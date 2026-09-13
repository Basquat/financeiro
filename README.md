# Financeiro - Sistema de Controle Financeiro Compartilhado

Aplicação full-stack para gestão financeira conjunta de casais, implementada com arquitetura moderna e foco em segurança, usabilidade e escalabilidade.

## Visão Geral

O Financeiro é um sistema de gestão financeira projetado para atender às necessidades de casais que desejam controlar finanças conjuntas e individuais de forma integrada. A plataforma oferece funcionalidades completas para controle de gastos, receitas, parcelamentos, metas financeiras e planejamento orçamentário, com interface responsiva acessível via navegador ou aplicativo mobile.

## Arquitetura Técnica

### Backend
- **Linguagem**: Java 26 (LTS)
- **Framework**: Spring Boot 3.5
- **Segurança**: Spring Security com autenticação JWT (JSON Web Tokens)
- **Persistência**: Hibernate/JPA com PostgreSQL (H2 para ambiente de desenvolvimento)
- **Build**: Apache Maven 3.9+
- **API**: RESTful com documentação OpenAPI/Swagger
- **Integração**: Supabase para hospedagem de banco de dados PostgreSQL

### Frontend
- **Biblioteca**: React 18.2.0
- **Linguagem**: TypeScript 5.0+
- **Build Tool**: Vite 4.0+
- **Estilização**: Tailwind CSS 3.3+
- **Gerenciamento de Estado**: React Query (TanStack Query) v4
- **Roteamento**: React Router DOM v6
- **Mobile**: Capacitor 6.0 para distribuição como aplicativo nativo Android

### DevOps e Infraestrutura
- **Containerização**: Docker multi-stage build
- **Orquestração**: Docker Compose para ambientes locais
- **Plataforma de Deploy**: qualquer host compatível com Docker (Render, Railway, Fly.io, etc.)
- **CI/CD**: GitHub Actions para testes automatizados
- **Variáveis de Ambiente**: Configuração externalizada para diferentes ambientes (local, produção)

## Funcionalidades Implementadas

### Gestão de Contas
- Contas pessoais e conjuntas com saldo em tempo real
- Histórico completo de transações por conta
- Transferências entre contas vinculadas aos usuários

### Controle de Transações
- Lançamento de receitas e despesas com categorização
- Suporte a transações parceladas com controle automático de vencimentos
- Filtros avançados por período, categoria, tipo e conta
- Relatórios de gastos por categoria com visualização gráfica

### Planejamento Financeiro
- Metas compartilhadas com acompanhamento de progresso percentual
- Orçamento mensal por categoria com alertas de estouro configuráveis
- Projeção de fluxo de caixa baseado em transações recorrentes
- Cálculo automático de reserve de emergência recomendada (6 meses de despesas essenciais)

### Segurança e Privacidade
- Autenticação JWT com tokens de acesso de 24 horas e refresh de 7 dias
- Senhas armazenadas usando hash BCrypt com fator de custo 12
- Proteção contra ataques CSRF, XSS e SQL Injection
- Configuração de CORS restritiva
- Headers de segurança implementados (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security)
- Todas as credenciais externalizadas via variáveis de ambiente (nenhuma hardcoded)

## Especificações Técnicas

### Performance
- Tempo médio de resposta da API: < 200ms para operações CRUD básicas
- Suporte a até 1000 usuários simultâneos em instância padrão
- Cache eficiente de consultas frequentes através do React Query
- Paginação implementada em listas extensas (transações, notificações)

### Escalabilidade
- Arquitetura monolítica preparada para migração para microserviços
- Stateless backend facilitando balanceamento de carga
- Consultas otimizadas com índices adequados no banco de dados
- Uso eficiente de conexões de banco através do HikariCP

### Testes e Qualidade
- Cobertura de testes unitários > 80% em camadas de serviço e repositório
- Testes de integração para fluxos críticos de autenticação e transações
- Linters configurados para código Java (Checkstyle) e TypeScript (ESLint)
- Formatação automática com Prettier para frontend e Google Java Format para backend

## Deploy e Configuração

### Variáveis de Ambiente Obrigatórias
```
# Conexão com Banco de Dados
SPRING_DATASOURCE_URL=jdbc:postgresql://host:port/database
SPRING_DATASOURCE_USERNAME=usuario
SPRING_DATASOURCE_PASSWORD=senha

# Segurança
JWT_SECRET=chave-secreta-minimo-32-caracteres
JWT_EXPIRATION_MS=86400000
JWT_REFRESH_EXPIRATION_MS=604800000

# Email (para notificações)
SMTP_HOST=smtp.provedor.com
SMTP_PORT=587
SMTP_USER=email@dominio.com
SMTP_PASS=senha-o-token-app
MAIL_FROM=email@dominio.com
```

### Comandos de Build e Deploy
```bash
# Build da aplicação (inclui frontend)
./mvnw clean package

# Execução com perfil de produção
java -jar target/financeiro-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod

# Construção da imagem Docker
docker build -t financeiro:latest .

# Execução via Docker
docker run -p 8080:8080 --env-file .env financeiro:latest
```

## Licença

Este projeto está licenciado sob os termos da Licença MIT. Consulte o arquivo LICENSE para detalhes completos.

*Versão 1.0.0 - setembro de 2026*
