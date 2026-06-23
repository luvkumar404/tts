const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXTENSIONS = { '.pdf': 'pdf', '.epub': 'epub', '.docx': 'docx', '.txt': 'txt' };
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'application/epub+zip': 'epub',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

const sanitizeFilename = (name) =>
  path.basename(name).replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, ' ').slice(0, 180);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const type = ALLOWED_TYPES[file.mimetype];
  if (!ALLOWED_EXTENSIONS[ext] || !type || ALLOWED_EXTENSIONS[ext] !== type) {
    return cb(new Error('Unsupported or mismatched file type. Upload a PDF, EPUB, DOCX, or TXT file.'));
  }
  file.originalname = sanitizeFilename(file.originalname);
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { files: 1 } });

module.exports = { upload, ALLOWED_TYPES, ALLOWED_EXTENSIONS, sanitizeFilename };
