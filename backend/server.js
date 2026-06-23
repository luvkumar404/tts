require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const connectDB = require('./config/db');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((x) => x.trim()) : '*', allowedHeaders: ['Content-Type', 'X-Session-ID'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api/documents', documentRoutes);
app.get('/api/config', (_req, res) => res.json({ supportedTypes: ['pdf', 'epub', 'docx', 'txt'] }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', message: 'VoiceDoc Tutor API is running' }));
app.use((req, res) => res.status(404).json({ message: 'API route not found.' }));
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ message: err.message });
  res.status(400).json({ message: err.message || 'Request failed.' });
});

const start = async () => {
  await connectDB();
  const port = process.env.PORT || 5000;
  return app.listen(port, () => console.log(`VoiceDoc Tutor server running on port ${port}`));
};

if (require.main === module) start();
module.exports = { app, start };
