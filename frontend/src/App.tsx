import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth, useAuthBootstrap } from '@/hooks/useAuth';
import { ModalHost } from '@/components/modals/ModalHost';
import { Spinner } from '@/components/ui/primitives';
import Accounts from '@/pages/Accounts';
import Assistente from '@/pages/Assistente';
import Dashboard from '@/pages/Dashboard';
import Importar from '@/pages/Importar';
import Legal from '@/pages/Legal';
import Login from '@/pages/Login';
import PinLogin from '@/pages/PinLogin';
import { scheduleDailyReminders } from '@/lib/notify';
import Planejar from '@/pages/Planejar';
import Profile from '@/pages/Profile';
import Transactions from '@/pages/Transactions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Splash() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink text-text-mute">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

function Shell() {
  useAuthBootstrap();
  const { isLoading, isAuthenticated, isLocked } = useAuth();
  useEffect(() => {
    if (isAuthenticated) void scheduleDailyReminders();
  }, [isAuthenticated]);

  if (isLoading) return <Splash />;
  if (isLocked) return <PinLogin />;

  if (!isAuthenticated) {
    const pinEnabled = typeof window !== 'undefined' && localStorage.getItem('financeiro.pin_enabled') === 'true';
    return (
      <Routes>
        <Route path="/termos" element={<Legal kind="termos" />} />
        <Route path="/privacidade" element={<Legal kind="privacidade" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pin-login" element={<PinLogin />} />
        <Route
          path="*"
          element={<Navigate to={pinEnabled ? '/pin-login' : '/login'} replace />}
        />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/planejar" element={<Planejar />} />
        <Route path="/assistente" element={<Assistente />} />
        <Route path="/importar" element={<Importar />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/termos" element={<Legal kind="termos" />} />
        <Route path="/privacidade" element={<Legal kind="privacidade" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ModalHost />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
        <Toaster
          position="top-center"
          theme="light"
          toastOptions={{
            style: {
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--line))',
              color: 'rgb(var(--text))',
              borderRadius: '11px',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
