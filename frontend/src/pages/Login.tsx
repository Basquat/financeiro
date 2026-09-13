import { useState } from 'react';
import { apiError } from '@/lib/api';
import { useAuthActions } from '@/hooks/useAuth';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/primitives';

type Mode = 'login' | 'register';

export default function Login() {
  const { login, register } = useAuthActions();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/15 font-display text-[22px] text-gold">
            F
          </span>
          <h1 className="font-display text-[26px] font-medium text-text">finance+</h1>
          <p className="mt-1 text-[14px] text-text-mute">
            {mode === 'login' ? 'Seu ledger, num só lugar.' : 'Crie sua conta para começar.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <Field label="Nome">
              {({ id }) => (
                <input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="field-input"
                  autoComplete="name"
                />
              )}
            </Field>
          )}
          <Field label="E-mail">
            {({ id }) => (
              <input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="field-input"
                autoComplete="email"
              />
            )}
          </Field>
          <Field
            label="Senha"
            hint={mode === 'register' ? '8+ caracteres, com maiúscula, número e símbolo.' : undefined}
          >
            {({ id }) => (
              <input
                id={id}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field-input"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            )}
          </Field>

          {error && (
            <p className="rounded-md border border-expense/30 bg-expense/10 px-3 py-2 text-[13px] text-expense">
              {error}
            </p>
          )}

          <Button type="submit" loading={busy} block>
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-text-mute">
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="font-medium text-gold hover:underline focus-ring"
          >
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
