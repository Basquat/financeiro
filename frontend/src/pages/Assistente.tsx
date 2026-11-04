import {
  ArrowUpIcon,
  Cog6ToothIcon,
  PaperClipIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Field } from '@/components/ui/Field';
import { Loading, LoadError } from '@/components/ui/Async';
import { Button, Card, EmptyState, IconButton, Pill, cx } from '@/components/ui/primitives';
import { useCurrentUser } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useData';
import { useUi } from '@/hooks/useUi';
import { apiError } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import { assistantService } from '@/services/assistantService';
import type { Account, AssistantAction, AssistantSettings, ChatAttachment, ChatTurn } from '@/types';

type ActionStatus = 'pending' | 'done' | 'dismissed' | 'error';

interface CardAction extends AssistantAction {
  status: ActionStatus;
  note?: string;
}

interface Item {
  role: 'user' | 'assistant';
  content: string;
  file?: string;
  error?: boolean;
  actions?: CardAction[];
}

const SETTINGS_KEY = ['assistant-settings'] as const;
const MAX_ITEMS = 40;
const MAX_FILE = 8 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';
const MONTH_SUMMARY = 'Me dá um resumo do meu mês';
const SUGGESTIONS = [
  MONTH_SUMMARY,
  'Quanto sobra do meu salário este mês?',
  'Onde estou gastando mais?',
  'Lança um gasto de R$ 50 no mercado hoje',
];

const STATUS_TEXT: Record<ActionStatus, string> = {
  pending: 'aguardando confirmação',
  done: 'confirmado e feito',
  dismissed: 'descartado pelo usuário',
  error: 'falhou',
};

const FIELD_LABELS: Record<string, string> = {
  id: 'Registro',
  title: 'Título',
  amount: 'Valor',
  transactionDate: 'Data',
  type: 'Tipo',
  category: 'Categoria',
  accountId: 'Conta',
  installmentCurrent: 'Parcela',
  installmentTotal: 'Total de parcelas',
  name: 'Nome',
  isJoint: 'Conjunta',
  totalAmount: 'Valor total',
  remainingAmount: 'Restante',
  installmentsLeft: 'Parcelas restantes',
  dueDate: 'Vencimento',
  targetAmount: 'Objetivo',
  deadline: 'Prazo',
  icon: 'Ícone',
  salary: 'Salário',
  housingCost: 'Moradia',
  householdSize: 'Pessoas na casa',
  paysFood: 'Paga alimentação',
  foodPerPerson: 'Alimentação por pessoa',
  emergencySaved: 'Reserva guardada',
  usesHouseholdIncome: 'Soma a renda compartilhada',
  creditCard: 'Cartão de crédito',
  closingDay: 'Fecha dia',
  dueDay: 'Vence dia',
  dayOfMonth: 'Todo dia',
  fromAccountId: 'De',
  toAccountId: 'Para',
  date: 'Data',
  limites: 'Limites mensais',
};
const MONEY_FIELDS = new Set([
  'amount', 'totalAmount', 'remainingAmount', 'targetAmount',
  'salary', 'housingCost', 'foodPerPerson', 'emergencySaved',
]);
const DATE_FIELDS = new Set(['transactionDate', 'dueDate', 'deadline']);

function fieldValue(key: string, value: unknown, accounts: Account[]): string {
  if (value === null || value === undefined || value === '') return '—';
  if (MONEY_FIELDS.has(key)) return money(Math.abs(Number(value)));
  if (DATE_FIELDS.has(key)) return shortDate(String(value));
  if (key === 'accountId' || key === 'fromAccountId' || key === 'toAccountId') {
    return accounts.find((a) => a.id === Number(value))?.name ?? `#${value}`;
  }
  if (key === 'limites' && typeof value === 'object') {
    return Object.entries(value as Record<string, number>)
      .map(([cat, limit]) => (Number(limit) > 0 ? `${cat} ${money(Number(limit))}` : `${cat}: sem limite`))
      .join(' · ');
  }
  if (key === 'type') return value === 'INCOME' ? 'Entrada' : 'Saída';
  if (key === 'id') return `#${value}`;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/* ---------- conversation storage (this device only) ---------- */

const storeKey = (uid: number) => `financeiro.chat.${uid}`;

function loadItems(uid: number): Item[] {
  try {
    return JSON.parse(localStorage.getItem(storeKey(uid)) ?? '[]') as Item[];
  } catch {
    return [];
  }
}

function saveItems(uid: number, items: Item[]) {
  try {
    localStorage.setItem(storeKey(uid), JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* storage unavailable — the chat just isn't kept */
  }
}

/** What the model sees: its replies plus what happened to each card it proposed. Errors stay out. */
function toTurns(items: Item[]): ChatTurn[] {
  return items
    .filter((i) => !i.error)
    .map((i) => ({
      role: i.role,
      content: i.actions?.length
        ? `${i.content}\n${i.actions.map((a) => `(${a.label}: ${STATUS_TEXT[a.status]})`).join('\n')}`
        : i.content,
    }));
}

async function toAttachment(file: File): Promise<ChatAttachment> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  // some Android pickers leave file.type empty
  const mediaType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  return { name: file.name, mediaType, data };
}

/* ---------- setup ---------- */

function Setup({ settings, onDone }: { settings: AssistantSettings; onDone?: () => void }) {
  const qc = useQueryClient();
  const listId = useId();
  const [provider, setProvider] = useState(settings.provider ?? settings.providers[0]?.id ?? '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(settings.model ?? '');
  const [notes, setNotes] = useState(settings.notes ?? '');
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);

  // a saved key belongs to the saved provider
  const keySaved = settings.hasKey && provider === settings.provider;

  async function loadModels() {
    setLoadingModels(true);
    try {
      const list = await assistantService.models(provider, apiKey.trim() || undefined);
      setModels(list);
      toast.success(`${list.length} modelos disponíveis`);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoadingModels(false);
    }
  }

  async function save(removeKey = false) {
    if (!removeKey && !keySaved && !apiKey.trim()) {
      toast.error('Cole a chave da API do provedor.');
      return;
    }
    if (!removeKey && !model.trim()) {
      toast.error('Escolha um modelo.');
      return;
    }
    setSaving(true);
    try {
      const saved = await assistantService.saveSettings({
        provider,
        model: model.trim(),
        apiKey: removeKey ? '' : apiKey.trim() || null,
        notes,
      });
      qc.setQueryData(SETTINGS_KEY, saved);
      setApiKey('');
      toast.success(removeKey ? 'Chave removida' : 'Assistente configurado');
      if (!removeKey) onDone?.();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save();
  }

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <p className="font-display text-[18px] font-semibold text-text">Configurar assistente</p>
          <p className="mt-1 text-[13px] text-text-mute">
            Use a chave de API do provedor que preferir. Ela fica cifrada no servidor e só é usada nas suas
            conversas; o que você envia ao assistente segue a política de dados do provedor.
          </p>
        </div>

        <Field label="Provedor">
          {({ id }) => (
            <select
              id={id}
              className="field-input"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setModels([]);
              }}
            >
              {settings.providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          label="Chave da API"
          hint={keySaved ? `Chave salva (${settings.keyHint}). Deixe em branco para manter.` : undefined}
        >
          {({ id }) => (
            <input
              id={id}
              type="password"
              autoComplete="off"
              className="field-input"
              placeholder={keySaved ? '••••••••' : 'Cole sua chave aqui'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          )}
        </Field>

        <Field label="Modelo" hint="Carregue a lista do provedor ou digite o nome do modelo.">
          {({ id }) => (
            <div className="flex gap-2">
              <input
                id={id}
                list={listId}
                className="field-input"
                placeholder="ex.: nome-do-modelo"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <datalist id={listId}>
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <Button
                type="button"
                variant="secondary"
                loading={loadingModels}
                disabled={!keySaved && !apiKey.trim()}
                onClick={() => void loadModels()}
                className="shrink-0"
              >
                Carregar
              </Button>
            </div>
          )}
        </Field>

        <Field label="O que o assistente sabe sobre você" hint="Ele anota aqui o que você conta. Pode editar.">
          {({ id }) => (
            <textarea
              id={id}
              rows={4}
              className="field-input resize-y"
              placeholder="- recebo dia 5&#10;- vale-refeição de R$ 800"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
          {onDone && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancelar
            </Button>
          )}
          {settings.hasKey && (
            <Button type="button" variant="ghost" className="ml-auto" onClick={() => void save(true)}>
              Remover chave
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

/* ---------- telegram ---------- */

function TelegramConnect() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['telegram-status'], queryFn: assistantService.telegramStatus });
  const [link, setLink] = useState<{ code: string; link: string } | null>(null);

  if (!status.data?.enabled) return null; // server has no bot configured

  async function connect() {
    try {
      const res = await assistantService.telegramLink();
      setLink(res);
      if (res.link) window.open(res.link, '_blank', 'noopener');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function disconnect() {
    await assistantService.telegramUnlink();
    setLink(null);
    void qc.invalidateQueries({ queryKey: ['telegram-status'] });
  }

  return (
    <Card className="mt-4 space-y-3 p-4 sm:p-5">
      <div>
        <p className="text-[15px] font-semibold text-text">Telegram</p>
        <p className="mt-1 text-[13px] text-text-mute">
          Converse com o assistente pelo Telegram: mande gastos, perguntas ou foto do comprovante.
        </p>
      </div>
      {status.data.linked ? (
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[13px] text-income">Conectado ✓</p>
          <Button variant="ghost" onClick={() => void disconnect()}>
            Desconectar
          </Button>
        </div>
      ) : link ? (
        <p className="text-[13px] text-text-dim">
          {link.link ? (
            <>
              Abra <a className="font-medium text-brand underline" href={link.link} target="_blank" rel="noreferrer">o bot</a> e
              toque em Iniciar.
            </>
          ) : (
            <>Envie para o bot:</>
          )}{' '}
          Código: <span className="amount font-medium text-text">/start {link.code}</span> (vale 10 minutos).{' '}
          <button className="font-medium text-brand underline" onClick={() => void status.refetch()}>
            Já conectei
          </button>
        </p>
      ) : (
        <Button variant="secondary" onClick={() => void connect()}>
          Conectar Telegram
        </Button>
      )}
    </Card>
  );
}

/* ---------- action card ---------- */

function ActionCard({
  action,
  accounts,
  busy,
  onConfirm,
  onDismiss,
}: {
  action: CardAction;
  accounts: Account[];
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const destructive = action.tool.startsWith('excluir');
  const open = action.status === 'pending' || action.status === 'error';
  return (
    <div className={cx('rounded-lg border bg-surface p-3.5', destructive ? 'border-expense/40' : 'border-line')}>
      <p className="eyebrow">{action.label}</p>
      {/* every argument is shown: the user confirms exactly what will run */}
      <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-[13px]">
        {Object.entries(action.args ?? {}).map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-text-mute">{FIELD_LABELS[key] ?? key}</dt>
            <dd className={cx('text-right text-text', MONEY_FIELDS.has(key) && 'amount')}>
              {fieldValue(key, value, accounts)}
            </dd>
          </Fragment>
        ))}
      </dl>
      {action.status === 'error' && <p className="mt-2 text-[12px] text-expense">{action.note}</p>}
      {open ? (
        <div className="mt-3 flex gap-2">
          <Button variant={destructive ? 'danger' : 'primary'} loading={busy} onClick={onConfirm} className="flex-1">
            {destructive ? 'Excluir' : 'Confirmar'}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onDismiss}>
            Descartar
          </Button>
        </div>
      ) : (
        <p className={cx('mt-2 text-[12px] font-medium', action.status === 'done' ? 'text-income' : 'text-text-mute')}>
          {action.status === 'done' ? '✓ Feito' : 'Descartado'}
        </p>
      )}
    </div>
  );
}

/* ---------- chat ---------- */

function Chat({ userId, settings, onConfigure }: { userId: number; settings: AssistantSettings; onConfigure: () => void }) {
  const qc = useQueryClient();
  const accounts = useAccounts().data ?? [];
  const askConfirm = useUi((s) => s.askConfirm);
  const [items, setItems] = useState<Item[]>(() => loadItems(userId));
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveItems(userId, items);
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items, userId]);

  const providerLabel = settings.providers.find((p) => p.id === settings.provider)?.label ?? settings.provider;

  async function send(content = text) {
    const body = content.trim();
    if ((!body && !file) || sending) return;
    if (file && file.size > MAX_FILE) {
      toast.error('Arquivo muito grande (máx. 8 MB).');
      return;
    }
    let attachment: ChatAttachment | undefined;
    try {
      attachment = file ? await toAttachment(file) : undefined;
    } catch {
      toast.error('Não consegui ler o arquivo.');
      return;
    }
    const next: Item[] = [...items, { role: 'user', content: body || 'Analise o anexo.', file: file?.name }];
    setItems(next);
    setText('');
    setFile(null);
    setSending(true);
    try {
      const res = await assistantService.chat(toTurns(next), attachment);
      setItems([
        ...next,
        { role: 'assistant', content: res.reply, actions: res.actions.map((a) => ({ ...a, status: 'pending' })) },
      ]);
    } catch (err) {
      setItems([...next, { role: 'assistant', content: apiError(err), error: true }]);
    } finally {
      setSending(false);
    }
  }

  function patchAction(itemIdx: number, actionIdx: number, patch: Partial<CardAction>) {
    setItems((prev) =>
      prev.map((it, i) =>
        i !== itemIdx ? it : { ...it, actions: it.actions?.map((a, j) => (j === actionIdx ? { ...a, ...patch } : a)) },
      ),
    );
  }

  async function confirm(itemIdx: number, actionIdx: number, action: CardAction) {
    setBusyKey(`${itemIdx}-${actionIdx}`);
    try {
      const message = await assistantService.execute(action);
      patchAction(itemIdx, actionIdx, { status: 'done', note: undefined });
      toast.success(message);
      void qc.invalidateQueries();
    } catch (err) {
      patchAction(itemIdx, actionIdx, { status: 'error', note: apiError(err) });
    } finally {
      setBusyKey(null);
    }
  }

  function clear() {
    askConfirm({
      title: 'Limpar conversa?',
      body: 'Apaga o histórico deste aparelho. Seus lançamentos não são afetados.',
      confirmLabel: 'Limpar',
      danger: true,
      onConfirm: () => setItems([]),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] text-text-mute">
          {providerLabel} · <span className="text-text-dim">{settings.model}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {items.length > 0 && (
            <Pill disabled={sending} onClick={() => void send(MONTH_SUMMARY)}>
              Resumo do mês
            </Pill>
          )}
          {items.length > 0 && (
            <IconButton label="Limpar conversa" onClick={clear}>
              <TrashIcon className="h-5 w-5" />
            </IconButton>
          )}
          <IconButton label="Configurar assistente" onClick={onConfigure}>
            <Cog6ToothIcon className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Pergunte sobre o seu dinheiro"
          art={<SparklesIcon className="mx-auto h-full text-brand" />}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Pill key={s} onClick={() => void send(s)}>
                  {s}
                </Pill>
              ))}
            </div>
          }
        >
          Ele conhece seu salário, contas, metas e lançamentos. Anexe um comprovante (PDF ou foto) e ele prepara o
          lançamento para você confirmar.
        </EmptyState>
      ) : (
        <ul className="space-y-3" aria-live="polite">
          {items.map((item, i) => (
            <li key={i} className={cx('flex flex-col gap-2', item.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cx(
                  'max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-[14px] leading-relaxed',
                  item.role === 'user'
                    ? 'bg-brand text-canvas'
                    : item.error
                      ? 'border border-expense/40 bg-surface text-expense'
                      : 'border border-line bg-surface text-text',
                )}
              >
                {item.file && <p className="mb-1 text-[12px] opacity-80">📎 {item.file}</p>}
                {item.content}
              </div>
              {item.actions?.map((action, j) => (
                <div key={j} className="w-full max-w-[85%]">
                  <ActionCard
                    action={action}
                    accounts={accounts}
                    busy={busyKey === `${i}-${j}`}
                    onConfirm={() => void confirm(i, j, action)}
                    onDismiss={() => patchAction(i, j, { status: 'dismissed' })}
                  />
                </div>
              ))}
            </li>
          ))}
          {sending && (
            <li className="flex items-center gap-2 text-[13px] text-text-mute">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              Pensando…
            </li>
          )}
        </ul>
      )}
      <div ref={endRef} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4"
      >
        <Card className="p-2">
          {file && (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-1.5 text-[13px] text-text-dim">
              <PaperClipIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="ml-auto rounded focus-ring"
                aria-label="Remover anexo"
                onClick={() => setFile(null)}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-1">
            <IconButton type="button" label="Anexar comprovante" onClick={() => fileRef.current?.click()}>
              <PaperClipIcon className="h-5 w-5" />
            </IconButton>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <textarea
              rows={1}
              aria-label="Mensagem para o assistente"
              className="max-h-40 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-text outline-none placeholder:text-text-mute"
              placeholder="Mensagem ou comprovante…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <IconButton
              type="submit"
              label="Enviar"
              disabled={sending || (!text.trim() && !file)}
              className="bg-brand text-canvas hover:bg-brand-bright hover:text-canvas disabled:opacity-40"
            >
              <ArrowUpIcon className="h-5 w-5" />
            </IconButton>
          </div>
        </Card>
      </form>
    </div>
  );
}

/* ---------- page ---------- */

export default function Assistente() {
  const user = useCurrentUser();
  const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: assistantService.settings });
  const [editing, setEditing] = useState(false);

  const s = settings.data;
  const ready = !!s && s.hasKey && !!s.provider && !!s.model;

  return (
    <AppShell title="Assistente">
      {settings.isLoading ? (
        <Loading />
      ) : settings.isError || !s ? (
        <LoadError error={settings.error} onRetry={() => void settings.refetch()} />
      ) : ready && !editing ? (
        <Chat userId={user.id} settings={s} onConfigure={() => setEditing(true)} />
      ) : (
        <>
          <Setup settings={s} onDone={ready ? () => setEditing(false) : undefined} />
          {ready && <TelegramConnect />}
        </>
      )}
    </AppShell>
  );
}
