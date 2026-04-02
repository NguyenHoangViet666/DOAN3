import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get all novels (with filters)
router.get('/', async (req, res) => {
  try {
    const { type, isPending } = req.query;
    let query = 'SELECT * FROM novels WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (isPending !== undefined) {
      query += ' AND is_pending = ?';
      params.push(isPending === 'true' ? 1 : 0);
    }

    query += ' ORDER BY is_pending DESC, created_at DESC';

    const [novels] = await pool.query(query, params);
    const novelsList = novels as any[];
    
    // Fetch genres for each novel
    for (let novel of novelsList) {
      const [genres] = await pool.query('SELECT genre FROM novel_genres WHERE novel_id = ?', [novel.id]);
      novel.genres = (genres as any[]).map(g => g.genre);
      
      novel.coverUrl = novel.cover_url;
      novel.uploaderId = novel.uploader_id;
      novel.isPending = novel.is_pending;
      novel.isFeatured = novel.is_featured;
      novel.viewCount = novel.view_count;
      novel.likeCount = novel.like_count;
      novel.ratingCount = novel.rating_count;
      novel.ratingSum = novel.rating_sum;
      novel.createdAt = novel.created_at;
      
      delete novel.cover_url;
      delete novel.uploader_id;
      delete novel.is_pending;
      delete novel.is_featured;
      delete novel.view_count;
      delete novel.like_count;
      delete novel.rating_count;
      delete novel.rating_sum;
      delete novel.created_at;
    }

    res.json(novelsList);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get novel by ID
router.get('/:id', async (req, res) => {
  try {
    const [novels] = await pool.query('SELECT * FROM novels WHERE id = ?', [req.params.id]);
    const novel = (novels as any[])[0];
    if (!novel) return res.status(404).json({ message: 'Novel not found' });

    const [genres] = await pool.query('SELECT genre FROM novel_genres WHERE novel_id = ?', [novel.id]);
    novel.genres = (genres as any[]).map(g => g.genre);
    
    novel.coverUrl = novel.cover_url;
    novel.uploaderId = novel.uploader_id;
    novel.isPending = novel.is_pending;
    novel.isFeatured = novel.is_featured;
    novel.viewCount = novel.view_count;
    novel.likeCount = novel.like_count;
    novel.ratingCount = novel.rating_count;
    novel.ratingSum = novel.rating_sum;
    novel.createdAt = novel.created_at;
    
    delete novel.cover_url;
    delete novel.uploader_id;
    delete novel.is_pending;
    delete novel.is_featured;
    delete novel.view_count;
    delete novel.like_count;
    delete novel.rating_count;
    delete novel.rating_sum;
    delete novel.created_at;

    res.json(novel);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create novel
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, author, description, coverUrl, type, status, length, genres } = req.body;
    const id = uuidv4();
    const uploaderId = req.user?.id;

    await pool.query(
      'INSERT INTO novels (id, title, author, description, cover_url, type, status, length, uploader_id, is_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, author, description, coverUrl, type, status, length, uploaderId, true] // Default pending
    );

    if (genres && Array.isArray(genres)) {
      for (const genre of genres) {
        await pool.query('INSERT INTO novel_genres (novel_id, genre) VALUES (?, ?)', [id, genre]);
      }
    }

    res.status(201).json({ id, message: 'Novel created successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update novel
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, author, description, coverUrl, type, status, length, genres, isPending, isFeatured } = req.body;
    
    // Check ownership or admin
    const [novels] = await pool.query('SELECT * FROM novels WHERE id = ?', [req.params.id]);
    const novel = (novels as any[])[0];
    if (!novel) return res.status(404).json({ message: 'Novel not found' });

    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR') || req.user?.roles.includes('Mod');
    if (novel.uploader_id !== req.user?.id && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if ((isPending !== undefined || isFeatured !== undefined) && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Only admins can update pending or featured status' });
    }

    await pool.query(
      'UPDATE novels SET title=?, author=?, description=?, cover_url=?, type=?, status=?, length=?, is_pending=?, is_featured=? WHERE id=?',
      [
        title ?? novel.title, 
        author ?? novel.author, 
        description ?? novel.description, 
        coverUrl ?? novel.cover_url, 
        type ?? novel.type, 
        status ?? novel.status, 
        length ?? novel.length, 
        isPending ?? novel.is_pending, 
        isFeatured ?? novel.is_featured, 
        req.params.id
      ]
    );

    if (genres && Array.isArray(genres)) {
      await pool.query('DELETE FROM novel_genres WHERE novel_id = ?', [req.params.id]);
      for (const genre of genres) {
        await pool.query('INSERT INTO novel_genres (novel_id, genre) VALUES (?, ?)', [req.params.id, genre]);
      }
    }

    res.json({ message: 'Novel updated' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get novels by uploader
router.get('/uploader/:uploaderId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM novels WHERE uploader_id = ? ORDER BY created_at DESC',
      [req.params.uploaderId]
    );
    const novels = rows as any[];
    
    // Fetch genres for each novel
    for (const novel of novels) {
      const [genreRows] = await pool.query(
        'SELECT genre FROM novel_genres WHERE novel_id = ?',
        [novel.id]
      );
      novel.genres = (genreRows as any[]).map(g => g.genre);
      
      // Convert snake_case to camelCase
      novel.coverUrl = novel.cover_url;
      novel.uploaderId = novel.uploader_id;
      novel.isPending = novel.is_pending;
      novel.isFeatured = novel.is_featured;
      novel.viewCount = novel.view_count;
      novel.likeCount = novel.like_count;
      novel.ratingCount = novel.rating_count;
      novel.ratingSum = novel.rating_sum;
      novel.createdAt = novel.created_at;
      
      delete novel.cover_url;
      delete novel.uploader_id;
      delete novel.is_pending;
      delete novel.is_featured;
      delete novel.view_count;
      delete novel.like_count;
      delete novel.rating_count;
      delete novel.rating_sum;
      delete novel.created_at;
    }
    
    res.json(novels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete novel
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [novels] = await pool.query('SELECT * FROM novels WHERE id = ?', [req.params.id]);
    const novel = (novels as any[])[0];
    if (!novel) return res.status(404).json({ message: 'Novel not found' });

    const isAdmin = req.user?.roles.includes('Admin') || req.user?.roles.includes('SSR') || req.user?.roles.includes('Mod');
    if (novel.uploader_id !== req.user?.id && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Delete related data first to avoid foreign key constraint errors (in case ON DELETE CASCADE is missing)
    await pool.query('DELETE FROM novel_genres WHERE novel_id = ?', [req.params.id]);
    await pool.query('DELETE FROM chapters WHERE novel_id = ?', [req.params.id]);
    
    // Delete replies and comment_likes for comments on this novel
    const [comments] = await pool.query('SELECT id FROM comments WHERE novel_id = ?', [req.params.id]);
    const commentIds = (comments as any[]).map(c => c.id);
    if (commentIds.length > 0) {
      await pool.query('DELETE FROM replies WHERE comment_id IN (?)', [commentIds]);
      await pool.query('DELETE FROM comment_likes WHERE comment_id IN (?)', [commentIds]);
    }
    
    await pool.query('DELETE FROM comments WHERE novel_id = ?', [req.params.id]);
    await pool.query('DELETE FROM user_liked_novels WHERE novel_id = ?', [req.params.id]);
    await pool.query('DELETE FROM ratings WHERE novel_id = ?', [req.params.id]);
    
    await pool.query('DELETE FROM novels WHERE id = ?', [req.params.id]);

    res.json({ message: 'Novel deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get user's rating for a novel
router.get('/:id/rating', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const [ratings] = await pool.query('SELECT * FROM ratings WHERE novel_id = ? AND user_id = ?', [req.params.id, userId]);
    const rating = (ratings as any[])[0];
    if (!rating) return res.status(404).json({ message: 'Not rated yet' });
    res.json(rating);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Rate a novel
router.post('/:id/rate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { score } = req.body;
    const userId = req.user?.id;
    const novelId = req.params.id;
    
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ message: 'Invalid score' });
    }

    const [existing] = await pool.query('SELECT * FROM ratings WHERE novel_id = ? AND user_id = ?', [novelId, userId]);
    const existingRating = (existing as any[])[0];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (existingRating) {
        const diff = score - existingRating.score;
        await connection.query('UPDATE ratings SET score = ? WHERE id = ?', [score, existingRating.id]);
        await connection.query('UPDATE novels SET rating_sum = rating_sum + ? WHERE id = ?', [diff, novelId]);
      } else {
        const id = uuidv4();
        await connection.query('INSERT INTO ratings (id, novel_id, user_id, score) VALUES (?, ?, ?, ?)', [id, novelId, userId, score]);
        await connection.query('UPDATE novels SET rating_count = rating_count + 1, rating_sum = rating_sum + ? WHERE id = ?', [score, novelId]);
      }
      
      await connection.commit();
      res.json({ message: 'Rating saved' });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
