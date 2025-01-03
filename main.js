// Generate a random ID for the peer
const peerId = Math.random().toString(36).substr(2, 9);
let peerConnection = null;
let dataChannel = null;

// STUN servers for NAT traversal
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// DOM elements
const setupBox = document.getElementById('setupBox');
const chatBox = document.getElementById('chatBox');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const joinInput = document.getElementById('joinInput');
const roomIdDisplay = document.getElementById('roomId');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const copyLinkBtn = document.getElementById('copyLink');

let roomId = '';

// Create a new room
createBtn.addEventListener('click', async () => {
    roomId = Math.random().toString(36).substr(2, 9);
    roomIdDisplay.textContent = roomId;
    
    // Create peer connection as offerer
    peerConnection = new RTCPeerConnection(configuration);
    setupPeerConnection();
    
    // Create data channel
    dataChannel = peerConnection.createDataChannel('chat');
    setupDataChannel();
    
    // Create and set local description
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // Store the offer in localStorage (simulating signaling)
    localStorage.setItem(`offer_${roomId}`, JSON.stringify(offer));
    
    // Show chat interface
    setupBox.classList.add('hidden');
    chatBox.classList.remove('hidden');
});

// Join an existing room
joinBtn.addEventListener('click', async () => {
    const joinRoomId = joinInput.value.trim();
    if (!joinRoomId) return;
    
    roomId = joinRoomId;
    
    // Get the offer from localStorage
    const offerStr = localStorage.getItem(`offer_${roomId}`);
    if (!offerStr) {
        alert('Room not found!');
        return;
    }
    
    // Create peer connection as answerer
    peerConnection = new RTCPeerConnection(configuration);
    setupPeerConnection();
    
    // Set up data channel handler
    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel();
    };
    
    // Set remote description (offer)
    const offer = JSON.parse(offerStr);
    await peerConnection.setRemoteDescription(offer);
    
    // Create and set local description (answer)
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Store the answer in localStorage
    localStorage.setItem(`answer_${roomId}`, JSON.stringify(answer));
    
    // Show chat interface
    setupBox.classList.add('hidden');
    chatBox.classList.remove('hidden');
});

function setupPeerConnection() {
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // Store ICE candidate in localStorage
            const candidates = JSON.parse(localStorage.getItem(`ice_${roomId}`) || '[]');
            candidates.push(event.candidate);
            localStorage.setItem(`ice_${roomId}`, JSON.stringify(candidates));
        }
    };
    
    // Check for answer periodically (if we're the offerer)
    if (!joinInput.value) {
        const checkAnswer = setInterval(() => {
            const answerStr = localStorage.getItem(`answer_${roomId}`);
            if (answerStr) {
                const answer = JSON.parse(answerStr);
                peerConnection.setRemoteDescription(answer);
                clearInterval(checkAnswer);
            }
        }, 1000);
    }
    
    // Check for ICE candidates periodically
    setInterval(() => {
        const candidates = JSON.parse(localStorage.getItem(`ice_${roomId}`) || '[]');
        candidates.forEach(candidate => {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(e => console.log('Error adding ICE candidate:', e));
        });
    }, 1000);
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        console.log('Data channel is open');
    };
    
    dataChannel.onmessage = (event) => {
        appendMessage(event.data, false);
    };
}

// Send message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !dataChannel) return;
    
    dataChannel.send(message);
    appendMessage(message, true);
    messageInput.value = '';
}

// Append message to chat
function appendMessage(message, sent) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sent ? 'sent' : 'received');
    messageDiv.textContent = message;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Copy room ID
copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
});