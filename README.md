# VoiceDoc TTS

A full-stack MERN web application that converts pasted text and uploaded documents (PDF, DOCX, TXT) into spoken audio using the **browser's built-in Web Speech API** (`window.speechSynthesis`). No premium TTS API keys required.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| File Upload | Multer |
| Text Extraction | pdf-parse, mammoth |

## Project Structure

```
tts/
├── backend/
│   ├── server.js
│   ├── config/db.js
│   ├── models/User.js, Document.js
│   ├── routes/authRoutes.js, documentRoutes.js
│   ├── controllers/authController.js, documentController.js
│   ├── middleware/authMiddleware.js, uploadMiddleware.js
│   ├── utils/extractText.js
│   └── uploads/
└── frontend/
    └── src/
        ├── pages/Login.jsx, Register.jsx, Dashboard.jsx, Landing.jsx
        ├── components/Navbar, TextEditor, DocumentUpload, VoiceControls, DocumentHistory
        └── utils/speech.js
```

## Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** running locally (`mongodb://localhost:27017`) or a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string

## Installation & Setup

### 1. Clone and enter the project

```bash
cd tts
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/voicedoc-tts
JWT_SECRET=your_super_secret_jwt_key_change_this
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

Server runs at **http://localhost:5000**

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**

## MongoDB Schema

### User Collection

```javascript
{
  _id: ObjectId,
  name: String,        // required
  email: String,       // required, unique
  password: String,    // bcrypt hashed
  createdAt: Date,
  updatedAt: Date
}
```

### Document Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // ref: User
  originalFilename: String,
  fileType: "pdf" | "docx" | "txt",
  extractedText: String,
  createdAt: Date,
  updatedAt: Date
}
```

## API Reference

All document routes require `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, password }` | Register user |
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| GET | `/api/auth/me` | — | Get current user (protected) |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload` | Upload file (multipart field: `document`) |
| GET | `/api/documents` | List user's documents (no extracted text) |
| GET | `/api/documents/:id` | Get single document with extracted text |
| DELETE | `/api/documents/:id` | Delete document |

### Health Check

```
GET /api/health
```

## API Testing Examples (curl)

### Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"secret123"}'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'
```

Save the `token` from the response.

### Upload document

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "document=@/path/to/your/file.pdf"
```

### Get documents

```bash
curl http://localhost:5000/api/documents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get single document

```bash
curl http://localhost:5000/api/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete document

```bash
curl -X DELETE http://localhost:5000/api/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Features

- **JWT authentication** — register, login, protected routes
- **Document upload** — PDF, DOCX, TXT up to 10MB with server-side text extraction
- **Web Speech API TTS** — voice selection, language, rate, pitch, volume
- **Chunked speech** — long documents split into ~250 char chunks to prevent browser crashes
- **Playback controls** — speak, pause, resume, stop with progress indicator
- **Document history** — save, browse, reload, and delete past documents
- **Dark mode** — toggle light/dark theme
- **Responsive UI** — works on mobile and desktop

## Important Notes

- TTS runs **entirely in the browser** via `SpeechSynthesisUtterance`. The backend only extracts and stores text.
- Voice availability depends on your OS and browser (Chrome/Edge/Safari recommended).
- MP3 export is **not supported** — Web Speech API does not reliably produce downloadable audio.
- Uploaded files are deleted from disk after text extraction; only metadata and text are stored in MongoDB.

## License

MIT
