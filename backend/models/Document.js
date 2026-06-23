const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
  {
    number: Number,
    title: { type: String, required: true },
    text: { type: String, required: true },
    pageStart: Number,
    pageEnd: Number,
    wordCount: Number,
    estimatedMinutes: Number,
  },
  { _id: true }
);

const progressSchema = new mongoose.Schema(
  {
    chapterIndex: { type: Number, default: 0 },
    paragraphIndex: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
  },
  { _id: false, timestamps: true }
);

const imageMetadataSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    chapterId: { type: String, required: true },
    pageNumber: Number,
    order: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    surroundingText: { type: String, default: '' },
    width: Number,
    height: Number,
    mimeType: { type: String, required: true },
    paragraphIndex: { type: Number, default: 0 },
    scannedPage: { type: Boolean, default: false },
    label: { type: String, default: '' },
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    ownerKey: { type: String, required: true, index: true },
    originalFilename: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String, default: '' },
    fileType: { type: String, enum: ['pdf', 'epub', 'docx', 'txt'], required: true },
    extractedText: { type: String, required: true },
    tableOfContents: [{ title: String, chapterIndex: Number, page: Number }],
    chapters: [chapterSchema],
    images: [imageMetadataSchema],
    progress: { type: progressSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
