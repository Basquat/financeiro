# Auditoria de segurança, LGPD e integridade financeira — 2026-10-30

Escopo: código do repositório (`master`, a partir de `4c6b82f`). Nenhum ambiente de produção, banco real ou credencial foi acessado. Este documento **não** declara o sistema "100% seguro" nem em conformidade integral com a LGPD.

## A. Diagnóstico inicial

| Item | Informado | Encontrado no código |
|---|---|---|
| Java | 26 | JDK 26 (`pom.xml` `java.version=26`, Dockerfile `temurin:26`). CI Android usa 21 (só Gradle). |
| Spring Boot | 3.5 | 3.5.16 (Security 6.5, Hibernate 6.6). Oficialmente a linha 3.5 declara suporte até Java 25 → **combinação fora da matriz suportada**. Recomendado: Java 25 LTS (trocar `java.version` e as imagens base) após rodar a suíte. Não alterado sem autorização. |
| JWT | access 24h + refresh 7d | Só access token (jjwt 0.12.6, HS256). **Refresh token não existe** (config era morta, removida). |
| Swagger/OpenAPI | sim | **Não existe** (nenhuma dependência springdoc). |
| Supabase | Postgres + chaves | Apenas Postgres via JDBC pelo backend. Chaves `anon`/`service_role` nunca eram usadas (config morta, removida). Frontend **não** acessa o banco → RLS não é a camada de controle aqui. |
| Migrations | — | Nenhuma: `ddl-auto: update` em todos os perfis. |
| Transferências, recorrências, orçamentos por categoria, relatórios/exportação | sim | **Não existem no backend.** Orçamento/projeção/reserva são cálculos de exibição no frontend (`lib/budget.ts`, `lib/invest.ts`). Sem agendador (`@Scheduled`), sem CSV/PDF. |
| Deploy | containers | `Dockerfile` multi-stage (runtime não-root), `docker-compose.prod.yml` + Caddy (HTTPS), Postgres gerenciado (Neon). |

Caminhos que leem/alteram dados financeiros: `/api/accounts`, `/api/transactions`, `/api/installment-plans` (+`/pay`), `/api/shared-goals` (+`/contribute`), `/api/partner` (vínculo que compartilha contas conjuntas e metas), `/api/users/me/*` (salário, orçamento, reserva).

Modelo de autorização de conta conjunta: `Account.owners` (N:N). Todo dono tem leitura **e escrita** — não há papel "somente leitura". O vínculo é criado só por código de convite de 8 caracteres (32^8) gerado pelo próprio dono, válido 7 dias; desfazer remove imediatamente o parceiro das contas criadas pelo outro (checado no banco a cada requisição, então tokens antigos não mantêm acesso).

## B. Matriz de vulnerabilidades

| ID | Achado | Evidência (antes) | Impacto / Prob. | Prio | Status | Teste |
|---|---|---|---|---|---|---|
| V01 | **Login por PIN sem identificar o usuário**: o servidor testava o PIN contra *todos* os usuários e logava no primeiro que batesse. 4–6 dígitos, sem limite → força bruta loga em contas alheias | `PinService.loginWithPin` (`findAll()`) | Tomada de conta / alta | P0 | **Corrigido**: PIN exige e-mail; 5 erros apagam o PIN (volta a exigir senha) | `pinOnlyUnlocksItsOwnAccount…` |
| V02 | `GET /api/auth/profile?email=` **público** devolvia salário, orçamento, reserva, avatar e `pinEnabled` de qualquer e-mail (enumeração + vazamento) | `SecurityConfig` permitAll + `AuthController.getProfile` | Vazamento / alta | P0 | **Removido** (não era usado pelo front) | `profileLookupByEmailIsNotPublic` |
| V03 | **IDOR em lançamentos**: `userId` do corpo era aceito e `accountId` não era checado → criar/mover lançamento na conta de outra pessoa e alterar o saldo dela | `TransactionController.create`, `TransactionService.create/update` | Alteração de saldo alheio / alta | P0 | **Corrigido**: dono = usuário do token; conta precisa pertencer a ele (criar, mover, pagar parcela) | `cannotWriteIntoAnotherUsersAccount` |
| V04 | `GET /transactions/user/{id}/monthly` ignorava o usuário e devolvia **todos os lançamentos de todos os usuários** do mês | `findByTransactionDateBetween…` | Vazamento em massa / alta | P0 | **Removido** (não usado pelo front) | — (rota inexistente) |
| V05 | `userId` do corpo aceito na criação de parcelamento | `InstallmentPlanController.create` | Escrita em nome de terceiros | P0 | **Corrigido** | `cannotTouchAnother…` |
| V06 | Segredo JWT com **default conhecido** no `application.yml`; segredo curto/vazio era **completado com zeros** (`docker-compose.prod` sem `JWT_SECRET` ⇒ chave toda zero ⇒ tokens forjáveis) | `JwtService`, `application.yml` | Bypass total de autenticação | P0 | **Corrigido**: sem default fora de local/test; < 32 bytes ⇒ app não sobe | `rejectsMissingForged…` |
| V07 | Saldo armazenado com read-modify-write sem lock (perda de atualização em concorrência; divergência silenciosa) | `TransactionService.applyToBalance` | Saldo errado / média | P1 | **Corrigido**: saldo = `SUM(amount)` do histórico (fonte única de verdade) | `signFollowsType…`, `installmentsSum…` |
| V08 | Sinal do valor vinha do cliente (despesa com valor positivo somava ao saldo) | `TransactionController.fromRequest` | Integridade / média | P1 | **Corrigido**: sinal derivado do `type` no servidor | `signFollowsType…` |
| V09 | Bean Validation declarada mas **não aplicada** (faltava `@Valid`) em contas, lançamentos, parcelamentos e metas; sem limite de casas decimais/magnitude | controllers | Dados inválidos / média | P1 | **Corrigido**: `@Valid` + `@Digits(12,2)`; erro volta como `{error}` | `rejectsMoreThanTwoDecimals…` |
| V10 | Login por senha sem limite de tentativas | `AuthService.login` | Força bruta / média | P1 | **Corrigido**: 5 falhas/15 min por e-mail ⇒ 429 temporário (sem bloqueio permanente) | `passwordLoginIsThrottled…` |
| V11 | Código de troca de e-mail (6 dígitos) sem limite de tentativas | `EmailChangeService.confirmChange` | Sequestro de e-mail / baixa | P1 | **Corrigido**: 5 erros invalidam o código | — (reusa o mesmo limitador) |
| V12 | Meta/parcelamento sem dono (`owner == null`) acessível a qualquer usuário | `SharedGoalService.getOrThrow`, `InstallmentPlanService.get` | IDOR legado / baixa | P1 | **Corrigido** | `cannotTouchAnother…` |
| V13 | Avatar aceitava qualquer string (ex.: `javascript:`) | `UserService.updateAvatar` | XSS indireto / baixa | P2 | **Corrigido**: só `data:image/` ou `https://` | `avatarOnlyAcceptsImages…` |
| V14 | Sem Content-Security-Policy | `SecurityConfig` | Amplia impacto de XSS | P2 | **Corrigido** (exceto `/h2-console`, só local) | `…SpaHasCsp` |
| V15 | Android `allowBackup=true` (token no backup do Google) | `AndroidManifest.xml` | Exposição de sessão | P2 | **Corrigido** | — (sem SDK Android aqui) |
| V16 | CVE `follow-redirects` (high, GHSA-q3jh-wrc6-jgq8 / GHSA-8r9p-f939-6h3c) e `react-router` (moderate) | `npm audit` | Cadeia de suprimentos | P1 | `npm audit fix` aplicado (sem `--force`); ver D | `npm audit` no CI |
| P01 | Token em `localStorage` (web e WebView) — legível por XSS | `lib/api.ts` | Roubo de sessão | P1 | **Pendente**: CSP mitiga; mudar para cookie HttpOnly exige CSRF e afeta o app Android | — |
| P02 | Sem refresh token / revogação de sessão (logout só no cliente). TTL reduzido de 24h → **12h** | `JwtService` | Janela de token roubado | P1 | **Parcial** | — |
| P03 | Dinheiro em `double` (Java) / `double precision` (Postgres) | entidades | Arredondamento | P1 | **Pendente**: arredondamento a 2 casas + `@Digits` contêm o risco; migrar para `BigDecimal`/`NUMERIC(14,2)` exige migration em produção | `signFollowsType…` (0,10+0,20) |
| P04 | `ddl-auto: update` em produção, sem migrations versionadas | `application-prod.yml` | Esquema não reproduzível | P1 | **Pendente** (Flyway + `validate`); nenhuma mudança de esquema foi necessária nesta rodada | — |
| P05 | Sem exclusão de conta (direito de eliminação LGPD) nem exportação de dados | — | LGPD | P1 | **Pendente**: processo manual documentado em F | — |
| P06 | Sem idempotência em `POST /transactions` e `/pay` (duplo clique/retry duplica) | controllers | Duplicação / baixa | P2 | **Pendente** (front desabilita o botão durante o envio) | — |
| P07 | `catch (Exception e) → e.getMessage()` pode expor mensagens internas (ex.: SQL) | todos os controllers | Info disclosure / baixa | P2 | **Pendente** | — |
| P08 | CORS `*` | `SecurityConfig` | Aceitável: autenticação só por header, sem cookies. Restringir via `CORS_ALLOWED_ORIGINS` em produção | P2 | Documentado | — |
| P09 | `usesCleartextTraffic=true` / `allowMixedContent` no Android (testes em LAN) | manifest / capacitor | MITM se apontar p/ http | P2 | Decisão do dono: manter p/ LAN ou desligar em release | — |
| P10 | Código de troca de e-mail é logado quando SMTP não está configurado (inclusive em prod) | `EmailChangeService.sendCode` | Baixa | P2 | Pendente: configurar SMTP em prod | — |
| P11 | Workflow Android: `contents: write`, publica release a cada push em `master`, actions por tag (não SHA) | `android.yml` | Cadeia de suprimentos | P2 | Pendente | — |

Não aplicáveis (funcionalidade inexistente): transferências entre contas, recorrências/jobs, exportação CSV/PDF, RLS no Supabase, Swagger, papéis admin (não há administrador na aplicação — bom).

## C. Modificações realizadas

Backend (`backend/src/main/java/com/financeiro/casal/`):
- `security/JwtService.java` — recusa segredo < 32 bytes; TTL padrão 12h.
- `config/SecurityConfig.java` — remove permitAll de `/api/auth/profile`; adiciona CSP.
- `config/ValidationErrorHandler.java` (novo) — erros de validação no formato `{error}`.
- `service/AuthService.java` — limitador de tentativas (memória, por instância) usado por senha, PIN e código de e-mail.
- `service/PinService.java`, `dto/PinLoginRequest.java`, `controller/AuthController.java` — PIN vinculado ao e-mail; 429 no login; rota `/profile` removida.
- `model/Account.java` — `isOwnedBy()`; campo `currentBalance` removido da entidade (a coluna antiga fica no banco, ignorada — sem migration).
- `repository/TransactionRepository.java` — `sumByAccountId`; consulta global por data removida.
- `service/AccountService.java`, `controller/AccountController.java` — saldo derivado do histórico; `@Valid`.
- `service/TransactionService.java`, `controller/TransactionController.java`, `dto/TransactionRequestDTO.java` — conta precisa ser do usuário; sinal pelo tipo; `userId` do cliente removido; rota `/monthly` removida; `@Valid` + `@Digits`.
- `controller/InstallmentPlanController.java`, `dto/InstallmentPlanRequestDTO.java`, `service/InstallmentPlanService.java` — dono pelo token; `@Valid` + `@Digits`.
- `service/SharedGoalService.java`, `controller/SharedGoalController.java`, `dto/SharedGoalRequestDTO.java` — sem fallthrough de dono nulo; `@Valid` + `@Digits`.
- `service/UserService.java` — avatar restrito a imagem/https.
- `service/EmailChangeService.java` — limite de tentativas do código.
- `resources/application*.yml`, `test/resources/application-test.yml`, `docker-compose.yml`, `backend/.env.example` — sem segredo default em prod, config morta (refresh, Supabase) removida.

Frontend: `hooks/useAuth.ts`, `services/authService.ts` (PIN envia o e-mail salvo), `android/app/src/main/AndroidManifest.xml` (`allowBackup=false`), `package-lock.json` (`npm audit fix`).

Infra: `.github/workflows/ci.yml` (novo: testes backend, tsc/build, `npm audit --audit-level=high`, `permissions: read`), `.github/dependabot.yml` (novo: maven, npm, actions).

Esquema do banco: **nenhuma alteração**. Migrations: nenhuma.

Efeito para usuários existentes: (1) quem usava PIN precisa entrar uma vez com senha (o app passa a guardar o e-mail para o PIN); (2) o saldo exibido passa a ser a soma real dos lançamentos — se o saldo antigo tinha divergido, agora aparece o valor correto; (3) produção **não sobe** sem `JWT_SECRET` de ≥ 32 bytes.

## D. Resultados dos testes

| Suíte | Resultado |
|---|---|
| `ApiIntegrationTest` (existente, MockMvc + H2) | 17/17 ✔ |
| `SecurityIntegrationTest` (novo, 10 cenários com usuários sintéticos) | 10/10 ✔ |
| `tsc --noEmit` / `vite build` | ✔ (bundle sem script inline, sem segredos) |
| `npm audit --omit=dev` | antes: 1 high + 2 moderate → depois: 0 high, 2 moderate (`react-router` 6.x; correção exige upgrade major para 7.18+, não aplicado) |

Cobertos (numeração do pedido): 48.1–4, 48.7–8, 48.12, 48.16, 48.18 (não há rota admin), 49.1–4 (parcial), 49.11–12, 49.19, 49.21, 50.1, 50.6 (avatar/CSP), 50.10 (parcial), 50.16–17.

Não executados e por quê: Postgres real/Testcontainers (sem Docker aqui; H2 não prova compatibilidade com Postgres), concorrência real, restauração de backup (sem acesso), build Android (sem SDK), teste de carga (o sandbox não sobe servidor HTTP JVM), refresh token (não existe), transferências/recorrências/CSV (não existem).

## E. Situação de produção

- P0 conhecidos: **todos corrigidos no código** (V01–V06). Ainda não implantados.
- **Ação obrigatória antes do deploy**: definir `JWT_SECRET` forte e único por ambiente (o app não sobe sem ele). Se a produção rodou alguma vez sem `JWT_SECRET` ou com o valor padrão, **trate todos os tokens emitidos como comprometidos** — trocar o segredo invalida todos.
- Avaliar se V01/V02/V04 foram explorados: não há logs de acesso no app para confirmar; verificar logs do Caddy (`/api/auth/pin/login` em volume, `/api/auth/profile`, `/monthly`). Se houver indício, seguir o fluxo de incidente abaixo.
- Java 26 + Boot 3.5: fora da matriz oficial → migrar para Java 25 LTS.
- Banco: `ddl-auto: update`, sem migrations; colunas monetárias em ponto flutuante. Backups: dependem do provedor (Neon) — **não verificados**; nenhum teste de restauração foi feito.
- Prontidão: melhorou substancialmente, mas **não** recomendo declarar "pronto para produção" até P01–P05 terem decisão registrada.

## F. Privacidade e LGPD

Inventário: identificação (nome, e-mail, foto), autenticação (hash bcrypt de senha e PIN, códigos de e-mail), financeiro pessoal (salário, contas, saldos, lançamentos com título/categoria/data, parcelamentos, metas, gastos de moradia/alimentação, tamanho do domicílio, reserva), vínculo entre duas pessoas (parceria), técnicos (logs). Títulos de lançamentos podem conter dados de terceiros.

Classificação: dados pessoais de **alto impacto** se expostos (financeiros). Em regra não são dados sensíveis do art. 5º, II — avaliar caso a caso (ex.: títulos que revelem saúde ou religião).

Bases legais a validar com jurídico: execução de contrato/procedimentos a pedido do titular (art. 7º, V) para o serviço; legítimo interesse (art. 7º, IX) para logs de segurança; consentimento apenas se houver uso opcional (não há hoje).

Fornecedores / transferência internacional (validar): Neon (Postgres), Oracle Cloud (VM), Google Fonts (IP do usuário enviado ao Google ao carregar o app — considerar hospedar as fontes localmente), SMTP (Gmail), GitHub (código/APK).

Direitos dos titulares — processo manual até existir endpoint: o titular pede pelo e-mail cadastrado → confirmar identidade com login ativo ou código enviado ao e-mail → exportar (acesso/portabilidade) ou excluir os registros do `user_id` (lançamentos, parcelamentos, metas, convites, parceria; contas exclusivas; remover das contas conjuntas) → registrar a solicitação. Exceções de retenção a definir pelo controlador.

Incidentes: seguir detecção → classificação → contenção (trocar `JWT_SECRET` revoga todas as sessões) → preservar logs → identificar titulares afetados → avaliar comunicação à ANPD e aos titulares (Res. CD/ANPD nº 15/2024: prazo geral de 3 dias úteis quando houver risco ou dano relevante) → corrigir → registrar o incidente.

Questões para o controlador/jurídico: retenção após encerramento da conta; base legal para o compartilhamento entre parceiros (o próprio titular inicia); uso de Google Fonts; publicação de política de privacidade.

## G. Próximos passos

| # | Item | Aceite |
|---|---|---|
| 1 | Definir `JWT_SECRET` em produção e implantar | app sobe; login funciona; tokens antigos rejeitados |
| 2 | Flyway + `ddl-auto: validate`; migration `NUMERIC(14,2)` + `BigDecimal` | testes com Testcontainers/Postgres verdes |
| 3 | Endpoint de exclusão/exportação de conta com reconfirmação de senha | teste: dados do titular somem, dados do parceiro preservados |
| 4 | Refresh token rotativo + `tokenVersion` no usuário (logout em todos os dispositivos) | reuso de refresh token revoga a família |
| 5 | Token no Android via armazenamento seguro (Keystore) | sem token em `localStorage` no APK |
| 6 | Java 25 LTS | suíte verde no CI |
| 7 | Idempotency-Key em `POST /transactions` e `/pay` | reenvio não duplica |
| 8 | Fixar actions por SHA; restringir release do APK | — |

Reavaliação: rodar esta auditoria a cada mudança em autenticação, autorização ou modelo de dados, e no mínimo a cada trimestre.
