import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiError } from '@/lib/api';
import { useAuth, useAuthActions } from '@/hooks/useAuth';
import { Button } from '@/components/ui/primitives';
import { AuthLayout } from '@/components/layout/AuthLayout';

const PIN_LENGTH = 6;

export default function PinLogin() {
  const navigate = useNavigate();
  const { pinLogin, logout } = useAuthActions();
  const { isLocked } = useAuth();
  const [fails, setFails] = useState(0);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem('financeiro.pin_enabled');
    if (enabled !== 'true') {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  async function submit() {
    if (pin.length < 4 || pin.length > PIN_LENGTH) return;
    setError(null);
    setBusy(true);
    try {
      await pinLogin(pin);
      navigate('/', { replace: true });
    } catch (err) {
      setPin('');
      setError(apiError(err));
      // ponytail: client-side gate, the server wipes the PIN after 5 misses; a locked app falls back to the password.
      if (isLocked && fails + 1 >= 5) logout();
      setFails(fails + 1);
    } finally {
      setBusy(false);
    }
  }

  function press(digit: string) {
    if (busy) return;
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
  }

  function backspace() {
    if (busy) return;
    setPin(pin.slice(0, -1));
  }

  function goToEmailLogin() {
    if (isLocked) logout();
    navigate('/login');
  }

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => (
    <div
      key={i}
      className={`h-3 w-3 rounded-full transition ${
        i < pin.length ? 'scale-110 bg-brand' : 'bg-surface-3'
      }`}
    />
  ));

  return (
    <AuthLayout title="Digite seu PIN" subtitle="Acesso rápido neste aparelho.">
      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex items-center gap-3">{dots}</div>

        {error && (
          <p className="rounded-md border border-expense/30 bg-expense/10 px-3 py-2 text-center text-[13px] text-expense">
            {error}
          </p>
        )}

        <div className="grid w-full grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '✓', '0', '⌫'].map((key) => {
            const isAction = key === '⌫' && !pin;
            return (
              <button
                key={key}
                onClick={() => (key === '⌫' ? backspace() : key === '✓' ? submit() : press(key))}
                disabled={isAction || (key === '✓' && pin.length < 4)}
                className={`flex h-14 items-center justify-center rounded-xl text-[18px] font-medium transition focus-ring ${
                  isAction
                    ? 'invisible'
                    : 'amount border border-line bg-surface text-[20px] text-text shadow-card hover:border-brand/40 active:scale-95'
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>

        <Button variant="ghost" onClick={goToEmailLogin} block>
          Entrar com e-mail e senha
        </Button>
      </div>
    </AuthLayout>
  );
}
