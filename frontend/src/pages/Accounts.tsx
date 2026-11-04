import { useState } from 'react';
import { money } from '@/lib/format';
import { useAccounts, useDeleteAccount } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { AppShell } from '@/components/layout/AppShell';
import { AccountCard } from '@/components/Cards';
import { TransferDialog, type TransferPreset } from '@/components/TransferDialog';
import { QueryBoundary } from '@/components/ui/Async';
import { Button, Card, EmptyState } from '@/components/ui/primitives';

export default function Accounts() {
  const accounts = useAccounts();
  const open = useUi((s) => s.open);
  const askConfirm = useUi((s) => s.askConfirm);
  const del = useDeleteAccount();
  const [transfer, setTransfer] = useState<TransferPreset | null>(null);

  return (
    <AppShell
      title="Contas"
      eyebrow="Carteiras, bancos e cartões"
      actions={
        <div className="flex gap-2">
          {(accounts.data?.length ?? 0) > 1 && (
            <Button variant="secondary" onClick={() => setTransfer({})}>
              Transferir
            </Button>
          )}
          <Button onClick={() => open('account')} className="hidden sm:inline-flex">
            Nova conta
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <QueryBoundary query={accounts}>
          {(list) => {
            const total = list.reduce((s, a) => s + (a.currentBalance ?? 0), 0);
            if (list.length === 0) {
              return (
                <EmptyState
                  title="Nenhuma conta"
                  action={<Button onClick={() => open('account')}>Criar conta</Button>}
                >
                  Cadastre suas carteiras, contas bancárias e cartões para lançar transações neles.
                </EmptyState>
              );
            }
            return (
              <>
                <div className="rounded-xl bg-pine p-5 text-paper shadow-lift">
                  <p className="text-[13px] text-paper/70">Total em {list.length} {list.length === 1 ? 'conta' : 'contas'}</p>
                  <p className="amount mt-1 text-[32px] font-medium leading-none">{money(total)}</p>
                </div>
                <div className="grid gap-3">
                  {list.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onEdit={() => open('account', account)}
                      onPayBill={(amount) =>
                        setTransfer({ toAccountId: account.id, amount, title: `Pagar fatura · ${account.name}` })
                      }
                      onDelete={() =>
                        askConfirm({
                          title: 'Excluir conta?',
                          body: `“${account.name}” será removida. Só é possível se ela não tiver lançamentos.`,
                          confirmLabel: 'Excluir',
                          danger: true,
                          onConfirm: () => del.mutateAsync(account.id),
                        })
                      }
                    />
                  ))}
                </div>
              </>
            );
          }}
        </QueryBoundary>
      </div>
      <TransferDialog preset={transfer} onClose={() => setTransfer(null)} />
    </AppShell>
  );
}
