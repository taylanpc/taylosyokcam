// app.js

let api = null;

function startMeeting() {
    const roomName = document.getElementById('roomName').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const jitsiContainer = document.getElementById('jitsi-container');
    const joinForm = document.getElementById('join-form');
    
    if (!roomName) {
        alert("Lütfen bir toplantı adı girin.");
        return;
    }

    jitsiContainer.style.display = 'block';
    joinForm.style.display = 'none';

    const domain = "meet.jit.si"; 
    
    const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainer,
        userInfo: {
            displayName: userName
        },
        configOverwrite: {
            startWithAudioMuted: false, 
            startWithVideoMuted: false,
            defaultLanguage: 'tr',      
            disableDeepLinking: true,   
            disableSelfView: false,     
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'desktop', 'fullscreen',
                'chat', 'settings', 'raisehand',
                'tileview', 'videoquality', 'closedcaptions', 'recording',
            ],
        }
    };
    
    api = new JitsiMeetExternalAPI(domain, options);

    api.on('readyToClose', () => {
        jitsiContainer.style.display = 'none';
        joinForm.style.display = 'flex';
        alert("Toplantı sona erdi.");
        api.dispose();
        api = null;
    });
}
