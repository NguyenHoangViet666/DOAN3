import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Create role request
router.post('/request', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { requestedRole, reason } = req.body;
    const userId = req.user?.id;

    const [existing] = await pool.query("SELECT * FROM role_requests WHERE user_id = ? AND status = 'Chờ duyệt'", [userId]);
    if ((existing as any[]).length > 0) return res.status(400).json({ message: 'You already have a pending request' });

    await pool.query(
      'INSERT INTO role_requests (id, user_id, requested_role, reason) VALUES (?, ?, ?, ?)',
      [uuidv4(), userId, requestedRole, reason]
    );

    res.status(201).json({ message: 'Role request submitted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get role requests (Admin only)
router.get('/requests', authenticateToken, requireRole(['Admin', 'SSR', 'Mod']), async (req: AuthRequest, res) => {
  try {
    const [requests] = await pool.query(`
      SELECT 
        rr.id, 
        rr.user_id as userId, 
        rr.requested_role as requestedRole, 
        rr.reason, 
        rr.status, 
        rr.created_at as createdAt,
        u.username, 
        COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as userAvatar 
      FROM role_requests rr 
      JOIN users u ON rr.user_id = u.id 
      ORDER BY rr.created_at DESC
    `);
    
    for (let request of (requests as any[])) {
      const [roles] = await pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [request.userId]);
      request.currentRoles = (roles as any[]).map(r => r.name);
    }

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update role request status (Admin only)
router.put('/requests/:id', authenticateToken, requireRole(['Admin', 'SSR', 'Mod']), async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    const [requests] = await pool.query('SELECT * FROM role_requests WHERE id = ?', [requestId]);
    const request = (requests as any[])[0];
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await pool.query('UPDATE role_requests SET status = ? WHERE id = ?', [status, requestId]);

    if (status === 'Đã duyệt') {
      const [roleRow] = await pool.query('SELECT id FROM roles WHERE name = ?', [request.requested_role]);
      const roleId = (roleRow as any[])[0]?.id;
      
      if (roleId) {
        await pool.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [request.user_id, roleId]);
        
        await pool.query(
          'INSERT INTO notifications (id, user_id, type, title, message, link, actor_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), request.user_id, 'ROLE_UPDATE', 'Yêu cầu cấp quyền được duyệt', `Yêu cầu cấp quyền ${request.requested_role} của bạn đã được duyệt.`, `/profile`, req.user?.avatar || null]
        );
      }
    } else if (status === 'Từ chối') {
      await pool.query(
        'INSERT INTO notifications (id, user_id, type, title, message, link, actor_avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), request.user_id, 'ROLE_UPDATE', 'Yêu cầu cấp quyền bị từ chối', `Yêu cầu cấp quyền ${request.requested_role} của bạn đã bị từ chối.`, `/profile`, req.user?.avatar || null]
      );
    }

    res.json({ message: 'Request updated' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get user's pending request
router.get('/requests/user/:userId', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        rr.id, rr.user_id as userId, u.username, COALESCE(u.avatar, 'https://i.pinimg.com/736x/4b/90/5b/4b905b1342b5635310923fd10319c265.jpg') as userAvatar,
        rr.requested_role as requestedRole, rr.reason, rr.status, rr.created_at as createdAt
      FROM role_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.user_id = ? AND rr.status = ? 
      ORDER BY rr.created_at DESC LIMIT 1
    `, [req.params.userId, 'Chờ duyệt']);
    
    const requests = rows as any[];
    if (requests.length === 0) {
      return res.status(404).json({ message: 'No pending request found' });
    }
    
    const reqData = requests[0];
    
    // Get current roles for this user
    const [roles] = await pool.query('SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [reqData.userId]);
    reqData.currentRoles = (roles as any[]).map(r => r.name);
    
    res.json(reqData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
