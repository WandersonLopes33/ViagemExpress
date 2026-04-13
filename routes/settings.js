const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /api/settings
 * Obter configurações do sistema
 */
router.get('/', (req, res) => {
    try {
        const settings = {
            sistema: {
                nome: process.env.COMPANY_NAME || 'ViagemExpress',
                ambiente: process.env.NODE_ENV || 'development',
                versao: '2.0.0'
            },
            horarios: {
                inicio: process.env.BUSINESS_HOURS_START || '08:00',
                fim: process.env.BUSINESS_HOURS_END || '22:00'
            },
            ia: {
                provider: process.env.LLM_PROVIDER || 'groq',
                modelo: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                tom: process.env.AI_TONE || 'friendly'
            },
            pagamento: {
                descontoPix: parseInt(process.env.PIX_DISCOUNT_PERCENTAGE) || 5,
                parcelasSemJuros: 3
            },
            contato: {
                email: process.env.SUPPORT_EMAIL,
                telefone: process.env.SUPPORT_PHONE
            },
            recursos: {
                transferirParaHumano: process.env.FEATURE_AUTO_TRANSFER_TO_HUMAN === 'true',
                analytics: process.env.FEATURE_ANALYTICS_ENABLED === 'true',
                fallbackIA: process.env.FEATURE_AI_FALLBACK_ENABLED === 'true'
            }
        };

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        logger.error('Erro ao buscar configurações', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar configurações'
        });
    }
});

/**
 * GET /api/settings/health
 * Verificar saúde do sistema
 */
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoria: {
                usada: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                unidade: 'MB'
            },
            servicos: {
                evolutionAPI: process.env.EVOLUTION_API_URL,
                groq: process.env.GROQ_API_KEY ? 'Configurado' : 'Não configurado',
                postgresql: process.env.DATABASE_URL ? 'Configurado' : 'Não configurado'
            }
        };

        res.json({
            success: true,
            data: health
        });

    } catch (error) {
        logger.error('Erro ao verificar saúde', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao verificar saúde do sistema'
        });
    }
});

module.exports = router;
