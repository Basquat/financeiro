import { api } from '@/lib/api';
import type { SharedGoal, SharedGoalInput } from '@/types';

export const sharedGoalService = {
  async list(): Promise<SharedGoal[]> {
    const { data } = await api.get<SharedGoal[]>('/shared-goals');
    return data;
  },

  async create(input: SharedGoalInput): Promise<SharedGoal> {
    const { data } = await api.post<SharedGoal>('/shared-goals', input);
    return data;
  },

  async update(id: number, input: SharedGoalInput): Promise<SharedGoal> {
    const { data } = await api.put<SharedGoal>(`/shared-goals/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/shared-goals/${id}`);
  },

  async contribute(goalId: number, amount: number): Promise<SharedGoal> {
    const { data } = await api.put<SharedGoal>(`/shared-goals/${goalId}/contribute`, null, {
      params: { amount },
    });
    return data;
  },
};
