import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiError } from '@/lib/api';
import { useAuthActions } from '@/hooks/useAuth';
import { Button } from '@/components/ui/primitives';

const PIN_LENGTH = 6;

export default function PinLogin() {
  const navigate = useNavigate();
  const { pinLogin } = useAuthActions();
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
    } finally {
      setBusy(false);
    }
  }

  function press(digit: string) {
    if (busy) return;
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length >= 4) {
      submit();
    }
  }

  function backspace() {
    if (busy) return;
    setPin(pin.slice(0, -1));
  }

  function goToEmailLogin() {
    navigate('/login');
  }

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => (
    <div
      key={i}
      className={`h-3 w-3 rounded-full transition ${
        i < pin.length ? 'bg-gold' : 'bg-line-soft'
      }`}
    />
  ));

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15 font-display text-[22px] text-gold">
          F
        </span>
        <h1 className="font-display text-[26px] font-medium text-text">finance+</h1>
        <p className="mt-1 text-[14px] text-text-mute">Digite seu PIN para entrar.</p>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-6">
        <div className="flex items-center gap-3">{dots}</div>

        {error && (
          <p className="rounded-md border border-expense/30 bg-expense/10 px-3 py-2 text-center text-[13px] text-expense">
            {error}
          </p>
        )}

        <div className="grid w-full grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => {
            const isAction = key === '.' || key === '⌫';
            return (
              <button
                key={key}
                onClick={() => (key === '⌫' ? backspace() : key === '.' ? undefined : press(key))}
                disabled={isAction}
                className={`flex h-14 items-center justify-center rounded-xl text-[18px] font-medium transition focus-ring ${
                  isAction
                    ? 'invisible'
                    : 'bg-surface-2 text-text hover:bg-line-soft active:scale-95'
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
    </div>
  );
}
