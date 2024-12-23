const WebSocket = require('ws');
const Redis = require('redis');
require('dotenv').config();

const redis = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});

const wss = new WebSocket.Server({ port: process.env.WS_PORT || 3001 });

const clients = new Map(); // Связываем WebSocket-соединения с ID пользователей

wss.on('connection', (ws, req) => {
    const token = req.url.split('?token=')[1];

    if (!token) {
        ws.close(1008, 'Authentication token missing');
        return;
    }

    // Проверяем токен пользователя
    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        clients.set(userId, ws);
        console.log(`User ${userId} connected`);
    } catch (err) {
        ws.close(1008, 'Invalid authentication token');
        return;
    }

    ws.on('close', () => {
        clients.delete(userId);
        console.log(`User ${userId} disconnected`);
    });
});

// Подписка на Redis каналы
redis.on('message', (channel, message) => {
    console.log(`Message received from channel ${channel}: ${message}`);
    const parsedMessage = JSON.parse(message);

    if (channel.startsWith('private-user.')) {
        const userId = channel.split('private-user.')[1];
        const targetClient = clients.get(userId);

        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify({
                type: 'private',
                data: parsedMessage,
            }));
        }
    } else if (channel === 'public') {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'broadcast',
                    data: parsedMessage,
                }));
            }
        });
    }
});

// Подписываемся на каналы Redis
redis.subscribe('private-.*'); // Слушаем приватные каналы
redis.subscribe('public'); // Слушаем публичные каналы

console.log(`WebSocket server started on port ${process.env.WS_PORT || 3001}`);
