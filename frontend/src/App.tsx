import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth, useAuthBootstrap } from '@/hooks/useAuth';
import { ModalHost } from '@/components/modals/ModalHost';
import { Spinner } from '@/components/ui/primitives';
import Accounts from '@/pages/Accounts';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
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
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <Splash />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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
        <Route path="/profile" element={<Profile />} />
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
          theme="dark"
          toastOptions={{
            style: {
              background: '#1D212B',
              border: '1px solid #2A2F3A',
              color: '#EDEFF3',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
