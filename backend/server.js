// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Безопасная настройка CORS (разрешаем только ваш домен)
const corsOptions = {
  origin: ['http://localhost:5173', 'https://babyborz.shop'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Подключение к БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

// Инициализация таблицы
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_store (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Таблица app_store готова');
};
initDb().catch(console.error);

// Эндпоинты
app.get('/api/data', async (req, res) => {
  const { key } = req.query;
  if (!key || typeof key !== 'string' || key.length > 100) {
    return res.status(400).json({ error: 'Invalid key' });
  }

  try {
    const result = await pool.query('SELECT data FROM app_store WHERE key = $1', [key]);
    res.json(result.rows[0]?.data || []);
  } catch (err) {
    console.error('GET error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/data', async (req, res) => {
  const { key, data } = req.body;
  if (!key || typeof key !== 'string' || key.length > 100) {
    return res.status(400).json({ error: 'Invalid key' });
  }

  try {
    await pool.query(
      `INSERT INTO app_store (key, data) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET data = $2, updated_at = NOW()`,
      [key, JSON.stringify(data)]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('POST error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend запущен на порту ${PORT}`);
});