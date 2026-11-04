import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthActions } from '@/hooks/useAuth';
import { apiError } from '@/lib/api';
import { downloadFile } from '@/lib/download';
import { userService } from '@/services/userService';
import { Field } from '@/components/ui/Field';
import { Button, Card } from '@/components/ui/primitives';

/** LGPD: take your data out, or delete the account (password required). */
export function PrivacyCard() {
  const { logout } = useAuthActions();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');

  async function exportData() {
    setExporting(true);
    try {
      downloadFile('meus-dados-financeplus.json', await userService.exportData());
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await userService.deleteAccount(password);
      toast.success('Conta excluída. Seus dados foram apagados.');
      logout();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="text-[15px] font-semibold text-text">Seus dados</p>
        <p className="mt-1 text-[13px] text-text-mute">
          Baixe tudo o que guardamos sobre você ou exclua sua conta de vez.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={exporting} onClick={() => void exportData()}>
          Baixar meus dados
        </Button>
        {!confirming && (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Excluir minha conta
          </Button>
        )}
      </div>
      {confirming && (
        <div className="space-y-3 rounded-md border border-expense/40 p-3">
          <p className="text-[13px] text-text">
            Isso apaga seus lançamentos, contas, metas e parcelamentos. Numa conta conjunta, a outra pessoa continua com a
            conta e com os lançamentos dela. Não dá para desfazer.
          </p>
          <Field label="Confirme sua senha">
            {({ id }) => (
              <input
                id={id}
                type="password"
                autoComplete="current-password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} disabled={!password} onClick={() => void deleteAccount()}>
              Excluir definitivamente
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
