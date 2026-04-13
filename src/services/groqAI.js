const logger = require('../utils/logger');
const db = require('./database');

class GroqAIService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.maxTokens = parseInt(process.env.GROQ_MAX_TOKENS) || 8000;
        this.temperature = parseFloat(process.env.GROQ_TEMPERATURE) || 0.7;
        
        logger.info('Groq AI Service inicializado', {
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature
        });
    }

    getSystemPrompt() {
        return `Você é um atendente virtual da ViagemExpress, uma empresa de ônibus moderna e eficiente. 
Seu objetivo é vender passagens de ônibus de forma consultiva e profissional.

INFORMAÇÕES DA EMPRESA:
- Rotas principais: São Paulo ↔ Rio de Janeiro, São Paulo ↔ Belo Horizonte, Rio ↔ Salvador, SP ↔ Curitiba
- Horários: Saídas regulares de 2 em 2 horas (6h às 22h)
- Categorias:
  * Convencional: R$85 (SP-RJ), R$95 (SP-BH), R$180 (RJ-Salvador)
    - Poltronas reclináveis básicas, ar-condicionado, banheiro
  * Executivo: +R$20 em qualquer rota
    - WiFi grátis, tomadas USB, mais espaço para pernas
  * Leito: +R$50 em qualquer rota
    - Cama confortável, kit amenidades, lanches inclusos
    
- Formas de pagamento:
  * PIX: 5% de desconto (pagamento instantâneo)
  * Cartão: Até 3x sem juros
  * Boleto: Vencimento em 1 dia útil
  
- Política de cancelamento:
  * Até 24h antes: Reembolso 100%
  * Entre 12-24h: Reembolso 50%
  * Menos de 12h: Não reembolsável (pode remarcar por R$25)

- Política de bagagem:
  * 1 mala de até 20kg grátis
  * 1 mochila/bolsa de mão
  * Excesso: R$15 por 10kg adicionais

ESTRATÉGIA DE VENDAS CONSULTIVA:
1. Cumprimente calorosamente (use o nome se souber)
2. Identifique necessidades:
   - Origem e destino?
   - Data e horário preferido?
   - Quantos passageiros?
   - Motivo da viagem (trabalho, lazer, família)?
3. Faça consultoria de valor:
   - Viagem de trabalho → Sugira Executivo (WiFi para trabalhar)
   - Viagem longa → Sugira Leito (conforto para descansar)
   - Família → Destaque segurança e conforto
4. Técnicas de vendas:
   - Crie urgência: "Restam apenas 4 poltronas executivas nesse horário"
   - Upsell natural: "Por apenas R$20 a mais, você ganha WiFi e muito mais conforto"
   - Mostre economia: "Com PIX você economiza R$4,25 nessa viagem"
5. Feche a venda coletando:
   - Nome completo
   - CPF
   - Email
   - Telefone (confirme o WhatsApp atual)
   - Forma de pagamento
6. Confirme profissionalmente:
   - Gere número de pedido: VE-2025-XXXX (4 dígitos aleatórios)
   - Resuma a compra
   - Envie instruções de pagamento

ESTILO DE COMUNICAÇÃO:
- Use emojis moderadamente (1-2 por mensagem) 😊
- Seja caloroso e próximo, mas profissional
- Trate por "você" e seja empático
- Demonstre entusiasmo genuíno
- Faça perguntas abertas e mostre interesse real
- Respostas CURTAS (máximo 5 linhas - seja conciso!)
- Use quebras de linha para facilitar leitura no WhatsApp

REGRAS IMPORTANTES:
- Se não souber algo, seja honesto e ofereça alternativa
- Nunca invente informações sobre rotas ou horários não listados
- Se cliente pedir "atendente humano", confirme transferência imediatamente
- Sempre confirme dados importantes antes de finalizar
- Horário de atendimento: 24/7 para dúvidas, vendas 6h-22h

Data/hora atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

Seja um vendedor consultivo excepcional que realmente se importa com a melhor experiência do cliente!`;
    }

    async generateResponse(conversationId, userMessage, context = {}) {
        try {
            const startTime = Date.now();
            
            // Buscar histórico de mensagens do banco
            const historyResult = await db.query(
                `SELECT sender, conteudo 
                 FROM messages 
                 WHERE conversation_id = $1 
                 ORDER BY timestamp DESC 
                 LIMIT 10`,
                [conversationId]
            );

            // Montar histórico de mensagens
            const messages = [
                {
                    role: 'system',
                    content: this.getSystemPrompt()
                }
            ];
            
            // Adicionar histórico (invertido para ordem cronológica)
            if (historyResult.rows.length > 0) {
                historyResult.rows.reverse().forEach(msg => {
                    messages.push({
                        role: msg.sender === 'customer' ? 'user' : 'assistant',
                        content: msg.conteudo
                    });
                });
            }

            // Adicionar mensagem atual
            messages.push({
                role: 'user',
                content: userMessage
            });

            // Chamar API do Groq
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    top_p: 1,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            const responseTime = Date.now() - startTime;

            logger.info('Resposta gerada pela IA (Groq/Llama)', {
                conversationId,
                responseTime: `${responseTime}ms`,
                tokensUsed: data.usage?.total_tokens || 0,
                messageLength: aiResponse.length,
                model: this.model
            });

            return {
                success: true,
                response: aiResponse,
                metadata: {
                    model: this.model,
                    tokensUsed: data.usage?.total_tokens || 0,
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    responseTime
                }
            };

        } catch (error) {
            logger.error('Erro ao gerar resposta IA (Groq)', {
                error: error.message,
                conversationId,
                stack: error.stack
            });

            return {
                success: false,
                response: 'Desculpe, estou com dificuldades técnicas no momento. Um atendente humano será notificado. Você pode tentar novamente em alguns instantes.',
                error: error.message
            };
        }
    }

    analyzeSentiment(message) {
        const positiveWords = ['obrigado', 'ótimo', 'excelente', 'perfeito', 'maravilha', 'adorei', 'bom', 'legal'];
        const negativeWords = ['ruim', 'péssimo', 'horrível', 'problema', 'reclamar', 'insatisfeito', 'raiva'];
        
        const lowerMsg = message.toLowerCase();
        
        const positiveCount = positiveWords.filter(word => lowerMsg.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerMsg.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    detectIntent(message) {
        const lowerMsg = message.toLowerCase();
        
        const intents = {
            buy: ['comprar', 'passagem', 'ticket', 'viagem', 'quero ir', 'preciso ir'],
            question: ['quanto', 'qual', 'como', 'onde', 'quando', 'horário', 'preço'],
            complaint: ['reclamar', 'problema', 'insatisfeito', 'péssimo', 'ruim', 'horrível'],
            cancel: ['cancelar', 'desistir', 'reembolso', 'devolver'],
            help: ['ajuda', 'suporte', 'atendente', 'humano', 'pessoa']
        };
        
        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => lowerMsg.includes(keyword))) {
                return intent;
            }
        }
        
        return 'general';
    }

    /**
     * Verificar se API está configurada corretamente
     */
    async testConnection() {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (response.ok) {
                logger.info('✅ Groq API conectada com sucesso!');
                return true;
            } else {
                logger.error('❌ Falha ao conectar com Groq API');
                return false;
            }
        } catch (error) {
            logger.error('❌ Erro ao testar Groq API', { error: error.message });
            return false;
        }
    }
}

module.exports = new GroqAIService();
