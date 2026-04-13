# 🚌 ViagemExpress - Sistema de Atendimento WhatsApp com IA

Sistema profissional completo para atendimento automatizado via WhatsApp usando Inteligência Artificial (Groq - Llama 3.3) para vendas de passagens de ônibus.

## 🌟 Características

- ✅ **Atendimento 24/7** com IA inteligente (Groq - Llama 3.3 70B)
- 💬 **Integração WhatsApp** via Evolution API
- 🤖 **IA Consultiva** - Llama 3.3 para vendas personalizadas
- 📊 **Dashboard** completo com métricas em tempo real
- 💾 **Banco de dados** PostgreSQL profissional
- 📈 **Analytics** avançado de conversas e vendas
- 🔄 **Transferência** para atendente humano
- 🎯 **Configurável** - Tom, horários, regras de negócio
- 🔒 **Seguro** - Rate limiting, helmet, logs profissionais
- ⚡ **Alta Performance** - Groq é 10x mais rápido que outras IAs

## 📋 Pré-requisitos

- Node.js >= 18.0.0 (Recomendado: 20.x LTS)
- NPM >= 9.0.0
- PostgreSQL >= 14.0
- Evolution API (configurado separadamente)
- Chave da API Groq (gratuita)

## 🚀 Instalação Completa

### 1️⃣ Configurar PostgreSQL

#### Windows:
```powershell
# Conectar ao PostgreSQL
psql -U postgres

# Criar banco e usuário do backend
CREATE DATABASE #####;
CREATE USER ######## WITH ENCRYPTED PASSWORD '######';
GRANT ALL PRIVILEGES ON DATABASE ##############;

# PostgreSQL 15+ requer permissões adicionais
\c viagemexpress
GRANT ALL ON SCHEMA public TO ###########
GRANT CREATE ON SCHEMA public TO ######
ALTER SCHEMA public OWNER TO #########

# Criar banco do Evolution API
CREATE DATABASE evolution;
CREATE USER evolution_user WITH ENCRYPTED PASSWORD '';
GRANT ALL PRIVILEGES ON DATABASE 

\c evolution
GRANT ALL ON SCHEMA public 
GRANT CREATE ON SCHEMA public 
ALTER SCHEMA public OWNER 

\q
```

#### Linux/Mac:
```bash
sudo -u postgres psql
# Execute os mesmos comandos SQL acima
```

---

### 2️⃣ Instalar Backend (ViagemExpress)

```bash
# Clonar projeto
cd backend-whatsapp

# Instalar dependências
npm install

# Copiar .env de exemplo
cp .env.example .env
```

#### Configurar .env do Backend

Edite o arquivo `.env`:

```env
# ==================================
# SERVIDOR
# ==================================
NODE_ENV=production
PORT=3000

# ==================================
# POSTGRESQL
# ==================================
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=

# ==================================
# GROQ AI (LLAMA 3.3)
# ==================================
GROQ_API_KEY=gsk_sua_chave_aqui
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MAX_TOKENS=8000
GROQ_TEMPERATURE=0.7

# ==================================
# EVOLUTION API (WhatsApp)
# ==================================
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=

# ==================================
# REDIS (Opcional - para cache)
# ==================================
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ==================================
# LOGS
# ==================================
LOG_LEVEL=info
```

#### Obter Chave Groq (GRATUITA):
1. Acesse: https://console.groq.com/
2. Crie uma conta (grátis!)
3. Vá em "API Keys"
4. Crie uma nova chave
5. Cole no .env em `GROQ_API_KEY`

#### Executar Migrações

```bash
npm run migrate
```

Deve aparecer:
```
✅ Database schema criado com sucesso!
Tabelas criadas:
   * clientes
   * conversations
   * messages
   * viagens
   * orders
   * pagamentos
   * analytics
   * operators
   * settings
```

---

### 3️⃣ Instalar Evolution API

```bash
# Na pasta do projeto backend
cd backend-whatsapp

# Clonar Evolution API
git clone -b main https://github.com/EvolutionAPI/evolution-api.git

cd evolution-api

# Instalar dependências
npm install
```

#### Configurar .env do Evolution API

Copie o `.env.example` e edite:

```bash
cp .env.example .env
```

Cole esta configuração no `.env`:

```env
# ==================================
# SERVIDOR
# ==================================
SERVER_TYPE=http
SERVER_PORT=8080
SERVER_URL=http://localhost:
CORS_ORIGIN=*
CORS_METHODS=POST,GET,PUT,DELETE
CORS_CREDENTIALS=true

# ==================================
# BANCO DE DADOS (POSTGRESQL)
# ==================================
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution_user:SuaSenhaEvolution@localhost:
DATABASE_CONNECTION_CLIENT_NAME=evolution_api
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
DATABASE_SAVE_DATA_LABELS=true
DATABASE_SAVE_DATA_HISTORIC=true

# ==================================
# AUTENTICAÇÃO
# ==================================
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# ==================================
# CONFIGURAÇÕES DE SESSÃO
# ==================================
CONFIG_SESSION_PHONE_CLIENT=
CONFIG_SESSION_PHONE_NAME=Chrome
DEL_INSTANCE=false

# ==================================
# LOGS
# ==================================
LOG_LEVEL=ERROR,WARN,DEBUG,INFO,LOG,VERBOSE
LOG_COLOR=true
LOG_BAILEYS=error

# ==================================
# LIMPEZA AUTOMÁTICA
# ==================================
CLEAN_STORE_CLEANING_INTERVAL=7200
CLEAN_STORE_MESSAGES=true
CLEAN_STORE_MESSAGE_UP_TO_DAYS=30
CLEAN_STORE_CONTACTS=true
CLEAN_STORE_CHATS=true

# ==================================
# QRCODE
# ==================================
QRCODE_LIMIT=30
QRCODE_COLOR=#198754
```

#### Criar Schema Prisma

```bash
# Criar pasta prisma
mkdir prisma

# Criar arquivo schema.prisma
# Cole o conteúdo abaixo no arquivo prisma/schema.prisma
```

**Conteúdo do `prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_CONNECTION_URI")
}

model Instance {
  id                       String    @id @default(uuid())
  name                     String    @unique
  connectionStatus         String?
  ownerJid                 String?
  profileName              String?
  profilePicUrl            String?
  integration              String?
  number                   String?
  businessId               String?
  token                    String?
  clientName               String?
  disconnectionReasonCode  Int?
  disconnectionObject      String?
  disconnectionAt          DateTime?
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  Message  Message[]
  Contact  Contact[]
  Chat     Chat[]
  Webhook  Webhook[]

  @@map("Instance")
}

model Message {
  id               String   @id @default(uuid())
  keyId            String   @map("key_id")
  keyRemoteJid     String   @map("key_remoteJid")
  keyFromMe        Boolean  @map("key_fromMe")
  keyParticipant   String?  @map("key_participant")
  pushName         String?
  message          String?  @db.Text
  messageType      String
  messageTimestamp BigInt
  instanceId       String
  source           String?
  createdAt        DateTime @default(now())

  instance Instance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([keyRemoteJid, instanceId])
  @@index([keyId, keyRemoteJid])
  @@map("Message")
}

model Contact {
  id            String   @id @default(uuid())
  remoteJid     String
  pushName      String?
  profilePicUrl String?
  instanceId    String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  instance Instance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@unique([remoteJid, instanceId])
  @@index([instanceId])
  @@map("Contact")
}

model Chat {
  id          String   @id @default(uuid())
  remoteJid   String
  name        String?
  isGroup     Boolean  @default(false)
  isReadOnly  Boolean  @default(false)
  isArchived  Boolean  @default(false)
  notSpam     Boolean  @default(true)
  unreadCount Int      @default(0)
  instanceId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  instance Instance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@unique([remoteJid, instanceId])
  @@index([instanceId])
  @@map("Chat")
}

model Webhook {
  id         String   @id @default(uuid())
  url        String
  enabled    Boolean  @default(true)
  events     String[]
  instanceId String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  instance Instance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@map("Webhook")
}
```

#### Gerar Prisma e Criar Tabelas

```bash
# Gerar Prisma Client
npx prisma generate --schema=./prisma/schema.prisma

# Criar tabelas no banco
npx prisma db push
```

---

## 🎯 Executar o Sistema

Você precisa rodar **2 servidores** em terminais separados:

### Terminal 1 - Evolution API (WhatsApp)

```bash
cd backend-whatsapp/evolution-api
npm start
```

Deve aparecer:
```
[Evolution API] Repository:Prisma - ON
[Evolution API] HTTP - ON: 8080
```

### Terminal 2 - Backend ViagemExpress

```bash
cd backend-whatsapp
npm run dev
```

Deve aparecer:
```
✅ Groq AI Service inicializado
✅ Evolution API Service inicializado
🚀 Servidor iniciado na porta 3000
✅ Conexão estabelecida com PostgreSQL
```

---

## 📱 Conectar WhatsApp

### 1. Criar Instância

Use **Postman** ou **Insomnia**:

```
POST http://localhost:8080/instance/create

Headers:
apikey: ViagemExpress_SecretKey_2025_Production
Content-Type: application/json

Body:
{
  "instanceName": "viagemexpress",
  "qrcode": true
}
```

### 2. Obter QR Code

```
GET http://localhost:8080/instance/qrcode/viagemexpress

Headers:
apikey: ViagemExpress_SecretKey_2025_Production
```

### 3. Escanear QR Code

1. Copie o base64 retornado
2. Cole no navegador ou em https://base64.guru/converter/decode/image
3. **Escaneie com WhatsApp**:
   - WhatsApp → Configurações → Aparelhos conectados
   - Conectar um aparelho
   - Escaneie o QR Code

### 4. Configurar Webhook

Depois que conectar:

```
POST http://localhost:8080/webhook/set/viagemexpress

Headers:
apikey: ViagemExpress_SecretKey_2025_Production
Content-Type: application/json

Body:
{
  "url": "http://localhost:3000/webhook",
  "enabled": true,
  "events": [
    "messages.upsert",
    "messages.update",
    "connection.update"
  ]
}
```

### 5. Verificar Status

```
GET http://localhost:3000/api/whatsapp/status
```

Resposta quando conectado:
```json
{
  "state": "open",
  "statusReason": 200
}
```

---

## 🧪 Testar o Sistema

### Enviar Mensagem de Teste

Do seu celular, envie para o número do WhatsApp conectado:

```
"Olá, quero comprar uma passagem para o Rio"
```

### O que Acontece:

1. **Evolution API** recebe a mensagem
2. Envia para **backend** via webhook
3. **Backend** processa com **Groq AI (Llama 3.3)**
4. **IA** responde de forma consultiva
5. **Resposta** é enviada de volta ao WhatsApp
6. **Cliente** recebe resposta inteligente!

### Ver nos Logs:

**Terminal 1 (Evolution API):**
```
[Evolution API] Message received
```

**Terminal 2 (Backend):**
```
INFO: Nova mensagem recebida
INFO: Resposta gerada pela IA (Groq/Llama)
INFO: Mensagem enviada
```

---

## 🏗️ Arquitetura

```
┌─────────────┐
│   Cliente   │
│  (WhatsApp) │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Evolution API   │ ◄──── Gerencia conexão WhatsApp
│   (Porta 8080)   │
└────────┬─────────┘
         │ Webhook
         ▼
┌─────────────────────────────────────────┐
│    BACKEND NODE.JS (Porta 3000)         │
│                                          │
│  ┌───────────┐      ┌──────────────┐   │
│  │  Webhook  │──────│  Controller  │   │
│  │  Handler  │      │              │   │
│  └───────────┘      └──────┬───────┘   │
│                            │            │
│  ┌─────────────────────────▼─────────┐ │
│  │        SERVICES LAYER             │ │
│  │                                    │ │
│  │  ┌──────────┐    ┌─────────────┐ │ │
│  │  │ Groq     │    │ Evolution   │ │ │
│  │  │ AI Svc   │    │ API Service │ │ │
│  │  └─────┬────┘    └──────┬──────┘ │ │
│  └────────┼──────────────────┼───────┘ │
│           │                  │         │
│           ▼                  ▼         │
│  ┌──────────────┐   ┌──────────────┐  │
│  │   Database   │   │    Logger    │  │
│  │  PostgreSQL  │   │   Winston    │  │
│  └──────────────┘   └──────────────┘  │
└─────────────────────────────────────────┘
         │                      │
         ▼                      ▼
┌────────────────┐    ┌──────────────┐
│   Groq API     │    │    Logs      │
│  (Llama 3.3)   │    │ error.log    │
└────────────────┘    │ combined.log │
                      └──────────────┘
```

---

## 📊 Estrutura do Banco de Dados

### PostgreSQL - viagemexpress (Backend)

```sql
-- Clientes
clientes (id, telefone, nome, cpf, email)

-- Conversas
conversations (id, cliente_id, telefone, status, ultimo_estado)

-- Mensagens
messages (id, conversation_id, tipo, conteudo, sender, timestamp)

-- Viagens (Catálogo)
viagens (id, origem, destino, data, hora_saida, preco_*, assentos_disponiveis)

-- Pedidos
orders (id, numero_pedido, conversation_id, cliente_id, viagem_id, valor_total, status)

-- Pagamentos
pagamentos (id, order_id, valor, metodo, status, transaction_id)

-- Analytics
analytics (id, data, conversas_iniciadas, vendas_realizadas, receita_total)

-- Operadores
operators (id, nome, email, senha_hash, role, ativo)

-- Configurações
settings (key, value, description)
```

### PostgreSQL - evolution (Evolution API)

```sql
Instance (id, name, connectionStatus, ownerJid, number)
Message (id, keyId, keyRemoteJid, message, instanceId)
Contact (id, remoteJid, pushName, instanceId)
Chat (id, remoteJid, name, isGroup, instanceId)
Webhook (id, url, enabled, events, instanceId)
```

---

## 🔌 API Endpoints

### Backend (Porta 3000)

#### Webhook
```
POST   /webhook                    # Recebe eventos do WhatsApp
```

#### Conversas
```
GET    /api/conversations          # Listar conversas
GET    /api/conversations/:id      # Detalhes da conversa
PATCH  /api/conversations/:id/status  # Atualizar status
```

#### Mensagens
```
GET    /api/messages/:conversationId  # Mensagens da conversa
POST   /api/messages/send            # Enviar mensagem manual
```

#### Pedidos
```
GET    /api/orders                  # Listar pedidos
GET    /api/orders/:id              # Detalhes do pedido
GET    /api/orders/stats/summary    # Estatísticas de vendas
```

#### Analytics
```
GET    /api/analytics/dashboard     # Métricas do dashboard
```

#### WhatsApp
```
GET    /api/whatsapp/qrcode         # Obter QR Code
GET    /api/whatsapp/status         # Status da conexão
POST   /api/whatsapp/connect        # Conectar instância
```

#### Configurações
```
GET    /api/settings                # Listar configurações
PUT    /api/settings/:key           # Atualizar configuração
```

#### Sistema
```
GET    /health                      # Health check
GET    /docs                        # Documentação
```

---

## ⚙️ Configurações

### Personalizar IA

Edite `services/groqAI.js` para alterar:
- Rotas e preços
- Tom do atendimento
- Estratégias de venda
- Informações da empresa

### Configurar via API

```bash
# Mudar tom do atendimento
PUT /api/settings/ai_tone
{
  "value": "professional"  # friendly, professional, formal
}

# Horário de atendimento
PUT /api/settings/business_hours_start
{
  "value": "08:00"
}
```

---

## 📈 Monitoramento

### Ver Logs

```bash
# Backend
tail -f logs/combined.log
tail -f logs/error.log

# Evolution API (no terminal)
```

### Health Checks

```bash
# Backend
curl http://localhost:3000/health

# Evolution API
curl http://localhost:8080
```

### Métricas PostgreSQL

```sql
-- Conversas por dia
SELECT DATE(created_at) as data, COUNT(*) as total
FROM conversations
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at);

-- Taxa de conversão
SELECT 
    COUNT(DISTINCT conversation_id) as conversas,
    COUNT(*) as vendas,
    ROUND(COUNT(*) * 100.0 / COUNT(DISTINCT conversation_id), 2) as taxa
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Receita por dia
SELECT DATE(created_at) as data, SUM(valor_total) as receita
FROM orders
WHERE status = 'confirmado'
GROUP BY DATE(created_at)
ORDER BY data DESC;
```

---

## 🐛 Troubleshooting

### PostgreSQL não conecta
```bash
# Verificar status
# Windows:
Get-Service postgresql*

# Linux:
sudo systemctl status postgresql

# Testar conexão
psql -U viagemexpress_user -d viagemexpress -h localhost
```

### Evolution API não inicia
```bash
# Regenerar Prisma
cd evolution-api
npx prisma generate --schema=./prisma/schema.prisma
npx prisma db push

# Verificar permissões do banco
psql -U postgres -d evolution
GRANT ALL ON SCHEMA public TO evolution_user;
\q
```

### WhatsApp desconecta
```bash
# Ver logs
# Verificar se webhook está configurado
# Recriar instância se necessário
```

### IA não responde
```bash
# Verificar chave Groq no .env
# Confirmar saldo/limite da conta Groq
# Ver logs: grep "Groq" logs/error.log
```

### Porta já em uso
```powershell
# Windows - Encontrar processo
netstat -ano | findstr :3000
Stop-Process -Id [PID] -Force

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

---

## 🚀 Deploy Produção

### Opções Recomendadas

**1. Railway** (Mais Fácil - PostgreSQL incluído)
```bash
railway login
railway init
railway add postgresql
railway up
```

**2. Render** (Gratuito com limitações)
- Conecte repositório GitHub
- Adicione PostgreSQL addon
- Configure variáveis de ambiente
- Deploy automático

**3. VPS (Digital Ocean, AWS, etc)**
```bash
# Instalar PostgreSQL
sudo apt install postgresql

# Instalar PM2
npm install -g pm2

# Iniciar backend
pm2 start src/server.js --name viagemexpress-backend

# Iniciar Evolution API
cd evolution-api
pm2 start npm --name evolution-api -- start

# Salvar processos
pm2 save
pm2 startup

# Nginx reverse proxy
sudo apt install nginx
# Configure SSL com Let's Encrypt
```

---

## 💡 Vantagens do Groq (Llama 3.3)

- ⚡ **10x MAIS RÁPIDO** que GPT-4 e Claude
- 💰 **Muito mais barato** (tier gratuito generoso)
- 🔥 **Qualidade excelente** - Llama 3.3 70B
- 🎯 **Mesmo desempenho** em vendas consultivas
- 🚀 **Infraestrutura otimizada** para velocidade

---

## 📝 Licença

MIT License - Livre para uso comercial

---

## 🤝 Suporte

Para dúvidas:
1. Consulte este README
2. Veja logs em `logs/`
3. Verifique `/docs` endpoint
4. Monitore métricas em `/api/analytics/dashboard`

---

## 🎉 Créditos

- **Evolution API**: WhatsApp Web integration
- **Groq**: Infraestrutura de IA ultrarrápida
- **Meta AI**: Llama 3.3 70B model
- **Express.js**: Framework web
- **PostgreSQL**: Banco de dados robusto
- **Node.js**: Runtime JavaScript

---

**Desenvolvido wandersonlopes33

**Versão**: 2.0.0  
**Última atualização**: Fevereiro 2025  
**Stack**: Node.js + PostgreSQL + Groq (Llama 3.3) + Evolution API
