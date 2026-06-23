const mongoose = require('mongoose');
const Document = require('../models/Document');
const BookImage = require('../models/BookImage');
const { ALLOWED_EXTENSIONS } = require('../middleware/uploadMiddleware');
const { extractDocument, deleteTempFile } = require('../utils/extractText');
const { generateLesson, answerQuestion } = require('../utils/tutor');
const path = require('path');

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const findOwned = (req) => validId(req.params.id) ? Document.findOne({ _id: req.params.id, ownerKey: req.ownerKey }).select('-ownerKey') : null;

const uploadDocument = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a non-empty document to upload.' });
  const filePath = req.file.path;
  let createdDocument = null;
  try {
    const fileType = ALLOWED_EXTENSIONS[path.extname(req.file.originalname).toLowerCase()];
    const extracted = await extractDocument(filePath, fileType, req.file.originalname);
    const document = await Document.create({
      ownerKey: req.ownerKey, originalFilename: req.file.originalname, fileType,
      title: extracted.title, author: extracted.author, extractedText: extracted.text,
      tableOfContents: extracted.tableOfContents, chapters: extracted.chapters,
    });
    createdDocument = document;
    const imageRecords = [];
    for (const image of extracted.images || []) {
      const binary = await BookImage.create({ documentId: document._id, ownerKey: req.ownerKey, data: image.data, mimeType: image.mimeType });
      const chapterIndex = Math.min(document.chapters.length - 1, Math.max(0, image.chapterIndex || 0));
      imageRecords.push({
        id: binary.id,
        chapterId: document.chapters[chapterIndex]._id.toString(),
        pageNumber: image.pageNumber,
        order: image.order,
        imageUrl: `/api/documents/${document.id}/images/${binary.id}`,
        caption: image.caption,
        surroundingText: image.surroundingText,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
        paragraphIndex: image.paragraphIndex || 0,
        scannedPage: Boolean(image.scannedPage),
        label: image.label || `Figure ${image.order + 1}`,
      });
    }
    document.images = imageRecords;
    await document.save();
    const response = document.toObject();
    delete response.ownerKey;
    res.status(201).json(response);
  } catch (error) {
    if (createdDocument) {
      await Promise.all([BookImage.deleteMany({ documentId: createdDocument._id }), Document.deleteOne({ _id: createdDocument._id })]);
    }
    const status = /too large/i.test(error.message) ? 413 : 400;
    const safeMessage = /[A-Z]:\\|\/uploads\//i.test(error.message) ? 'The document could not be processed. It may be corrupted or contain an unsupported image.' : error.message;
    res.status(status).json({ message: safeMessage });
  } finally {
    await deleteTempFile(filePath);
  }
};

const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ ownerKey: req.ownerKey }).select('-ownerKey -extractedText -chapters.text').sort({ updatedAt: -1 });
    res.json(documents);
  } catch (error) { res.status(500).json({ message: 'Could not load the book history.' }); }
};

const getDocumentById = async (req, res) => {
  try {
    const document = await findOwned(req);
    if (!document) return res.status(404).json({ message: 'Book not found.' });
    res.json(document);
  } catch { res.status(500).json({ message: 'Could not load this book.' }); }
};

const getChapters = async (req, res) => {
  try {
    const document = await findOwned(req);
    if (!document) return res.status(404).json({ message: 'Book not found.' });
    res.json({ bookId: document.id, title: document.title, author: document.author, tableOfContents: document.tableOfContents, chapters: document.chapters, images: document.images, progress: document.progress });
  } catch { res.status(500).json({ message: 'Could not load chapters.' }); }
};

const saveProgress = async (req, res) => {
  const chapterIndex = Number(req.body.chapterIndex);
  const paragraphIndex = Number(req.body.paragraphIndex);
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || !Number.isInteger(paragraphIndex) || paragraphIndex < 0) return res.status(400).json({ message: 'Invalid reading position.' });
  if (!validId(req.params.id)) return res.status(404).json({ message: 'Book not found.' });
  const document = await Document.findOne({ _id: req.params.id, ownerKey: req.ownerKey });
  if (!document || chapterIndex >= document.chapters.length) return res.status(404).json({ message: 'Book or chapter not found.' });
  const percent = Math.min(100, Math.max(0, Number(req.body.percent) || 0));
  document.progress = { chapterIndex, paragraphIndex, percent };
  await document.save();
  res.json(document.progress);
};

const getLesson = async (req, res) => {
  const document = await findOwned(req);
  if (!document) return res.status(404).json({ message: 'Book not found.' });
  const level = ['beginner', 'student', 'advanced'].includes(req.body.level) ? req.body.level : 'student';
  const lessonWithImages = (chapter) => {
    const lesson = generateLesson(chapter, level);
    lesson.importantImages = document.images.filter((image) => image.chapterId === chapter._id.toString()).slice(0, 6).map((image) => ({ id: image.id, label: image.label, caption: image.caption, pageNumber: image.pageNumber, imageUrl: image.imageUrl }));
    return lesson;
  };
  if (req.body.scope === 'book') return res.json({ scope: 'book', lessons: document.chapters.map(lessonWithImages) });
  const index = Number(req.body.chapterIndex);
  if (!Number.isInteger(index) || !document.chapters[index]) return res.status(400).json({ message: 'Choose a valid chapter.' });
  res.json({ scope: 'chapter', lesson: lessonWithImages(document.chapters[index]) });
};

const getImage = async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.imageId)) return res.status(404).json({ message: 'Image not found.' });
  const image = await BookImage.findOne({ _id: req.params.imageId, documentId: req.params.id, ownerKey: req.ownerKey });
  if (!image) return res.status(404).json({ message: 'Image not found.' });
  res.set({ 'Content-Type': image.mimeType, 'Content-Length': image.data.length, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });
  res.send(image.data);
};

const explainImage = async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.imageId)) return res.status(404).json({ message: 'Image not found.' });
  const document = await Document.findOne({ _id: req.params.id, ownerKey: req.ownerKey }).select('-ownerKey');
  const image = document?.images.find((item) => item.id === req.params.imageId);
  if (!document || !image) return res.status(404).json({ message: 'Image not found.' });
  const chapter = document.chapters.id(image.chapterId);
  const label = image.label || `Figure ${image.order + 1}${image.pageNumber ? ` on page ${image.pageNumber}` : ''}`;
  const evidence = [image.caption, image.surroundingText].filter(Boolean).join(' ');
  const explanation = evidence
    ? `${label} appears in ${chapter?.title || 'this chapter'}. ${evidence} The explanation is limited to the book's caption and surrounding text because no visual-analysis provider is configured.`
    : `${label} has no usable caption or surrounding text. The image cannot be interpreted reliably without inventing details, so no visual explanation is available.`;
  res.json({ explanation, unclear: !evidence, image: { id: image.id, label, caption: image.caption, pageNumber: image.pageNumber }, citations: chapter ? [{ chapterNumber: chapter.number, chapterTitle: chapter.title, page: image.pageNumber || chapter.pageStart || null, excerpt: evidence.slice(0, 220) }] : [] });
};

const askTutor = async (req, res) => {
  const question = String(req.body.question || '').trim().slice(0, 1000);
  if (!question) return res.status(400).json({ message: 'Enter a question.' });
  const document = await findOwned(req);
  if (!document) return res.status(404).json({ message: 'Book not found.' });
  let chapters = document.chapters;
  if (req.body.context === 'chapter') {
    const chapter = chapters[Number(req.body.chapterIndex)];
    if (!chapter) return res.status(400).json({ message: 'Choose a valid chapter.' });
    chapters = [chapter];
  }
  res.json(answerQuestion(chapters, question, String(req.body.selectedText || '').slice(0, 5000)));
};

const deleteDocument = async (req, res) => {
  const document = validId(req.params.id) && await Document.findOneAndDelete({ _id: req.params.id, ownerKey: req.ownerKey });
  if (!document) return res.status(404).json({ message: 'Book not found.' });
  await BookImage.deleteMany({ documentId: document._id, ownerKey: req.ownerKey });
  res.json({ message: 'Book deleted.' });
};

module.exports = { uploadDocument, getDocuments, getDocumentById, getChapters, saveProgress, getLesson, getImage, explainImage, askTutor, deleteDocument };
