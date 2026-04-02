import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to fetch comments with replies and likes
const fetchComments = async (query: string, params: any[]) => {
  const [comments] = await pool.query(query, params);
  
  for (let comment of (comments as any[])) {
    // Get roles
    const [roles] = await pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [comment.user_id]);
    comment.roles = (roles as any[]).map(r => r.name);

    // Get likes
    const [likes] = await pool.query('SELECT user_id FROM comment_likes WHERE comment_id = ?', [comment.id]);
    comment.likedBy = (likes as any[]).map(l => l.user_id);

    // Get replies
    const [replies] = await pool.query(`
      SELECT 
        r.id, r.comment_id as commentId, r.user_id as userId, 
        r.content, r.created_at as createdAt,
        u.username, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as userAvatar 
      FROM replies r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.comment_id = ? 
      ORDER BY r.created_at ASC
    `, [comment.id]);
    
    for (let reply of (replies as any[])) {
      const [replyRoles] = await pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [reply.user_id]);
      reply.roles = (replyRoles as any[]).map(r => r.name);
    }
    comment.replies = replies;
  }
  return comments;
};

// Get comments for a novel
router.get('/novel/:novelId', async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, c.novel_id as novelId, c.post_id as postId, 
        c.user_id as userId, c.content, c.created_at as createdAt,
        u.username, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as userAvatar 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.novel_id = ? 
      ORDER BY c.created_at DESC
    `;
    const comments = await fetchComments(query, [req.params.novelId]);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get comments for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id, c.novel_id as novelId, c.post_id as postId, 
        c.user_id as userId, c.content, c.created_at as createdAt,
        u.username, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as userAvatar 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = ? 
      ORDER BY c.created_at ASC
    `;
    const comments = await fetchComments(query, [req.params.postId]);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create comment
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { novelId, postId, content } = req.body;
    const id = uuidv4();
    const userId = req.user?.id;

    await pool.query(
      'INSERT INTO comments (id, novel_id, post_id, user_id, content) VALUES (?, ?, ?, ?, ?)',
      [id, novelId || null, postId || null, userId, content]
    );

    // Create notification if it's a novel comment
    if (novelId) {
      const [novels] = await pool.query('SELECT uploader_id, title, cover_url FROM novels WHERE id = ?', [novelId]);
      const novel = (novels as any[])[0];
      if (novel && novel.uploader_id !== userId) {
        await pool.query(
          'INSERT INTO notifications (id, user_id, type, title, message, link, actor_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), novel.uploader_id, 'NEW_POST_COMMENT', 'Bình luận mới', `Có bình luận mới trong truyện "${novel.title}"`, `/novel/${novelId}`, (req.user as any)?.avatar || null]
        );
      }
    }

    res.status(201).json({ id, message: 'Comment created' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Toggle like comment
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.id;

    const [existing] = await pool.query('SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
    
    if ((existing as any[]).length > 0) {
      await pool.query('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
      res.json({ message: 'Unliked', liked: false });
    } else {
      await pool.query('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, userId]);
      
      // Notify comment owner
      const [comments] = await pool.query('SELECT user_id, novel_id, post_id FROM comments WHERE id = ?', [commentId]);
      const comment = (comments as any[])[0];
      if (comment && comment.user_id !== userId) {
        const link = comment.novel_id ? `/novel/${comment.novel_id}` : `/forum/${comment.post_id}`;
        await pool.query(
          'INSERT INTO notifications (id, user_id, type, title, message, link, actor_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), comment.user_id, 'LIKE_COMMENT', 'Ai đó thích bình luận của bạn', `${req.user?.username} đã thích bình luận của bạn.`, link, (req.user as any)?.avatar || null]
        );
      }
      
      res.json({ message: 'Liked', liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create reply
router.post('/:id/reply', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const id = uuidv4();
    const commentId = req.params.id;
    const userId = req.user?.id;

    await pool.query(
      'INSERT INTO replies (id, comment_id, user_id, content) VALUES (?, ?, ?, ?)',
      [id, commentId, userId, content]
    );

    // Notify comment owner
    const [comments] = await pool.query('SELECT user_id, novel_id, post_id FROM comments WHERE id = ?', [commentId]);
    const comment = (comments as any[])[0];
    if (comment && comment.user_id !== userId) {
      const link = comment.novel_id ? `/novel/${comment.novel_id}` : `/forum/${comment.post_id}`;
      await pool.query(
        'INSERT INTO notifications (id, user_id, type, title, message, link, actor_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), comment.user_id, 'REPLY_COMMENT', 'Có người trả lời bình luận', `${req.user?.username} đã trả lời bình luận của bạn.`, link, (req.user as any)?.avatar || null]
      );
    }

    res.status(201).json({ id, message: 'Reply created' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete comment
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [comments] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [req.params.id]);
    const comment = (comments as any[])[0];
    
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR') || req.user?.roles.includes('Mod');
    if (comment.user_id !== req.user?.id && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
