const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
// Render.com'un dinamik olarak atadığı PORT'u kullanır, yerel için 3000
const PORT = process.env.PORT || 3000;

// İstemci dosyalarını (index.html) public klasöründen servis et
app.use(express.static(__dirname + '/public'));

// Socket.IO bağlantıları
io.on('connection', (socket) => {
    // Kullanıcı bir odaya katılmak istediğinde
    socket.on('joinRoom', (roomID) => {
        socket.join(roomID);
        // Odadaki diğer kullanıcılara yeni kullanıcının katıldığını bildir
        socket.to(roomID).emit('userJoined', socket.id);
    });

    // Kullanıcı WebRTC sinyalini (SDP, ICE) gönderdiğinde
    socket.on('signal', (data) => {
        // Sinyali hedefe (targetID) ilet
        io.to(data.targetID).emit('signal', {
            senderID: socket.id,
            signal: data.signal
        });
    });

    // Kullanıcı bağlantısı kesildiğinde
    socket.on('disconnect', () => {
        // Otomatik olarak odadan ayrılma sinyali gönderilir.
    });
});

// Sunucuyu başlat
http.listen(PORT, () => {
    console.log(`Sunucu çalışıyor ve ${PORT} portunu dinliyor.`);
});