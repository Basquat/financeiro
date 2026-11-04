import { api } from '@/lib/api';
import type { Recurring, RecurringInput } from '@/types';

export const recurringService = {
  async list(): Promise<Recurring[]> {
    const { data } = await api.get<Recurring[]>('/recurring');
    return data;
  },

  async create(input: RecurringInput): Promise<Recurring> {
    const { data } = await api.post<Recurring>('/recurring', input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/recurring/${id}`);
  },

  /** Books this month's occurrence as a regular transaction. */
  async post(id: number): Promise<void> {
    await api.post(`/recurring/${id}/post`);
  },
};
