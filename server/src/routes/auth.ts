import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Tables, getRecords, createRecord, getRecord } from '../services/airtable';
import { generateToken, authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    // Check if user exists
    const { records: existing } = await getRecords(Tables.Users, {
      filterByFormula: `{Email} = '${email.replace(/'/g, "\\'")}'`,
    });

    if (existing.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createRecord(Tables.Users, {
      Email: email,
      Name: name,
      Role: 'member',
      PasswordHash: passwordHash,
    });

    const token = generateToken({
      userId: user.id,
      email: user.Email,
      role: user.Role || 'member',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.Email,
        name: user.Name,
        role: user.Role || 'member',
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { records } = await getRecords(Tables.Users, {
      filterByFormula: `{Email} = '${email.replace(/'/g, "\\'")}'`,
    });

    if (records.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = records[0];
    const validPassword = await bcrypt.compare(password, user.PasswordHash || '');

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.Email,
      role: user.Role || 'member',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.Email,
        name: user.Name,
        role: user.Role || 'member',
        avatar: user.Avatar,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await getRecord(Tables.Users, req.user!.userId);
    res.json({
      id: user.id,
      email: user.Email,
      name: user.Name,
      role: user.Role || 'member',
      avatar: user.Avatar,
    });
  } catch (err: any) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
