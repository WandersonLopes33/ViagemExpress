const { Pool } = require('pg');
const logger = require('../utils/logger');

class ConversationService {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: parseInt(process.env.DB_POOL_MAX) || 20,
            min: parseInt(process.env.DB_POOL_MIN) || 2
        });

        this.pool.on('error', (err) => {
            logger.error('Erro inesperado no pool do PostgreSQL', { error: err.message });
        });
    }

    /**
     * Buscar ou criar conversa
     */
    async getOrCreateConversation(phoneNumber) {
        try {
            // Tentar buscar conversa existente
            const selectQuery = `
                SELECT * FROM conversations 
                WHERE phone_number = $1 
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            
            let result = await this.pool.query(selectQuery, [phoneNumber]);
            
            if (result.rows.length > 0) {
                return result.rows[0];
            }

            // Criar nova conversa
            const insertQuery = `
                INSERT INTO conversations (phone_number, status, created_at, updated_at)
                VALUES ($1, 'active', NOW(), NOW())
                RETURNING *
            `;
            
            result = await this.pool.query(insertQuery, [phoneNumber]);
            
            logger.info('Nova conversa criada', { 
                phoneNumber, 
                conversationId: result.rows[0].id 
            });
            
            return result.rows[0];

        } catch (error) {
            logger.error('Erro ao buscar/criar conversa', { 
                error: error.message,
                phoneNumber 
            });
            throw error;
        }
    }

    /**
     * Salvar mensagem
     */
    async saveMessage(conversationId, messageData) {
        try {
            const query = `
                INSERT INTO messages (
                    conversation_id, 
                    sender, 
                    content, 
                    message_type, 
                    created_at,
                    is_manual
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            
            const values = [
                conversationId,
                messageData.sender,
                messageData.content,
                messageData.messageType || 'text',
                messageData.timestamp || new Date(),
                messageData.isManual || false
            ];
            
            const result = await this.pool.query(query, values);
            return result.rows[0];

        } catch (error) {
            logger.error('Erro ao salvar mensagem', { 
                error: error.message,
                conversationId 
            });
            throw error;
        }
    }

    /**
     * Obter mensagens da conversa
     */
    async getMessages(conversationId, limit = null) {
        try {
            const maxLimit = limit || parseInt(process.env.MAX_CONVERSATION_HISTORY) || 10;
            
            const query = `
                SELECT * FROM messages 
                WHERE conversation_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2
            `;
            
            const result = await this.pool.query(query, [conversationId, maxLimit]);
            
            // Retornar na ordem cronológica (mais antiga primeiro)
            return result.rows.reverse();

        } catch (error) {
            logger.error('Erro ao buscar mensagens', { 
                error: error.message,
                conversationId 
            });
            throw error;
        }
    }

    /**
     * Atualizar última interação
     */
    async updateLastInteraction(conversationId) {
        try {
            const query = `
                UPDATE conversations 
                SET updated_at = NOW(), last_message_at = NOW()
                WHERE id = $1
            `;
            
            await this.pool.query(query, [conversationId]);

        } catch (error) {
            logger.error('Erro ao atualizar última interação', { 
                error: error.message,
                conversationId 
            });
        }
    }

    /**
     * Atualizar status da conversa
     */
    async updateStatus(conversationId, status) {
        try {
            const query = `
                UPDATE conversations 
                SET status = $1, updated_at = NOW()
                WHERE id = $2
                RETURNING *
            `;
            
            const result = await this.pool.query(query, [status, conversationId]);
            return result.rows[0];

        } catch (error) {
            logger.error('Erro ao atualizar status', { 
                error: error.message,
                conversationId,
                status 
            });
            throw error;
        }
    }

    /**
     * Listar conversas ativas
     */
    async listConversations(filters = {}) {
        try {
            let query = 'SELECT * FROM conversations WHERE 1=1';
            const values = [];
            let paramCount = 1;

            if (filters.status) {
                query += ` AND status = $${paramCount}`;
                values.push(filters.status);
                paramCount++;
            }

            if (filters.dateFrom) {
                query += ` AND created_at >= $${paramCount}`;
                values.push(filters.dateFrom);
                paramCount++;
            }

            if (filters.dateTo) {
                query += ` AND created_at <= $${paramCount}`;
                values.push(filters.dateTo);
                paramCount++;
            }

            query += ' ORDER BY updated_at DESC';

            if (filters.limit) {
                query += ` LIMIT $${paramCount}`;
                values.push(filters.limit);
            }

            const result = await this.pool.query(query, values);
            return result.rows;

        } catch (error) {
            logger.error('Erro ao listar conversas', { error: error.message });
            throw error;
        }
    }

    /**
     * Obter estatísticas
     */
    async getStats(dateFrom, dateTo) {
        try {
            const query = `
                SELECT 
                    COUNT(DISTINCT id) as total_conversations,
                    COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_conversations,
                    COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as completed_conversations,
                    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
                FROM conversations
                WHERE created_at BETWEEN $1 AND $2
            `;
            
            const result = await this.pool.query(query, [dateFrom, dateTo]);
            return result.rows[0];

        } catch (error) {
            logger.error('Erro ao obter estatísticas', { error: error.message });
            throw error;
        }
    }

    /**
     * Fechar pool de conexões
     */
    async close() {
        await this.pool.end();
    }
}

module.exports = new ConversationService();
