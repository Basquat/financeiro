import { ChevronRightIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { money } from '@/lib/format';
import { apiError } from '@/lib/api';
import { authService } from '@/services/authService';
import { useAuth, useAuthActions, useAuthStore } from '@/hooks/useAuth';
import { usePartner } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { AppShell } from '@/components/layout/AppShell';
import { PersonDot } from '@/components/ui/Person';
import { Button, Card } from '@/components/ui/primitives';
import { Field } from '@/components/ui/Field';

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
  const setUser = useAuthStore((s) => s.setUser);
  const { logout } = useAuthActions();
  const open = useUi((s) => s.open);
  const partner = usePartner();
  const [pinMode, setPinMode] = useState<'idle' | 'create' | 'disable'>('idle');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinEnabled = !!user?.pinEnabled;

  async function handleSetPin() {
    setError(null);
    if (pin.length < 4 || pin.length > 6) {
      setError('PIN deve ter entre 4 e 6 dígitos.');
      return;
    }
    if (pin !== pinConfirm) {
      setError('Os PINs não coincidem.');
      return;
    }
    setBusy(true);
    try {
      const { user: updated } = await authService.setPin(password, pin);
      setUser(updated);
      setPinMode('idle');
      setPin('');
      setPinConfirm('');
      setPassword('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisablePin() {
    setError(null);
    setBusy(true);
    try {
      const { user: updated } = await authService.disablePin(password);
      setUser(updated);
      setPinMode('idle');
      setPassword('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

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
          <Row
            label="PIN de acesso"
            value={pinEnabled ? 'Ativo' : 'Desativado'}
            onClick={() => setPinMode(pinEnabled ? 'disable' : 'create')}
          />
        </Card>

        {pinMode !== 'idle' && (
          <Card className="space-y-3 p-4">
            <p className="text-[14px] font-medium text-text">
              {pinEnabled ? 'Desativar PIN' : 'Criar PIN'}
            </p>
            {!pinEnabled && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Novo PIN">
                    {({ id }) => (
                      <input
                        id={id}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="field-input"
                        placeholder="4-6 dígitos"
                      />
                    )}
                  </Field>
                  <Field label="Confirmar PIN">
                    {({ id }) => (
                      <input
                        id={id}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pinConfirm}
                        onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                        className="field-input"
                        placeholder="Repita o PIN"
                      />
                    )}
                  </Field>
                </div>
                <p className="text-[12px] text-text-mute">
                  Evite sequências simples como 1234 ou 0000.
                </p>
              </>
            )}
            <Field label="Senha atual">
              {({ id }) => (
                <input
                  id={id}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  placeholder="Confirme com sua senha"
                />
              )}
            </Field>
            {error && (
              <p className="rounded-md border border-expense/30 bg-expense/10 px-3 py-2 text-[13px] text-expense">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={pinEnabled ? handleDisablePin : handleSetPin}
                loading={busy}
                className="flex-1"
              >
                {pinEnabled ? 'Desativar PIN' : 'Salvar PIN'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setPinMode('idle');
                  setError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </Card>
        )}

        <Button variant="danger" onClick={logout} block>
          Sair da conta
        </Button>
      </div>
    </AppShell>
  );
}
