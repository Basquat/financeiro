import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Fragment, type ReactNode } from 'react';
import { cx } from './primitives';

export interface MenuAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
}

/** A "⋮" button that drops a small action menu. */
export function CardMenu({ actions, label = 'Ações' }: { actions: MenuAction[]; label?: string }) {
  return (
    <Menu as="div" className="relative shrink-0">
      <Menu.Button
        aria-label={label}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-mute transition hover:bg-surface-2 hover:text-text focus-ring"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition duration-100 ease-out"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition duration-75 ease-in"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-20 mt-1 w-44 origin-top-right overflow-hidden rounded-md border border-line bg-surface-2 p-1 shadow-pop focus:outline-none">
          {actions.map((action) => (
            <Menu.Item key={action.label}>
              {({ active }) => (
                <button
                  onClick={action.onClick}
                  className={cx(
                    'flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] transition',
                    active && 'bg-surface-3',
                    action.danger ? 'text-expense' : 'text-text-dim',
                  )}
                >
                  {action.icon}
                  {action.label}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
