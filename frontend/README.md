# finance+ — Frontend

Ledger de finanças pessoais: saldo, lançamentos, parcelamentos e metas.
React 18 + TypeScript + Vite, integrado ao backend Spring Boot via REST.

## Stack

- React 18, TypeScript, Vite
- Tailwind CSS — tema escuro (ver `tailwind.config.js`)
- React Router, TanStack Query (React Query v4), Zustand
- Axios (cliente em `src/lib/api.ts`, com JWT e tratamento de 401/403)
- Headless UI (modais), Heroicons, Sonner (toasts), date-fns

## Rodando localmente

Precisa do **backend no ar** (`../backend`, perfil `local`, porta 8080).

```bash
npm install
npm run dev          # http://localhost:5173
```

Variável de ambiente (`.env` na raiz do frontend):

```
VITE_BACKEND_URL=http://localhost:8080/api
```

Login de teste do perfil `local`: `daniel@email.com` / `123456`.

```bash
npm run build        # gera dist/
npx tsc --noEmit     # type-check
```

## Estrutura

```
src/
├── lib/           api.ts (axios + token), format.ts (moeda, datas)
├── services/      um arquivo por recurso do backend (auth, users, transactions, ...)
├── hooks/         useAuth (sessão), useData (queries/mutations React Query), useUi (modais)
├── components/
│   ├── ui/        Button, Field, Modal, Person, primitives, Async
│   ├── modals/    um modal por ação de "adicionar" + ModalHost + AddSheet
│   ├── layout/    AppShell (sidebar no desktop, bottom nav no mobile)
│   ├── Ledger.tsx  lista de transações agrupada por dia
│   └── Cards.tsx   GoalCard, InstallmentCard, AccountCard
├── pages/         Login, Dashboard, Transactions, Accounts, Profile
├── types.ts       espelha os DTOs do backend (ver ../API.md)
└── App.tsx        rotas + bootstrap da sessão
```

## Notas

- Não há endpoint de "dashboard": a tela inicial é composta de
  `/transactions/balance`, `/transactions/user`, `/installment-plans/user` e `/shared-goals`.
- IDs são numéricos (`Long`); o tipo de transação é `INCOME` / `EXPENSE`.
- Sem backend, a tela de login mostra "Sem conexão com o servidor" em vez de quebrar.
