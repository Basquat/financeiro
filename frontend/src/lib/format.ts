import { format, isThisYear, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** "R$ 1.234,56" — always with the sign folded in by the caller if needed. */
export function money(value: number | null | undefined): string {
  return brl.format(value ?? 0);
}

/** Amount for a ledger row: "+ R$ 200,00" / "− R$ 45,90". */
export function signedMoney(value: number): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign} ${brl.format(Math.abs(value))}`;
}

export function toDate(iso: string): Date {
  return iso.length <= 10 ? parseISO(`${iso}T00:00:00`) : parseISO(iso);
}

/** Relative day label used in the ledger date gutter. */
export function dayLabel(iso: string): string {
  const d = toDate(iso);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, isThisYear(d) ? "d 'de' MMM" : "d MMM yyyy", { locale: ptBR });
}

export function shortDate(iso: string): string {
  return format(toDate(iso), "dd/MM/yyyy", { locale: ptBR });
}

export function monthKey(iso: string): string {
  return format(toDate(iso), 'yyyy-MM');
}

/** ISO LocalDateTime the backend accepts, from an <input type="date"> value. */
export function dateInputToIso(dateValue: string): string {
  if (!dateValue) return new Date().toISOString().slice(0, 19);
  return `${dateValue}T12:00:00`;
}

export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || '—';
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
