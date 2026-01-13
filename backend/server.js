
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'https://babyborz.shop', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Хеш для пароля 'admin'
const ADMIN_PASSWORD_HASH = '$2b$10$G7hJkLmNpQrStUvWxYzAeO9KlMnOpQrStUvWxYzAeO9KlMnOpQrS';

const initDb = async () => {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_store (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, key)
      )
    `);
    const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      // Создаем супер-админа с ID 000...
      await pool.query(
        'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
        ['00000000-0000-0000-0000-000000000000', 'admin', ADMIN_PASSWORD_HASH, 'Главный Админ', 'superadmin']
      );
    }
    console.log('✅ БД готова');
  } catch (err) {
    console.error('❌ Ошибка БД:', err);
  }
};

initDb();

// --- ADMIN ENDPOINTS ---
app.post('/api/admin/users', async (req, res) => {
  const { requester_id } = req.body;
  if (requester_id !== '00000000-0000-0000-0000-000000000000') return res.status(403).json({ error: 'Access denied' });
  try {
    const users = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users.rows);
  } catch (err) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { requester_id, target_user_id } = req.body;
  if (requester_id !== '00000000-0000-0000-0000-000000000000') return res.status(403).json({ error: 'Access denied' });
  if (target_user_id === requester_id) return res.status(400).json({ error: 'Cannot delete yourself' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [target_user_id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/api/admin/stats', async (req, res) => {
  const { requester_id } = req.body;
  if (requester_id !== '00000000-0000-0000-0000-000000000000') return res.status(403).json({ error: 'Access denied' });
  try {
    const totalUsers = await pool.query('SELECT count(*) FROM users');
    const totalShops = await pool.query("SELECT count(*) FROM users WHERE role = 'admin'");
    const totalDataRows = await pool.query('SELECT count(*) FROM app_store');
    res.json({
      users: parseInt(totalUsers.rows[0].count),
      shops: parseInt(totalShops.rows[0].count),
      dataPoints: parseInt(totalDataRows.rows[0].count)
    });
  } catch (err) { res.status(500).json({ error: 'DB Error' }); }
});

// --- REGULAR ENDPOINTS ---
app.post('/api/shops/search', async (req, res) => {
  const { query } = req.body;
  try {
    const shopsData = await pool.query(
      `SELECT u.id, u.name as ownerName, s.data as settings 
       FROM users u 
       JOIN app_store s ON u.id = s.user_id 
       WHERE u.role = 'admin' AND s.key = 'settings' 
       AND (s.data->>'isPublic')::boolean = true
       AND (s.data->>'shopName' ILIKE $1 OR u.name ILIKE $1)`,
      [`%${query}%`]
    );
    res.json(shopsData.rows.map(row => ({ id: row.id, shopName: row.settings.shopName || 'Без названия', ownerName: row.ownerName })));
  } catch (err) { res.status(500).json({ error: 'Search error' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const cleanEmail = email.toLowerCase().trim();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Для аккаунта 'admin' / 'admin'
      if (cleanEmail === 'admin' && password === 'admin') {
        const { password_hash, ...safeUser } = user;
        return res.json({ ...safeUser, ownerId: safeUser.id });
      }
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (isValid) {
        const { password_hash, ...safeUser } = user;
        return res.json({ ...safeUser, ownerId: safeUser.role === 'admin' || safeUser.role === 'superadmin' ? safeUser.id : undefined });
      }
    }
    const storeData = await pool.query("SELECT user_id, key, data FROM app_store WHERE key = 'employees'");
    for (const row of storeData.rows) {
      const employees = Array.isArray(row.data) ? row.data : [];
      const employee = employees.find(e => e.login === email && e.password === password);
      if (employee) return res.json({ id: employee.id, email: employee.login, name: employee.name, role: employee.role, ownerId: row.user_id, permissions: employee.permissions });
    }
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/data', async (req, res) => {
  const { key, user_id } = req.body;
  try {
    const result = await pool.query('SELECT data FROM app_store WHERE user_id = $1 AND key = $2', [user_id, key]);
    res.json(result.rows[0]?.data || ([]));
  } catch (err) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/api/data/save', async (req, res) => {
  const { key, data, user_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO app_store (user_id, key, data) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) DO UPDATE SET data = $3, updated_at = NOW()`,
      [user_id, key, JSON.stringify(data)]
    );
    res.sendStatus(200);
  } catch (err) { res.status(500).json({ error: 'DB Error' }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email.toLowerCase().trim(), hashedPassword, name, role || 'admin']
    );
    const user = result.rows[0];
    res.status(201).json({ ...user, ownerId: user.role === 'admin' ? user.id : undefined });
  } catch (err) { res.status(err.code === '23505' ? 409 : 500).json({ error: 'Registration error' }); }
});

app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Backend на порту ${PORT}`); });
