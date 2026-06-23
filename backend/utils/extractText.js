const fs = require('fs').promises;
const path = require('path');
const canvasApi = require('canvas');
global.DOMMatrix ||= canvasApi.DOMMatrix;
global.Path2D ||= canvasApi.Path2D;
global.ImageData ||= canvasApi.ImageData;
const { createCanvas } = canvasApi;
const mammoth = require('mammoth');
const JSZip = require('jszip');
const { cleanText, detectChapters, stripHtml, decodeEntities } = require('./chapters');
const { normalizeImage, mimeFromPath, captionNear } = require('./imageProcessing');
const PDFJS_ROOT = path.dirname(require.resolve('pdfjs-dist/package.json'));
let pdfjsPromise;
const loadPdfJs = () => { pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs'); return pdfjsPromise; };

class NapiCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(target, width, height) {
    target.canvas.width = width; target.canvas.height = height;
  }
  destroy(target) {
    target.canvas.width = 0; target.canvas.height = 0; target.canvas = null; target.context = null;
  }
}

const verifySignature = (buffer, type) => {
  if (!buffer?.length) throw new Error('The uploaded file is empty.');
  const head = buffer.subarray(0, 8);
  if (type === 'pdf' && head.subarray(0, 5).toString() !== '%PDF-') throw new Error('The file contents do not match the PDF format.');
  if ((type === 'docx' || type === 'epub') && !(head[0] === 0x50 && head[1] === 0x4b)) throw new Error(`The file contents do not match the ${type.toUpperCase()} format.`);
  if (type === 'txt' && buffer.subarray(0, 512).includes(0)) throw new Error('Binary or executable content cannot be uploaded as TXT.');
};

const xmlValue = (xml, names) => {
  for (const name of names) {
    const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
    if (match) return cleanText(stripHtml(match[1]));
  }
  return '';
};

const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1] || '';

const textFromPdfItems = (items) => {
  let lastY = null;
  const lines = [];
  for (const item of items) {
    const y = Math.round(item.transform?.[5] || 0);
    if (lastY !== null && Math.abs(y - lastY) > 2) lines.push('\n');
    lines.push(item.str, ' ');
    lastY = y;
  }
  return cleanText(lines.join(''));
};

const associatePdfImages = (images, chapters, pages) => images.map((image) => {
  let chapterIndex = chapters.findIndex((chapter) => image.pageNumber >= (chapter.pageStart || 1) && image.pageNumber <= (chapter.pageEnd || pages.length));
  if (chapterIndex < 0) chapterIndex = Math.min(chapters.length - 1, Math.max(0, image.pageNumber - 1));
  const pageText = pages[image.pageNumber - 1]?.text || '';
  const chapterText = chapters[chapterIndex]?.text || '';
  const anchor = pageText.slice(0, 80);
  const offset = anchor ? chapterText.indexOf(anchor) : -1;
  const paragraphIndex = offset < 0 ? 0 : chapterText.slice(0, offset).split(/\n\s*\n/).length - 1;
  return { ...image, chapterIndex, paragraphIndex };
});

const extractPdf = async (buffer) => {
  try {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer), disableWorker: true, useSystemFonts: true,
      standardFontDataUrl: `${path.join(PDFJS_ROOT, 'standard_fonts')}${path.sep}`,
      cMapUrl: `${path.join(PDFJS_ROOT, 'cmaps')}${path.sep}`, cMapPacked: true,
      CanvasFactory: NapiCanvasFactory,
    }).promise;
    const metadata = await pdf.getMetadata().catch(() => ({ info: {} }));
    const pages = [];
    const images = [];
    const imageOps = new Set([
      pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintInlineImageXObject, pdfjs.OPS.paintImageMaskXObject,
      pdfjs.OPS.paintImageXObjectRepeat, pdfjs.OPS.paintImageMaskXObjectRepeat,
    ]);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ normalizeWhitespace: true });
      const pageText = textFromPdfItems(content.items);
      const operators = await page.getOperatorList();
      const containsGraphics = operators.fnArray.some((operator) => imageOps.has(operator));
      const scannedPage = !pageText || pageText.length < 15;
      pages.push({ number: pageNumber, text: pageText || 'This is a scanned page. Text extraction is unavailable, but you can still view the page.' });
      if (containsGraphics || scannedPage) {
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, 1600 / base.width);
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const surroundingText = pageText.slice(0, 1000);
        const caption = scannedPage ? `Scanned page ${pageNumber}` : captionNear(pageText);
        images.push({ data: canvas.toBuffer('image/png'), mimeType: 'image/png', width: canvas.width, height: canvas.height, pageNumber, order: images.length, caption, surroundingText, scannedPage, label: caption || `Figure on page ${pageNumber}` });
      }
      page.cleanup();
    }
    await pdf.destroy();
    const text = cleanText(pages.map((page) => page.text).join('\n\n'));
    const title = cleanText(metadata.info?.Title || '') || 'Untitled PDF';
    const chapters = detectChapters({ text, title, pages });
    chapters.forEach((chapter, index) => {
      if (chapter.pageStart) return;
      const firstPage = pages.findIndex((page) => page.text.toLowerCase().includes(chapter.title.toLowerCase()));
      chapter.pageStart = firstPage >= 0 ? firstPage + 1 : Math.min(index + 1, pages.length);
      const nextTitle = chapters[index + 1]?.title?.toLowerCase();
      const nextPage = nextTitle ? pages.findIndex((page, pageIndex) => pageIndex >= chapter.pageStart && page.text.toLowerCase().includes(nextTitle)) : -1;
      chapter.pageEnd = nextPage >= chapter.pageStart ? nextPage : pages.length;
    });
    return { title, author: cleanText(metadata.info?.Author || ''), text, pages, chapters, images: associatePdfImages(images, chapters, pages) };
  } catch (error) {
    if (/password|encrypted/i.test(error.message)) throw new Error('Password-protected PDFs are not supported. Please remove the password and upload again.');
    throw error;
  }
};

const sectionsFromHeadings = (html) => {
  const tokens = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|([\s\S]*?)(?=<h[1-6]|$)/gi)];
  const sections = [];
  let current = null;
  for (const token of tokens) {
    if (token[1]) { if (current?.text.trim()) sections.push(current); current = { title: stripHtml(token[2]), text: '' }; }
    else if (current && token[3]) current.text += `\n${stripHtml(token[3])}`;
  }
  if (current?.text.trim()) sections.push(current);
  return sections;
};

const extractDocx = async (filePath) => {
  const rawImages = [];
  const converted = await mammoth.convertToHtml({ path: filePath }, {
    convertImage: mammoth.images.imgElement(async (image) => {
      const index = rawImages.length;
      rawImages.push({ data: Buffer.from(await image.read('base64'), 'base64'), mimeType: image.contentType, marker: `book-image-${index}` });
      return { src: `book-image-${index}` };
    }),
  });
  const raw = await mammoth.extractRawText({ path: filePath });
  const text = cleanText(raw.value);
  const title = path.basename(filePath, path.extname(filePath));
  const explicitSections = sectionsFromHeadings(converted.value);
  const chapters = detectChapters({ text, title, explicitSections });
  const images = [];
  for (let index = 0; index < rawImages.length; index += 1) {
    const item = rawImages[index];
    try {
      const normalized = await normalizeImage(item.data, item.mimeType);
      const markerAt = converted.value.indexOf(item.marker);
      const before = converted.value.slice(0, markerAt);
      const chapterIndex = Math.min(chapters.length - 1, Math.max(0, (before.match(/<h[1-6]\b/gi) || []).length - 1));
      const lastHeading = Math.max(before.lastIndexOf('<h1'), before.lastIndexOf('<h2'), before.lastIndexOf('<h3'), before.lastIndexOf('<h4'), before.lastIndexOf('<h5'), before.lastIndexOf('<h6'));
      const paragraphIndex = (before.slice(Math.max(0, lastHeading)).match(/<p\b/gi) || []).length;
      const nearby = stripHtml(converted.value.slice(Math.max(0, markerAt - 700), markerAt + 700));
      const caption = captionNear(nearby);
      images.push({ ...normalized, chapterIndex, paragraphIndex, order: images.length, caption, surroundingText: nearby.slice(0, 1000), label: caption || `Figure ${images.length + 1}` });
    } catch { /* Corrupt embedded images are omitted; no placeholder image is fabricated. */ }
  }
  return { title, author: '', text, chapters, images };
};

const extractEpub = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const container = await zip.file('META-INF/container.xml')?.async('string');
  const opfPath = container?.match(/full-path=["']([^"']+)["']/i)?.[1];
  if (!opfPath || !zip.file(opfPath)) throw new Error('The EPUB is corrupted or missing its package metadata.');
  const opf = await zip.file(opfPath).async('string');
  const root = path.posix.dirname(opfPath);
  const manifest = {};
  for (const tag of opf.matchAll(/<item\b[^>]*>/gi)) {
    const id = attribute(tag[0], 'id'); const href = attribute(tag[0], 'href');
    if (id && href) manifest[id] = decodeURIComponent(href.split('#')[0]);
  }
  const spine = [...opf.matchAll(/<itemref\b[^>]*>/gi)].map((match) => attribute(match[0], 'idref')).filter(Boolean);
  const title = xmlValue(opf, ['dc:title', 'title']) || 'Untitled EPUB';
  const author = xmlValue(opf, ['dc:creator', 'creator']);
  const explicitSections = [];
  const pendingImages = [];
  for (const id of spine) {
    const href = manifest[id];
    const contentPath = href && path.posix.normalize(path.posix.join(root, href));
    const file = contentPath && zip.file(contentPath);
    if (!file) continue;
    const html = await file.async('string');
    const chapterIndex = explicitSections.length;
    const heading = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    const sectionText = cleanText(stripHtml(html));
    if (sectionText) explicitSections.push({ title: heading ? stripHtml(heading[1]) : `Section ${chapterIndex + 1}`, text: sectionText });
    for (const imageMatch of html.matchAll(/<img\b[^>]*>/gi)) {
      const src = decodeURIComponent(attribute(imageMatch[0], 'src').split('#')[0]);
      const imagePath = src && path.posix.normalize(path.posix.join(path.posix.dirname(contentPath), src));
      const imageFile = imagePath && zip.file(imagePath);
      if (!imageFile) continue;
      const markerAt = imageMatch.index;
      const before = html.slice(0, markerAt);
      const nearbyHtml = html.slice(Math.max(0, markerAt - 800), markerAt + 1000);
      const figcaption = nearbyHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1];
      pendingImages.push({ imageFile, imagePath, mimeType: mimeFromPath(imagePath), chapterIndex, paragraphIndex: (before.match(/<p\b/gi) || []).length, caption: cleanText(stripHtml(figcaption || attribute(imageMatch[0], 'alt'))), surroundingText: cleanText(stripHtml(nearbyHtml)).slice(0, 1000) });
    }
  }
  const text = cleanText(explicitSections.map((section) => `${section.title}\n${section.text}`).join('\n\n'));
  if (!text) throw new Error('No readable text could be extracted from this EPUB.');
  const chapters = detectChapters({ text, title, explicitSections });
  const images = [];
  for (const pending of pendingImages) {
    try {
      const normalized = await normalizeImage(await pending.imageFile.async('nodebuffer'), pending.mimeType);
      images.push({ ...normalized, chapterIndex: Math.min(pending.chapterIndex, chapters.length - 1), paragraphIndex: pending.paragraphIndex, order: images.length, caption: pending.caption || captionNear(pending.surroundingText), surroundingText: pending.surroundingText, label: pending.caption || `Figure ${images.length + 1}` });
    } catch { /* Skip unreadable archive images without fabricating replacements. */ }
  }
  return { title, author, text, chapters, images };
};

const extractDocument = async (filePath, fileType, originalFilename) => {
  const buffer = await fs.readFile(filePath);
  verifySignature(buffer, fileType);
  let result;
  if (fileType === 'pdf') result = await extractPdf(buffer);
  else if (fileType === 'docx') result = await extractDocx(filePath);
  else if (fileType === 'epub') result = await extractEpub(buffer);
  else {
    const text = cleanText(buffer.toString('utf8'));
    const title = path.basename(originalFilename, path.extname(originalFilename));
    result = { title, author: '', text, chapters: detectChapters({ text, title }), images: [] };
  }
  if (!result.text || !result.chapters.length) throw new Error('No text could be extracted from this document. It may be empty or corrupted.');
  result.title = result.title === path.basename(filePath, path.extname(filePath)) ? path.basename(originalFilename, path.extname(originalFilename)) : result.title;
  if (/^untitled\b/i.test(result.title)) result.title = path.basename(originalFilename, path.extname(originalFilename));
  result.tableOfContents = result.chapters.map((chapter, chapterIndex) => ({ title: chapter.title, chapterIndex, page: chapter.pageStart }));
  return result;
};

const deleteTempFile = async (filePath) => {
  if (!filePath) return;
  try { await fs.unlink(filePath); } catch (error) { if (error.code !== 'ENOENT') console.error('Temporary upload cleanup failed:', error.message); }
};

module.exports = { extractDocument, deleteTempFile, verifySignature };
