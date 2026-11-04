import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAccounts } from '@/hooks/useData';
import { apiError } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { shortDate, signedMoney } from '@/lib/format';
import { importService } from '@/services/importService';
import type { ImportRow } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Field } from '@/components/ui/Field';
import { Button, Card, EmptyState, cx } from '@/components/ui/primitives';

interface Pick extends ImportRow {
  selected: boolean;
}

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function Importar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const accounts = useAccounts().data ?? [];
  const [accountId, setAccountId] = useState<number | ''>('');
  const [rows, setRows] = useState<Pick[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const account = accountId || accounts[0]?.id;

  async function onFile(file: File | undefined) {
    if (!file || !account) return;
    setLoading(true);
    try {
      const preview = await importService.previewOfx(account, await readBase64(file));
      setRows(preview.map((r) => ({ ...r, selected: !r.duplicate })));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  function patch(i: number, change: Partial<Pick>) {
    setRows((prev) => prev && prev.map((r, j) => (j === i ? { ...r, ...change } : r)));
  }

  const chosen = rows?.filter((r) => r.selected) ?? [];

  async function commit() {
    if (!account || chosen.length === 0) return;
    setSaving(true);
    try {
      const n = await importService.commit(account, chosen);
      toast.success(`${n} lançamentos importados`);
      void qc.invalidateQueries();
      navigate('/transactions');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Importar extrato" eyebrow="Arquivo OFX do seu banco">
      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <p className="text-[13px] text-text-mute">
            No app ou site do banco, exporte o extrato em <span className="font-medium text-text">OFX</span>. Você revisa
            tudo antes de importar; o que já existe na conta vem desmarcado.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Conta">
              {({ id }) => (
                <select
                  id={id}
                  className="field-input"
                  value={account ?? ''}
                  onChange={(e) => {
                    setAccountId(Number(e.target.value));
                    setRows(null);
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Arquivo">
              {({ id }) => (
                <label
                  htmlFor={id}
                  className={cx(
                    'field-input flex cursor-pointer items-center gap-2 text-text-dim',
                    (!account || loading) && 'pointer-events-none opacity-50',
                  )}
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {loading ? 'Lendo…' : 'Escolher arquivo .ofx'}
                  <input
                    id={id}
                    type="file"
                    accept=".ofx,.OFX,application/x-ofx"
                    className="sr-only"
                    onChange={(e) => {
                      void onFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </Field>
          </div>
          {accounts.length === 0 && <p className="text-[12px] text-text-mute">Crie uma conta antes, na aba Contas.</p>}
        </Card>

        {rows && rows.length === 0 && <EmptyState title="Nada para importar" />}

        {rows && rows.length > 0 && (
          <>
            <Card className="divide-y divide-line-soft px-4">
              {rows.map((r, i) => (
                <div key={i} className={cx('flex items-center gap-3 py-2.5', !r.selected && 'opacity-50')}>
                  <input
                    type="checkbox"
                    aria-label={`Importar ${r.title}`}
                    checked={r.selected}
                    onChange={(e) => patch(i, { selected: e.target.checked })}
                    className="h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-text">{r.title}</p>
                    <p className="text-[12px] text-text-mute">
                      {shortDate(r.date)}
                      {r.duplicate && <span className="ml-1.5 text-expense">· já existe</span>}
                    </p>
                  </div>
                  <select
                    aria-label="Categoria"
                    className="hidden rounded-md border border-line bg-surface px-2 py-1 text-[13px] text-text sm:block"
                    value={r.category}
                    onChange={(e) => patch(i, { category: e.target.value })}
                  >
                    {[...new Set([r.category, ...CATEGORIES])].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <span className={cx('amount w-28 shrink-0 text-right text-[14px]', r.amount > 0 ? 'text-income' : 'text-text')}>
                    {signedMoney(r.amount)}
                  </span>
                </div>
              ))}
            </Card>
            <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4">
              <Button block loading={saving} disabled={chosen.length === 0} onClick={() => void commit()}>
                Importar {chosen.length} {chosen.length === 1 ? 'lançamento' : 'lançamentos'}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
