const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from uploaded document based on file type.
 * Returns trimmed text or throws if extraction yields empty content.
 */
const extractText = async (filePath, fileType) => {
  let text = '';

  switch (fileType) {
    case 'pdf': {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text || '';
      break;
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value || '';
      break;
    }
    case 'txt': {
      text = await fs.readFile(filePath, 'utf-8');
      break;
    }
    default:
      throw new Error('Unsupported file type');
  }

  text = text.trim();
  if (!text) {
    throw new Error('No text could be extracted from this document');
  }

  return text;
};

/**
 * Delete temporary uploaded file after extraction.
 */
const deleteTempFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete temp file: ${filePath}`, error.message);
  }
};

module.exports = { extractText, deleteTempFile };
