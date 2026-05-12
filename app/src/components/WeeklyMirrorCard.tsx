import Markdown from './Markdown';
import { formatWeekRange, type WeeklyMirror } from '../lib/weekly-mirror';

interface WeeklyMirrorCardProps {
  mirror: WeeklyMirror;
  onDismiss: () => void;
}

export default function WeeklyMirrorCard({ mirror, onDismiss }: WeeklyMirrorCardProps) {
  return (
    <div
      className="mt-6 flex flex-col gap-3 rounded-3xl border bg-paper-elev px-5 py-5"
      style={{ borderColor: 'rgba(26, 24, 21, 0.18)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow" style={{ color: '#b56b1d' }}>
            Last week
          </p>
          <p className="mono mt-1 text-[11px] text-ink-3">
            {formatWeekRange(mirror.weekStart)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <Markdown
        text={mirror.content}
        className="display text-[15.5px] leading-relaxed text-ink"
      />
    </div>
  );
}
