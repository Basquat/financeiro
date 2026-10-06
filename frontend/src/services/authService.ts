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

  async pinLogin(pin: string): Promise<AuthResult> {
    const { data } = await api.post<AuthResult>('/auth/pin/login', { pin });
    tokenStore.set(data.token);
    return data;
  },

  async setPin(currentPassword: string, pin: string): Promise<AuthResult> {
    const { data } = await api.post<{ user: User; message: string }>('/auth/pin/set', { currentPassword, pin });
    return { user: data.user, token: tokenStore.get() || '' };
  },

  async disablePin(currentPassword: string): Promise<AuthResult> {
    const { data } = await api.delete('/auth/pin', { data: { currentPassword } });
    return { user: (data as { user: User }).user, token: tokenStore.get() || '' };
  },

  logout() {
    tokenStore.clear();
  },
};
