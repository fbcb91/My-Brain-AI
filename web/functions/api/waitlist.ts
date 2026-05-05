interface Env {
  PLUNK_API_KEY?: string;
}

interface WaitlistBody {
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: WaitlistBody;
  try {
    body = (await request.json()) as WaitlistBody;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email.' }, 400);
  }

  const apiKey = env.PLUNK_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch('https://api.useplunk.com/v1/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          subscribed: true,
          data: { source: 'niklaus.app waitlist' },
        }),
      });

      if (!res.ok && res.status !== 409) {
        return json({ error: 'Could not save your email. Try again?' }, 500);
      }
    } catch {
      return json({ error: 'Could not save your email. Try again?' }, 500);
    }
  }

  return json({ ok: true }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
