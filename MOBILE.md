# App no celular (APK de teste)

O app do celular é o **mesmo site React** empacotado num APK Android (via Capacitor).
Ele **não** carrega um servidor dentro do celular — precisa falar com o backend pela
internet ou pela rede local. Então a ordem é: **1) backend no ar → 2) gerar o APK →
3) instalar no celular**.

---

## Passo 1 — Deixar o backend acessível

### Opção A — Hospedagem em nuvem (recomendado, funciona de qualquer lugar)

1. Crie uma conta em um provedor com suporte a Docker (ex.: Render, Railway, Fly.io).
2. Conecte este repositório e aponte para o `Dockerfile` na raiz; provisione também
   um banco Postgres. Configure as variáveis de ambiente descritas no
   [README](README.md#variáveis-de-ambiente-obrigatórias).
3. Espere o primeiro deploy (~5–10 min). No fim você tem uma URL tipo
   `https://seu-app.exemplo.com`.
4. A **URL da API** é essa + `/api`, ou seja:
   `https://seu-app.exemplo.com/api`

> Planos gratuitos costumam "dormir" após um tempo sem uso — a primeira tela pode
> demorar alguns segundos pra responder. Normal.

### Opção B — Na sua rede (teste rápido, só em casa)

1. No PC, rode o backend: dê 2 cliques em **`iniciar.bat`**. Deixe a janela aberta.
2. Descubra o IP do PC na rede: abra o `cmd` e rode `ipconfig`. Pegue o
   **"Endereço IPv4"** do adaptador do Wi‑Fi (algo como `192.168.0.12`).
3. Libere a porta no Firewall do Windows: na 1ª vez que o Java pedir, clique
   **"Permitir acesso"** (redes privadas).
4. A **URL da API** é: `http://192.168.0.12:8080/api` (troque pelo seu IP).
5. O celular tem que estar **na mesma rede Wi‑Fi** do PC, e o PC ligado com o
   `iniciar.bat` rodando.

---

## Passo 2 — Gerar o APK (no GitHub, sem instalar nada)

1. No GitHub, aba **Actions** → **Build Android APK** (menu à esquerda).
2. Botão **Run workflow** (canto direito).
3. Em **"URL da API"**, cole a URL do Passo 1 (com `/api` no fim). Confirme.
4. Espere ~5 min. Quando ficar verde ✅:
   - baixe em **Releases** (lateral do repositório) → release **"APK de teste (mais recente)"**
     → arquivo **`financas-do-casal.apk`**;
   - ou dentro do próprio run, seção **Artifacts** → `financas-do-casal-apk`.

> Dica: se quiser que o APK seja regerado a cada push, crie a variável de repositório
> **`BACKEND_URL`** em *Settings → Secrets and variables → Actions → Variables*
> com a URL da API. Aí o workflow roda sozinho.

---

## Passo 3 — Instalar no celular (Android)

1. Passe o `financas-do-casal.apk` para o celular (cabo USB, Google Drive, mandar
   pra si mesmo no Telegram/WhatsApp, etc.).
2. Toque no arquivo. O Android vai avisar que é de "fonte desconhecida" →
   **Configurações → permitir para este app** (o gerenciador de arquivos ou o navegador
   que abriu o APK) → volte e **Instalar**.
3. Abra o app **"Finanças do Casal"**.

---

## Passo 4 — Usar

- Na 1ª vez, toque em **Cadastre‑se** e crie sua conta (não existe usuário de exemplo).
- Se aparecer **"Sem conexão com o servidor"**:
  - **Opção A (nuvem):** o serviço pode estar "acordando" — espere 30s e tente de novo;
    confira se a URL colada tinha `/api` no fim.
  - **Opção B (rede local):** o PC precisa estar ligado com o `iniciar.bat` rodando,
    o celular na **mesma Wi‑Fi**, e o Firewall liberado. Teste abrindo
    `http://SEU_IP:8080` no navegador do próprio celular.

---

## Atualizar o app depois de mudanças

Rode o workflow **Build Android APK** de novo (mesma URL), baixe o APK novo e
**instale por cima** do antigo — os dados no servidor continuam.

---

## Observações

- É um **APK de debug**, para teste. Instala direto, mas não serve para a Play Store
  (isso exige assinatura com keystore própria, ícone, etc.).
- O código nativo fica em `frontend/android/` (gerado pelo Capacitor). Para mexer
  localmente você precisaria do Android Studio — mas para só gerar o APK, o GitHub
  Actions já faz tudo.
- Trocar ícone/nome: `frontend/android/app/src/main/res/` e
  `frontend/android/app/src/main/res/values/strings.xml`.
