# ViagemExpress - Backend WhatsApp

Sistema profissional de atendimento via WhatsApp com IA para vendas de passagens rodoviárias.

## 📁 Estrutura Criada

```
src/
├── services/
│   ├── evolutionAPI.js      # Comunicação com Evolution API
│   ├── aiService.js          # Integração com IA (Groq/Llama)
│   └── conversationService.js # Gerenciamento de conversas
├── routes/
│   ├── whatsapp.js          # Rotas de controle WhatsApp
│   ├── webhook.js           # Recebimento de webhooks
│   ├── conversations.js     # Gestão de conversas
│   ├── messages.js          # Envio/recebimento de mensagens
│   ├── orders.js            # Pedidos (em desenvolvimento)
│   ├── analytics.js         # Métricas e relatórios
│   └── settings.js          # Configurações do sistema
├── controllers/
│   └── messageController.js # Processamento de mensagens
├── utils/
│   └── logger.js            # Sistema de logs
└── server.js                # Servidor principal

database/
└── schema.sql               # Schema do banco de dados PostgreSQL
```

## 🚀 Instalação

### 1. Copiar arquivos para o projeto

Copie todos os arquivos desta estrutura para o seu projeto:

```powershell
# No Windows PowerShell
Copy-Item -Path "C:\caminho\para\estrutura\*" -Destination "C:\sat\atendentedepassagens\backend-whatsapp\" -Recurse -Force
```

### 2. Criar o banco de dados

```powershell
# Conectar ao PostgreSQL
psql -U viagemexpress_user -h localhost -d viagemexpress

# Executar o schema
\i C:/sat/atendentedepassagens/backend-whatsapp/database/schema.sql

# Verificar tabelas criadas
\dt
```

### 3. Atualizar o arquivo .env

Certifique-se de que as seguintes variáveis estejam corretas:

```env
# Evolution API - IMPORTANTE: Usar a mesma API Key
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=ViagemExpress_SecretKey_2025_Production
EVOLUTION_INSTANCE_NAME=viagemexpress

# Groq AI
GROQ_API_KEY=sua_chave_aqui
GROQ_MODEL=llama-3.3-70b-versatile
```

### 4. Instalar dependências (se necessário)

```powershell
npm install axios winston winston-daily-rotate-file
```

### 5. Iniciar o backend

```powershell
cd C:\sat\atendentedepassagens\backend-whatsapp
npm run dev
```

## 📱 Como usar

### 1. Conectar WhatsApp

Acesse no navegador:
```
http://localhost:3000/api/whatsapp/qrcode
```

Escaneie o QR Code com seu WhatsApp.

### 2. Testar o webhook

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/webhook/test" -Method GET
```

### 3. Verificar status

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp/status"
```

### 4. Enviar mensagem de teste

```powershell
$body = @{
    phoneNumber = "5511999999999"
    message = "Olá! Esta é uma mensagem de teste."
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/messages/send" -Method POST -Body $body -ContentType "application/json"
```

## 🔧 Endpoints Principais

### WhatsApp
- `GET /api/whatsapp/status` - Status da conexão
- `GET /api/whatsapp/qrcode` - Gerar QR Code
- `POST /api/whatsapp/connect` - Conectar instância
- `DELETE /api/whatsapp/disconnect` - Desconectar
- `PUT /api/whatsapp/restart` - Reiniciar instância

### Conversas
- `GET /api/conversations` - Listar conversas
- `GET /api/conversations/:id` - Detalhes da conversa
- `PATCH /api/conversations/:id/status` - Atualizar status

### Mensagens
- `GET /api/messages/:conversationId` - Mensagens da conversa
- `POST /api/messages/send` - Enviar mensagem manual

### Analytics
- `GET /api/analytics/dashboard` - Métricas do dashboard

### Webhook
- `POST /webhook` - Receber eventos do WhatsApp

## 🔐 Segurança

- Rate limiting configurado (100 requisições/15min)
- Helmet para headers de segurança
- CORS configurado
- Logs detalhados

## 📊 Banco de Dados

Tabelas criadas:
- `conversations` - Conversas com clientes
- `messages` - Histórico de mensagens
- `orders` - Pedidos de passagens
- `analytics_events` - Eventos para análise
- `system_settings` - Configurações do sistema

## 🤖 IA (Groq/Llama)

O sistema usa Groq com Llama 3.3 70B por padrão. Para trocar:

```env
LLM_PROVIDER=anthropic  # ou openai, ollama
```

## 📝 Logs

Logs são salvos em:
- Console (desenvolvimento)
- `logs/error-YYYY-MM-DD.log` (erros)
- `logs/combined-YYYY-MM-DD.log` (tudo)

## ⚠️ Problemas Comuns

### 1. Erro 401 no Evolution API
**Solução:** Verificar se EVOLUTION_API_KEY é igual em ambos os .env

### 2. WhatsApp não conecta
**Solução:** 
- Verificar se Evolution API está rodando (porta 8080)
- Gerar novo QR Code
- Reiniciar instância

### 3. Mensagens não são processadas
**Solução:**
- Verificar logs do webhook
- Confirmar que o webhook está configurado no Evolution API
- Verificar conexão com banco de dados

## 🛠️ Desenvolvimento

### Estrutura de uma nova rota

```javascript
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
    try {
        // Sua lógica aqui
        res.json({ success: true, data: {} });
    } catch (error) {
        logger.error('Erro', { error: error.message });
        res.status(500).json({ success: false, error: 'Erro' });
    }
});

module.exports = router;
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs em `logs/`
2. Consultar documentação do Evolution API
3. Revisar configurações no `.env`

## 🎯 Próximos Passos

- [ ] Implementar sistema completo de pedidos
- [ ] Adicionar autenticação JWT
- [ ] Criar painel administrativo
- [ ] Integrar com gateway de pagamento
- [ ] Adicionar suporte a múltiplas instâncias
- [ ] Implementar fila de mensagens com Redis
- [ ] Criar testes automatizados
