import { api } from '@/lib/api';
import type { Account, AccountInput } from '@/types';

export const accountService = {
  async list(): Promise<Account[]> {
    const { data } = await api.get<Account[]>('/accounts');
    return data;
  },

  async create(input: AccountInput): Promise<Account> {
    const { data } = await api.post<Account>('/accounts', input);
    return data;
  },

  async update(id: number, input: AccountInput): Promise<Account> {
    const { data } = await api.put<Account>(`/accounts/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/accounts/${id}`);
  },
};
