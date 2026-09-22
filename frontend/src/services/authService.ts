import { api, tokenStore } from '@/lib/api';
import type { AuthResult, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const { data } = await api.post<AuthResult>('/auth/login', { email, password });
    tokenStore.set(data.token);
    return data;
  },

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    const { data } = await api.post<AuthResult>('/auth/register', { name, email, password });
    tokenStore.set(data.token);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/users/me');
    return data;
  },

  logout() {
    tokenStore.clear();
  },
};
