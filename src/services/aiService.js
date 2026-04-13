const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        this.provider = process.env.LLM_PROVIDER || 'groq';
        this.initializeProvider();
    }

    initializeProvider() {
        switch (this.provider) {
            case 'groq':
                this.client = axios.create({
                    baseURL: 'https://api.groq.com/openai/v1',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 30000
                });
                this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
                this.maxTokens = parseInt(process.env.GROQ_MAX_TOKENS) || 8000;
                this.temperature = parseFloat(process.env.GROQ_TEMPERATURE) || 0.7;
                break;

            case 'anthropic':
                this.client = axios.create({
                    baseURL: 'https://api.anthropic.com/v1',
                    headers: {
                        'x-api-key': process.env.ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    },
                    timeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 30000
                });
                this.model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
                this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS) || 8000;
                this.temperature = parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.7;
                break;

            case 'openai':
                this.client = axios.create({
                    baseURL: 'https://api.openai.com/v1',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 30000
                });
                this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
                this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 8000;
                this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
                break;

            default:
                throw new Error(`Provider ${this.provider} não suportado`);
        }

        logger.info('Groq AI Service inicializado', {
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature
        });
    }

    /**
     * Sistema de prompt para vendas de passagens
     */
    getSystemPrompt() {
        return `Você é um atendente virtual especializado da ViagemExpress, empresa de vendas de passagens rodoviárias.

SEU PAPEL:
- Ser cordial, prestativo e profissional
- Entender as necessidades do cliente sobre viagens de ônibus
- Coletar informações: origem, destino, data, quantidade de passageiros
- Apresentar opções de horários e valores
- Explicar formas de pagamento (PIX com ${process.env.PIX_DISCOUNT_PERCENTAGE || 5}% desconto, cartão)
- Confirmar dados e finalizar vendas

DIRETRIZES:
- Sempre cumprimente o cliente no início
- Seja objetivo mas amigável
- Faça uma pergunta por vez
- Confirme informações importantes
- Não invente horários ou valores - apenas use dados fornecidos
- Se não tiver informação, explique que vai consultar
- Ao final, resuma o pedido e peça confirmação

HORÁRIO DE ATENDIMENTO: ${process.env.BUSINESS_HOURS_START || '08:00'} às ${process.env.BUSINESS_HOURS_END || '22:00'}

FORMAS DE PAGAMENTO:
- PIX: ${process.env.PIX_DISCOUNT_PERCENTAGE || 5}% de desconto
- Cartão de crédito: até 3x sem juros
- Cartão de débito

Tom de voz: ${process.env.AI_TONE || 'friendly'} e profissional.`;
    }

    /**
     * Gerar resposta da IA
     */
    async generateResponse(messages, userMessage) {
        try {
            const conversationHistory = this.formatMessages(messages);
            
            let response;
            
            if (this.provider === 'anthropic') {
                response = await this.client.post('/messages', {
                    model: this.model,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    system: this.getSystemPrompt(),
                    messages: conversationHistory
                });
                return response.data.content[0].text;
            } else {
                // Groq e OpenAI usam o mesmo formato
                response = await this.client.post('/chat/completions', {
                    model: this.model,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    messages: [
                        { role: 'system', content: this.getSystemPrompt() },
                        ...conversationHistory
                    ]
                });
                return response.data.choices[0].message.content;
            }
        } catch (error) {
            logger.error('Erro ao gerar resposta da IA', {
                error: error.message,
                provider: this.provider,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Formatar histórico de mensagens
     */
    formatMessages(messages) {
        return messages.slice(-10).map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
    }

    /**
     * Analisar intenção do usuário
     */
    async analyzeIntent(message) {
        try {
            const prompt = `Analise a seguinte mensagem e identifique a intenção principal. 
Retorne APENAS uma das opções: NOVA_VIAGEM, CONSULTA_PRECO, CANCELAMENTO, HORARIOS, DUVIDA, SAUDACAO, AGRADECIMENTO, OUTRO

Mensagem: "${message}"

Responda apenas com a intenção, sem explicações.`;

            let response;
            
            if (this.provider === 'anthropic') {
                response = await this.client.post('/messages', {
                    model: this.model,
                    max_tokens: 50,
                    messages: [{ role: 'user', content: prompt }]
                });
                return response.data.content[0].text.trim();
            } else {
                response = await this.client.post('/chat/completions', {
                    model: this.model,
                    max_tokens: 50,
                    messages: [{ role: 'user', content: prompt }]
                });
                return response.data.choices[0].message.content.trim();
            }
        } catch (error) {
            logger.error('Erro ao analisar intenção', { error: error.message });
            return 'OUTRO';
        }
    }

    /**
     * Extrair informações estruturadas (origem, destino, data)
     */
    async extractTravelInfo(message) {
        try {
            const prompt = `Extraia as informações de viagem da mensagem. 
Retorne um JSON com: origem, destino, data, passageiros (número).
Se algum campo não estiver presente, use null.

Mensagem: "${message}"

Retorne APENAS o JSON, sem texto adicional.`;

            let response;
            
            if (this.provider === 'anthropic') {
                response = await this.client.post('/messages', {
                    model: this.model,
                    max_tokens: 200,
                    messages: [{ role: 'user', content: prompt }]
                });
                return JSON.parse(response.data.content[0].text);
            } else {
                response = await this.client.post('/chat/completions', {
                    model: this.model,
                    max_tokens: 200,
                    messages: [{ role: 'user', content: prompt }]
                });
                return JSON.parse(response.data.choices[0].message.content);
            }
        } catch (error) {
            logger.error('Erro ao extrair informações', { error: error.message });
            return { origem: null, destino: null, data: null, passageiros: null };
        }
    }

    /**
     * Gerar resumo da conversa
     */
    async summarizeConversation(messages) {
        try {
            const conversation = messages.map(m => 
                `${m.sender === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`
            ).join('\n');

            const prompt = `Resuma esta conversa de atendimento em 2-3 frases:

${conversation}

Foque no que o cliente solicitou e qual foi o resultado.`;

            let response;
            
            if (this.provider === 'anthropic') {
                response = await this.client.post('/messages', {
                    model: this.model,
                    max_tokens: 200,
                    messages: [{ role: 'user', content: prompt }]
                });
                return response.data.content[0].text;
            } else {
                response = await this.client.post('/chat/completions', {
                    model: this.model,
                    max_tokens: 200,
                    messages: [{ role: 'user', content: prompt }]
                });
                return response.data.choices[0].message.content;
            }
        } catch (error) {
            logger.error('Erro ao gerar resumo', { error: error.message });
            return 'Conversa sobre viagem de ônibus';
        }
    }
}

module.exports = new AIService();
