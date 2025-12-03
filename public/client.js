// public/client.js
const socket = io(); // Varsayılan sunucuya bağlanır (Node.js)
const roomNameInput = document.getElementById('roomName');
const localVideo = document.getElementById('localVideo');
const videoGrid = document.getElementById('video-grid');

const peerConnections = {}; 
let localStream;
let myId; // Kendi socket ID'mizi tutmak için

// 🔥 TURN SUNUCUSU VE GENİŞ STUN LİSTESİ (Eşleşme sorununu çözmek için KRİTİK) 🔥
const iceServers = {
    'iceServers': [
        // ÜCRETSİZ TURN SUNUCUSU (Röle noktası)
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "8cd9f3e46c7f892c90666795",
            credential: "88a38b1d9774653a3e6a71e2"
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=udp",
            username: "8cd9f3e46c7f892c90666795",
            credential: "88a38b1d9774653a3e6a71e2"
        },
        // GENİŞ STUN SUNUCU LİSTESİ
        { 'urls': 'stun:stun.l.google.com:19302' },
        { 'urls': 'stun:stun1.l.google.com:19302' },
    ]
};

// ---------------------------------------------
// 1. Odaya Katılma
// ---------------------------------------------

async function joinRoom() {
    const roomName = roomNameInput.value;
    if (!roomName) return alert('Lütfen bir oda adı girin.');

    // Önceki bağlantıları temizle (Yeniden bağlanma sorununu çözmek için)
    for (const userId in peerConnections) {
        peerConnections[userId].close();
        delete peerConnections[userId];
    }
    videoGrid.innerHTML = ''; // Eski videoları sil
    
    // Kamera ve mikrofona erişim
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        
        // Kendi ID'mizi al ve odaya katıl
        socket.on('connect', () => {
            myId = socket.id;
            socket.emit('joinRoom', roomName);
        });
        
        // Eğer zaten bağlıysak, direkt katıl
        if (socket.connected) {
             myId = socket.id;
             socket.emit('joinRoom', roomName);
        }
        
    } catch (err) {
        console.error("Medya erişim hatası:", err);
        alert("Kamera ve Mikrofon izni gereklidir!");
        return;
    }
}


// ---------------------------------------------
// 2. SOCKET.IO Olay Yönetimi
// ---------------------------------------------

socket.on('userJoined', (newUserId) => {
    console.log('Yeni kullanıcı katıldı:', newUserId);
    createPeerConnection(newUserId, true); // Teklif Gönderen (Initiator)
});

socket.on('signal', async (data) => {
    const { from, signalData } = data;
    let peer = peerConnections[from];

    if (!peer) {
        peer = createPeerConnection(from, false); // Teklif Kabul Eden
    }

    try {
        if (signalData.type === 'offer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signalData));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('signal', { to: from, signalData: peer.localDescription });
        } else if (signalData.type === 'answer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signalData));
        } else if (signalData.candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
    } catch (e) {
        console.error('Sinyalleme hatası:', e);
    }
});

socket.on('userLeft', (userId) => {
    console.log('Kullanıcı ayrıldı:', userId);
    const videoElement = document.getElementById(`video-${userId}`);
    if (videoElement) {
        videoElement.remove(); 
    }
    if (peerConnections[userId]) {
        peerConnections[userId].close(); 
        delete peerConnections[userId];
    }
});


// ---------------------------------------------
// 3. PEER CONNECTION Yönetimi
// ---------------------------------------------

function createPeerConnection(userId, isInitiator) {
    const peer = new RTCPeerConnection(iceServers);
    peerConnections[userId] = peer;

    // Yerel akışı ekle
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });

    // Uzak akış (diğer kişinin videosu) geldiğinde
    peer.ontrack = (event) => {
        addRemoteVideo(event.streams[0], userId);
    };
    
    // ICE adayları oluşturulduğunda
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', {
                to: userId,
                signalData: { candidate: event.candidate }
            });
        }
    };

    // Teklif Başlatma
    if (isInitiator) {
        peer.onnegotiationneeded = async () => {
            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socket.emit('signal', { to: userId, signalData: peer.localDescription });
            } catch (e) {
                console.error('Teklif oluşturma hatası:', e);
            }
        };
    }

    return peer;
}

function addRemoteVideo(stream, userId) {
    const remoteVideo = document.createElement('video');
    remoteVideo.id = `video-${userId}`;
    remoteVideo.srcObject = stream;
    remoteVideo.autoplay = true;
    remoteVideo.play().catch(e => console.error("Video otomatik oynatma engellendi:", e));
    videoGrid.appendChild(remoteVideo);
}

// ---------------------------------------------
// 4. Kontroller
// ---------------------------------------------

function toggleVideo() {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
}

function toggleAudio() {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
}