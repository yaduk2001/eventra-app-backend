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

        const existing = await db.collection('chats')
            .where('participants', 'array-contains', uid)
            .get();

        let chatDoc = existing.docs.find(doc => {
            const data = doc.data();
            return data.participants.includes(peerId);
        });

        if (chatDoc) {
            return res.json({ id: chatDoc.id, ...chatDoc.data() });
        }

        const newChat = {
            participants: [uid, peerId],
            lastMessage: '',
            lastMessageTime: new Date().toISOString(),
            bookingId: bookingId || null,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('chats').add(newChat);
        res.status(201).json({ id: docRef.id, ...newChat });

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
        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();
        if (!chatDoc.exists) return res.status(404).json({ message: 'Chat not found' });

        if (!chatDoc.data().participants.includes(uid)) {
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

        await db.collection('messages').add(newMessage);

        // Update Chat Preview
        await chatRef.update({
            lastMessage: type === 'IMAGE' ? '📷 Image' : finalContent,
            lastMessageTime: newMessage.createdAt
        });

        res.json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Send failed' });
    }
};

// Upload Media (Mock/Stub for MVP - In prod use Multer+Firebase Storage)
// For MVP, we'll assume the client sends Base64 or a URL they generated.
// Detailed implementation of Multi-part upload without 'multer' setup is complex in one step.
// We will allow the frontend to send a dummy URL for now or if they send base64 treat as text.

const getChats = async (req, res) => {
    try {
        const uid = req.user.uid;
        const snapshot = await db.collection('chats')
            .where('participants', 'array-contains', uid)
            .orderBy('lastMessageTime', 'desc')
            .get();

        const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: 'Fetch chats failed' });
    }
};

const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const uid = req.user.uid;

        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (!chatDoc.exists || !chatDoc.data().participants.includes(uid)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const snapshot = await db.collection('messages')
            .where('chatId', '==', chatId)
            .orderBy('createdAt', 'asc')
            .get();

        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Fetch messages failed' });
    }
};

module.exports = { startChat, sendMessage, getChats, getMessages };
