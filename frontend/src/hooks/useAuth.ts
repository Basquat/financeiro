import { useEffect } from 'react';
import { create } from 'zustand';
import { setUnauthorizedHandler, tokenStore } from '@/lib/api';
import { authService } from '@/services/authService';
import type { User } from '@/types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: Status;
  /** PIN gate: a stored token alone doesn't open the app when the account has a PIN. */
  unlocked: boolean;
  unlock: () => void;
  setUser: (user: User | null) => void;
  setStatus: (status: Status) => void;
  patchUser: (patch: Partial<User>) => void;
  logout: () => void;
}

const PIN_KEY = 'financeiro.pin_enabled';
export const pinOnDevice = () => {
  try {
    return localStorage.getItem(PIN_KEY) === 'true';
  } catch {
    return false;
  }
};
export const setPinOnDevice = (on: boolean) => {
  try {
    if (on) localStorage.setItem(PIN_KEY, 'true');
    else {
      localStorage.removeItem(PIN_KEY);
      localStorage.removeItem('financeiro.pin_email');
    }
  } catch {
    /* noop */
  }
};

const UNLOCK_KEY = 'financeiro.unlocked';
const readUnlocked = () => {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
};

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: tokenStore.get() ? 'loading' : 'anonymous',
  unlocked: readUnlocked(),
  unlock: () => {
    try {
      sessionStorage.setItem(UNLOCK_KEY, '1');
    } catch {
      /* noop */
    }
    set({ unlocked: true });
  },
  setUser: (user) => {
    // Profile edits while already inside the app must not lock the user out (e.g. right after enabling a PIN).
    if (useAuthStore.getState().status === 'authenticated') useAuthStore.getState().unlock();
    set({ user, status: user ? 'authenticated' : 'anonymous' });
    try {
      // The PIN is per device: only Profile turns it on here; the server can only turn it off (disabled/wiped).
      if (user && !user.pinEnabled) setPinOnDevice(false);
      // The PIN only unlocks this account, so the PIN screen needs to know which one.
      if (user && pinOnDevice()) localStorage.setItem('financeiro.pin_email', user.email);
    } catch {
      /* noop */
    }
  },
  setStatus: (status) => set({ status }),
  patchUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
  logout: () => {
    authService.logout();
    try {
      sessionStorage.removeItem(UNLOCK_KEY);
    } catch {
      /* noop */
    }
    // pin_enabled / pin_email stay: after a logout or an expired token this device still offers the PIN screen.
    set({ user: null, status: 'anonymous', unlocked: false });
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
  const { user, status, unlocked } = useAuthStore();
  return {
    user,
    status,
    isLocked: status === 'authenticated' && !!user?.pinEnabled && pinOnDevice() && !unlocked,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

export function useAuthActions() {
  const setUser = useAuthStore((s) => s.setUser);
  const patchUser = useAuthStore((s) => s.patchUser);
  const logout = useAuthStore((s) => s.logout);

  return {
    async login(email: string, password: string, only30Days = false) {
      const { user } = await authService.login(email, password, only30Days);
      useAuthStore.getState().unlock();
      setUser(user);
    },
    async register(name: string, email: string, password: string) {
      const res = await authService.register(name, email, password);
      if (!res) return false; // e-mail code still pending
      useAuthStore.getState().unlock();
      setUser(res.user);
      return true;
    },
    async verify(email: string, code: string) {
      const { user } = await authService.verify(email, code);
      useAuthStore.getState().unlock();
      setUser(user);
    },
    async pinLogin(pin: string) {
      const { user } = await authService.pinLogin(pin);
      useAuthStore.getState().unlock();
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

export { useAuthStore };
