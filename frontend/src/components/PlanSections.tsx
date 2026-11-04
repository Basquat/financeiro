import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuth, useAuthStore } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useData';
import { apiError } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { money } from '@/lib/format';
import { recurringService } from '@/services/recurringService';
import { userService } from '@/services/userService';
import type { TransactionType } from '@/types';
import { RECURRING_KEY } from '@/components/MonthCards';
import { Field, MoneyInput, parseAmount } from '@/components/ui/Field';
import { Button, Card, EmptyState, IconButton, Pill } from '@/components/ui/primitives';

const SPENDING = CATEGORIES.filter((c) => c !== 'Salário');

/** Monthly limit per category; blank = no limit. */
export function CategoryLimits() {
  const { user } = useAuth();
  const setUser = useAuthStore((s) => s.setUser);
  const current = user?.categoryBudgets ?? {};
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(SPENDING.map((c) => [c, current[c] ? String(current[c]).replace('.', ',') : ''])),
  );
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const limits: Record<string, number> = {};
    for (const [category, raw] of Object.entries(values)) {
      const n = parseAmount(raw);
      if (Number.isFinite(n) && n > 0) limits[category] = n;
    }
    setSaving(true);
    try {
      setUser(await userService.updateCategoryBudgets(limits));
      toast.success('Limites salvos');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={save} className="space-y-4">
        <div>
          <p className="text-[15px] font-semibold text-text">Quanto você quer gastar por mês?</p>
          <p className="mt-1 text-[13px] text-text-mute">Deixe em branco as categorias sem limite. O Início mostra o quanto já foi.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SPENDING.map((category) => (
            <Field key={category} label={category}>
              {({ id }) => (
                <MoneyInput
                  id={id}
                  value={values[category] ?? ''}
                  placeholder="sem limite"
                  onChange={(v) => setValues((prev) => ({ ...prev, [category]: v }))}
                />
              )}
            </Field>
          ))}
        </div>
        <Button type="submit" loading={saving}>
          Salvar limites
        </Button>
      </form>
    </Card>
  );
}

/** Bills and incomes that repeat every month. */
export function RecurringManager() {
  const qc = useQueryClient();
  const accounts = useAccounts().data ?? [];
  const recurring = useQuery({ queryKey: RECURRING_KEY, queryFn: recurringService.list });
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [category, setCategory] = useState('Moradia');
  const [day, setDay] = useState('5');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const account = accountId || accounts[0]?.id;

  async function add(e: FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!title.trim() || !(value > 0) || !account) {
      toast.error('Preencha descrição, valor e conta.');
      return;
    }
    setSaving(true);
    try {
      await recurringService.create({
        title: title.trim(),
        amount: value,
        type,
        category: type === 'INCOME' && category === 'Moradia' ? 'Salário' : category,
        dayOfMonth: Math.min(31, Math.max(1, Number(day) || 1)),
        accountId: account,
      });
      setTitle('');
      setAmount('');
      toast.success('Conta fixa cadastrada');
      void qc.invalidateQueries({ queryKey: RECURRING_KEY });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    try {
      await recurringService.remove(id);
      void qc.invalidateQueries({ queryKey: RECURRING_KEY });
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const list = recurring.data ?? [];

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <EmptyState title="Nenhuma conta fixa">
          Aluguel, salário, internet, assinaturas: cadastre uma vez e lance todo mês com um toque no Início.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line-soft px-5">
          {list.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-text">{r.title}</p>
                <p className="text-[12px] text-text-mute">
                  todo dia {r.dayOfMonth} · {r.category} · {r.accountName}
                </p>
              </div>
              <span className={`amount shrink-0 text-[14px] ${r.type === 'INCOME' ? 'text-income' : 'text-text'}`}>
                {r.type === 'INCOME' ? '+' : '−'} {money(r.amount)}
              </span>
              <IconButton label={`Excluir ${r.title}`} onClick={() => void remove(r.id)}>
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-5">
        <form onSubmit={add} className="space-y-4">
          <p className="text-[15px] font-semibold text-text">Nova conta fixa</p>
          <div className="flex gap-2">
            <Pill type="button" active={type === 'EXPENSE'} onClick={() => setType('EXPENSE')}>
              Saída
            </Pill>
            <Pill type="button" active={type === 'INCOME'} onClick={() => setType('INCOME')}>
              Entrada
            </Pill>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Descrição">
              {({ id }) => (
                <input id={id} className="field-input" placeholder="Aluguel, Netflix, Salário…" value={title}
                  onChange={(e) => setTitle(e.target.value)} />
              )}
            </Field>
            <Field label="Valor">{({ id }) => <MoneyInput id={id} value={amount} onChange={setAmount} />}</Field>
            <Field label="Categoria">
              {({ id }) => (
                <select id={id} className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Dia do mês">
              {({ id }) => (
                <input id={id} type="number" min={1} max={31} inputMode="numeric" className="field-input" value={day}
                  onChange={(e) => setDay(e.target.value)} />
              )}
            </Field>
            <Field label="Conta">
              {({ id }) => (
                <select id={id} className="field-input" value={account ?? ''} onChange={(e) => setAccountId(Number(e.target.value))}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <Button type="submit" loading={saving} disabled={accounts.length === 0}>
            Adicionar
          </Button>
          {accounts.length === 0 && <p className="text-[12px] text-text-mute">Crie uma conta antes, na aba Contas.</p>}
        </form>
      </Card>
    </div>
  );
}
