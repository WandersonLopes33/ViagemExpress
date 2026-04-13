const evolutionAPI = require('../services/evolutionAPI');
const aiService = require('../services/aiService');
const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');

class MessageController {
    /**
     * Processar mensagem recebida
     */
    async handleIncomingMessage(messageData) {
        try {
            const phoneNumber = messageData.key.remoteJid;
            const isGroup = phoneNumber.includes('@g.us');
            
            // Ignorar mensagens de grupos por enquanto
            if (isGroup) {
                return;
            }

            // Extrair texto da mensagem
            const messageText = this.extractMessageText(messageData);
            
            if (!messageText) {
                logger.warn('Mensagem sem texto', { messageData });
                return;
            }

            // Buscar ou criar conversa
            const conversation = await conversationService.getOrCreateConversation(phoneNumber);
            
            // Salvar mensagem do usuário
            await conversationService.saveMessage(conversation.id, {
                sender: 'user',
                content: messageText,
                messageType: messageData.messageType,
                timestamp: new Date(messageData.messageTimestamp * 1000)
            });

            // Marcar mensagem como lida
            await evolutionAPI.markAsRead(messageData.key.id);

            // Mostrar que está digitando
            await evolutionAPI.setPresence(phoneNumber, 'composing');

            // Obter histórico da conversa
            const messages = await conversationService.getMessages(conversation.id);

            // Gerar resposta da IA
            const aiResponse = await aiService.generateResponse(messages, messageText);

            // Remover "digitando"
            await evolutionAPI.setPresence(phoneNumber, 'available');

            // Enviar resposta
            await evolutionAPI.sendTextMessage(phoneNumber, aiResponse);

            // Salvar resposta da IA
            await conversationService.saveMessage(conversation.id, {
                sender: 'assistant',
                content: aiResponse,
                messageType: 'text',
                timestamp: new Date()
            });

            // Atualizar última interação
            await conversationService.updateLastInteraction(conversation.id);

            logger.info('Mensagem processada com sucesso', {
                phoneNumber,
                userMessage: messageText,
                aiResponse: aiResponse.substring(0, 100)
            });

        } catch (error) {
            logger.error('Erro ao processar mensagem', {
                error: error.message,
                stack: error.stack
            });
            
            // Tentar enviar mensagem de erro ao usuário
            try {
                const phoneNumber = messageData.key.remoteJid;
                await evolutionAPI.sendTextMessage(
                    phoneNumber, 
                    'Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente em alguns instantes.'
                );
            } catch (sendError) {
                logger.error('Erro ao enviar mensagem de erro', { error: sendError.message });
            }
        }
    }

    /**
     * Extrair texto da mensagem
     */
    extractMessageText(messageData) {
        const message = messageData.message;
        
        if (message.conversation) {
            return message.conversation;
        }
        
        if (message.extendedTextMessage?.text) {
            return message.extendedTextMessage.text;
        }
        
        if (message.imageMessage?.caption) {
            return message.imageMessage.caption;
        }
        
        if (message.videoMessage?.caption) {
            return message.videoMessage.caption;
        }
        
        if (message.documentMessage?.caption) {
            return message.documentMessage.caption;
        }
        
        return null;
    }

    /**
     * Enviar mensagem manual
     */
    async sendManualMessage(phoneNumber, messageText) {
        try {
            // Buscar ou criar conversa
            const conversation = await conversationService.getOrCreateConversation(phoneNumber);
            
            // Enviar mensagem
            await evolutionAPI.sendTextMessage(phoneNumber, messageText);
            
            // Salvar no banco
            await conversationService.saveMessage(conversation.id, {
                sender: 'assistant',
                content: messageText,
                messageType: 'text',
                timestamp: new Date(),
                isManual: true
            });
            
            logger.info('Mensagem manual enviada', { phoneNumber, messageText });
            
            return { success: true };
        } catch (error) {
            logger.error('Erro ao enviar mensagem manual', { 
                error: error.message,
                phoneNumber 
            });
            throw error;
        }
    }
}

module.exports = new MessageController();
