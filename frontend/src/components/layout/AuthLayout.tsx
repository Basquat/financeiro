import type { ReactNode } from 'react';
import { HeroArt } from '@/components/ui/Illustrations';
import { Logo } from '@/components/ui/Logo';

/** Split screen for login/PIN: illustrated pine panel on the left, form on the right. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-pine p-10 text-paper lg:flex">
        <Logo inverted />
        <HeroArt className="mx-auto w-full max-w-[520px]" />
        <div className="max-w-md">
          <p className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.03em]">
            Seu dinheiro, <span className="text-lime">organizado num lugar só.</span>
          </p>
          <p className="mt-3 text-[14px] text-paper/70">
            Contas, cartões, parcelas, metas e um assistente que entende seus comprovantes — sem planilha.
            Divide as contas com alguém? Tem conta conjunta também.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-[30px] font-semibold leading-tight text-text">{title}</h1>
          <p className="mt-1.5 text-[14px] text-text-mute">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
