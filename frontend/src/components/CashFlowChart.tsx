import { useEffect, useMemo, useRef, useState } from 'react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { money, monthKey } from '@/lib/format';
import type { Transaction } from '@/types';

// Series colors are the chart-in/chart-out tokens (index.css), validated per theme with the dataviz
// validator: light pair CVD ΔE 7.9 (legend + fixed order as secondary encoding), dark pair all-pass.

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/** 1/2/5 × 10^n ceiling so the axis reads in round numbers. */
function niceMax(v: number): number {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/** Bar with 4px rounded top, flat on the baseline. */
function barPath(x: number, y: number, w: number, base: number): string {
  const h = base - y;
  if (h <= 0) return '';
  const r = Math.min(4, h, w / 2);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${base}Z`;
}

const H = 220;
const PAD_L = 44;
const PAD_B = 26;
const PAD_T = 8;
const BAR = 14;

export function CashFlowChart({ transactions, months = 6 }: { transactions: Transaction[]; months?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw in real pixels so labels keep their size on phones.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const now = new Date();
    const rows = Array.from({ length: months }, (_, i) => {
      const d = subMonths(now, months - 1 - i);
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM', { locale: ptBR }), income: 0, expense: 0 };
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    for (const tx of transactions) {
      const row = byKey.get(monthKey(tx.transactionDate));
      if (!row) continue;
      if (tx.amount > 0) row.income += tx.amount;
      else row.expense += Math.abs(tx.amount);
    }
    return rows;
  }, [transactions, months]);

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense))));
  const base = H - PAD_B;
  const y = (v: number) => base - (v / max) * (base - PAD_T);
  const slot = (W - PAD_L) / data.length;
  const active = hover == null ? null : data[hover];

  return (
    <div className="relative" ref={box}>
      <div className="mb-3 flex items-center gap-4 text-[12px] text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-in"  /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-out"  /> Gastos
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label="Entradas e gastos dos últimos meses">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W} y1={y(max * t)} y2={y(max * t)} className="stroke-line-soft" strokeDasharray={t ? '3 4' : undefined} />
            <text x={PAD_L - 8} y={y(max * t) + 4} textAnchor="end" className="fill-text-mute text-[11px]">
              {compact.format(max * t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD_L + slot * i + slot / 2;
          const dim = hover != null && hover !== i;
          return (
            <g key={d.key} opacity={dim ? 0.35 : 1} className="transition-opacity">
              <path d={barPath(cx - BAR - 1, y(d.income), BAR, base)} className="fill-chart-in" />
              <path d={barPath(cx + 1, y(d.expense), BAR, base)} className="fill-chart-out" />
              <text x={cx} y={H - 6} textAnchor="middle" className="fill-text-mute text-[11px] capitalize">
                {d.label}
              </text>
              {/* hit target wider than the marks */}
              <rect
                x={PAD_L + slot * i}
                y={0}
                width={slot}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              />
            </g>
          );
        })}
      </svg>

      {active && hover != null && (
        <div
          className="pointer-events-none absolute top-8 z-10 w-44 -translate-x-1/2 rounded-md border border-line bg-surface p-3 text-[12px] shadow-pop"
          style={{ left: `${((PAD_L + slot * hover + slot / 2) / W) * 100}%` }}
        >
          <p className="mb-1.5 font-semibold capitalize text-text">{active.label}</p>
          <p className="flex justify-between text-text-dim">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-chart-in"  />
              Entradas
            </span>
            <span className="amount text-text">{money(active.income)}</span>
          </p>
          <p className="mt-1 flex justify-between text-text-dim">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-chart-out"  />
              Gastos
            </span>
            <span className="amount text-text">{money(active.expense)}</span>
          </p>
          <p className="mt-2 flex justify-between border-t border-line-soft pt-2 text-text-dim">
            Saldo <span className="amount font-medium text-text">{money(active.income - active.expense)}</span>
          </p>
        </div>
      )}

      <table className="sr-only">
        <caption>Entradas e gastos por mês</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th>{d.label}</th>
              <td>Entradas {money(d.income)}</td>
              <td>Gastos {money(d.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
