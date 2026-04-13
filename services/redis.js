const Redis = require('ioredis');
const logger = require('../utils/logger');

// Configuração do Redis
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3
};

// Verificar se Redis está habilitado
const redisEnabled = process.env.REDIS_ENABLED !== 'false';

let redisClient = null;

if (redisEnabled) {
    try {
        redisClient = new Redis(redisConfig);

        redisClient.on('connect', () => {
            logger.info('✅ Conexão estabelecida com Redis');
        });

        redisClient.on('ready', () => {
            logger.info('🚀 Redis pronto para uso');
        });

        redisClient.on('error', (err) => {
            logger.error('❌ Erro no Redis', { error: err.message });
        });

        redisClient.on('close', () => {
            logger.warn('⚠️  Conexão Redis fechada');
        });

    } catch (error) {
        logger.error('❌ Falha ao inicializar Redis', { error: error.message });
        redisClient = null;
    }
} else {
    logger.info('ℹ️  Redis desabilitado - funcionando sem cache');
}

// Helper para obter do cache
const get = async (key) => {
    if (!redisClient) return null;
    
    try {
        const value = await redisClient.get(key);
        if (value) {
            logger.debug('Cache HIT', { key });
            return JSON.parse(value);
        }
        logger.debug('Cache MISS', { key });
        return null;
    } catch (error) {
        logger.error('Erro ao buscar do cache', { key, error: error.message });
        return null;
    }
};

// Helper para salvar no cache
const set = async (key, value, ttlSeconds = 300) => {
    if (!redisClient) return false;
    
    try {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
        logger.debug('Cache SET', { key, ttl: ttlSeconds });
        return true;
    } catch (error) {
        logger.error('Erro ao salvar no cache', { key, error: error.message });
        return false;
    }
};

// Helper para deletar do cache
const del = async (key) => {
    if (!redisClient) return false;
    
    try {
        await redisClient.del(key);
        logger.debug('Cache DEL', { key });
        return true;
    } catch (error) {
        logger.error('Erro ao deletar do cache', { key, error: error.message });
        return false;
    }
};

// Helper para limpar cache com padrão
const clear = async (pattern = '*') => {
    if (!redisClient) return false;
    
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(...keys);
            logger.info('Cache limpo', { pattern, keysRemoved: keys.length });
        }
        return true;
    } catch (error) {
        logger.error('Erro ao limpar cache', { pattern, error: error.message });
        return false;
    }
};

// Helper para rate limiting
const checkRateLimit = async (identifier, limit = 100, windowSeconds = 900) => {
    if (!redisClient) return true; // Se sem Redis, permite
    
    try {
        const key = `ratelimit:${identifier}`;
        const current = await redisClient.incr(key);
        
        if (current === 1) {
            await redisClient.expire(key, windowSeconds);
        }
        
        const isAllowed = current <= limit;
        
        if (!isAllowed) {
            logger.warn('Rate limit excedido', { identifier, current, limit });
        }
        
        return isAllowed;
    } catch (error) {
        logger.error('Erro no rate limit', { identifier, error: error.message });
        return true; // Em caso de erro, permite
    }
};

// Helper para salvar sessão
const saveSession = async (phoneNumber, sessionData, ttlSeconds = 1800) => {
    const key = `session:${phoneNumber}`;
    return await set(key, sessionData, ttlSeconds);
};

// Helper para obter sessão
const getSession = async (phoneNumber) => {
    const key = `session:${phoneNumber}`;
    return await get(key);
};

// Helper para deletar sessão
const deleteSession = async (phoneNumber) => {
    const key = `session:${phoneNumber}`;
    return await del(key);
};

// Graceful shutdown
process.on('SIGINT', async () => {
    if (redisClient) {
        logger.info('Fechando conexão Redis...');
        await redisClient.quit();
    }
});

module.exports = {
    redisClient,
    get,
    set,
    del,
    clear,
    checkRateLimit,
    saveSession,
    getSession,
    deleteSession,
    isEnabled: redisEnabled
};
