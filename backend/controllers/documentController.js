const Document = require('../models/Document');
const { ALLOWED_TYPES } = require('../middleware/uploadMiddleware');
const { extractText, deleteTempFile } = require('../utils/extractText');

// POST /api/documents/upload
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileType = ALLOWED_TYPES[req.file.mimetype];
    const filePath = req.file.path;

    let extractedText;
    try {
      extractedText = await extractText(filePath, fileType);
    } catch (extractError) {
      await deleteTempFile(filePath);
      return res.status(400).json({ message: extractError.message });
    }

    // Remove temp file after successful extraction
    await deleteTempFile(filePath);

    const document = await Document.create({
      userId: req.user._id,
      originalFilename: req.file.originalname,
      fileType,
      extractedText,
    });

    res.status(201).json({
      _id: document._id,
      originalFilename: document.originalFilename,
      fileType: document.fileType,
      extractedText: document.extractedText,
      createdAt: document.createdAt,
    });
  } catch (error) {
    if (req.file?.path) {
      await deleteTempFile(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents
const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .select('-extractedText')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents/:id
const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/documents/:id
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
};
