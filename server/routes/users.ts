import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng (Chỉ dành cho Admin/SSR/Mod)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       403:
 *         description: Không có quyền truy cập (Forbidden)
 *       500:
 *         description: Lỗi hệ thống
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR') || req.user?.roles.includes('Mod');
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const [users] = await pool.query(`
      SELECT u.id, u.username, u.email, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as avatar 
      FROM users u
      ORDER BY u.created_at DESC
    `);

    for (let user of (users as any[])) {
      const [roles] = await pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [user.id]);
      user.roles = (roles as any[]).map(r => r.name);
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Lấy thông tin hồ sơ của người dùng theo ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID người dùng
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi hệ thống
 */
router.get('/:id', async (req, res) => {
  try {
    const [users] = await pool.query("SELECT id, username, email, COALESCE(avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as avatar FROM users WHERE id = ?", [req.params.id]);
    const user = (users as any[])[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [roles] = await pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [user.id]);
    user.roles = (roles as any[]).map(r => r.name);

    const [liked] = await pool.query('SELECT novel_id FROM user_liked_novels WHERE user_id = ?', [user.id]);
    user.likedNovelIds = (liked as any[]).map(l => l.novel_id);

    const [friends] = await pool.query('SELECT friend_id FROM friends WHERE user_id = ?', [user.id]);
    user.friends = (friends as any[]).map(f => f.friend_id);

    const [friendRequests] = await pool.query("SELECT sender_id FROM friend_requests WHERE receiver_id = ? AND status = 'PENDING'", [user.id]);
    user.friendRequests = (friendRequests as any[]).map(f => f.sender_id);

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Temporary endpoint to make a user an admin
router.post('/make-admin', async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    const user = (users as any[])[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', ['Admin']);
    const role = (roles as any[])[0];
    if (!role) return res.status(404).json({ message: 'Role not found' });

    await pool.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [user.id, role.id]);
    res.json({ message: `User ${email} is now an admin` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Cập nhật thông tin hồ sơ cá nhân
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: new_display_name
 *               avatar:
 *                 type: string
 *                 example: https://new-avatar-link.png
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Chưa xác thực token
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi hệ thống
 */
router.put('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username, avatar } = req.body;

    const [users] = await pool.query('SELECT username, avatar FROM users WHERE id = ?', [req.user?.id]);
    const user = (users as any[])[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    await pool.query('UPDATE users SET username = ?, avatar = ? WHERE id = ?', [
      username !== undefined ? username : user.username,
      avatar !== undefined ? avatar : user.avatar,
      req.user?.id
    ]);
    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update user roles (Admin only)
router.put('/:id/roles', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR');
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const { roles } = req.body; // Array of role names
    const userId = req.params.id;

    // Check if user exists
    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if ((users as any[]).length === 0) return res.status(404).json({ message: 'User not found' });

    // Get role IDs for the provided role names
    const [roleRows] = await pool.query('SELECT id, name FROM roles WHERE name IN (?)', [roles.length > 0 ? roles : ['']]);
    const roleIds = (roleRows as any[]).map(r => r.id);

    // Delete existing roles
    await pool.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);

    // Insert new roles
    if (roleIds.length > 0) {
      const values = roleIds.map(roleId => [userId, roleId]);
      await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);
    }

    res.json({ message: 'Roles updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR');
    if (!isAdmin) return res.status(403).json({ message: 'Forbidden' });

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    const user = (users as any[])[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete related data first
    await pool.query('DELETE FROM user_roles WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM user_liked_novels WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [req.params.id, req.params.id]);
    await pool.query('DELETE FROM friend_requests WHERE sender_id = ? OR receiver_id = ?', [req.params.id, req.params.id]);
    await pool.query('DELETE FROM ratings WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM comments WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM comment_likes WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM replies WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM role_requests WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM posts WHERE author_id = ?', [req.params.id]);
    await pool.query('DELETE FROM conversation_participants WHERE user_id = ?', [req.params.id]);
    await pool.query('DELETE FROM messages WHERE sender_id = ?', [req.params.id]);

    // Delete novels uploaded by user
    const [novels] = await pool.query('SELECT id FROM novels WHERE uploader_id = ?', [req.params.id]);
    const novelIds = (novels as any[]).map(n => n.id);
    if (novelIds.length > 0) {
      await pool.query('DELETE FROM novel_genres WHERE novel_id IN (?)', [novelIds]);
      await pool.query('DELETE FROM chapters WHERE novel_id IN (?)', [novelIds]);
      await pool.query('DELETE FROM comments WHERE novel_id IN (?)', [novelIds]);
      await pool.query('DELETE FROM user_liked_novels WHERE novel_id IN (?)', [novelIds]);
      await pool.query('DELETE FROM ratings WHERE novel_id IN (?)', [novelIds]);
      await pool.query('DELETE FROM novels WHERE uploader_id = ?', [req.params.id]);
    }

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/users/like/{novelId}:
 *   post:
 *     summary: Thích / Bỏ thích một truyện
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: novelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID truyện cần Thích / Bỏ thích
 *     responses:
 *       200:
 *         description: Đã thay đổi trạng thái (Thành công)
 *       401:
 *         description: Chưa xác thực token
 *       500:
 *         description: Lỗi hệ thống
 */
router.post('/like/:novelId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const novelId = req.params.novelId;
    const userId = req.user?.id;

    const [existing] = await pool.query('SELECT * FROM user_liked_novels WHERE user_id = ? AND novel_id = ?', [userId, novelId]);

    if ((existing as any[]).length > 0) {
      await pool.query('DELETE FROM user_liked_novels WHERE user_id = ? AND novel_id = ?', [userId, novelId]);
      res.json({ message: 'Unliked', liked: false });
    } else {
      await pool.query('INSERT INTO user_liked_novels (user_id, novel_id) VALUES (?, ?)', [userId, novelId]);
      res.json({ message: 'Liked', liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Notifications
router.get('/me/notifications', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [notifications] = await pool.query(`
      SELECT 
        id, user_id as userId, type, title, message, link, 
        is_read as isRead, COALESCE(actor_avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as actorAvatar, created_at as createdAt 
      FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [req.user?.id]);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user?.id]);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
