const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const logger = require('../utils/logger');

/**
 * POST /webhook
 * Receber eventos do Evolution API
 */
router.post('/', async (req, res) => {
    try {
        const event = req.body;
        
        logger.info('Webhook recebido', {
            event: event.event,
            instance: event.instance,
            data: event.data
        });

        // Responder imediatamente para não bloquear o webhook
        res.status(200).json({ success: true, message: 'Evento recebido' });

        // Processar evento de forma assíncrona
        processWebhookEvent(event).catch(error => {
            logger.error('Erro ao processar webhook', { 
                error: error.message,
                event: event.event 
            });
        });

    } catch (error) {
        logger.error('Erro no webhook', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Processar diferentes tipos de eventos
 */
async function processWebhookEvent(event) {
    switch (event.event) {
        case 'messages.upsert':
            await handleNewMessage(event);
            break;
            
        case 'connection.update':
            await handleConnectionUpdate(event);
            break;
            
        case 'qrcode.updated':
            await handleQRCodeUpdate(event);
            break;
            
        case 'messages.update':
            await handleMessageUpdate(event);
            break;
            
        default:
            logger.debug('Evento não tratado', { event: event.event });
    }
}

/**
 * Tratar nova mensagem recebida
 */
async function handleNewMessage(event) {
    try {
        const message = event.data;
        
        // Ignorar mensagens do próprio bot
        if (message.key.fromMe) {
            return;
        }
        
        // Ignorar mensagens de status
        if (message.key.remoteJid === 'status@broadcast') {
            return;
        }

        logger.info('Nova mensagem recebida', {
            from: message.key.remoteJid,
            messageType: message.messageType,
            text: message.message?.conversation || message.message?.extendedTextMessage?.text
        });

        // Delegar para o controller processar
        await messageController.handleIncomingMessage(message);

    } catch (error) {
        logger.error('Erro ao tratar mensagem', { error: error.message });
    }
}

/**
 * Tratar atualização de conexão
 */
async function handleConnectionUpdate(event) {
    const status = event.data;
    
    logger.info('Status da conexão atualizado', {
        instance: event.instance,
        state: status.state,
        statusReason: status.statusReason
    });

    // Aqui você pode adicionar lógica para reconectar automaticamente
    // ou notificar administradores sobre desconexões
}

/**
 * Tratar atualização de QR Code
 */
async function handleQRCodeUpdate(event) {
    logger.info('QR Code atualizado', {
        instance: event.instance,
        qrcode: event.data.qrcode ? 'Disponível' : 'Não disponível'
    });
}

/**
 * Tratar atualização de mensagem (lida, entregue, etc)
 */
async function handleMessageUpdate(event) {
    logger.debug('Mensagem atualizada', {
        messageId: event.data.key?.id,
        status: event.data.update?.status
    });
}

/**
 * GET /webhook/test
 * Testar webhook (para desenvolvimento)
 */
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook está funcionando!',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
