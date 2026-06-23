# VoiceDoc Tutor

A public MERN book reader and grounded teaching assistant. Upload PDF, EPUB, DOCX, or TXT books, extract chapter structure and embedded visuals, read or listen with `window.speechSynthesis`, create chapter lessons, ask source-grounded questions, and resume later in the same browser.

## Requirements

- Node.js 18+
- MongoDB
- A browser with the Web Speech API (Chrome, Edge, or Safari recommended)

## Run locally

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:5173`; the API defaults to `http://localhost:5000/api`. Set `VITE_API_URL` in `frontend/.env` to override the API base URL.

## Environment variables

Backend:

| Variable | Required | Purpose |
|---|---:|---|
| `MONGO_URI` | Yes | Existing MongoDB connection string |
| `PORT` | No | API port; default `5000` |
| `CLIENT_URL` | No | Comma-separated allowed frontend origins |
| `TUTOR_RATE_LIMIT` | No | Tutor requests per IP per minute; default `30` |

No JWT or TTS key is used. Speech is generated only by the browser. The bundled tutor is extractive and uses only stored chapter text; it does not call an external AI provider.

## Main flow

1. `/` opens the public library and upload dashboard.
2. Upload uses actual browser transfer progress, followed by an indeterminate extraction stage.
3. The backend validates the extension, MIME type, file signature, and extracted content, then deletes the temporary file.
4. PDF.js renders image-bearing/scanned PDF pages; EPUB archive images and Mammoth DOCX images retain approximate chapter/paragraph placement.
5. Image bytes are normalized and stored as separate, session-scoped MongoDB records. API responses never expose filesystem paths.
6. Structural headings and format navigation take priority over fallback page sections.
7. `/reader/:bookId` provides chapters, responsive images, zoomable previews, reading settings, paragraph speech, teaching content, quizzes, grounded chat, and citations.
6. A random browser identifier in local storage scopes library history and reading progress without user accounts.

Scanned PDFs are not OCR-processed because no OCR service exists in this project. Scanned pages remain viewable as rendered images and are labeled: “This is a scanned page. Text extraction is unavailable, but you can still view the page.” Password-protected PDFs are rejected with a specific error.

## API

All document requests include `X-Session-ID` (16–100 URL-safe characters).

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/config` | Upload configuration |
| `POST` | `/api/documents/upload` | Upload and extract field `document` |
| `GET` | `/api/documents` | Browser-scoped book history |
| `GET` | `/api/documents/:id` | Full extracted book |
| `GET` | `/api/documents/:id/chapters` | Reader data |
| `GET` | `/api/documents/:id/images/:imageId` | Stream a session-scoped image |
| `POST` | `/api/documents/:id/images/:imageId/explain` | Explain an image from caption and chapter evidence |
| `PUT` | `/api/documents/:id/progress` | Save reading position |
| `POST` | `/api/documents/:id/lessons` | Generate chapter/book lesson |
| `POST` | `/api/documents/:id/tutor` | Ask a grounded question |
| `DELETE` | `/api/documents/:id` | Delete a book |

## Verification

```bash
cd backend
npm test
cd ../frontend
npm test
npm run build
```

Uploaded originals are never retained. Extracted text and chapter metadata are stored in the existing MongoDB database. Access is anonymous and browser-scoped, not authentication-grade privacy; do not use this deployment model for confidential documents without adding an appropriate access-control layer.
