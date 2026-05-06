import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import CodeInput from '../components/CodeInput';
import { useAuth } from '../contexts/AuthContext';

type Step = 'email' | 'code';

export default function SignIn() {
  const { configured, sendOtp, verifyOtp, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('/today', { replace: true });
  }, [user, navigate]);

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const res = await sendOtp(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send the code.');
      return;
    }
    setStep('code');
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const res = await verifyOtp(email, code);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Wrong or expired code.');
      return;
    }
    // onAuthStateChange will fire and useEffect above will redirect
  }

  async function resend() {
    setError(null);
    setBusy(true);
    const res = await sendOtp(email);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Could not send the code.');
  }

  if (!configured) {
    return (
      <div className="screen">
        <div className="screen-content">
          <header className="pt-12 text-center">
            <h1 className="display text-[34px] leading-[1.05]">Niklaus</h1>
            <p className="mt-4 text-sm text-ink-2">
              Auth is not configured yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in the deployment env to continue.
            </p>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-content flex flex-col">
        <header className="pt-12 text-center">
          <h1 className="display text-[40px] leading-[1.05]">Niklaus</h1>
          <p className="eyebrow mt-3">Sign in</p>
        </header>

        <div className="mt-12">
          {step === 'email' ? (
            <form onSubmit={onSubmitEmail} className="flex flex-col gap-4">
              <label className="display text-[20px]">
                What's your email?
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-b border-ink bg-transparent py-3 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
              />
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="mt-4 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper transition-opacity disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Send me a code →'}
              </button>
              <p className="mt-2 text-center text-xs text-ink-3">
                We'll email you a 6-digit code. No password needed.
              </p>
            </form>
          ) : (
            <form onSubmit={onSubmitCode} className="flex flex-col gap-4">
              <label className="display text-[20px]">
                Enter the code we sent to<br />
                <span className="text-accent">{email}</span>
              </label>
              <CodeInput value={code} onChange={setCode} autoFocus />
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="mt-4 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper transition-opacity disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Verify and sign in →'}
              </button>
              <div className="mt-2 flex justify-between text-xs text-ink-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                  }}
                  className="underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={resend}
                  disabled={busy}
                  className="underline disabled:opacity-50"
                >
                  Resend
                </button>
              </div>
            </form>
          )}

          {error && (
            <p className="mt-6 text-center text-xs text-[#b94d2b]">{error}</p>
          )}
        </div>

        <div className="mt-auto pb-8 pt-12 text-center">
          <p className="eyebrow">Your data is yours</p>
          <p className="mt-2 text-xs text-ink-3">
            We never share or sell your data. Export anything, anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
