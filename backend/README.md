# Finanças do Casal - Backend

Este é o backend do sistema de gestão financeira para casais, construído com Java 26 e Spring Boot 3.

## Tecnologias

- Java 26
- Spring Boot 3
- Spring Data JPA
- Spring Security
- JWT Authentication
- PostgreSQL (via Supabase)
- Maven

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend com as seguintes variáveis:

```
# Supabase Connection
SUPABASE_URL=seu_supabase_url_aqui
SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico_aqui

# JWT
JWT_SECRET=sua_chave_secreta_para_jwt_aqui

# Server
PORT=8080

# CORS (ajuste conforme necessário)
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://seu-frontend.vercel.app
```

### Executando Localmente

```bash
# Clone o repositório
git clone <repository-url>
cd financeiro-casal/backend

# Instale dependências e execute
./mvnw spring-boot:run
```

O backend estará disponível em `http://localhost:8080/api`

### Executando com Docker

```bash
# Construa a imagem
docker build -t casal-financeiro-backend .

# Execute o container
docker run -p 8080:8080 \
  -e SUPABASE_URL=seu_supabase_url_aqui \
  -e SUPABASE_ANON_KEY=sua_chave_anonima_aqui \
  -e SUPABASE_SERVICE_ROLE_KEY=sua_chave_de_servico_aqui \
  -e JWT_SECRET=sua_chave_secreta_para_jwt_aqui \
  casal-financeiro-backend
```

### Deploy em um PaaS (Render, Railway, Fly.io, etc.)

1. Crie um serviço web na plataforma escolhida
2. Conecte seu repositório GitHub
3. Configure:
   - Build Command: `./mvnw clean package -DskipTests`
   - Start Command: `java -jar target/casal-financeiro-0.0.1-SNAPSHOT.jar`
   - Variáveis de ambiente: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
   - Ative o Auto Deploy

### Endpoints da API

#### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/profile?email=email@exemplo.com` - Obter perfil do usuário

#### Transações
- `POST /api/transactions` - Criar nova transação
- `GET /api/transactions/user/{userId}` - Obter transações de um usuário
- `GET /api/transactions/balance/{userId}` - Obter saldo de um usuário
- `GET /api/transactions/user/{userId}/monthly?year=2026&month=9` - Obter transações mensais

### Modelo de Dados

O banco de dados consiste nas seguintes tabelas principais:
- `users`: Perfis dos usuários
- `accounts`: Contas (pessoais e conjuntas)
- `account_owners`: Relacionamento muitos-para-muitos entre usuários e contas
- `transactions`: Lançamentos financeiros
- `installment_plans`: Planos de parcelamento
- `shared_goals`: Metas financeiras compartilhadas

### Estrutura do Projeto

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/financeiro/casal/
│   │   │   ├── controller/    # REST controllers
│   │   │   ├── service/       # Business logic
│   │   │   ├── repository/    # Data access layer
│   │   │   ├── model/         # JPA entities
│   │   │   └── config/        # Configuration classes
│   │   └ resources/
│   │       ├── application.yml    # Configuration
│   │       └── data.sql           # Sample data
├── pom.xml
├── Dockerfile
└── mvnw
```