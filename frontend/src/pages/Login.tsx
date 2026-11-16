import { isAxiosError } from 'axios';
import { useState } from 'react';
import { apiError } from '@/lib/api';
import { useAuthActions } from '@/hooks/useAuth';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/primitives';
import { authService } from '@/services/authService';
import { AuthLayout } from '@/components/layout/AuthLayout';

type Mode = 'login' | 'register' | 'forgot' | 'verify' | 'reset';

export default function Login() {
  const { login, register, verify } = useAuthActions();
  const [code, setCode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [only30, setOnly30] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function go(next: Mode, message: string | null = null) {
    setMode(next);
    setCode('');
    setError(null);
    setInfo(message);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password, only30);
      } else if (mode === 'register') {
        if (!(await register(name.trim(), email.trim(), password))) go('verify', 'Enviamos um código de 6 dígitos para o seu e-mail.');
      } else if (mode === 'verify') {
        await verify(email.trim(), code.trim());
      } else if (mode === 'forgot') {
        await authService.forgot(email.trim());
        go('reset', 'Se o e-mail tem conta, enviamos um código de 6 dígitos.');
      } else {
        await authService.reset(email.trim(), code.trim(), password);
        setPassword('');
        go('login', 'Senha alterada. Entre com a nova senha.');
      }
    } catch (err) {
      if (mode === 'login' && isAxiosError(err) && err.response?.data?.verificationRequired) {
        go('verify', 'Confirme seu e-mail: enviamos um código de 6 dígitos.');
        return;
      }
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={{ login: 'Bem-vindos de volta', register: 'Criar conta', verify: 'Confirme seu e-mail', forgot: 'Esqueci minha senha', reset: 'Nova senha' }[mode]}
      subtitle={{ login: 'Entre para ver como está o seu mês.', register: 'Leva menos de um minuto.', verify: email, forgot: 'Enviaremos um código para o seu e-mail.', reset: email }[mode]}
    >
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
          {info && <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px] text-text-mute">{info}</p>}
          {(mode === 'verify' || mode === 'reset') && (
            <Field label="Código">
              {({ id }) => (
                <input id={id} value={code} onChange={(e) => setCode(e.target.value)} required inputMode="numeric"
                  maxLength={6} className="field-input" autoComplete="one-time-code" />
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
          {mode !== 'verify' && mode !== 'forgot' && <Field
            label={mode === 'reset' ? 'Nova senha' : 'Senha'}
            hint={mode === 'register' || mode === 'reset' ? '8+ caracteres, com maiúscula, número e símbolo (@#$%^&+=).' : undefined}
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
          </Field>}

          {mode === 'login' && (
            <label className="flex items-start gap-2 text-[13px] text-text-mute">
              <input type="checkbox" checked={only30} onChange={(e) => setOnly30(e.target.checked)} className="mt-0.5" />
              <span>Confiar neste aparelho só por 30 dias (depois pede a senha de novo)</span>
            </label>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2 text-[13px] text-text-mute">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required className="mt-0.5" />
              <span>
                Li e aceito os <a href="/termos" target="_blank" className="text-brand hover:underline">Termos de Uso</a> e a{' '}
                <a href="/privacidade" target="_blank" className="text-brand hover:underline">Política de Privacidade</a>.
              </span>
            </label>
          )}

          {error && (
            <p className="rounded-md border border-expense/25 bg-expense/10 px-3 py-2 text-[13px] text-expense">
              {error}
            </p>
          )}

          <Button type="submit" loading={busy} block>
            {{ login: 'Entrar', register: 'Criar conta', verify: 'Confirmar', forgot: 'Enviar código', reset: 'Salvar senha' }[mode]}
          </Button>
          {mode === 'login' && (
            <button type="button" onClick={() => go('forgot')} className="block w-full text-center text-[13px] text-brand hover:underline focus-ring">
              Esqueci minha senha
            </button>
          )}
        </form>

        <p className="mt-6 text-center text-[13px] text-text-mute">
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
          <button
            onClick={() => go(mode === 'login' ? 'register' : 'login')}
            className="font-medium text-brand hover:underline focus-ring"
          >
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
    </AuthLayout>
  );
}
