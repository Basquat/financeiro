import { Dialog, Transition } from '@headlessui/react';
import { Fragment, type ReactNode } from 'react';
import { IconButton } from './primitives';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/70 backdrop-blur-sm" aria-hidden />
        </Transition.Child>

        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="transition duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
            enterFrom="translate-y-full sm:translate-y-2 sm:opacity-0 sm:scale-[0.98]"
            enterTo="translate-y-0 sm:opacity-100 sm:scale-100"
            leave="transition duration-150 ease-in"
            leaveFrom="translate-y-0 sm:opacity-100"
            leaveTo="translate-y-full sm:translate-y-2 sm:opacity-0"
          >
            <Dialog.Panel className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop sm:max-w-md sm:rounded-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
                <div>
                  <Dialog.Title className="font-display text-[18px] font-medium text-text">
                    {title}
                  </Dialog.Title>
                  {description && (
                    <Dialog.Description className="mt-0.5 text-[13px] text-text-mute">
                      {description}
                    </Dialog.Description>
                  )}
                </div>
                <IconButton label="Fechar" onClick={onClose} className="-mr-2">
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                  </svg>
                </IconButton>
              </div>

              <div className="overflow-y-auto px-5 py-5">{children}</div>

              {footer && (
                <div className="border-t border-line-soft px-5 py-4 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))] sm:[padding-bottom:1rem]">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
