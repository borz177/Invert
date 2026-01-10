const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'https://babyborz.shop'],
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

// Создаём хеш для admin123
const ADMIN_PASSWORD_HASH = '$2b$10$1NgDQeIO5JKmoB3J4APQBuCMmdX7JpyTuSWt8XHI4TULdcgydnldu'; // ← замените на ваш хеш

// Инициализация админа
const initAdmin = async () => {
  const adminCheck = await pool.query('SELECT id FROM users WHERE email = $1', ['admin']);
  if (adminCheck.rows.length === 0) {
    await pool.query(
      'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
      ['00000000-0000-0000-0000-000000000000', 'admin', ADMIN_PASSWORD_HASH, 'Суперадмин']
    );
    console.log('👑 Superadmin создан');
  }
};

// Регистрация владельца
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, пароль и имя обязательны' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email.toLowerCase().trim(), hashedPassword, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Пользователь уже существует' });
    }
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();

    // Сначала проверяем владельца
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (isValid) {
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'owner',
          ownerId: user.id
        });
      }
    }

    // Потом проверяем сотрудника
    const empResult = await pool.query(
      'SELECT e.*, u.id as owner_id FROM employees e JOIN users u ON e.owner_id = u.id WHERE e.login = $1',
      [cleanEmail]
    );
    if (empResult.rows.length > 0) {
      const emp = empResult.rows[0];
      const isValid = await bcrypt.compare(password, emp.password_hash);
      if (isValid) {
        return res.json({
          id: emp.id,
          email: emp.login,
          name: emp.name,
          role: emp.role,
          ownerId: emp.owner_id,
          permissions: emp.permissions
        });
      }
    }

    return res.status(401).json({ error: 'Неверный логин или пароль' });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение данных
app.post('/api/data', async (req, res) => {
  console.log('📥 GET DATA — RAW:', req.body);
  const { key, user_id } = req.body;
  if (!key || !user_id) {
    console.error('❌ Missing key or user_id');
    return res.status(400).json({ error: 'Missing key or user_id' });
  }

  try {
    console.log('🔍 Запрос к БД:', { user_id, key });
    const result = await pool.query(
      'SELECT data FROM app_store WHERE owner_id = $1 AND key = $2',
      [user_id, key]
    );
    console.log('✅ Получено данных:', result.rows.length);
    res.json(result.rows[0]?.data || []);
  } catch (err) {
    console.error('💥 ОШИБКА ПРИ ЧТЕНИИ:', err.message);
    res.status(500).json({ error: 'Ошибка БД' });
  }
});

app.post('/api/data/save', async (req, res) => {
  console.log('📥 SAVE DATA — RAW:', req.body);
  const { key, data, user_id } = req.body;
  if (!key || !user_id) {
    console.error('❌ Missing key or user_id');
    return res.status(400).json({ error: 'Missing key or user_id' });
  }

  try {
    console.log('🔍 Проверка пользователя...');
    const userCheck = await pool.query('SELECT 1 FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      console.error('❌ Пользователь не найден:', user_id);
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    console.log('📤 Сохранение данных...');
    await pool.query(
      `INSERT INTO app_store (user_id, key, data) 
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, key) 
       DO UPDATE SET data = $3::jsonb, updated_at = NOW()`,
      [user_id, key, data]
    );
    console.log('✅ Данные сохранены');
    res.sendStatus(200);
  } catch (err) {
    console.error('💥 ОШИБКА ПРИ СОХРАНЕНИИ:', err.message);
    res.status(500).json({ error: 'Ошибка БД' });
  }
});

// Создание сотрудника (только для владельца)
app.post('/api/employees', async (req, res) => {
  const { user_id, login, password, name, role, permissions } = req.body; // ← ИЗМЕНЕНО НА user_id
  if (!user_id || !login || !password || !name) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO employees (owner_id, login, password_hash, name, role, permissions)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, login, name, role, permissions`,
      [user_id, login, hashedPassword, name, role || 'seller', JSON.stringify(permissions || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Сотрудник с таким логином уже существует' });
    }
    console.error('Ошибка создания сотрудника:', err);
    res.status(500).json({ error: 'Ошибка создания сотрудника' });
  }
});

initAdmin().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend запущен на порту ${PORT}`);
  });
});