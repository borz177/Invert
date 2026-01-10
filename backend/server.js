
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: ['http://localhost:5173', 'https://babyborz.shop', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Подключение к БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const ADMIN_PASSWORD_HASH = '$2b$10$G7hJkLmNpQrStUvWxYzAeO9KlMnOpQrStUvWxYzAeO9KlMnOpQrS';

// Инициализация БД
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

    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');

    const checkTable = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'app_store' AND column_name = 'user_id'
    `);

    if (checkTable.rows.length === 0) {
      try {
        await pool.query('ALTER TABLE app_store ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
      } catch (e) {}
    }

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
      await pool.query(
        'INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
        ['00000000-0000-0000-0000-000000000000', 'admin', ADMIN_PASSWORD_HASH, 'Суперадмин', 'admin']
      );
    }
    console.log('✅ БД готова');
  } catch (err) {
    console.error('❌ Ошибка БД:', err);
  }
};

initDb();

// Обновление профиля
app.post('/api/auth/update-profile', async (req, res) => {
  const { userId, name, currentPassword, newPassword } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userResult.rows[0];

    // Если меняется пароль
    let newHash = user.password_hash;
    if (newPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Текущий пароль неверен' });
      newHash = await bcrypt.hash(newPassword, 10);
    }

    const updated = await pool.query(
      'UPDATE users SET name = $1, password_hash = $2 WHERE id = $3 RETURNING id, email, name, role',
      [name || user.name, newHash, userId]
    );

    const resultUser = updated.rows[0];
    // Важно: возвращаем ownerId для админа
    if (resultUser.role === 'admin') {
      resultUser.ownerId = resultUser.id;
    }

    res.json(resultUser);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
});

const ARRAY_KEYS = [
  'products', 'transactions', 'sales', 'cashEntries',
  'suppliers', 'customers', 'employees', 'categories',
  'posCart', 'warehouseBatch'
];

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const cleanEmail = email.toLowerCase().trim();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (isValid) {
        const { password_hash, ...safeUser } = user;
        return res.json({ ...safeUser, ownerId: safeUser.id });
      }
    }
    // Проверка сотрудников (в app_store)
    const empData = await pool.query("SELECT user_id, data FROM app_store WHERE key = 'employees'");
    for (const row of empData.rows) {
      const employees = Array.isArray(row.data) ? row.data : [];
      const employee = employees.find(e => e.login === email && e.password === password);
      if (employee) {
        return res.json({ id: employee.id, email: employee.login, name: employee.name, role: employee.role, ownerId: row.user_id, permissions: employee.permissions });
      }
    }
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/data', async (req, res) => {
  const { key, user_id } = req.body;
  try {
    const result = await pool.query('SELECT data FROM app_store WHERE user_id = $1 AND key = $2', [user_id, key]);
    let data = result.rows[0]?.data;
    if (ARRAY_KEYS.includes(key) && !Array.isArray(data)) data = [];
    res.json(data || (ARRAY_KEYS.includes(key) ? [] : {}));
  } catch (err) { res.status(500).json({ error: 'Ошибка БД' }); }
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
  } catch (err) { res.status(500).json({ error: 'Ошибка БД' }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email.toLowerCase().trim(), hashedPassword, name, 'admin']
    );
    const user = result.rows[0];
    res.status(201).json({ ...user, ownerId: user.id });
  } catch (err) { res.status(err.code === '23505' ? 409 : 500).json({ error: 'Ошибка регистрации' }); }
});

app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 Backend на порту ${PORT}`); });
