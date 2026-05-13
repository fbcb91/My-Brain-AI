import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { countHeirs } from '../lib/heirs';
import {
  type DailyQuestionTime,
  getDailyQuestionTime,
  setDailyQuestionTime,
} from '../lib/preferences';

interface Section {
  title: string;
  rows: { label: string; desc: string; onClick?: () => void }[];
}

export default function You() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [questionTime, setQuestionTimeState] = useState<DailyQuestionTime>(() =>
    getDailyQuestionTime()
  );
  const [heirsCount, setHeirsCount] = useState<number | null>(null);

  function setQuestionTime(value: DailyQuestionTime) {
    setDailyQuestionTime(value);
    setQuestionTimeState(value);
  }

  useEffect(() => {
    let cancelled = false;
    countHeirs()
      .then((n) => {
        if (!cancelled) setHeirsCount(n);
      })
      .catch(() => {
        if (!cancelled) setHeirsCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const heirsDesc =
    heirsCount === null
      ? 'No one designated yet'
      : heirsCount === 0
        ? 'No one designated yet'
        : `${heirsCount} ${heirsCount === 1 ? 'person' : 'people'} designated`;

  const sections: Section[] = [
    {
      title: 'Your world',
      rows: [
        {
          label: 'People & themes',
          desc: 'Whoever and whatever keeps coming up',
          onClick: () => navigate('/entities'),
        },
      ],
    },
    {
      title: 'Heritage',
      rows: [
        {
          label: 'Designate heirs',
          desc: heirsDesc,
          onClick: () => navigate('/heritage/heirs'),
        },
        { label: 'Heritage preferences', desc: 'Defaults applied' },
        { label: 'Time-locked messages', desc: 'None yet' },
      ],
    },
    {
      title: 'Privacy',
      rows: [
        { label: 'Export all my data', desc: 'Free, anytime, no questions' },
        { label: 'What Niklaus can see', desc: 'Voice, notes' },
        { label: 'Encryption details', desc: 'In-transit, at rest' },
      ],
    },
    {
      title: 'Account',
      rows: [
        { label: 'Subscription', desc: 'Free plan' },
        {
          label: 'Sign out',
          desc: '',
          onClick: () => {
            void signOut();
          },
        },
        { label: 'Delete account', desc: '' },
      ],
    },
  ];

  const initial = user?.email?.[0]?.toUpperCase() ?? 'N';

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-4">
          <p className="eyebrow">Profile</p>
          <h1 className="display mt-1.5 text-[34px] leading-[1.05]">You</h1>
        </header>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-paper-elev p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper">
            <span className="display text-xl">{initial}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-[15px] font-medium">
              {user?.email ?? 'Signed in'}
            </p>
            <p className="text-xs text-ink-3">Free plan · Upgrade →</p>
          </div>
        </div>

        <section className="mt-7">
          <p className="eyebrow mb-2">Daily question</p>
          <div className="rounded-2xl border border-line bg-paper-elev p-4">
            <p className="text-[15px] font-medium text-ink">
              When should Niklaus ask?
            </p>
            <p className="mt-0.5 text-xs text-ink-3">
              The question card on Today appears after this time.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setQuestionTime('morning')}
                className="flex-1 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors"
                style={{
                  background: questionTime === 'morning' ? '#1a1815' : 'transparent',
                  color: questionTime === 'morning' ? '#f6f2ea' : '#4b4640',
                  border:
                    questionTime === 'morning'
                      ? '1px solid #1a1815'
                      : '1px solid rgba(26, 24, 21, 0.18)',
                }}
              >
                Morning
              </button>
              <button
                type="button"
                onClick={() => setQuestionTime('evening')}
                className="flex-1 rounded-full px-4 py-2.5 text-[14px] font-medium transition-colors"
                style={{
                  background: questionTime === 'evening' ? '#1a1815' : 'transparent',
                  color: questionTime === 'evening' ? '#f6f2ea' : '#4b4640',
                  border:
                    questionTime === 'evening'
                      ? '1px solid #1a1815'
                      : '1px solid rgba(26, 24, 21, 0.18)',
                }}
              >
                Evening
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              {questionTime === 'morning'
                ? 'You\'ll see today\'s question after 6:00 AM.'
                : 'You\'ll see today\'s question after 6:00 PM.'}
            </p>
          </div>
        </section>

        {sections.map((s) => (
          <section key={s.title} className="mt-7">
            <p className="eyebrow mb-2">{s.title}</p>
            <ul className="overflow-hidden rounded-2xl border border-line bg-paper-elev">
              {s.rows.map((r, i) => (
                <li
                  key={r.label}
                  className={
                    i < s.rows.length - 1 ? 'border-b border-line' : ''
                  }
                >
                  <button
                    type="button"
                    onClick={r.onClick}
                    disabled={!r.onClick}
                    className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left disabled:cursor-default"
                  >
                    <div>
                      <p className="text-[15px] font-medium text-ink">
                        {r.label}
                      </p>
                      {r.desc && (
                        <p className="mt-0.5 text-xs text-ink-3">{r.desc}</p>
                      )}
                    </div>
                    <span className="text-lg text-ink-3">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-10 mb-6 text-center text-xs text-ink-3">
          Niklaus · Built with care
        </p>
      </div>
    </div>
  );
}
