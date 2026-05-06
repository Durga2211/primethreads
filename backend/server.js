require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS — allow frontend origin
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '50mb' }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clothing';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const Product = require('./models/Product');

// ─── Health Check ─────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Prime Threads API', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({ status: 'ok', database: states[dbState] || 'unknown' });
});

// ─── API Routes ───────────────────────────────

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ id: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST to sync/add products
app.post('/api/products', async (req, res) => {
  try {
    const newProducts = req.body;
    if (Array.isArray(newProducts)) {
      const savedProducts = [];
      for (const p of newProducts) {
        const updated = await Product.findOneAndUpdate(
          { id: p.id },
          p,
          { new: true, upsert: true }
        );
        savedProducts.push(updated);
      }
      res.json(savedProducts);
    } else {
      res.status(400).json({ message: 'Expected an array of products' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE a product
app.put('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await Product.findOneAndUpdate({ id }, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await Product.findOneAndDelete({ id });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
