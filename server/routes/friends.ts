import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/friends/request/{toUserId}:
 *   post:
 *     summary: Gửi yêu cầu kết bạn tới một người dùng khác
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: toUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người nhận yêu cầu kết bạn
 *     responses:
 *       201:
 *         description: Gửi yêu cầu thành công
 *       400:
 *         description: Yêu cầu không hợp lệ (gửi cho chính mình hoặc đã gửi rồi)
 *       401:
 *         description: Chưa xác thực token
 *       500:
 *         description: Lỗi hệ thống
 */
router.post('/request/:toUserId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const fromUserId = req.user?.id;
    const toUserId = req.params.toUserId;

    if (fromUserId === toUserId) return res.status(400).json({ message: 'Cannot send request to yourself' });

    const [existing] = await pool.query('SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?', [fromUserId, toUserId]);
    if ((existing as any[]).length > 0) return res.status(400).json({ message: 'Request already sent' });

    await pool.query(
      'INSERT INTO friend_requests (id, sender_id, receiver_id) VALUES (?, ?, ?)',
      [uuidv4(), fromUserId, toUserId]
    );

    await pool.query(
      'INSERT INTO notifications (id, user_id, type, title, message, link, actor_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), toUserId, 'FRIEND_REQUEST', 'Lời mời kết bạn mới', `${req.user?.username} muốn kết bạn với bạn.`, `/user/${fromUserId}`, req.user?.avatar || null]
    );

    res.status(201).json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Cancel friend request
router.post('/cancel/:toUserId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const fromUserId = req.user?.id;
    const toUserId = req.params.toUserId;

    await pool.query('DELETE FROM friend_requests WHERE sender_id = ? AND receiver_id = ?', [fromUserId, toUserId]);
    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/friends/accept/{fromUserId}:
 *   post:
 *     summary: Chấp nhận yêu cầu kết bạn từ người dùng khác
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fromUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người gửi yêu cầu kết bạn
 *     responses:
 *       200:
 *         description: Chấp nhận kết bạn thành công
 *       401:
 *         description: Chưa xác thực token
 *       500:
 *         description: Lỗi hệ thống
 */
router.post('/accept/:fromUserId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const currentUser = req.user?.id;
    const fromUserId = req.params.fromUserId;

    await pool.query("UPDATE friend_requests SET status = 'ACCEPTED' WHERE sender_id = ? AND receiver_id = ?", [fromUserId, currentUser]);
    
    await pool.query('INSERT IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)', [currentUser, fromUserId]);
    await pool.query('INSERT IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)', [fromUserId, currentUser]);

    await pool.query(
      'INSERT INTO notifications (id, user_id, type, title, message, link, actor_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), fromUserId, 'FRIEND_ACCEPT', 'Lời mời kết bạn được chấp nhận', `${req.user?.username} đã chấp nhận lời mời kết bạn của bạn.`, `/user/${currentUser}`, req.user?.avatar || null]
    );

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Unfriend
router.post('/unfriend/:friendId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const currentUser = req.user?.id;
    const friendId = req.params.friendId;

    await pool.query('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [currentUser, friendId]);
    await pool.query('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [friendId, currentUser]);
    await pool.query('DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [currentUser, friendId, friendId, currentUser]);

    res.json({ message: 'Unfriended' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
