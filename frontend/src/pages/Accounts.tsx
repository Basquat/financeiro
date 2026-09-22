import { money } from '@/lib/format';
import { useAccounts, useDeleteAccount } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { AppShell } from '@/components/layout/AppShell';
import { AccountCard } from '@/components/Cards';
import { QueryBoundary } from '@/components/ui/Async';
import { Button, Card, EmptyState } from '@/components/ui/primitives';

export default function Accounts() {
  const accounts = useAccounts();
  const open = useUi((s) => s.open);
  const askConfirm = useUi((s) => s.askConfirm);
  const del = useDeleteAccount();

  return (
    <AppShell title="Contas">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => open('account')} className="hidden sm:inline-flex">
            Nova conta
          </Button>
        </div>

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
                <Card className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px] text-text-mute">Total em contas</span>
                  <span className="amount text-[15px] font-medium text-text">{money(total)}</span>
                </Card>
                <div className="grid gap-3">
                  {list.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onEdit={() => open('account', account)}
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
    </AppShell>
  );
}
