import { supabase } from './supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatStreamHandlers {
  /** Called for each text chunk as it arrives from the model. */
  onText: (chunk: string) => void;
  /** Called once the stream has finished, with the list of capture ids the
   *  model referenced. */
  onDone: (sources: string[]) => void;
  /** Called for any error — pre-stream (auth, network, 5xx) or mid-stream
   *  (an error event from the model). */
  onError: (error: string) => void;
}

/**
 * Strips citation markers and the trailing SOURCES line from a (possibly
 * partial) raw reply, so the displayed text stays clean while the stream is
 * still in flight. Once any line begins with "SOURCES" we treat everything
 * from that line forward as protocol noise and hide it.
 */
export function stripChatMarkers(text: string): string {
  const lines = text.split('\n');
  const visible: string[] = [];
  for (const line of lines) {
    if (/^\s*SOURCES\b/i.test(line)) break;
    visible.push(line);
  }
  return visible
    .join('\n')
    .replace(/\[[a-f0-9-]{8,}\]/gi, '')
    .replace(/  +/g, ' ')
    .trimEnd();
}

export async function streamChatMessage(
  messages: ChatMessage[],
  handlers: ChatStreamHandlers
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    handlers.onError('Not signed in.');
    return;
  }

  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    handlers.onError(
      e instanceof Error ? e.message : 'Network error while talking to Niklaus.'
    );
    return;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    handlers.onError(`Chat failed (${res.status}). ${detail}`.trim());
    return;
  }

  if (!res.body) {
    handlers.onError('Empty response body.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneSeen = false;

  interface StreamEvent {
    type?: 'text' | 'done' | 'error';
    text?: string;
    sources?: unknown;
    error?: string;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        let event: StreamEvent;
        try {
          event = JSON.parse(line) as StreamEvent;
        } catch {
          continue;
        }
        if (event.type === 'text' && typeof event.text === 'string') {
          handlers.onText(event.text);
        } else if (event.type === 'done') {
          doneSeen = true;
          const sources = Array.isArray(event.sources)
            ? (event.sources as unknown[]).filter(
                (v): v is string => typeof v === 'string'
              )
            : [];
          handlers.onDone(sources);
        } else if (event.type === 'error') {
          handlers.onError(event.error ?? 'Unknown error.');
          return;
        }
      }
    }
    if (!doneSeen) {
      handlers.onDone([]);
    }
  } catch (e) {
    handlers.onError(
      e instanceof Error ? e.message : 'Stream interrupted.'
    );
  }
}
