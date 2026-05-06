import { NavLink } from 'react-router';

interface TabIconProps {
  active: boolean;
}

function TodayIcon({ active }: TabIconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#b56b1d' : '#807872'}
      strokeWidth="1.6"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

function MemoryIcon({ active }: TabIconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#b56b1d' : '#807872'}
      strokeWidth="1.6"
    >
      <path d="M3 12l9-9 9 9-9 9z" strokeLinejoin="round" />
    </svg>
  );
}

function YouIcon({ active }: TabIconProps) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#b56b1d' : '#807872'}
      strokeWidth="1.6"
    >
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { to: '/today', label: 'Today', Icon: TodayIcon },
  { to: '/memory', label: 'Memory', Icon: MemoryIcon },
  { to: '/you', label: 'You', Icon: YouIcon },
] as const;

export default function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[640px] border-t border-line bg-paper-elev/85 backdrop-blur-xl"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0))' }}
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className="flex flex-col items-center justify-center gap-1 py-3"
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span
                    className="text-[10px] font-medium tracking-wide"
                    style={{ color: isActive ? '#b56b1d' : '#807872' }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
