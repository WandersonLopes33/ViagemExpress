const express = require('express');
const router = express.Router();
const db = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /api/analytics/dashboard
 * Obter métricas gerais do dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const conversationsStats = await db.query(`
            SELECT 
                COUNT(*) as total_conversas,
                COUNT(*) FILTER (WHERE status = 'active') as conversas_ativas,
                COUNT(*) FILTER (WHERE status = 'closed') as conversas_fechadas,
                COUNT(*) FILTER (WHERE transferido_para_humano = TRUE) as conversas_transferidas,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days') as conversas_periodo
            FROM conversations
        `);

        const messagesStats = await db.query(`
            SELECT 
                COUNT(*) as total_mensagens,
                COUNT(*) FILTER (WHERE sender = 'customer') as mensagens_clientes,
                COUNT(*) FILTER (WHERE sender = 'bot') as mensagens_bot,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days') as mensagens_periodo
            FROM messages
        `);

        const ordersStats = await db.query(`
            SELECT 
                COUNT(*) as total_pedidos,
                COUNT(*) FILTER (WHERE status = 'confirmado') as pedidos_confirmados,
                COUNT(*) FILTER (WHERE status_pagamento = 'pago') as pedidos_pagos,
                COALESCE(SUM(valor_total), 0) as receita_total,
                COALESCE(AVG(valor_total), 0) as ticket_medio
            FROM pedidos
            WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        `);

        res.json({
            success: true,
            period: `Últimos ${days} dias`,
            data: {
                conversations: conversationsStats.rows[0],
                messages: messagesStats.rows[0],
                orders: ordersStats.rows[0]
            }
        });

    } catch (error) {
        logger.error('Erro ao buscar dashboard', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar métricas do dashboard'
        });
    }
});

/**
 * GET /api/analytics/daily
 * Estatísticas diárias
 */
router.get('/daily', async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const result = await db.query(`
            SELECT 
                DATE(created_at) as data,
                COUNT(*) as total_conversas,
                COUNT(*) FILTER (WHERE status = 'closed') as conversas_fechadas
            FROM conversations
            WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
            GROUP BY DATE(created_at)
            ORDER BY data DESC
        `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Erro ao buscar estatísticas diárias', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas'
        });
    }
});

module.exports = router;
