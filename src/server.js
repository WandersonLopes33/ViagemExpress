require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Importar rotas
const webhookRoutes = require('../routes/webhook');
const conversationRoutes = require('../routes/conversations');
const messageRoutes = require('../routes/messages');
const orderRoutes = require('../routes/orders');
const analyticsRoutes = require('../routes/analytics');
const settingsRoutes = require('../routes/settings');
const whatsappRoutes = require('../routes/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de segurança
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de 100 requisições por IP
    message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Rotas da API
app.use('/webhook', webhookRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Rota principal
app.get('/', (req, res) => {
    res.json({
        name: 'ViagemExpress WhatsApp Bot API',
        version: '1.0.0',
        description: 'Sistema profissional de atendimento via WhatsApp com IA',
        endpoints: {
            health: '/health',
            webhook: '/webhook',
            api: {
                conversations: '/api/conversations',
                messages: '/api/messages',
                orders: '/api/orders',
                analytics: '/api/analytics',
                settings: '/api/settings',
                whatsapp: '/api/whatsapp'
            }
        },
        documentation: '/docs',
        status: 'online'
    });
});

// Documentação básica
app.get('/docs', (req, res) => {
    res.json({
        title: 'ViagemExpress API Documentation',
        version: '1.0.0',
        baseURL: `http://localhost:${PORT}`,
        authentication: 'Bearer Token (JWT)',
        endpoints: [
            {
                group: 'Webhook',
                description: 'Recebe eventos do WhatsApp',
                routes: [
                    {
                        method: 'POST',
                        path: '/webhook',
                        description: 'Recebe mensagens do WhatsApp',
                        auth: false
                    }
                ]
            },
            {
                group: 'Conversas',
                description: 'Gerenciar conversas',
                routes: [
                    {
                        method: 'GET',
                        path: '/api/conversations',
                        description: 'Listar todas as conversas',
                        auth: true
                    },
                    {
                        method: 'GET',
                        path: '/api/conversations/:id',
                        description: 'Obter detalhes de uma conversa',
                        auth: true
                    },
                    {
                        method: 'PATCH',
                        path: '/api/conversations/:id/status',
                        description: 'Atualizar status da conversa',
                        auth: true
                    }
                ]
            },
            {
                group: 'Mensagens',
                description: 'Gerenciar mensagens',
                routes: [
                    {
                        method: 'GET',
                        path: '/api/messages/:conversationId',
                        description: 'Obter mensagens de uma conversa',
                        auth: true
                    },
                    {
                        method: 'POST',
                        path: '/api/messages/send',
                        description: 'Enviar mensagem manualmente',
                        auth: true
                    }
                ]
            },
            {
                group: 'Pedidos',
                description: 'Gerenciar vendas',
                routes: [
                    {
                        method: 'GET',
                        path: '/api/orders',
                        description: 'Listar todos os pedidos',
                        auth: true
                    },
                    {
                        method: 'GET',
                        path: '/api/orders/:id',
                        description: 'Obter detalhes de um pedido',
                        auth: true
                    }
                ]
            },
            {
                group: 'Analytics',
                description: 'Métricas e relatórios',
                routes: [
                    {
                        method: 'GET',
                        path: '/api/analytics/dashboard',
                        description: 'Obter métricas do dashboard',
                        auth: true
                    },
                    {
                        method: 'GET',
                        path: '/api/analytics/report',
                        description: 'Gerar relatório personalizado',
                        auth: true
                    }
                ]
            },
            {
                group: 'WhatsApp',
                description: 'Controlar conexão WhatsApp',
                routes: [
                    {
                        method: 'GET',
                        path: '/api/whatsapp/qrcode',
                        description: 'Obter QR Code para conexão',
                        auth: true
                    },
                    {
                        method: 'GET',
                        path: '/api/whatsapp/status',
                        description: 'Verificar status da conexão',
                        auth: true
                    }
                ]
            }
        ]
    });
});

// Tratamento de erros 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        path: req.path,
        method: req.method
    });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    logger.error('Erro na aplicação', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Iniciar servidor
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        logger.info(`🚀 Servidor iniciado na porta ${PORT}`);
        logger.info(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📚 Documentação: http://localhost:${PORT}/docs`);
        logger.info(`💚 Health check: http://localhost:${PORT}/health`);
        
        // Conectar ao WhatsApp automaticamente
        const evolutionAPI = require('../services/evolutionAPI');
        evolutionAPI.getConnectionStatus()
            .then(status => {
                logger.info('Status WhatsApp:', status);
            })
            .catch(err => {
                logger.warn('WhatsApp não conectado. Use /api/whatsapp/qrcode para conectar');
            });
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM recebido. Encerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT recebido. Encerrando servidor...');
    process.exit(0);
});

module.exports = app;
