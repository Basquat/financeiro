import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChartPieIcon,
  HomeIcon,
  PlusIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUi } from '@/hooks/useUi';
import { firstName } from '@/lib/format';
import { PersonDot } from '@/components/ui/Person';
import { Button, cx } from '@/components/ui/primitives';

interface NavItem {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Início', Icon: HomeIcon },
  { to: '/transactions', label: 'Extrato', Icon: ArrowsRightLeftIcon },
  { to: '/accounts', label: 'Contas', Icon: BanknotesIcon },
  { to: '/planejar', label: 'Planejar', Icon: ChartPieIcon },
  { to: '/profile', label: 'Perfil', Icon: UserIcon },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gold/15 font-display text-[15px] text-gold">
        F
      </span>
      <span className="font-display text-[15px] font-medium text-text">finance+</span>
    </div>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAuth();
  const openAdd = useUi((s) => s.open);

  return (
    <div className="min-h-[100dvh] bg-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface/40 px-3 py-5 md:flex">
        <div className="px-2">
          <Wordmark />
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition',
                  isActive
                    ? 'bg-surface-2 font-medium text-text'
                    : 'text-text-dim hover:bg-surface-2/60 hover:text-text',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Button onClick={() => openAdd('add-sheet')} className="mt-2">
          <PlusIcon className="h-4 w-4" />
          Adicionar
        </Button>
        <div className="mt-4 flex items-center gap-2 border-t border-line-soft px-2 pt-4">
          <PersonDot person={user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl } : null} size="sm" />
          <span className="truncate text-[13px] text-text-dim">{firstName(user?.name)}</span>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink/85 px-4 backdrop-blur md:pl-[calc(15rem+1.5rem)] md:pr-6">
        <div className="md:hidden">
          <Wordmark />
        </div>
        <h1 className="hidden font-display text-[19px] font-medium text-text md:block">{title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAdd('add-sheet')}
            className="flex h-9 items-center gap-1.5 rounded-md bg-gold px-3 text-[13px] font-medium text-ink transition hover:bg-gold-bright focus-ring md:hidden"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar
          </button>
          <Link to="/profile" className="rounded-full focus-ring" aria-label="Abrir perfil">
            <PersonDot person={user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl } : null} size="sm" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pb-28 pt-5 md:pb-14 md:pl-[15rem] lg:pl-[16rem]">
        <div className="mx-auto max-w-2xl lg:max-w-3xl">
          <h1 className="mb-4 font-display text-[22px] font-medium text-text md:hidden">{title}</h1>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] transition',
                isActive ? 'text-gold' : 'text-text-mute',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
