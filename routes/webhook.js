const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../services/database');
const groqAI = require('../services/groqAI');
const evolutionAPI = require('../services/evolutionAPI');

router.post('/', async (req, res) => {
    try {
        const { event, instance, data } = req.body;

        logger.info('Webhook recebido', { event, instance });

        if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
            const message = data.key ? data : data.messages?.[0];
            
            if (!message) {
                return res.status(200).json({ success: true, message: 'No message to process' });
            }

            const { key, message: messageContent, pushName } = message;
            const phoneNumber = key.remoteJid.replace('@s.whatsapp.net', '');
            
            if (key.fromMe) {
                return res.status(200).json({ success: true, message: 'Own message ignored' });
            }

            if (key.remoteJid.includes('@g.us')) {
                return res.status(200).json({ success: true, message: 'Group message ignored' });
            }

            const messageText = messageContent?.conversation || 
                               messageContent?.extendedTextMessage?.text || 
                               '';

            if (!messageText) {
                return res.status(200).json({ success: true, message: 'No text in message' });
            }

            logger.info('Mensagem recebida', {
                from: phoneNumber,
                name: pushName,
                message: messageText.substring(0, 100)
            });

            try {
                await evolutionAPI.markAsRead(phoneNumber, key.id);
            } catch (error) {
                logger.warn('Erro ao marcar como lida', { error: error.message });
            }

            let clienteResult = await db.query(
                'SELECT id FROM clientes WHERE telefone = $1',
                [phoneNumber]
            );

            let clienteId;
            if (clienteResult.rows.length === 0) {
                const insertResult = await db.query(
                    'INSERT INTO clientes (telefone, nome) VALUES ($1, $2) RETURNING id',
                    [phoneNumber, pushName || 'Cliente']
                );
                clienteId = insertResult.rows[0].id;
                logger.info('Novo cliente criado', { clienteId, telefone: phoneNumber });
            } else {
                clienteId = clienteResult.rows[0].id;
            }

            let conversationResult = await db.query(
                'SELECT id, status FROM conversations WHERE telefone = $1 AND status != $2',
                [phoneNumber, 'closed']
            );

            let conversationId;
            if (conversationResult.rows.length === 0) {
                const insertResult = await db.query(
                    'INSERT INTO conversations (cliente_id, telefone, status) VALUES ($1, $2, $3) RETURNING id',
                    [clienteId, phoneNumber, 'active']
                );
                conversationId = insertResult.rows[0].id;
                logger.info('Nova conversa criada', { conversationId, telefone: phoneNumber });
            } else {
                conversationId = conversationResult.rows[0].id;
            }

            await db.query(
                'INSERT INTO messages (conversation_id, sender, conteudo, tipo, timestamp) VALUES ($1, $2, $3, $4, NOW())',
                [conversationId, 'customer', messageText, 'text']
            );

            const transferKeywords = ['atendente', 'humano', 'pessoa', 'falar com alguém'];
            const shouldTransfer = transferKeywords.some(keyword => 
                messageText.toLowerCase().includes(keyword)
            );

            if (shouldTransfer) {
                await db.query(
                    'UPDATE conversations SET transferido_para_humano = TRUE WHERE id = $1',
                    [conversationId]
                );

                const transferMessage = 'Entendi! Vou transferir você para um atendente humano. Aguarde um momento! 👨‍💼';
                
                await evolutionAPI.sendTextMessage(phoneNumber, transferMessage);
                
                await db.query(
                    'INSERT INTO messages (conversation_id, sender, conteudo, tipo, timestamp) VALUES ($1, $2, $3, $4, NOW())',
                    [conversationId, 'bot', transferMessage, 'text']
                );

                logger.info('Conversa transferida para humano', { conversationId });
                
                return res.status(200).json({ success: true, transferred: true });
            }

            try {
                await evolutionAPI.sendTyping(phoneNumber, true);
            } catch (error) {
                logger.warn('Erro ao enviar typing', { error: error.message });
            }

            const aiResult = await groqAI.generateResponse(conversationId, messageText);

            try {
                await evolutionAPI.sendTyping(phoneNumber, false);
            } catch (error) {
                logger.warn('Erro ao parar typing', { error: error.message });
            }

            if (aiResult.success) {
                await evolutionAPI.sendTextMessage(phoneNumber, aiResult.response);

                await db.query(
                    'INSERT INTO messages (conversation_id, sender, conteudo, tipo, timestamp, metadata) VALUES ($1, $2, $3, $4, NOW(), $5)',
                    [conversationId, 'bot', aiResult.response, 'text', JSON.stringify(aiResult.metadata)]
                );

                const sentiment = groqAI.analyzeSentiment(messageText);
                const intent = groqAI.detectIntent(messageText);

                await db.query(
                    'UPDATE conversations SET ultimo_estado = $1, updated_at = NOW() WHERE id = $2',
                    [intent, conversationId]
                );

                logger.info('Resposta enviada', {
                    conversationId,
                    responseLength: aiResult.response.length,
                    sentiment,
                    intent
                });
            } else {
                logger.error('Falha ao gerar resposta IA', { conversationId });
                
                const fallbackMessage = 'Desculpe, estou com dificuldades no momento. Um atendente será notificado.';
                await evolutionAPI.sendTextMessage(phoneNumber, fallbackMessage);
            }

            return res.status(200).json({ success: true });
        }

        res.status(200).json({ success: true });

    } catch (error) {
        logger.error('Erro no webhook', {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: 'Erro ao processar webhook'
        });
    }
});

module.exports = router;