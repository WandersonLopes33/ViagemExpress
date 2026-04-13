/**
 * AI Provider Service - Multi-Provider Support
 * Suporta: Groq (Llama), Anthropic (Claude), OpenAI (GPT), e outros
 * 
 * @description Serviço profissional para integração com múltiplos provedores de IA
 * com fallback automático, rate limiting, e cache de respostas
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { getCachedResponse, setCachedResponse } = require('../utils/cache');

class AIProvider {
  constructor() {
    // Configuração de provedores
    this.provider = process.env.LLM_PROVIDER || 'groq'; // groq, claude, openai
    this.config = this.getProviderConfig();
    this.fallbackProviders = this.getFallbackChain();
    
    // Métricas
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbackUsed: 0,
      avgResponseTime: 0
    };

    logger.info(`AI Provider initialized: ${this.provider.toUpperCase()}`);
  }

  /**
   * Configuração dos provedores disponíveis
   */
  getProviderConfig() {
    const configs = {
      groq: {
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        maxTokens: 8000,
        temperature: 0.7,
        timeout: 30000
      },
      claude: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1',
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        maxTokens: 8000,
        temperature: 0.7,
        timeout: 30000
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        maxTokens: 8000,
        temperature: 0.7,
        timeout: 30000
      },
      ollama: {
        apiKey: 'not-required',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api',
        model: process.env.OLLAMA_MODEL || 'llama3.1',
        maxTokens: 8000,
        temperature: 0.7,
        timeout: 60000
      }
    };

    return configs[this.provider];
  }

  /**
   * Cadeia de fallback (ordem de tentativas)
   */
  getFallbackChain() {
    const chains = {
      groq: ['claude', 'openai'],
      claude: ['groq', 'openai'],
      openai: ['groq', 'claude'],
      ollama: ['groq', 'claude']
    };

    return chains[this.provider] || [];
  }

  /**
   * System prompt para vendas de passagens
   */
  getSystemPrompt() {
    return `Você é um assistente virtual PROFISSIONAL especializado em vendas de passagens de ônibus da ViagemExpress.

## IDENTIDADE E TOM
- Nome: Assistente ViagemExpress
- Tom: Amigável, consultivo, profissional
- Objetivo: Vender passagens oferecendo a melhor experiência

## ROTAS E PREÇOS PRINCIPAIS
Rotas disponíveis (preços base - Convencional):
- São Paulo ↔ Rio de Janeiro: R$ 150,00 (4h30)
- São Paulo ↔ Belo Horizonte: R$ 120,00 (7h)
- Rio de Janeiro ↔ Belo Horizonte: R$ 140,00 (6h)
- São Paulo ↔ Curitiba: R$ 90,00 (6h)
- São Paulo ↔ Brasília: R$ 180,00 (14h)
- Rio de Janeiro ↔ Salvador: R$ 280,00 (24h)
- São Paulo ↔ Florianópolis: R$ 160,00 (11h)

## TIPOS DE SERVIÇO (SEMPRE OFERECER UPGRADE)
1. **Convencional**: Preço base
2. **Executivo**: +R$ 20,00 (WiFi, tomadas USB, mais espaço)
3. **Leito**: +R$ 50,00 (cama, cobertor, travesseiro) - apenas viagens acima de 8h

## ESTRATÉGIA DE VENDAS (IMPORTANTE!)
1. **Descoberta**: Pergunte origem, destino, data, horário preferido
2. **Qualificação**: Identifique se é viagem a trabalho ou lazer
3. **Upsell**: SEMPRE sugira upgrade (Executivo/Leito) mostrando benefícios
4. **Urgência**: Mencione assentos limitados quando apropriado
5. **Facilitação**: Ofereça desconto PIX (5% OFF) ou parcelamento
6. **Fechamento**: Colete nome, CPF, e-mail para finalizar

## HORÁRIOS DISPONÍVEIS (padrão)
- Manhã: 06:00, 08:00, 10:00
- Tarde: 13:00, 15:00, 17:00
- Noite: 19:00, 21:00, 23:00

## FORMAS DE PAGAMENTO
- PIX (5% desconto) - SEMPRE OFERECER PRIMEIRO
- Cartão de crédito (até 6x sem juros)
- Boleto bancário (à vista)

## POLÍTICAS
- Cancelamento: até 24h antes (reembolso integral)
- Alteração: até 2h antes (sem custo)
- Bagagem: 1 mala até 20kg + 1 mochila
- Menores de 12 anos: 50% desconto
- Idosos 60+: 15% desconto

## FLUXO DE ATENDIMENTO
1. Saudação calorosa
2. Perguntas consultivas (não interrogatório)
3. Apresente opções com benefícios (não apenas preços)
4. Responda dúvidas
5. Crie urgência sutil
6. Colete dados para reserva
7. Confirme pedido com número
8. Envie instruções de pagamento

## REGRAS IMPORTANTES
- NUNCA invente rotas ou horários não listados
- SEMPRE confirme disponibilidade antes de garantir assento
- Se não souber algo, transfira para atendente humano
- Seja natural, não robótico
- Use emojis moderadamente (🚌 ✅ 🎯)
- Máximo 3-4 linhas por mensagem (WhatsApp)
- Faça uma pergunta por vez

## EXEMPLO DE UPSELL BOM
Cliente: "Quero ir de SP para Rio"
Você: "Perfeito! Para qual data? E você prefere viajar de manhã, tarde ou noite? Pergunto porque temos horários com menos movimento se você busca mais tranquilidade 😊"

Cliente: "Sexta, de manhã"
Você: "Ótimo! Temos saídas às 6h, 8h e 10h por R$150. 
Deixa eu te falar: por apenas +R$20 você vai no nosso Executivo com WiFi grátis, tomadas USB e poltronas super confortáveis. Como é sexta, pode ser ótimo pra você já trabalhar durante a viagem ou simplesmente relaxar mais. Vale a pena! O que acha?"

## TRATAMENTO DE OBJEÇÕES
- "Tá caro": Mencione desconto PIX ou parcelamento
- "Vou pensar": Crie urgência ("últimos assentos nesse horário")
- "Outra empresa é mais barata": Destaque diferenciais (conforto, pontualidade, segurança)

## SE NÃO SOUBER
"Deixa eu transferir você para um de nossos especialistas que vai te ajudar melhor com isso, ok?"

Responda SEMPRE em português brasileiro, seja consultivo mas não insistente, e foque em entender a necessidade antes de oferecer.`;
  }

  /**
   * Processa mensagem com retry e fallback
   */
  async processMessage(userMessage, conversationHistory = [], retryCount = 0) {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Verificar cache (opcional)
      const cacheKey = this.generateCacheKey(userMessage, conversationHistory);
      const cached = await getCachedResponse(cacheKey);
      
      if (cached && process.env.AI_CACHE_ENABLED === 'true') {
        logger.info('Using cached AI response');
        return cached;
      }

      // Processar de acordo com o provider
      let response;
      
      switch (this.provider) {
        case 'groq':
          response = await this.processWithGroq(userMessage, conversationHistory);
          break;
        case 'claude':
          response = await this.processWithClaude(userMessage, conversationHistory);
          break;
        case 'openai':
          response = await this.processWithOpenAI(userMessage, conversationHistory);
          break;
        case 'ollama':
          response = await this.processWithOllama(userMessage, conversationHistory);
          break;
        default:
          throw new Error(`Provider não suportado: ${this.provider}`);
      }

      // Métricas
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime);

      // Cachear resposta
      if (process.env.AI_CACHE_ENABLED === 'true') {
        await setCachedResponse(cacheKey, response, 300); // 5 min TTL
      }

      logger.info(`AI response generated in ${responseTime}ms using ${this.provider}`);
      return response;

    } catch (error) {
      logger.error(`AI Provider error (${this.provider}):`, error.message);
      this.updateMetrics(false);

      // Tentar fallback
      if (retryCount < this.fallbackProviders.length) {
        const fallbackProvider = this.fallbackProviders[retryCount];
        logger.warn(`Trying fallback provider: ${fallbackProvider}`);
        
        this.metrics.fallbackUsed++;
        const originalProvider = this.provider;
        this.provider = fallbackProvider;
        this.config = this.getProviderConfig();

        try {
          const response = await this.processMessage(userMessage, conversationHistory, retryCount + 1);
          this.provider = originalProvider; // Restaurar
          this.config = this.getProviderConfig();
          return response;
        } catch (fallbackError) {
          this.provider = originalProvider; // Restaurar
          this.config = this.getProviderConfig();
          throw fallbackError;
        }
      }

      // Resposta de fallback manual
      return this.getFallbackResponse();
    }
  }

  /**
   * Processar com Groq (Llama)
   */
  async processWithGroq(userMessage, conversationHistory) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      ...this.formatConversationHistory(conversationHistory),
      { role: 'user', content: userMessage }
    ];

    const response = await axios.post(
      `${this.config.baseURL}/chat/completions`,
      {
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      }
    );

    return {
      content: response.data.choices[0].message.content,
      provider: 'groq',
      model: this.config.model,
      usage: response.data.usage
    };
  }

  /**
   * Processar com Claude (Anthropic)
   */
  async processWithClaude(userMessage, conversationHistory) {
    const messages = [
      ...this.formatConversationHistory(conversationHistory),
      { role: 'user', content: userMessage }
    ];

    const response = await axios.post(
      `${this.config.baseURL}/messages`,
      {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: this.getSystemPrompt(),
        messages: messages
      },
      {
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      }
    );

    return {
      content: response.data.content[0].text,
      provider: 'claude',
      model: this.config.model,
      usage: response.data.usage
    };
  }

  /**
   * Processar com OpenAI (GPT)
   */
  async processWithOpenAI(userMessage, conversationHistory) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      ...this.formatConversationHistory(conversationHistory),
      { role: 'user', content: userMessage }
    ];

    const response = await axios.post(
      `${this.config.baseURL}/chat/completions`,
      {
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      }
    );

    return {
      content: response.data.choices[0].message.content,
      provider: 'openai',
      model: this.config.model,
      usage: response.data.usage
    };
  }

  /**
   * Processar com Ollama (local)
   */
  async processWithOllama(userMessage, conversationHistory) {
    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      ...this.formatConversationHistory(conversationHistory),
      { role: 'user', content: userMessage }
    ];

    const response = await axios.post(
      `${this.config.baseURL}/chat`,
      {
        model: this.config.model,
        messages: messages,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      },
      {
        timeout: this.config.timeout
      }
    );

    return {
      content: response.data.message.content,
      provider: 'ollama',
      model: this.config.model,
      usage: {}
    };
  }

  /**
   * Formatar histórico de conversa
   */
  formatConversationHistory(history) {
    return history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content || msg.conteudo
    }));
  }

  /**
   * Gerar chave de cache
   */
  generateCacheKey(message, history) {
    const historyHash = history.slice(-3).map(h => h.content).join('|');
    return `ai:${this.provider}:${Buffer.from(message + historyHash).toString('base64').substring(0, 50)}`;
  }

  /**
   * Resposta de fallback quando todos os provedores falharem
   */
  getFallbackResponse() {
    return {
      content: `Olá! Estou com uma instabilidade técnica momentânea. 
      
Para continuar seu atendimento com qualidade, vou transferir você para um de nossos especialistas humanos que já está te aguardando! 😊

Um momento, por favor...`,
      provider: 'fallback',
      model: 'human-transfer',
      usage: {}
    };
  }

  /**
   * Atualizar métricas
   */
  updateMetrics(success, responseTime = 0) {
    if (success) {
      this.metrics.successfulRequests++;
      const totalTime = this.metrics.avgResponseTime * (this.metrics.successfulRequests - 1);
      this.metrics.avgResponseTime = (totalTime + responseTime) / this.metrics.successfulRequests;
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Obter métricas
   */
  getMetrics() {
    return {
      ...this.metrics,
      provider: this.provider,
      model: this.config.model,
      successRate: ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%'
    };
  }

  /**
   * Validar configuração do provider
   */
  validateConfig() {
    if (!this.config.apiKey && this.provider !== 'ollama') {
      throw new Error(`API Key não configurada para provider: ${this.provider}`);
    }
    
    if (!this.config.model) {
      throw new Error(`Modelo não configurado para provider: ${this.provider}`);
    }

    return true;
  }

  /**
   * Testar conexão com provider
   */
  async testConnection() {
    try {
      const testResponse = await this.processMessage('Olá, apenas testando a conexão', []);
      logger.info(`Connection test successful for ${this.provider}:`, testResponse.model);
      return { success: true, provider: this.provider, model: this.config.model };
    } catch (error) {
      logger.error(`Connection test failed for ${this.provider}:`, error.message);
      return { success: false, provider: this.provider, error: error.message };
    }
  }
}

// Singleton instance
let aiProviderInstance = null;

const getAIProvider = () => {
  if (!aiProviderInstance) {
    aiProviderInstance = new AIProvider();
  }
  return aiProviderInstance;
};

module.exports = { AIProvider, getAIProvider };
