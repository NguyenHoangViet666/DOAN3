import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/forum:
 *   get:
 *     summary: Lấy tất cả bài viết trên diễn đàn
 *     tags: [Forum]
 *     responses:
 *       200:
 *         description: Thành công
 *       500:
 *         description: Lỗi hệ thống
 */
router.get('/', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT 
        p.id, p.title, p.content, p.topic, p.author_id as authorId, 
        p.view_count as viewCount, p.like_count as likeCount, 
        p.is_pinned as isPinned, p.pinned_until as pinnedUntil, 
        p.created_at as createdAt,
        u.username as authorName, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as authorAvatar,
        GROUP_CONCAT(r.name) as authorRoles
      FROM posts p 
      JOIN users u ON p.author_id = u.id 
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY p.id
      ORDER BY p.is_pinned DESC, p.created_at DESC
    `);
    
    for (let post of (posts as any[])) {
      post.authorRoles = post.authorRoles ? post.authorRoles.split(',') : [];
    }

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/forum/{id}:
 *   get:
 *     summary: Lấy chi tiết bài viết theo ID
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID bài viết
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy bài viết
 *       500:
 *         description: Lỗi hệ thống
 */
router.get('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);
    
    const [posts] = await pool.query(`
      SELECT 
        p.id, p.title, p.content, p.topic, p.author_id as authorId, 
        p.view_count as viewCount, p.like_count as likeCount, 
        p.is_pinned as isPinned, p.pinned_until as pinnedUntil, 
        p.created_at as createdAt,
        u.username as authorName, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as authorAvatar,
        GROUP_CONCAT(r.name) as authorRoles
      FROM posts p 
      JOIN users u ON p.author_id = u.id 
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [req.params.id]);
    
    const post = (posts as any[])[0];
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.authorRoles = post.authorRoles ? post.authorRoles.split(',') : [];

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get posts by user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT 
        p.id, p.title, p.content, p.topic, p.author_id as authorId, 
        p.view_count as viewCount, p.like_count as likeCount, 
        p.is_pinned as isPinned, p.pinned_until as pinnedUntil, 
        p.created_at as createdAt,
        u.username as authorName, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as authorAvatar,
        GROUP_CONCAT(r.name) as authorRoles
      FROM posts p 
      JOIN users u ON p.author_id = u.id 
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE p.author_id = ? 
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.params.userId]);
    
    for (let post of (posts as any[])) {
      post.authorRoles = post.authorRoles ? post.authorRoles.split(',') : [];
    }

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/forum:
 *   post:
 *     summary: Tạo một bài viết diễn đàn mới
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - topic
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Thảo luận về chương mới nhất của ma hoàng"
 *               content:
 *                 type: string
 *                 example: "Các đạo hữu nghĩ sao về cảnh này..."
 *               topic:
 *                 type: string
 *                 example: "Thảo Luận"
 *     responses:
 *       201:
 *         description: Tạo bài viết thành công
 *       401:
 *         description: Chưa xác thực token
 *       500:
 *         description: Lỗi hệ thống
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, content, topic } = req.body;
    const id = uuidv4();
    const authorId = req.user?.id;

    await pool.query(
      'INSERT INTO posts (id, title, content, topic, author_id) VALUES (?, ?, ?, ?, ?)',
      [id, title, content, topic, authorId]
    );

    res.status(201).json({ id, message: 'Post created' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update post
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, content, topic, isPinned, pinnedUntil } = req.body;
    
    const [posts] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    const post = (posts as any[])[0];
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR') || req.user?.roles.includes('Mod');
    
    // If only updating pin status, require admin
    const isPinUpdate = isPinned !== undefined || pinnedUntil !== undefined;
    if (isPinUpdate && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Only admins can pin posts' });
    }

    // If updating content, require ownership or admin
    const isContentUpdate = title !== undefined || content !== undefined || topic !== undefined;
    if (isContentUpdate && post.author_id !== req.user?.id && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Cannot edit this post' });
    }

    let finalPinnedUntil = pinnedUntil !== undefined ? pinnedUntil : post.pinned_until;
    if (isPinned === false) {
      finalPinnedUntil = null;
    } else if (finalPinnedUntil && typeof finalPinnedUntil === 'string') {
      finalPinnedUntil = new Date(finalPinnedUntil);
    }

    await pool.query(
      'UPDATE posts SET title=?, content=?, topic=?, is_pinned=?, pinned_until=? WHERE id=?',
      [
        title ?? post.title, 
        content ?? post.content, 
        topic ?? post.topic,
        isPinned ?? post.is_pinned,
        finalPinnedUntil,
        req.params.id
      ]
    );

    res.json({ message: 'Post updated' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Pin post
router.put('/:id/pin', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { isPinned, pinnedUntil } = req.body;
    
    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR') || req.user?.roles.includes('Mod');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let formattedPinnedUntil = null;
    if (pinnedUntil) {
      const dateObj = new Date(pinnedUntil);
      if (!isNaN(dateObj.getTime())) {
        formattedPinnedUntil = dateObj;
      }
    }

    await pool.query(
      'UPDATE posts SET is_pinned=?, pinned_until=? WHERE id=?',
      [isPinned, formattedPinnedUntil, req.params.id]
    );

    res.json({ message: 'Post pin status updated' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete post
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [posts] = await pool.query('SELECT author_id FROM posts WHERE id = ?', [req.params.id]);
    const post = (posts as any[])[0];
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR') || req.user?.roles.includes('Mod');
    if (post.author_id !== req.user?.id && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Cannot delete this post' });
    }

    await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

