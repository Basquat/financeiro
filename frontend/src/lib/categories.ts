import type { Transaction } from '@/types';

/** The fixed category list (transaction form, monthly limits, OFX import). */
export const CATEGORIES = [
  'Mercado',
  'Alimentação',
  'Transporte',
  'Moradia',
  'Utilidades',
  'Saúde',
  'Lazer',
  'Streaming',
  'Educação',
  'Salário',
  'Outros',
];

/** Set by the backend on both legs of a transfer (incl. paying a credit card bill). */
export const TRANSFER = 'Transferência';

/** Transfers move money between your own accounts: not income, not spending. */
export const notTransfer = (t: Transaction) => t.category !== TRANSFER;
