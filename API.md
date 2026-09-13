# API — Finanças do Casal (backend Spring Boot)

Base URL: `/api` na mesma origem — em produção o Spring serve o app React e a API juntos
(porta única). Em dev, o Vite (`:5173`) faz proxy de `/api` para o backend (`:8080`).

## Autenticação

JWT Bearer. Fluxo: `login` → guarde `token` → mande `Authorization: Bearer <token>` em todas as
rotas exceto `/auth/**` e `/actuator/**`.

Rotas sem token respondem **403**.

### `POST /api/auth/register`
```json
{ "email": "a@b.com", "password": "Senha@123", "name": "Fulano" }
```
> `password` exige: 8+ chars, maiúscula, minúscula, dígito, caractere especial, sem espaços.

### `POST /api/auth/login`
```json
{ "email": "daniel@email.com", "password": "123456" }
```
Resposta (200):
```json
{
  "user": { "id": 1, "email": "daniel@email.com", "name": "Daniel", "avatarUrl": "...", "salary": 5500.0 },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```
Credenciais inválidas → **401** `{ "error": "Credenciais inválidas" }`.

## Usuário

### `GET /api/users/me` → `UserDTO`
```json
{ "id": 1, "email": "...", "name": "...", "avatarUrl": "...", "salary": 5500.0 }
```

O `UserDTO` agora inclui `budget` (dados do planejamento):
```json
{ "id": 1, "email": "...", "name": "...", "avatarUrl": null, "salary": 6200.5,
  "budget": { "housingCost": 1500.0, "householdSize": 2, "paysFood": true,
              "foodPerPerson": 600.0, "emergencySaved": 3000.0, "usesHouseholdIncome": null } }
```

### `PUT /api/users/me/salary` → `{ "salary": 6200.50 }` → `UserDTO`

### `PUT /api/users/me/avatar` → `{ "avatarUrl": "data:image/jpeg;base64,..." | "https://..." | null }` → `UserDTO`
`null` remove a foto. Limite ~700 KB (o front reduz a imagem antes de enviar).

### `PUT /api/users/me/budget` → corpo = objeto `budget` acima → `UserDTO`
Persiste os dados que a aba "Planejar" usa para calcular a divisão do salário.

> Não existe endpoint para listar/ver outros usuários.

## Troca de e-mail (verificação por e-mail real)

### `POST /api/users/me/email/request`
```json
{ "newEmail": "novo@email.com" }
```
Gera um código de 6 dígitos, salva (expira em 15 min) e **envia por e-mail** para `newEmail`
(via Gmail SMTP; sem SMTP configurado, o código aparece no log do backend: `Código de verificação para ...`).
→ 200 `{ "message": "Enviamos um código de verificação para novo@email.com" }`
→ 400 se o e-mail já estiver em uso / for igual ao atual.

### `POST /api/users/me/email/confirm`
```json
{ "code": "123456" }
```
→ 200 `{ "user": UserDTO, "token": "<novo JWT>", "message": "E-mail alterado com sucesso" }`
→ 400 `{ "error": "Código inválido" | "Código expirado. Solicite um novo." }`

## Parceria / conta conjunta

Por padrão cada usuário só vê os próprios dados. Uma parceria (entre 2 pessoas) libera
as **contas conjuntas** e as **metas** entre elas. Qualquer um pode desfazer a qualquer hora.

### `GET /api/partner` → `{ "partner": UserSummary | null, "invite": { "code", "expiresAt" } | null }`
### `POST /api/partner/invite` → `{ "code": "ABCD2345", "expiresAt": "..." }`  (gera/substitui; vale 7 dias)
### `DELETE /api/partner/invite` → cancela o convite pendente
### `POST /api/partner/accept` → `{ "code": "ABCD2345" }` → `{ "partner": UserSummary, "message" }`
> 400 se o código for inválido/expirado, for o próprio, ou alguma das contas já tiver parceria.
### `DELETE /api/partner` → desfaz a parceria (cada um fica com as contas conjuntas que criou)

## Transações

### `POST /api/transactions`
```json
{
  "title": "Supermercado",
  "amount": -245.80,               // negativo = despesa, positivo = receita
  "transactionDate": "2026-09-08T10:00:00",   // LocalDateTime ISO
  "type": "EXPENSE",               // "INCOME" | "EXPENSE"
  "category": "Mercado",
  "userId": 1,
  "accountId": 1,
  "installmentCurrent": 3,          // opcional
  "installmentTotal": 12            // opcional
}
```
Ajusta o `currentBalance` da conta automaticamente. → `TransactionDTO` (com `user` e `account`).
`userId` é opcional (default = usuário do token).

### `GET /api/transactions/user/{userId}` → `TransactionDTO[]` (inclui `user` e `account`)
### `GET /api/transactions/balance/{userId}` → `{ "balance": 1234.56 }` (soma dos `amount`, já com sinal)
### `GET /api/transactions/user/{userId}/monthly?year=2026&month=9` → `TransactionDTO[]`
> Os três acima respondem **403** se `userId` não for o do token.
### `PUT /api/transactions/{id}` — mesmo corpo do POST (sem `userId`); reverte e reaplica o saldo. → `TransactionDTO`
### `DELETE /api/transactions/{id}` — reverte o saldo da conta. → `{ "message": "Lançamento excluído" }`
> Editar/excluir exige ser o autor do lançamento **ou** co-dono da conta.

## Parcelamentos

### `POST /api/installment-plans`
```json
{
  "title": "Notebook",
  "totalAmount": 4800.0,
  "dueDate": "2026-11-10",         // LocalDate
  "category": "Eletrônicos",
  "userId": 1,
  "installmentsLeft": 10,          // opcional (default 1)
  "remainingAmount": 4800.0        // opcional (default = totalAmount)
}
```
→ `InstallmentPlanDTO`.

### `GET /api/installment-plans/user/{userId}` → `InstallmentPlanDTO[]`
### `PUT /api/installment-plans/{id}` — mesmo corpo do POST. → `InstallmentPlanDTO`
### `DELETE /api/installment-plans/{id}` → `{ "message": "Parcelamento excluído" }`
### `POST /api/installment-plans/{id}/pay?accountId={id}` (accountId opcional)
Baixa uma parcela: `remainingAmount -= remainingAmount/installmentsLeft` e `installmentsLeft -= 1`.
Com `accountId`, lança a parcela como uma despesa nessa conta. → `InstallmentPlanDTO`.

## Contas

### `POST /api/accounts` (usa o usuário do token como dono/criador)
```json
{ "name": "Poupança", "isJoint": false }
```
> Se `isJoint: true` e você tem parceria, a conta já entra compartilhada com o parceiro.
### `GET /api/accounts` → `AccountDTO[]` (contas onde o usuário do token é dono)
### `PUT /api/accounts/{id}` → `{ "name": "...", "isJoint": false }` → `AccountDTO`
### `DELETE /api/accounts/{id}` → `{ "message": "Conta excluída" }`
> 400 se a conta tiver lançamentos. Editar/excluir exige ser dono da conta.

## Metas compartilhadas

### `GET /api/shared-goals` → `SharedGoalDTO[]` (metas suas + as compartilhadas pela parceria)
### `POST /api/shared-goals`
```json
{ "title": "Carro novo", "targetAmount": 60000.0, "deadline": "2028-01-01", "icon": "Car" }
```
### `PUT /api/shared-goals/{goalId}` — mesmo corpo do POST. → `SharedGoalDTO`
### `DELETE /api/shared-goals/{goalId}` → `{ "message": "Meta excluída" }`
### `PUT /api/shared-goals/{goalId}/contribute?amount=500.0` → `SharedGoalDTO` (400 se `amount <= 0`)

## Health

### `GET /api/actuator/health` → `{ "status": "UP" }`

---

### Notas

- Não existe endpoint único de "dashboard" — o front compõe a tela a partir de
  `/transactions/user/{id}`, `/installment-plans/user/{id}`, `/shared-goals` e `/users`
  (saldo do casal = soma de `currentBalance` das contas).
- IDs são `Long` (número). Enum de transação: `INCOME` / `EXPENSE`. DTO usa `avatarUrl` (camelCase).
- Erros de negócio: **400** com `{ "error": "..." }`. Sem token em rota protegida: **403**.
