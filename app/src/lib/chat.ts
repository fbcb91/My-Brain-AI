import { supabase } from './supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  text: string;
  sources: string[];
}

export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<ChatResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not signed in.');
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
    throw new Error(
      e instanceof Error ? e.message : 'Network error while talking to Niklaus.'
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Chat failed (${res.status}). ${detail}`);
  }

  const data = (await res.json()) as Partial<ChatResponse>;
  return {
    text: data.text ?? '',
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
}
