import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChartPieIcon,
  HomeIcon,
  PlusIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUi } from '@/hooks/useUi';
import { firstName } from '@/lib/format';
import { Logo } from '@/components/ui/Logo';
import { PersonDot } from '@/components/ui/Person';
import { cx } from '@/components/ui/primitives';

interface NavItem {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Dinheiro',
    items: [
      { to: '/', label: 'Início', Icon: HomeIcon },
      { to: '/transactions', label: 'Extrato', Icon: ArrowsRightLeftIcon },
      { to: '/accounts', label: 'Contas', Icon: BanknotesIcon },
    ],
  },
  {
    title: 'Futuro',
    items: [
      { to: '/planejar', label: 'Planejar', Icon: ChartPieIcon },
      { to: '/assistente', label: 'Assistente', Icon: SparklesIcon },
    ],
  },
  { title: 'Você', items: [{ to: '/profile', label: 'Perfil', Icon: UserIcon }] },
];

const NAV = GROUPS.flatMap((g) => g.items);

export function AppShell({
  title,
  eyebrow,
  actions,
  wide,
  children,
}: {
  title: string;
  /** Small line above the title (e.g. the date on the dashboard). */
  eyebrow?: string;
  /** Buttons on the right of the page title. */
  actions?: ReactNode;
  /** Dashboard-style pages use the full width; lists stay readable at 3xl. */
  wide?: boolean;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const openAdd = useUi((s) => s.open);
  const me = user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl } : null;

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col px-4 pb-4 pt-6 md:flex">
        <Link to="/" className="px-2 focus-ring rounded-md">
          <Logo />
        </Link>

        <button
          onClick={() => openAdd('add-sheet')}
          className="mt-7 flex h-11 items-center justify-center gap-2 rounded-md bg-brand text-[14px] font-medium text-canvas shadow-lift transition hover:bg-brand-bright active:scale-[0.98] focus-ring"
        >
          <PlusIcon className="h-4 w-4" />
          Novo lançamento
        </button>

        <nav className="mt-7 flex flex-1 flex-col gap-6">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="eyebrow mb-2 px-3">{group.title}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cx(
                        'group flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition focus-ring',
                        isActive
                          ? 'bg-surface font-medium text-text shadow-card'
                          : 'text-text-dim hover:bg-surface/60 hover:text-text',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cx(
                            'inline-flex h-7 w-7 items-center justify-center rounded-sm transition',
                            isActive ? 'bg-lime text-brand-deep' : 'text-text-mute group-hover:text-text',
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-md border border-line bg-surface p-2.5 shadow-card transition hover:border-brand/30 focus-ring"
        >
          <PersonDot person={me} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-text">{firstName(user?.name)}</span>
            <span className="block truncate text-[12px] text-text-mute">{user?.email}</span>
          </span>
        </Link>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between bg-canvas/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAdd('add-sheet')}
            aria-label="Novo lançamento"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-canvas transition active:scale-95 focus-ring"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
          <Link to="/profile" className="rounded-full focus-ring" aria-label="Abrir perfil">
            <PersonDot person={me} />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pb-28 pt-4 md:ml-64 md:px-8 md:pb-14 md:pt-8">
        <div className={cx('mx-auto', wide ? 'max-w-6xl' : 'max-w-3xl')}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
              <h1 className="text-[26px] font-semibold leading-tight text-text md:text-[32px]">{title}</h1>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition focus-ring',
                isActive ? 'text-brand' : 'text-text-mute',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cx(
                    'inline-flex h-7 w-11 items-center justify-center rounded-full transition',
                    isActive && 'bg-lime text-brand-deep',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
