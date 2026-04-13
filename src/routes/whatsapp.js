const express = require('express');
const router = express.Router();
const evolutionAPI = require('../services/evolutionAPI');
const logger = require('../utils/logger');

/**
 * GET /api/whatsapp/status
 * Verificar status da conexão WhatsApp
 */
router.get('/status', async (req, res) => {
    try {
        const status = await evolutionAPI.getConnectionStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        logger.error('Erro ao verificar status', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao verificar status da conexão' 
        });
    }
});

/**
 * POST /api/whatsapp/connect
 * Conectar instância WhatsApp
 */
router.post('/connect', async (req, res) => {
    try {
        const result = await evolutionAPI.connect();
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Erro ao conectar', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao conectar WhatsApp' 
        });
    }
});

/**
 * GET /api/whatsapp/qrcode
 * Obter QR Code para escanear
 */
router.get('/qrcode', async (req, res) => {
    try {
        const qrData = await evolutionAPI.getQRCode();
        
        // Se tiver QR Code em base64, retornar HTML com imagem
        if (qrData.qrcode && qrData.qrcode.base64) {
            const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp QR Code - ViagemExpress</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        
        .logo {
            font-size: 48px;
            margin-bottom: 10px;
        }
        
        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }
        
        .qrcode-wrapper {
            background: #f5f5f5;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .qrcode-wrapper img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
        }
        
        .instructions {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            border-radius: 5px;
            text-align: left;
            margin-bottom: 20px;
        }
        
        .instructions h3 {
            color: #1e40af;
            font-size: 16px;
            margin-bottom: 10px;
        }
        
        .instructions ol {
            color: #374151;
            font-size: 14px;
            padding-left: 20px;
        }
        
        .instructions li {
            margin-bottom: 8px;
        }
        
        .status {
            display: inline-block;
            padding: 8px 16px;
            background: #fef3c7;
            color: #92400e;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        
        .refresh-btn {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.3s;
        }
        
        .refresh-btn:hover {
            background: #5568d3;
        }
        
        .warning {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            border-radius: 5px;
            text-align: left;
            margin-top: 20px;
        }
        
        .warning p {
            color: #991b1b;
            font-size: 14px;
        }
        
        @media (max-width: 600px) {
            .container {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📱</div>
        <h1>Conectar WhatsApp</h1>
        <p class="subtitle">ViagemExpress - Sistema de Atendimento</p>
        
        <div class="qrcode-wrapper">
            <img src="${qrData.qrcode.base64}" alt="QR Code WhatsApp">
        </div>
        
        <div class="status">⏳ Aguardando leitura do QR Code</div>
        
        <div class="instructions">
            <h3>📋 Como conectar:</h3>
            <ol>
                <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                <li>Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong></li>
                <li>Selecione <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong></li>
                <li>Aponte seu celular para esta tela para escanear o código</li>
            </ol>
        </div>
        
        <div class="warning">
            <p><strong>⚠️ Importante:</strong> Este QR Code expira em 30 segundos. Se não funcionar, atualize a página.</p>
        </div>
        
        <a href="/api/whatsapp/qrcode" class="refresh-btn">🔄 Gerar novo QR Code</a>
    </div>
    
    <script>
        // Auto-refresh após 25 segundos
        setTimeout(() => {
            window.location.reload();
        }, 25000);
        
        // Verificar status a cada 3 segundos
        setInterval(async () => {
            try {
                const response = await fetch('/api/whatsapp/status');
                const data = await response.json();
                
                if (data.data?.instance?.state === 'open') {
                    document.querySelector('.status').innerHTML = '✅ WhatsApp Conectado!';
                    document.querySelector('.status').style.background = '#d1fae5';
                    document.querySelector('.status').style.color = '#065f46';
                    
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            }
        }, 3000);
    </script>
</body>
</html>`;
            res.send(html);
        } else {
            res.json({ success: true, data: qrData });
        }
    } catch (error) {
        logger.error('Erro ao obter QR Code', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao gerar QR Code. Verifique se o Evolution API está rodando.' 
        });
    }
});

/**
 * DELETE /api/whatsapp/disconnect
 * Desconectar WhatsApp
 */
router.delete('/disconnect', async (req, res) => {
    try {
        const result = await evolutionAPI.disconnect();
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Erro ao desconectar', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao desconectar WhatsApp' 
        });
    }
});

/**
 * POST /api/whatsapp/send
 * Enviar mensagem manual
 */
router.post('/send', async (req, res) => {
    try {
        const { to, message } = req.body;
        
        if (!to || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Número e mensagem são obrigatórios' 
            });
        }
        
        const result = await evolutionAPI.sendTextMessage(to, message);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Erro ao enviar mensagem', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao enviar mensagem' 
        });
    }
});

/**
 * GET /api/whatsapp/chats
 * Listar conversas
 */
router.get('/chats', async (req, res) => {
    try {
        const chats = await evolutionAPI.listChats();
        res.json({ success: true, data: chats });
    } catch (error) {
        logger.error('Erro ao listar conversas', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao listar conversas' 
        });
    }
});

/**
 * PUT /api/whatsapp/restart
 * Reiniciar instância
 */
router.put('/restart', async (req, res) => {
    try {
        const result = await evolutionAPI.restartInstance();
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('Erro ao reiniciar', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao reiniciar instância' 
        });
    }
});

module.exports = router;
