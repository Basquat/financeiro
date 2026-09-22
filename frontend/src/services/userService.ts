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
