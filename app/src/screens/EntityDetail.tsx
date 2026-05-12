import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { capturesForEntity, getEntity, type Entity } from '../lib/entities';
import { isLikelyHallucination } from '../lib/transcript-quality';
import type { Capture } from '../lib/types';

const fmtDuration = (s: number) => {
  const sec = Math.max(0, Math.floor(s));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

function getLabel(c: Capture): string {
  if (c.kind === 'note') return c.text ?? '';
  const t = c.transcript;
  if (typeof t === 'string' && t.trim() && !isLikelyHallucination(t)) return t;
  return `voice · ${fmtDuration(c.duration ?? 0)}`;
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const KIND_LABEL: Record<Entity['kind'], string> = {
  person: 'Person',
  place: 'Place',
  theme: 'Theme',
};

export default function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [captures, setCaptures] = useState<Capture[] | null>(null);
  const [loadedEntity, setLoadedEntity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([getEntity(id), capturesForEntity(id)])
      .then(([ent, caps]) => {
        if (cancelled) return;
        setEntity(ent);
        setCaptures(caps);
        setLoadedEntity(true);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('[entity-detail] load failed', e);
        setError('Could not load this entity.');
        setLoadedEntity(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!loadedEntity) {
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
          <div className="mt-10 space-y-3 animate-pulse">
            <div className="h-6 w-1/3 rounded bg-paper-deep" />
            <div className="h-4 w-1/4 rounded bg-paper-deep" />
            <div className="mt-6 h-12 rounded bg-paper-deep" />
            <div className="h-12 rounded bg-paper-deep" />
          </div>
        </div>
      </div>
    );
  }

  if (!entity) {
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
          <div className="mt-12 text-center">
            <p className="display text-lg text-ink-2">Not found.</p>
            <p className="mt-2 text-sm text-ink-3">
              {error ?? 'This entity has been removed.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="eyebrow">{KIND_LABEL[entity.kind]}</p>
          <h1 className="display mt-1.5 text-[34px] leading-tight">
            {entity.name}
          </h1>
          <p className="mt-2 text-sm text-ink-3">
            {entity.mentionsCount}{' '}
            {entity.mentionsCount === 1 ? 'mention' : 'mentions'}
            {entity.firstMentionAt
              ? ` · first on ${fmtDate(entity.firstMentionAt)}`
              : ''}
          </p>
        </div>

        <section className="mt-8">
          <p className="eyebrow mb-2">All mentions</p>
          {captures === null && (
            <p className="text-sm text-ink-3">Loading…</p>
          )}
          {captures && captures.length === 0 && (
            <p className="text-sm text-ink-3">No captures linked yet.</p>
          )}
          {captures && captures.length > 0 && (
            <ul className="overflow-hidden rounded-2xl border border-line bg-paper-elev">
              {captures.map((c, i) => {
                const label = getLabel(c);
                const date = new Date(c.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                const time = new Date(c.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });
                return (
                  <li
                    key={c.id}
                    className={
                      i < captures.length - 1 ? 'border-b border-line' : ''
                    }
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/capture/${c.id}`)}
                      className="grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <span className="mono text-[11px] text-ink-3">
                        {date}
                        <br />
                        {time}
                      </span>
                      <span className="truncate text-[13.5px] text-ink-2">
                        {label}
                      </span>
                      <span className="text-lg text-ink-3">›</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
