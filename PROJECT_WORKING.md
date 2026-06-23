# VoiceDoc TTS Project Working

This document explains how the VoiceDoc TTS project works internally. It is intended for developers who want to understand the application flow, backend APIs, frontend behavior, and how text-to-speech is handled.

## 1. Project Overview

VoiceDoc TTS is a full-stack MERN application that lets users:

- Register and log in.
- Paste text manually.
- Upload PDF, DOCX, or TXT documents.
- Extract text from uploaded documents.
- Convert text to speech in the browser.
- Save extracted or typed text to document history.
- Reload and delete saved documents.

The important point is that text-to-speech does not run on the backend. The backend only handles authentication, file upload, text extraction, and persistence. Speech playback is handled by the browser using the Web Speech API.

## 2. High-Level Architecture

```text
User Browser
  |
  | React frontend
  | - Login/register
  | - Dashboard
  | - Upload documents
  | - Text editor
  | - Speech controls
  |
  v
Express backend API
  |
  | - JWT authentication
  | - File upload with Multer
  | - Text extraction from PDF/DOCX/TXT
  | - Document CRUD
  |
  v
MongoDB
  |
  | - Users
  | - Saved documents and extracted text
```

## 3. Folder Structure

```text
tts/
|-- backend/
|   |-- server.js
|   |-- config/
|   |   `-- db.js
|   |-- controllers/
|   |   |-- authController.js
|   |   `-- documentController.js
|   |-- middleware/
|   |   |-- authMiddleware.js
|   |   `-- uploadMiddleware.js
|   |-- models/
|   |   |-- User.js
|   |   `-- Document.js
|   |-- routes/
|   |   |-- authRoutes.js
|   |   `-- documentRoutes.js
|   |-- uploads/
|   `-- utils/
|       `-- extractText.js
|
|-- frontend/
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
|       |-- App.jsx
|       |-- api/
|       |   `-- axios.js
|       |-- components/
|       |   |-- DocumentHistory.jsx
|       |   |-- DocumentUpload.jsx
|       |   |-- Navbar.jsx
|       |   |-- TextEditor.jsx
|       |   `-- VoiceControls.jsx
|       |-- pages/
|       |   |-- Dashboard.jsx
|       |   |-- Landing.jsx
|       |   |-- Login.jsx
|       |   `-- Register.jsx
|       |-- styles/
|       |   `-- global.css
|       `-- utils/
|           `-- speech.js
`-- README.md
```

## 4. Backend Working

The backend is an Express application started from `backend/server.js`.

### Startup Flow

1. Environment variables are loaded with `dotenv`.
2. MongoDB is connected through `config/db.js`.
3. Express middleware is registered:
   - `cors`
   - `express.json`
   - `express.urlencoded`
4. Routes are mounted:
   - `/api/auth`
   - `/api/documents`
5. Health check is exposed at `/api/health`.
6. Global error handling catches Multer upload errors and other request errors.

### Authentication

Authentication is handled by:

- `controllers/authController.js`
- `routes/authRoutes.js`
- `middleware/authMiddleware.js`
- `models/User.js`

The user model stores:

- `name`
- `email`
- hashed `password`
- timestamps

Passwords are hashed using `bcryptjs` before saving. Login compares the submitted password with the stored hash.

When a user registers or logs in successfully, the backend returns a JWT signed with `JWT_SECRET`. The token contains the user id and expires after 30 days.

Protected routes use the `protect` middleware. It expects this header:

```text
Authorization: Bearer <token>
```

The middleware verifies the token, loads the user from MongoDB, removes the password field, and attaches the user to `req.user`.

### Document Upload and Extraction

Document handling is implemented in:

- `middleware/uploadMiddleware.js`
- `controllers/documentController.js`
- `utils/extractText.js`
- `models/Document.js`

The upload endpoint accepts one file in the multipart field named `document`.

Allowed file types:

- PDF: `application/pdf`
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- TXT: `text/plain`

Maximum file size is 10 MB.

Upload flow:

1. Multer receives the uploaded file.
2. Multer saves it temporarily inside `backend/uploads`.
3. The controller detects the file type from its MIME type.
4. `extractText` extracts text based on the file type:
   - PDF uses `pdf-parse`.
   - DOCX uses `mammoth`.
   - TXT uses normal file reading.
5. Empty extracted text is rejected.
6. The temporary file is deleted after extraction.
7. A `Document` record is saved in MongoDB.
8. The extracted text is returned to the frontend.

The uploaded original file is not permanently stored. Only document metadata and extracted text are stored in MongoDB.

### Document Ownership

All document routes are protected by JWT authentication. Documents are queried with both:

- document id
- authenticated `userId`

This prevents one user from reading or deleting another user's documents.

## 5. Backend API Routes

### Auth Routes

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

`/api/auth/me` requires a valid JWT.

### Document Routes

```text
POST   /api/documents/upload
GET    /api/documents
GET    /api/documents/:id
DELETE /api/documents/:id
```

All document routes require a valid JWT.

`GET /api/documents` returns document metadata without `extractedText` to keep the list response lighter.

`GET /api/documents/:id` returns the full document including extracted text.

## 6. Frontend Working

The frontend is a React 18 application built with Vite and Tailwind CSS.

### Routing

Routes are defined in `frontend/src/App.jsx`.

```text
/           Landing page
/login      Login page
/register   Register page
/dashboard  Protected dashboard
```

The dashboard is protected by checking for a JWT token in `localStorage`. If the token is missing, the user is redirected to `/login`.

### API Client

The Axios client is configured in `frontend/src/api/axios.js`.

It uses this backend URL:

```text
VITE_API_URL or http://localhost:5000/api
```

Before every request, it checks `localStorage` for a token and adds:

```text
Authorization: Bearer <token>
```

If the backend returns `401`, the client removes the saved auth data and redirects the user to the login page.

### Dashboard State

`frontend/src/pages/Dashboard.jsx` coordinates the main user workflow. It stores:

- current text
- highlighted speech chunk
- speech rate, pitch, volume, language, and voice
- speaking and paused state
- speech progress
- document history refresh trigger
- save status and errors

The dashboard connects these UI components:

- `TextEditor` for editing or displaying text.
- `DocumentUpload` for sending files to the backend.
- `VoiceControls` for speech settings and playback buttons.
- `DocumentHistory` for loading or deleting saved documents.

## 7. Text-to-Speech Working

Speech logic is implemented in `frontend/src/utils/speech.js`.

The app uses the browser's native APIs:

- `window.speechSynthesis`
- `SpeechSynthesisUtterance`

No backend TTS engine and no external TTS API are used.

### Voice Loading

Browsers may load voices asynchronously. `loadVoices()` handles this by:

1. Calling `speechSynthesis.getVoices()`.
2. If voices are not ready, listening for the `voiceschanged` event.
3. Falling back after a short timeout.

The dashboard selects an English voice by default if one is available.

### Chunked Speaking

Long text is split into chunks of about 250 characters.

The splitter tries to break at:

1. Sentence boundaries.
2. Word boundaries.
3. The chunk limit if no better break is found.

Chunking makes long document playback more reliable because browsers can become unstable with very large `SpeechSynthesisUtterance` values.

### Playback Flow

When the user clicks speak:

1. Existing speech is stopped.
2. Text is split into chunks.
3. The first chunk is converted to a `SpeechSynthesisUtterance`.
4. Rate, pitch, volume, language, and selected voice are applied.
5. The browser speaks the chunk.
6. When the chunk ends, the next chunk starts.
7. Progress is reported back to the dashboard.
8. When all chunks finish, the speaking state is reset.

Pause, resume, and stop use:

```text
speechSynthesis.pause()
speechSynthesis.resume()
speechSynthesis.cancel()
```

## 8. Main User Workflows

### Register and Login

1. User creates an account or logs in.
2. Backend validates input.
3. Backend returns user details and a JWT.
4. Frontend stores the token in `localStorage`.
5. User can access the protected dashboard.

### Upload a Document

1. User selects a PDF, DOCX, or TXT file.
2. Frontend sends it as `multipart/form-data`.
3. Backend validates type and size.
4. Backend extracts text.
5. Backend deletes the temporary upload.
6. Backend saves document data in MongoDB.
7. Frontend places extracted text into the editor.
8. Document history refreshes.

### Speak Text

1. User enters text or loads extracted document text.
2. User selects voice settings.
3. User clicks speak.
4. Browser speech engine reads the text chunk by chunk.
5. UI updates progress and highlighted chunk.

### Save Pasted Text

When the user saves typed or pasted text, the frontend converts the text into a temporary TXT `File` object in the browser and sends it to the existing upload endpoint. This reuses the same backend upload and extraction pipeline used for real file uploads.

## 9. Data Stored in MongoDB

### User

```js
{
  name: String,
  email: String,
  password: String,
  createdAt: Date,
  updatedAt: Date
}
```

The password field stores a bcrypt hash, not the original password.

### Document

```js
{
  userId: ObjectId,
  originalFilename: String,
  fileType: "pdf" | "docx" | "txt",
  extractedText: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 10. Running the Project Locally

### Backend

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/voicedoc-tts
JWT_SECRET=change_this_secret
CLIENT_URL=http://localhost:5173
```

Install and run:

```bash
cd backend
npm install
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

### Frontend

Install and run:

```bash
cd frontend
npm install
npm run dev
```

The app runs at:

```text
http://localhost:5173
```

Optional frontend environment variable:

```env
VITE_API_URL=http://localhost:5000/api
```

## 11. Important Limitations

- Speech quality and voice availability depend on the user's browser and operating system.
- The Web Speech API does not reliably provide downloadable audio files such as MP3.
- Uploaded files are temporary; the extracted text is what gets stored.
- PDF extraction quality depends on whether the PDF contains real text. Scanned image PDFs may not extract useful text.
- The frontend route guard checks only whether a token exists. Actual authorization is still enforced by the backend.

## 12. Troubleshooting

### Backend cannot connect to MongoDB

Check that MongoDB is running and that `MONGO_URI` is correct in `backend/.env`.

### Upload fails with unsupported file type

Confirm that the file is PDF, DOCX, or plain TXT and that the browser sends the expected MIME type.

### Uploaded PDF returns empty text

The PDF may be scanned or image-based. This project does not include OCR.

### Speech does not play

Check browser support for `speechSynthesis`. Chrome, Edge, and Safari usually provide the best support.

### No voices appear

Voices are provided by the browser and operating system. Try refreshing the page or using another browser.

### User is redirected to login

The token may be missing, expired, or invalid. Log in again to receive a new JWT.
