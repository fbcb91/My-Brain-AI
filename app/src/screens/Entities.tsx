import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { listEntities, type Entity, type EntityKind } from '../lib/entities';

const SECTIONS: { kind: EntityKind; label: string; description: string }[] = [
  { kind: 'person', label: 'People', description: 'Whoever shows up in your thoughts.' },
  { kind: 'place', label: 'Places', description: 'Where you find yourself.' },
  { kind: 'theme', label: 'Themes', description: 'What keeps coming back.' },
];

function fmtLastMention(ts: number | null): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Entities() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listEntities()
      .then((es) => {
        if (!cancelled) setEntities(es);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error('[entities] load failed', e);
          setError('Could not load entities.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const out: Record<EntityKind, Entity[]> = {
      person: [],
      place: [],
      theme: [],
    };
    if (!entities) return out;
    for (const e of entities) out[e.kind].push(e);
    return out;
  }, [entities]);

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:text-ink"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        <div className="mt-3">
          <p className="eyebrow">Your world</p>
          <h1 className="display mt-1.5 text-[32px] leading-tight">
            People &amp; themes
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            What Niklaus is starting to recognise in what you share. Tap a name
            to see everything you've said about it.
          </p>
        </div>

        {entities === null && !error && (
          <div className="mt-10 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-2xl bg-paper-deep"
              />
            ))}
          </div>
        )}

        {error && <p className="mt-6 text-sm text-[#b94d2b]">{error}</p>}

        {entities && entities.length === 0 && (
          <div className="mt-12 text-center">
            <p className="display text-lg text-ink-2">Nothing yet.</p>
            <p className="mt-2 text-sm text-ink-3">
              Niklaus learns who and what matters to you from your captures.
              Record a few thoughts and check back.
            </p>
          </div>
        )}

        {entities && entities.length > 0 && (
          <div className="mt-8 space-y-7">
            {SECTIONS.map((section) => {
              const items = grouped[section.kind];
              if (items.length === 0) return null;
              return (
                <section key={section.kind}>
                  <p className="eyebrow mb-1">{section.label}</p>
                  <p className="mb-3 text-xs text-ink-3">{section.description}</p>
                  <ul className="overflow-hidden rounded-2xl border border-line bg-paper-elev">
                    {items.map((e, i) => (
                      <li
                        key={e.id}
                        className={
                          i < items.length - 1 ? 'border-b border-line' : ''
                        }
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/entities/${e.id}`)}
                          className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium text-ink">
                              {e.name}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-3">
                              {e.mentionsCount}{' '}
                              {e.mentionsCount === 1 ? 'mention' : 'mentions'}
                              {e.lastMentionAt
                                ? ` · last ${fmtLastMention(e.lastMentionAt)}`
                                : ''}
                            </p>
                          </div>
                          <span className="text-lg text-ink-3">›</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
