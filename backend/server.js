
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

    // Проверка структуры app_store
    const checkTable = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'app_store' AND column_name = 'user_id'
    `);

    if (checkTable.rows.length === 0) {
      console.log('🏗️ Обновление структуры таблицы app_store...');
      try {
        await pool.query('ALTER TABLE app_store ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
      } catch (e) {
        console.log('Заметка: Таблица app_store обновляется.');
      }
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

const ARRAY_KEYS = [
  'products', 'transactions', 'sales', 'cashEntries',
  'suppliers', 'customers', 'employees', 'categories',
  'posCart', 'warehouseBatch'
];

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

  try {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Владельцы
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (user.password_hash) {
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (isValid) {
          const { password_hash, ...safeUser } = user;
          return res.json({ ...safeUser, role: 'admin', ownerId: safeUser.id });
        }
      }
    }

    // 2. Сотрудники
    const empData = await pool.query("SELECT user_id, data FROM app_store WHERE key = 'employees'");
    for (const row of empData.rows) {
      const employees = Array.isArray(row.data) ? row.data : [];
      const employee = employees.find(e =>
        e.login && (e.login.toLowerCase() === cleanEmail || e.login === email) &&
        e.password === password
      );

      if (employee) {
        return res.json({
          id: employee.id,
          email: employee.login,
          name: employee.name,
          role: employee.role, // Возвращаем роль сотрудника (кассир, управляющий и т.д.)
          ownerId: row.user_id,
          permissions: employee.permissions
        });
      }
    }

    return res.status(401).json({ error: 'Неверный логин или пароль' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение данных
app.post('/api/data', async (req, res) => {
  const { key, user_id } = req.body;
  if (!key || !user_id) return res.status(400).json({ error: 'Missing key or user_id' });

  try {
    const result = await pool.query(
      'SELECT data FROM app_store WHERE user_id = $1 AND key = $2',
      [user_id, key]
    );

    let data = result.rows[0]?.data;
    if (ARRAY_KEYS.includes(key)) {
      if (!Array.isArray(data)) data = [];
    }
    res.json(data || (ARRAY_KEYS.includes(key) ? [] : {}));
  } catch (err) {
    res.status(500).json({ error: 'Ошибка БД' });
  }
});

// Сохранение данных
app.post('/api/data/save', async (req, res) => {
  const { key, data, user_id } = req.body;
  if (!key || !user_id) return res.status(400).json({ error: 'Missing key or user_id' });

  let sanitizedData = data;
  if (ARRAY_KEYS.includes(key)) {
    if (!Array.isArray(data)) {
      sanitizedData = [];
    }
  }

  try {
    await pool.query(
      `INSERT INTO app_store (user_id, key, data) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, key) 
       DO UPDATE SET data = $3, updated_at = NOW()`,
      [user_id, key, JSON.stringify(sanitizedData)]
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка БД' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',
      [email.toLowerCase().trim(), hashedPassword, name]
    );
    const user = result.rows[0];
    res.status(201).json({ ...user, ownerId: user.id });
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ error: 'Ошибка регистрации' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend запущен на порту ${PORT}`);
});
