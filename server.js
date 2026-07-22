import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'menu.json');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

const createDefaultMenu = () => ({
  title: 'Olympic Hotel',
  subtitle: 'Fine dining menu',
  categories: [
    {
      id: crypto.randomUUID(),
      name: 'Starters',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Crispy Calamari',
          description: 'Lemon aioli, chili flakes, parsley',
          price: '18.00',
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: 'Mains',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Herb Roast Chicken',
          description: 'Truffle jus, roasted baby vegetables',
          price: '32.00',
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: 'Drinks',
      items: [
        {
          id: crypto.randomUUID(),
          name: 'Signature Spritz',
          description: 'Citrus, elderflower, sparkling wine',
          price: '14.00',
        },
      ],
    },
  ],
});

async function ensureSchema() {
  if (!pool) {
    throw new Error('Database is not configured');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_data (
      id INTEGER PRIMARY KEY DEFAULT 1,
      content JSONB NOT NULL
    );
  `);

  const existing = await pool.query('SELECT content FROM menu_data WHERE id = 1');
  if (existing.rowCount === 0) {
    await pool.query('INSERT INTO menu_data (id, content) VALUES (1, $1)', [JSON.stringify(createDefaultMenu())]);
  }
}

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(createDefaultMenu(), null, 2));
  }
}

async function readMenuFromFile() {
  await ensureDataFile();
  const content = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(content);
}

async function writeMenuToFile(content) {
  await ensureDataFile();
  await fs.writeFile(dataFile, JSON.stringify(content, null, 2));
  return content;
}

async function loadMenuContent() {
  try {
    await ensureSchema();
    const result = await pool.query('SELECT content FROM menu_data WHERE id = 1');
    return result.rows[0]?.content ?? createDefaultMenu();
  } catch (error) {
    console.warn('Database unavailable, using local file fallback:', error.message);
    return readMenuFromFile();
  }
}

async function saveMenuContent(content) {
  try {
    await ensureSchema();
    await pool.query('UPDATE menu_data SET content = $1 WHERE id = 1', [content]);
  } catch (error) {
    console.warn('Database unavailable, saving to local file fallback:', error.message);
  }

  return writeMenuToFile(content);
}

app.get('/api/menu', async (_req, res) => {
  try {
    const content = await loadMenuContent();
    res.json(content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load menu' });
  }
});

app.put('/api/menu', async (req, res) => {
  try {
    const content = await saveMenuContent(req.body);
    res.json(content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to save menu' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
