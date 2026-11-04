import type { Transaction } from '@/types';

/** Saves a file from the browser. ponytail: plain <a download>; the Android app needs the Filesystem plugin for this. */
export function downloadFile(name: string, data: Blob | string, type = 'text/plain') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Excel pt-BR friendly: `;` separator, comma decimals, BOM so accents survive. */
export function transactionsCsv(list: Transaction[]): string {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = list.map((t) =>
    [
      t.transactionDate.slice(0, 10),
      cell(t.title),
      cell(t.category),
      cell(t.account?.name ?? ''),
      t.amount.toFixed(2).replace('.', ','),
    ].join(';'),
  );
  return '﻿' + ['Data;Descrição;Categoria;Conta;Valor', ...lines].join('\r\n');
}
