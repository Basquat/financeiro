import { ChevronRightIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { money } from '@/lib/format';
import { useAuth, useAuthActions } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { AppShell } from '@/components/layout/AppShell';
import { PersonDot } from '@/components/ui/Person';
import { Button, Card } from '@/components/ui/primitives';

function Row({
  label,
  value,
  onClick,
}: {
  label: string;
  value: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2 focus-ring"
    >
      <span className="text-[14px] text-text-dim">{label}</span>
      <span className="flex items-center gap-1.5 text-[14px] font-medium text-text">
        {value}
        <ChevronRightIcon className="h-4 w-4 text-text-mute" />
      </span>
    </button>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { logout } = useAuthActions();
  const open = useUi((s) => s.open);
  const partner = usePartner();

  return (
    <AppShell title="Perfil">
      <div className="space-y-5">
        <Card className="flex items-center gap-4 p-4">
          <button
            onClick={() => open('avatar')}
            className="group relative rounded-full focus-ring"
            aria-label="Trocar foto de perfil"
          >
            <PersonDot
              person={user ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl } : null}
              size="lg"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-surface-3 text-text-dim">
              <PencilSquareIcon className="h-3 w-3" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-medium text-text">{user?.name}</p>
            <p className="truncate text-[13px] text-text-mute">{user?.email}</p>
          </div>
        </Card>

        <Card className="divide-y divide-line-soft overflow-hidden">
          <Row
            label="Foto de perfil"
            value={user?.avatarUrl ? 'Trocar' : 'Adicionar'}
            onClick={() => open('avatar')}
          />
          <Row
            label="Salário mensal"
            value={user?.salary != null ? money(user.salary) : 'Definir'}
            onClick={() => open('salary')}
          />
          <Row label="E-mail de acesso" value="Alterar" onClick={() => open('email')} />
          <Row
            label="Conta conjunta"
            value={
              partner.data?.partner
                ? partner.data.partner.name
                : partner.data?.invite
                  ? 'Convite pendente'
                  : 'Convidar'
            }
            onClick={() => open('partner')}
          />
        </Card>

        <Button variant="danger" onClick={logout} block>
          Sair da conta
        </Button>
      </div>
    </AppShell>
  );
}
