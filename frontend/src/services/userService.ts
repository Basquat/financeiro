import { api, tokenStore } from '@/lib/api';
import type { BudgetSettings, User } from '@/types';

export const userService = {
  async updateSalary(salary: number): Promise<User> {
    const { data } = await api.put<User>('/users/me/salary', { salary });
    return data;
  },

  async updateAvatar(avatarUrl: string | null): Promise<User> {
    const { data } = await api.put<User>('/users/me/avatar', { avatarUrl });
    return data;
  },

  async updateBudget(settings: BudgetSettings): Promise<User> {
    const { data } = await api.put<User>('/users/me/budget', settings);
    return data;
  },

  /** Replaces all monthly limits; a category left out (or 0) has no limit. */
  async updateCategoryBudgets(limits: Record<string, number>): Promise<User> {
    const { data } = await api.put<User>('/users/me/category-budgets', limits);
    return data;
  },

  /** LGPD: everything stored about you, as JSON. */
  async exportData(): Promise<Blob> {
    const { data } = await api.get('/users/me/export', { responseType: 'blob' });
    return data as Blob;
  },

  async deleteAccount(password: string): Promise<void> {
    await api.post('/users/me/delete', { password });
  },

  async requestEmailChange(newEmail: string): Promise<string> {
    const { data } = await api.post<{ message: string }>('/users/me/email/request', { newEmail });
    return data.message;
  },

  async confirmEmailChange(code: string): Promise<{ user: User; message: string }> {
    const { data } = await api.post<{ user: User; token: string; message: string }>(
      '/users/me/email/confirm',
      { code },
    );
    tokenStore.set(data.token);
    return { user: data.user, message: data.message };
  },
};
