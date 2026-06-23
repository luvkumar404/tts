const mongoose = require('mongoose');

const bookImageSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    ownerKey: { type: String, required: true, index: true },
    data: { type: Buffer, required: true },
    mimeType: { type: String, enum: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'], required: true },
  },
  { timestamps: true }
);

bookImageSchema.index({ documentId: 1, ownerKey: 1 });
module.exports = mongoose.model('BookImage', bookImageSchema);
