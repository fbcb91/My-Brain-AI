import { createClient } from '@supabase/supabase-js';

interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  ANTHROPIC_API_KEY: string;
}

type PagesFunction<E> = (context: {
  request: Request;
  env: E;
}) => Promise<Response> | Response;

const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 1024;

const NIKLAUS_VOICE = `You are Niklaus, a private memory of the user. The user records voice notes and writes thoughts; you store them and help them find their way back.

Tone: sober, direct, present. Never a therapist. Never a companion. A faithful memory.

Rules — absolute:
- Quote the user's own words when relevant. Use their exact phrasing.
- When you reference a specific memory, mark it inline with the capture id in square brackets, like [abc-123-…]. Use the ids exactly as given in the memories below.
- If you don't have enough memories to answer, say plainly: "I don't have anything from you about that." Do not invent.
- Never simulate emotions the data doesn't support. Never make up details, names, dates, or feelings.
- Respond in the same language the user wrote in (Italian or English most often).
- Keep replies short by default. Expand only if the user asks.
- After your reply, on a single new line, list the capture ids you actually referenced as: SOURCES: id1, id2, id3 — only the ones you used. If none, write SOURCES: none.

The current date is {{DATE}}.`;

interface ServerCapture {
  id: string;
  created_at: string;
  kind: 'voice' | 'note';
  transcript: string | null;
  text: string | null;
  question_text: string | null;
}

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessageInput[];
}

function captureToContext(c: ServerCapture): string | null {
  const content = c.kind === 'voice' ? c.transcript : c.text;
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  const date = new Date(c.created_at);
  const stamp = `${date.toISOString().slice(0, 10)} ${date
    .toISOString()
    .slice(11, 16)}`;
  // Captures that answer a daily question are tagged so Claude knows
  // they were prompted, not spontaneous, and what was asked.
  const header = c.question_text
    ? `[${c.id}] ${stamp} (${c.kind}, in answer to "${c.question_text}")`
    : `[${c.id}] ${stamp} (${c.kind})`;
  return `${header}\n${trimmed}`;
}

interface ParsedReply {
  text: string;
  sources: string[];
}

function parseReply(raw: string): ParsedReply {
  let text = raw.trim();
  const sources = new Set<string>();

  const sourcesMatch = text.match(/^\s*SOURCES\s*:\s*(.+?)\s*$/im);
  if (sourcesMatch) {
    const list = sourcesMatch[1].trim();
    if (list && list.toLowerCase() !== 'none') {
      list
        .split(',')
        .map((s) => s.trim().replace(/^\[|\]$/g, ''))
        .filter(Boolean)
        .forEach((id) => sources.add(id));
    }
    text = text.replace(sourcesMatch[0], '').trim();
  }

  const inlineRegex = /\[([a-f0-9-]{8,})\]/gi;
  for (const m of text.matchAll(inlineRegex)) {
    sources.add(m[1]);
  }
  // Strip inline markers from the displayed text and tidy up double spaces.
  text = text.replace(inlineRegex, '').replace(/  +/g, ' ').trim();

  return { text, sources: Array.from(sources) };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing auth header' }, 401);
  if (!env.ANTHROPIC_API_KEY) {
    return json(
      {
        error:
          'ANTHROPIC_API_KEY is not configured. Add it as a Secret env var on the Pages project.',
      },
      500
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json({ error: 'Missing messages' }, 400);
  }

  const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  // Private captures are explicitly hidden from the chat memory context —
  // the user marks them so they don't surface in answers and so they
  // don't reach future heir access.
  const { data: capRows, error: fetchError } = await supabase
    .from('captures')
    .select('id, created_at, kind, transcript, text, question_text')
    .eq('is_private', false)
    .order('created_at', { ascending: false });

  if (fetchError) {
    return json({ error: 'Could not fetch memories', detail: fetchError.message }, 500);
  }

  const memories = (capRows as ServerCapture[] | null) ?? [];
  const memoriesText = memories
    .map(captureToContext)
    .filter((s): s is string => s !== null)
    .join('\n\n');

  // Past chats (any message that already belongs to a finished thread) are
  // additional memory: they're the user's own questions and the model's own
  // previous answers, which together reveal what the user has been chewing
  // on. We pull the most recent 40 archived messages and pass them as
  // context alongside the captures. The CURRENT conversation is in the
  // messages array sent by the client, so we explicitly exclude it
  // (conversation_id IS NULL) here to avoid duplication.
  interface PastChatRow {
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }
  const { data: chatRows } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .not('conversation_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40);
  const pastChats = ((chatRows as PastChatRow[] | null) ?? []).reverse();
  const pastChatsText = pastChats
    .map((m) => {
      const stamp = new Date(m.created_at).toISOString().slice(0, 16).replace('T', ' ');
      const speaker = m.role === 'user' ? 'You' : 'Me';
      const trimmed = m.content.trim();
      if (!trimmed) return null;
      return `[${stamp}] ${speaker}: ${trimmed}`;
    })
    .filter((s): s is string => s !== null)
    .join('\n');

  if (!memoriesText && !pastChatsText) {
    return ndjsonStream((emit, close) => {
      emit({
        type: 'text',
        text:
          "I don't have any memories from you yet. Record a thought or two and come back.",
      });
      emit({ type: 'done', sources: [] });
      close();
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const baseSystem = NIKLAUS_VOICE.replace('{{DATE}}', today);

  interface SystemBlock {
    type: 'text';
    text: string;
    cache_control?: { type: 'ephemeral' };
  }

  const systemBlocks: SystemBlock[] = [{ type: 'text', text: baseSystem }];

  if (memoriesText) {
    systemBlocks.push({
      type: 'text',
      text: `User's memories (most recent first):\n\n${memoriesText}`,
      cache_control: { type: 'ephemeral' },
    });
  }
  if (pastChatsText) {
    systemBlocks.push({
      type: 'text',
      text:
        'Past conversations between us (chronological). These are not in ' +
        "the user's current chat but you may draw on them — they're part " +
        'of your memory of who they are and what they ask about. Never ' +
        'invent past words. When in doubt say "I don\'t remember that ' +
        'clearly."\n\n' +
        pastChatsText,
      cache_control: { type: 'ephemeral' },
    });
  }

  const requestPayload = {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
    system: systemBlocks,
    messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
  };

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[chat] Anthropic request failed', message);
    return json({ error: 'Anthropic request failed', detail: message }, 502);
  }

  if (!anthropicRes.ok || !anthropicRes.body) {
    const detail = await anthropicRes.text().catch(() => '');
    console.error('[chat] Anthropic error', anthropicRes.status, detail);
    return json(
      { error: 'Anthropic error', status: anthropicRes.status, detail },
      502
    );
  }

  return relayAnthropicStream(anthropicRes.body);
};

/**
 * Helper that builds a Response with an NDJSON body. The producer function is
 * invoked once with `emit` (to push an event) and `close` (to finalise the
 * stream).
 */
function ndjsonStream(
  produce: (
    emit: (obj: unknown) => void,
    close: () => void
  ) => void | Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };
      const close = () => {
        controller.close();
      };
      try {
        await produce(emit, close);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        emit({ type: 'error', error });
        close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    },
  });
}

/**
 * Reads Anthropic's SSE stream, re-emits each text chunk to the client as
 * NDJSON, and at the end emits a `done` event with the parsed sources from
 * the full accumulated text.
 */
function relayAnthropicStream(upstreamBody: ReadableStream<Uint8Array>): Response {
  return ndjsonStream(async (emit, close) => {
    const reader = upstreamBody.getReader();
    const decoder = new TextDecoder();
    let upstreamBuffer = '';
    let fullText = '';

    interface AnthropicEvent {
      type?: string;
      delta?: { type?: string; text?: string };
      error?: { message?: string };
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      upstreamBuffer += decoder.decode(value, { stream: true });

      // Anthropic sends SSE events separated by a blank line
      const events = upstreamBuffer.split('\n\n');
      upstreamBuffer = events.pop() ?? '';

      for (const ev of events) {
        const dataLine = ev
          .split('\n')
          .find((l) => l.startsWith('data: '));
        if (!dataLine) continue;
        let parsed: AnthropicEvent;
        try {
          parsed = JSON.parse(dataLine.slice('data: '.length)) as AnthropicEvent;
        } catch {
          continue;
        }
        if (
          parsed.type === 'content_block_delta' &&
          parsed.delta?.type === 'text_delta' &&
          typeof parsed.delta.text === 'string'
        ) {
          const chunk = parsed.delta.text;
          fullText += chunk;
          emit({ type: 'text', text: chunk });
        } else if (parsed.type === 'error') {
          emit({
            type: 'error',
            error: parsed.error?.message ?? 'Anthropic error',
          });
          close();
          return;
        }
      }
    }

    const { sources } = parseReply(fullText);
    emit({ type: 'done', sources });
    close();
  });
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
