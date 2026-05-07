interface DailyQuestionCardProps {
  question: string;
  onAnswer: () => void;
  onSkip: () => void;
}

const eyebrow = (() => {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const partOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
  return `Niklaus, ${weekday} ${partOfDay}`;
})();

export default function DailyQuestionCard({
  question,
  onAnswer,
  onSkip,
}: DailyQuestionCardProps) {
  return (
    <div
      className="mt-6 flex flex-col gap-4 rounded-3xl border bg-paper-elev px-5 py-5"
      style={{ borderColor: 'rgba(181, 107, 29, 0.35)' }}
    >
      <p className="eyebrow" style={{ color: '#b56b1d' }}>
        {eyebrow}
      </p>
      <p className="display text-[20px] leading-snug text-ink">
        {question}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onAnswer}
          className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity hover:opacity-90"
        >
          Answer
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-4 py-2 text-[13px] text-ink-3 hover:text-ink-2"
        >
          Skip for today
        </button>
      </div>
    </div>
  );
}
