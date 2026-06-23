const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/documentController');
const { upload } = require('../middleware/uploadMiddleware');
const { sessionScope } = require('../middleware/sessionMiddleware');

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const uploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many uploads. Please wait before trying again.' } });
const tutorLimit = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.TUTOR_RATE_LIMIT) || 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Tutor request limit reached. Please wait a minute.' } });

router.use(sessionScope);
router.post('/upload', uploadLimit, upload.single('document'), asyncHandler(controller.uploadDocument));
router.get('/', asyncHandler(controller.getDocuments));
router.get('/:id/chapters', asyncHandler(controller.getChapters));
router.get('/:id/images/:imageId', asyncHandler(controller.getImage));
router.post('/:id/images/:imageId/explain', tutorLimit, asyncHandler(controller.explainImage));
router.put('/:id/progress', asyncHandler(controller.saveProgress));
router.post('/:id/lessons', tutorLimit, asyncHandler(controller.getLesson));
router.post('/:id/tutor', tutorLimit, asyncHandler(controller.askTutor));
router.get('/:id', asyncHandler(controller.getDocumentById));
router.delete('/:id', asyncHandler(controller.deleteDocument));

module.exports = router;
