import { api, tokenStore } from '@/lib/api';
import type { AuthResult, User } from '@/types';

export const authService = {
  /** only30Days: the session ends after 30 days; otherwise it stays open until logout. The device remembers the choice. */
  async login(email: string, password: string, only30Days = false): Promise<AuthResult> {
    const { data } = await api.post<AuthResult>('/auth/login', { email, password, only30Days });
    try {
      localStorage.setItem('financeiro.only30', only30Days ? '1' : '0');
    } catch {
      /* noop */
    }
    tokenStore.set(data.token);
    return data;
  },

  /** With e-mail verification on there is no token yet: null sends the user to the code step. */
  async register(name: string, email: string, password: string): Promise<AuthResult | null> {
    const { data } = await api.post<AuthResult & { verificationRequired?: boolean }>('/auth/register', { name, email, password });
    if (data.verificationRequired) return null;
    tokenStore.set(data.token);
    return data;
  },

  async verify(email: string, code: string): Promise<AuthResult> {
    const { data } = await api.post<AuthResult>('/auth/verify', { email, code });
    tokenStore.set(data.token);
    return data;
  },

  async forgot(email: string): Promise<void> {
    await api.post('/auth/forgot', { email });
  },

  async reset(email: string, code: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset', { email, code, newPassword });
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/users/me');
    return data;
  },

  async pinLogin(pin: string): Promise<AuthResult> {
    const email = localStorage.getItem('financeiro.pin_email') ?? '';
    const { data } = await api.post<AuthResult>('/auth/pin/login', { email, pin, only30Days: localStorage.getItem('financeiro.only30') === '1' });
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
