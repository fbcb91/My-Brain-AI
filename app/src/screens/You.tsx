interface Section {
  title: string;
  rows: { label: string; desc: string; status?: string }[];
}

const sections: Section[] = [
  {
    title: 'Heritage',
    rows: [
      { label: 'Designate heirs', desc: 'No one designated yet' },
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
      { label: 'Sign out', desc: '' },
      { label: 'Delete account', desc: '' },
    ],
  },
];

export default function You() {
  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-4">
          <p className="eyebrow">Profile</p>
          <h1 className="display mt-1.5 text-[34px] leading-[1.05]">You</h1>
        </header>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-paper-elev p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper">
            <span className="display text-xl">N</span>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-medium">You</p>
            <p className="text-xs text-ink-3">Free plan · Upgrade →</p>
          </div>
        </div>

        {sections.map((s) => (
          <section key={s.title} className="mt-7">
            <p className="eyebrow mb-2">{s.title}</p>
            <ul className="overflow-hidden rounded-2xl border border-line bg-paper-elev">
              {s.rows.map((r, i) => (
                <li
                  key={r.label}
                  className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 ${
                    i < s.rows.length - 1 ? 'border-b border-line' : ''
                  }`}
                >
                  <div>
                    <p className="text-[15px] font-medium text-ink">{r.label}</p>
                    {r.desc && <p className="mt-0.5 text-xs text-ink-3">{r.desc}</p>}
                  </div>
                  <span className="text-lg text-ink-3">›</span>
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
