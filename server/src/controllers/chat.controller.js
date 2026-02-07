const { db, admin } = require('../config/firebase');

/**
 * Safety Filters
 * - Mask Emails
 * - Mask Phone Numbers
 */
const sanitizeMessage = (text) => {
    if (!text) return '';

    // Simple Regex for Email
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    // Simple Regex for Phone (10 digits)
    const phoneRegex = /\b\d{10}\b/g;

    let sanitized = text.replace(emailRegex, '[HIDDEN EMAIL]');
    sanitized = sanitized.replace(phoneRegex, '[HIDDEN PHONE]');

    return sanitized;
};

// Start specific chat (or get existing)
const startChat = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { peerId, bookingId } = req.body;

        if (!peerId) return res.status(400).json({ message: 'Peer ID required' });

        // MVP: Fetch all chats and filter (Inefficient for scale, okay for prototype)
        const chatsSnapshot = await db.ref('chat_rooms').once('value');
        let existingChat = null;

        if (chatsSnapshot.exists()) {
            chatsSnapshot.forEach(child => {
                const data = child.val();
                if (data.participants && data.participants.includes(uid) && data.participants.includes(peerId)) {
                    existingChat = { id: child.key, ...data };
                }
            });
        }

        if (existingChat) {
            return res.json(existingChat);
        }

        const newChat = {
            participants: [uid, peerId],
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            bookingId: bookingId || null,
            createdAt: new Date().toISOString()
        };

        const chatRef = db.ref('chat_rooms').push();
        await chatRef.set({ ...newChat, id: chatRef.key });

        res.status(201).json({ id: chatRef.key, ...newChat });

    } catch (error) {
        res.status(500).json({ message: 'Failed to start chat' });
    }
};

// Send Message (Text or Image)
const sendMessage = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { chatId } = req.params;
        const { text, type } = req.body; // type: 'TEXT' | 'IMAGE'

        // Validation
        if (!text) return res.status(400).json({ message: 'Content empty' });

        // Verify participation
        const chatRef = db.ref('chat_rooms/' + chatId);
        const chatSnapshot = await chatRef.once('value');
        if (!chatSnapshot.exists()) return res.status(404).json({ message: 'Chat not found' });

        const chatData = chatSnapshot.val();
        if (!chatData.participants || !chatData.participants.includes(uid)) {
            return res.status(403).json({ message: 'Not in this chat' });
        }

        // Apply Safety Filters if TEXT
        let finalContent = text;
        if (!type || type === 'TEXT') {
            finalContent = sanitizeMessage(text);
        }

        const newMessage = {
            chatId,
            senderId: uid,
            text: finalContent,
            type: type || 'TEXT', // 'TEXT' or 'IMAGE'
            createdAt: new Date().toISOString()
        };

        const msgRef = db.ref('chat_messages').push();
        await msgRef.set({ ...newMessage, id: msgRef.key });

        // Update Chat Preview
        await chatRef.update({
            lastMessage: type === 'IMAGE' ? '📷 Image' : finalContent,
            lastMessageTime: newMessage.createdAt
        });

        res.json({ ...newMessage, id: msgRef.key });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Send failed' });
    }
};

const getChats = async (req, res) => {
    try {
        const uid = req.user.uid;
        // MVP: Fetch all and filter
        const snapshot = await db.ref('chat_rooms').once('value');

        let chats = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const data = child.val();
                if (data.participants && data.participants.includes(uid)) {
                    chats.push({ id: child.key, ...data });
                }
            });
            chats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        }

        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: 'Fetch chats failed' });
    }
};

const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const uid = req.user.uid;

        const chatSnapshot = await db.ref('chat_rooms/' + chatId).once('value');
        if (!chatSnapshot.exists()) return res.status(404).json({ message: 'Chat not found' });

        const chatData = chatSnapshot.val();
        if (!chatData.participants || !chatData.participants.includes(uid)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const snapshot = await db.ref('chat_messages').orderByChild('chatId').equalTo(chatId).once('value');

        let messages = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                messages.push({ id: child.key, ...child.val() });
            });
            messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Fetch messages failed' });
    }
};

module.exports = { startChat, sendMessage, getChats, getMessages };
