import { api } from '@/lib/api';
import type { ImportRow } from '@/types';

export const importService = {
  /** Parses an OFX statement (base64) and flags rows already in the account. Writes nothing. */
  async previewOfx(accountId: number, data: string): Promise<ImportRow[]> {
    const res = await api.post<{ rows: ImportRow[] }>('/import/ofx', { accountId, data });
    return res.data.rows;
  },

  async commit(accountId: number, rows: ImportRow[]): Promise<number> {
    const res = await api.post<{ imported: number }>('/import/commit', { accountId, rows });
    return res.data.imported;
  },
};
