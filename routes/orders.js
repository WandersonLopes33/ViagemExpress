const express = require('express');
const router = express.Router();
const db = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /api/orders
 * Listar pedidos
 */
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM pedidos';
        const params = [];

        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit));

        const result = await db.query(query, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        logger.error('Erro ao listar pedidos', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao listar pedidos'
        });
    }
});

/**
 * GET /api/orders/:id
 * Obter detalhes de um pedido
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT * FROM pedidos WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Pedido não encontrado'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Erro ao buscar pedido', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar pedido'
        });
    }
});

/**
 * POST /api/orders
 * Criar novo pedido
 */
router.post('/', async (req, res) => {
    try {
        const {
            conversation_id,
            cliente_id,
            origem,
            destino,
            data_viagem,
            horario_partida,
            num_passageiros,
            valor_total,
            forma_pagamento
        } = req.body;

        if (!origem || !destino || !data_viagem) {
            return res.status(400).json({
                success: false,
                error: 'Origem, destino e data da viagem são obrigatórios'
            });
        }

        const result = await db.query(
            `INSERT INTO pedidos 
            (conversation_id, cliente_id, origem, destino, data_viagem, horario_partida, num_passageiros, valor_total, forma_pagamento, status, status_pagamento)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendente', 'pendente')
            RETURNING *`,
            [conversation_id, cliente_id, origem, destino, data_viagem, horario_partida, num_passageiros || 1, valor_total, forma_pagamento]
        );

        res.json({
            success: true,
            message: 'Pedido criado com sucesso',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Erro ao criar pedido', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao criar pedido'
        });
    }
});

/**
 * PATCH /api/orders/:id/status
 * Atualizar status do pedido
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, status_pagamento } = req.body;

        const updates = [];
        const params = [];
        let paramCount = 1;

        if (status) {
            updates.push(`status = $${paramCount}`);
            params.push(status);
            paramCount++;
        }

        if (status_pagamento) {
            updates.push(`status_pagamento = $${paramCount}`);
            params.push(status_pagamento);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum status fornecido'
            });
        }

        params.push(id);
        const query = `UPDATE pedidos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Pedido não encontrado'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Erro ao atualizar pedido', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Erro ao atualizar pedido'
        });
    }
});

module.exports = router;
