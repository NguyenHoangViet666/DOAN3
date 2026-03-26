import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      console.log('Register failed: Email already exists', email);
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.query(
      'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
      [userId, username, email, hashedPassword]
    );

    // Default role: User
    const [roleRow] = await pool.query('SELECT id FROM roles WHERE name = ?', ['User']);
    if ((roleRow as any[]).length === 0) {
      console.error('CRITICAL: "User" role not found in database!');
      throw new Error('"User" role not found');
    }
    const roleId = (roleRow as any[])[0].id;
    await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);

    console.log('Register successful for:', email);
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = (users as any[])[0];

    if (!user) {
      console.log('Login failed: User not found', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Login failed: Invalid password', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const [roles] = await pool.query(
      'SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
      [user.id]
    );
    const roleNames = (roles as any[]).map(r => r.name);

    const [friends] = await pool.query('SELECT friend_id FROM friends WHERE user_id = ?', [user.id]);
    const friendsArray = (friends as any[]).map(f => f.friend_id);

    const [friendRequests] = await pool.query("SELECT sender_id FROM friend_requests WHERE receiver_id = ? AND status = 'PENDING'", [user.id]);
    const friendRequestsArray = (friendRequests as any[]).map(f => f.sender_id);

    const [liked] = await pool.query('SELECT novel_id FROM user_liked_novels WHERE user_id = ?', [user.id]);
    const likedNovelIdsArray = (liked as any[]).map(l => l.novel_id);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, roles: roleNames },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, roles: roleNames, avatar: user.avatar, friends: friendsArray, friendRequests: friendRequestsArray, likedNovelIds: likedNovelIdsArray } });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, email, avatar FROM users WHERE id = ?', [req.user?.id]);
    const user = (users as any[])[0];
    if (!user) return res.sendStatus(404);

    const [roles] = await pool.query(
      'SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
      [user.id]
    );
    user.roles = (roles as any[]).map(r => r.name);

    const [friends] = await pool.query('SELECT friend_id FROM friends WHERE user_id = ?', [user.id]);
    user.friends = (friends as any[]).map(f => f.friend_id);

    const [friendRequests] = await pool.query("SELECT sender_id FROM friend_requests WHERE receiver_id = ? AND status = 'PENDING'", [user.id]);
    user.friendRequests = (friendRequests as any[]).map(f => f.sender_id);

    const [liked] = await pool.query('SELECT novel_id FROM user_liked_novels WHERE user_id = ?', [user.id]);
    user.likedNovelIds = (liked as any[]).map(l => l.novel_id);

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
