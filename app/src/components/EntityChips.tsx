import { useNavigate } from 'react-router';
import type { Entity, EntityKind } from '../lib/entities';

interface EntityChipsProps {
  entities: Entity[];
  /** When set, an extra "see all" chip appears at the end linking to /entities */
  showSeeAll?: boolean;
}

const KIND_STYLES: Record<EntityKind, { bg: string; fg: string; border: string }> = {
  person: {
    bg: 'rgba(181, 107, 29, 0.10)',
    fg: '#6b3a08',
    border: 'rgba(181, 107, 29, 0.30)',
  },
  place: {
    bg: 'rgba(26, 24, 21, 0.06)',
    fg: '#4b4640',
    border: 'rgba(26, 24, 21, 0.16)',
  },
  theme: {
    bg: '#fbf8f2',
    fg: '#4b4640',
    border: 'rgba(26, 24, 21, 0.16)',
  },
};

export default function EntityChips({ entities, showSeeAll }: EntityChipsProps) {
  const navigate = useNavigate();

  if (entities.length === 0 && !showSeeAll) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {entities.map((e) => {
        const s = KIND_STYLES[e.kind];
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => navigate(`/entities/${e.id}`)}
            className="rounded-full border px-2.5 py-1 text-[12px] transition-opacity hover:opacity-80"
            style={{
              background: s.bg,
              color: s.fg,
              borderColor: s.border,
            }}
          >
            {e.name}
          </button>
        );
      })}
      {showSeeAll && (
        <button
          type="button"
          onClick={() => navigate('/entities')}
          className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-3 hover:text-ink-2"
        >
          See all →
        </button>
      )}
    </div>
  );
}
