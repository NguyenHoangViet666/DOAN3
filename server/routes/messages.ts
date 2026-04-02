import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user's conversations
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const [conversations] = await pool.query(`
      SELECT c.id, c.last_message as lastMessage, c.last_message_at as lastMessageAt, cp.unread_count 
      FROM conversations c 
      JOIN conversation_participants cp ON c.id = cp.conversation_id 
      WHERE cp.user_id = ? 
      ORDER BY c.last_message_at DESC
    `, [userId]);

    for (let conv of (conversations as any[])) {
      const [participants] = await pool.query(`
        SELECT u.id, u.username, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as avatar 
        FROM conversation_participants cp 
        JOIN users u ON cp.user_id = u.id 
        WHERE cp.conversation_id = ?
      `, [conv.id]);
      
      conv.participants = (participants as any[]).map(p => p.id);
      conv.participantInfo = participants;
      
      // Build unreadCount object
      const [unreadCounts] = await pool.query('SELECT user_id, unread_count FROM conversation_participants WHERE conversation_id = ?', [conv.id]);
      conv.unreadCount = {};
      for (let uc of (unreadCounts as any[])) {
        conv.unreadCount[uc.user_id] = uc.unread_count;
      }
    }

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get conversation by partner
router.get('/partner/:partnerId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const partnerId = req.params.partnerId;

    const [conversations] = await pool.query(`
      SELECT c.id 
      FROM conversations c 
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
    `, [userId, partnerId]);

    const conv = (conversations as any[])[0];
    if (!conv) return res.json(null);

    // Fetch full details
    const [details] = await pool.query('SELECT id, last_message as lastMessage, last_message_at as lastMessageAt FROM conversations WHERE id = ?', [conv.id]);
    const fullConv = (details as any[])[0];
    
    const [participants] = await pool.query('SELECT user_id FROM conversation_participants WHERE conversation_id = ?', [conv.id]);
    fullConv.participants = (participants as any[]).map(p => p.user_id);

    res.json(fullConv);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get messages in a conversation
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [messages] = await pool.query('SELECT id, conversation_id as conversationId, sender_id as senderId, content, is_read as isRead, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [req.params.id]);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Send a message
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { toUserId, content } = req.body;
    const fromUserId = req.user?.id;
    let conversationId = '';

    // Check if conversation exists
    const [existing] = await pool.query(`
      SELECT c.id 
      FROM conversations c 
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
    `, [fromUserId, toUserId]);

    const conv = (existing as any[])[0];

    if (!conv) {
      conversationId = uuidv4();
      await pool.query('INSERT INTO conversations (id, last_message) VALUES (?, ?)', [conversationId, content]);
      await pool.query('INSERT INTO conversation_participants (conversation_id, user_id, unread_count) VALUES (?, ?, ?)', [conversationId, fromUserId, 0]);
      await pool.query('INSERT INTO conversation_participants (conversation_id, user_id, unread_count) VALUES (?, ?, ?)', [conversationId, toUserId, 1]);
    } else {
      conversationId = conv.id;
      await pool.query('UPDATE conversations SET last_message = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ?', [content, conversationId]);
      await pool.query('UPDATE conversation_participants SET unread_count = unread_count + 1 WHERE conversation_id = ? AND user_id = ?', [conversationId, toUserId]);
    }

    const messageId = uuidv4();
    await pool.query(
      'INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)',
      [messageId, conversationId, fromUserId, content]
    );

    res.status(201).json({ id: messageId, message: 'Message sent' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Mark conversation as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await pool.query('UPDATE conversation_participants SET unread_count = 0 WHERE conversation_id = ? AND user_id = ?', [req.params.id, req.user?.id]);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get total unread count
router.get('/unread/count', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [counts] = await pool.query('SELECT SUM(unread_count) as total FROM conversation_participants WHERE user_id = ?', [req.user?.id]);
    const total = (counts as any[])[0]?.total || 0;
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
