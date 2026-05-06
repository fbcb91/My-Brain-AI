import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signin' | 'signup';

export default function SignIn() {
  const { configured, signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('/today', { replace: true });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const res = await fn(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
    }
    // success → onAuthStateChange will fire and the redirect useEffect runs
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

  const heading =
    mode === 'signin' ? 'Welcome back.' : 'Create your account.';
  const submitLabel = mode === 'signin' ? 'Sign in →' : 'Create account →';
  const switchLabel =
    mode === 'signin'
      ? "Don't have an account? Create one"
      : 'Already have an account? Sign in';

  return (
    <div className="screen">
      <div className="screen-content flex flex-col">
        <header className="pt-12 text-center">
          <h1 className="display text-[40px] leading-[1.05]">Niklaus</h1>
        </header>

        <div className="mt-12">
          <p className="display mb-6 text-[24px]">{heading}</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="eyebrow block pb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-ink bg-transparent py-3 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="eyebrow block pb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  required
                  minLength={8}
                  placeholder={
                    mode === 'signin' ? 'Your password' : 'At least 8 characters'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-b border-ink bg-transparent py-3 pr-14 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-ink-3 underline"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !email.trim() || password.length < 8}
              className="mt-4 rounded-full bg-ink px-6 py-3 text-[14px] font-medium text-paper transition-opacity disabled:opacity-50"
            >
              {busy ? 'Working…' : submitLabel}
            </button>
          </form>

          {error && (
            <p className="mt-6 text-center text-xs text-[#b94d2b]">{error}</p>
          )}

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError(null);
            }}
            className="mt-6 w-full text-center text-xs text-ink-3 underline"
          >
            {switchLabel}
          </button>
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
