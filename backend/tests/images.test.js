const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');
const { createCanvas } = require('canvas');
const { extractDocument } = require('../utils/extractText');
const { normalizeImage } = require('../utils/imageProcessing');

const samplePng = () => {
  const canvas = createCanvas(80, 40);
  const context = canvas.getContext('2d');
  context.fillStyle = '#3366ff'; context.fillRect(0, 0, 80, 40);
  return canvas.toBuffer('image/png');
};

const samplePdfWithImage = () => {
  const content = 'BT /F1 16 Tf 20 260 Td (Chapter One) Tj 0 -24 Td (Figure 1. Red square.) Tj ET q 80 0 0 80 20 120 cm /Im1 Do Q';
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 4 0 R >>'),
    Buffer.from(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
    Buffer.concat([Buffer.from('<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\n'), Buffer.from([255, 0, 0]), Buffer.from('\nendstream')]),
  ];
  const chunks = [Buffer.from('%PDF-1.4\n%\xff\xff\xff\xff\n', 'binary')];
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.concat(chunks).length); chunks.push(Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')); });
  const xrefAt = Buffer.concat(chunks).length;
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
};

test('normalizes extracted images while preserving aspect ratio', async () => {
  const image = await normalizeImage(samplePng(), 'image/png');
  assert.equal(image.width, 80);
  assert.equal(image.height, 40);
  assert.equal(image.mimeType, 'image/png');
  assert.ok(image.data.length > 0);
});

test('extracts EPUB images with chapter placement and captions', async () => {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/content.opf"/></rootfiles></container>');
  zip.file('OPS/content.opf', '<?xml version="1.0"?><package><metadata><dc:title>Image Book</dc:title></metadata><manifest><item id="c1" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="pic" href="figure.png" media-type="image/png"/></manifest><spine><itemref idref="c1"/></spine></package>');
  zip.file('OPS/chapter.xhtml', '<html><body><h1>Chapter One</h1><p>Introductory text.</p><figure><img src="figure.png" alt="A blue chart"/><figcaption>Figure 1. A blue chart.</figcaption></figure><p>Supporting discussion.</p></body></html>');
  zip.file('OPS/figure.png', samplePng());
  const filename = path.join(os.tmpdir(), `voicedoc-image-${Date.now()}.epub`);
  await fs.writeFile(filename, await zip.generateAsync({ type: 'nodebuffer' }));
  try {
    const result = await extractDocument(filename, 'epub', 'image-book.epub');
    assert.equal(result.images.length, 1);
    assert.equal(result.images[0].chapterIndex, 0);
    assert.match(result.images[0].caption, /Figure 1/);
    assert.equal(result.images[0].width, 80);
  } finally { await fs.unlink(filename); }
});

test('extracts DOCX images through the Mammoth image callback', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body><w:p><w:r><w:t>Chapter One</w:t></w:r></w:p><w:p><w:r><w:t>Introductory text.</w:t></w:r></w:p><w:p><w:r><w:drawing><wp:inline><wp:extent cx="762000" cy="381000"/><wp:docPr id="1" name="Figure 1" descr="A blue diagram"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rImg"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:p><w:r><w:t>Figure 1. A blue diagram.</w:t></w:r></w:p></w:body></w:document>`);
  zip.file('word/media/image1.png', samplePng());
  const filename = path.join(os.tmpdir(), `voicedoc-image-${Date.now()}.docx`);
  await fs.writeFile(filename, await zip.generateAsync({ type: 'nodebuffer' }));
  try {
    const result = await extractDocument(filename, 'docx', 'image-book.docx');
    assert.equal(result.images.length, 1);
    assert.equal(result.images[0].width, 80);
    assert.equal(result.images[0].chapterIndex, 0);
  } finally { await fs.unlink(filename); }
});

test('uses PDF.js to render pages containing PDF image operators', async () => {
  const filename = path.join(os.tmpdir(), `voicedoc-image-${Date.now()}.pdf`);
  await fs.writeFile(filename, samplePdfWithImage());
  try {
    const result = await extractDocument(filename, 'pdf', 'image-book.pdf');
    assert.match(result.text, /Chapter One/);
    assert.equal(result.images.length, 1);
    assert.equal(result.images[0].pageNumber, 1);
    assert.equal(result.images[0].mimeType, 'image/png');
    assert.ok(result.images[0].data.length > 0);
  } finally { await fs.unlink(filename); }
});
