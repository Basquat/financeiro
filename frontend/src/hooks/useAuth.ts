import { useEffect } from 'react';
import { create } from 'zustand';
import { setUnauthorizedHandler, tokenStore } from '@/lib/api';
import { authService } from '@/services/authService';
import type { User } from '@/types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: Status;
  setUser: (user: User | null) => void;
  setStatus: (status: Status) => void;
  patchUser: (patch: Partial<User>) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: tokenStore.get() ? 'loading' : 'anonymous',
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'anonymous' }),
  setStatus: (status) => set({ status }),
  patchUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
  logout: () => {
    authService.logout();
    set({ user: null, status: 'anonymous' });
  },
}));

/** Mount once near the root: restores the session from a stored token. */
export function useAuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    if (!tokenStore.get()) {
      setStatus('anonymous');
      return;
    }
    let alive = true;
    authService
      .me()
      .then((user) => alive && setUser(user))
      .catch(() => {
        if (!alive) return;
        tokenStore.clear();
        setStatus('anonymous');
      });
    return () => {
      alive = false;
    };
  }, [setUser, setStatus, logout]);
}

export function useAuth() {
  const { user, status } = useAuthStore();
  return {
    user,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

export function useAuthActions() {
  const setUser = useAuthStore((s) => s.setUser);
  const patchUser = useAuthStore((s) => s.patchUser);
  const logout = useAuthStore((s) => s.logout);

  return {
    async login(email: string, password: string) {
      const { user } = await authService.login(email, password);
      setUser(user);
    },
    async register(name: string, email: string, password: string) {
      const { user } = await authService.register(name, email, password);
      setUser(user);
    },
    patchUser,
    logout,
  };
}

export function useCurrentUser(): User {
  const user = useAuthStore((s) => s.user);
  if (!user) throw new Error('useCurrentUser used outside an authenticated tree');
  return user;
}
