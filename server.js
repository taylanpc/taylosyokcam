// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// Cors ayarları, Render için önemlidir
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(express.static('public')); // public klasörünü sun

server.listen(PORT, () => {
    console.log(`✅ Sunucu ${PORT} portunda çalışıyor.`);
});

io.on('connection', (socket) => {
    console.log(`Yeni kullanıcı bağlandı: ${socket.id}`);

    // Kullanıcı bir odaya katıldığında
    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        console.log(`Kullanıcı ${socket.id}, odaya katıldı: ${roomName}`);
        
        // Odadaki diğer kullanıcılara yeni bir eşin katıldığını bildir
        socket.to(roomName).emit('userJoined', socket.id);
    });

    // WebRTC sinyallerini yönlendir
    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', {
            from: socket.id,
            signalData: data.signalData
        });
    });

    // Kullanıcı ayrıldığında
    socket.on('disconnect', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomName => {
            socket.to(roomName).emit('userLeft', socket.id);
        });
        console.log(`Kullanıcı ayrıldı: ${socket.id}`);
    });
});