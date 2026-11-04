import {
  ArrowsRightLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { useUi, type ModalName } from '@/hooks/useUi';
import { Modal } from '@/components/ui/Modal';

const OPTIONS: Array<{
  target: Exclude<ModalName, null>;
  title: string;
  desc: string;
  Icon: typeof BanknotesIcon;
}> = [
  {
    target: 'transaction',
    title: 'Transação',
    desc: 'Uma entrada ou saída de dinheiro',
    Icon: ArrowsRightLeftIcon,
  },
  {
    target: 'installment',
    title: 'Parcelamento',
    desc: 'Uma compra parcelada em andamento',
    Icon: CreditCardIcon,
  },
  { target: 'goal', title: 'Meta', desc: 'Um objetivo para juntar dinheiro', Icon: FlagIcon },
  { target: 'account', title: 'Conta', desc: 'Uma carteira, banco ou cartão', Icon: BanknotesIcon },
];

export function AddSheet() {
  const open = useUi((s) => s.modal === 'add-sheet');
  const close = useUi((s) => s.close);
  const goTo = useUi((s) => s.open);

  return (
    <Modal open={open} onClose={close} title="O que você quer adicionar?">
      <div className="grid gap-2">
        {OPTIONS.map(({ target, title, desc, Icon }) => (
          <button
            key={target}
            onClick={() => goTo(target)}
            className="flex items-center gap-3 rounded-md border border-line bg-surface p-3 text-left transition hover:border-brand/40 hover:bg-brand-soft/50 focus-ring"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-lime text-brand-deep">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[14px] font-medium text-text">{title}</span>
              <span className="block text-[12px] text-text-mute">{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
