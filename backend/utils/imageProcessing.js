const { createCanvas, loadImage } = require('canvas');

const MIME_BY_EXTENSION = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', svg: 'image/svg+xml',
};

const mimeFromPath = (filename = '', fallback = '') => MIME_BY_EXTENSION[filename.split('.').pop()?.toLowerCase()] || fallback.toLowerCase();

const normalizeImage = async (data, mimeType = '') => {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!buffer.length) throw new Error('Empty image');
  const image = await loadImage(buffer);
  if (!image.width || !image.height) throw new Error('Invalid image dimensions');
  const maxDimension = 2400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  return { data: canvas.toBuffer('image/png'), mimeType: 'image/png', width, height, originalMimeType: mimeType };
};

const captionNear = (text = '') => {
  const candidates = String(text).split(/\n|(?<=[.!?])\s+/).map((line) => line.trim());
  return candidates.find((line) => /^(?:figure|fig\.?|chart|diagram|table|illustration|image)\s*[\d.ivxlcdm-]*/i.test(line))?.slice(0, 500) || '';
};

module.exports = { normalizeImage, mimeFromPath, captionNear };
