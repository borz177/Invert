
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Настройка подключения к локальной БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Отключаем кэширование на уровне сервера
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_store (
        key VARCHAR(255) PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ База данных готова к работе');
  } catch (err) {
    console.error('❌ Ошибка инициализации БД:', err);
  }
};

initDb();

app.get('/api/data', async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).send('Missing key');

  try {
    const result = await pool.query('SELECT data FROM app_store WHERE key = $1', [key]);
    res.json(result.rows[0]?.data || []);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/data', async (req, res) => {
  const { key, data } = req.body;
  if (!key) return res.status(400).send('Missing key');

  try {
    await pool.query(`
      INSERT INTO app_store (key, data, updated_at) 
      VALUES ($1, $2, NOW()) 
      ON CONFLICT (key) 
      DO UPDATE SET data = $2, updated_at = NOW()
    `, [key, JSON.stringify(data)]);
    res.sendStatus(200);
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
