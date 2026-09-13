import { api } from '@/lib/api';
import type { Transaction, TransactionInput } from '@/types';

export const transactionService = {
  async list(userId: number): Promise<Transaction[]> {
    const { data } = await api.get<Transaction[]>(`/transactions/user/${userId}`);
    return data;
  },

  async balance(userId: number): Promise<number> {
    const { data } = await api.get<{ balance: number }>(`/transactions/balance/${userId}`);
    return data.balance ?? 0;
  },

  async create(input: TransactionInput): Promise<Transaction> {
    const { data } = await api.post<Transaction>('/transactions', input);
    return data;
  },

  async update(id: number, input: TransactionInput): Promise<Transaction> {
    const { data } = await api.put<Transaction>(`/transactions/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },
};
