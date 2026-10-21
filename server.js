require('dotenv').config();

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const UPLOAD_MAX_MB = parseInt(process.env.UPLOAD_MAX_MB || '50', 10);
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Enable trust proxy when behind Nginx, Cloudflare, Render, AWS, etc.
app.set('trust proxy', 1);

// HTTP Request Logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// High-speed compression
app.use(compression());

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        frameSrc: ["'self'", "blob:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Session Configuration with FileStore for production persistence
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'humers-infratech-production-secret-99482';
app.use(session({
  name: 'humers.sid',
  secret: SESSION_SECRET,
  store: new FileStore({
    path: SESSIONS_DIR,
    ttl: 24 * 60 * 60, // 24 hours
    retries: 2,
    logFn: () => {} // Silence verbose debug logs
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true' // Set to true when on HTTPS
  }
}));

// Rate Limiters
// General API rate limiter (120 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again in a few minutes.' }
});

// Stricter rate limiter for admin login (10 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes before trying again.' }
});

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: UPLOAD_MAX_MB * 1024 * 1024 }
});

// Serve Static Frontend Assets with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: NODE_ENV === 'production' ? '1h' : '0'
}));

// Admin Authentication Middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
}

/* =========================================================
   HEALTHCHECK ROUTE (For Docker, Render, AWS, Kubernetes)
   ========================================================= */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'Humers Infratech Document Portal'
  });
});

/* =========================================================
   PUBLIC ROUTES
   ========================================================= */

// Public Search (Rate limited)
app.get('/api/search', apiLimiter, (req, res) => {
  const query = req.query.q || '';
  const category = req.query.category || '';

  if (!query.trim()) {
    return res.json({ success: true, count: 0, results: [] });
  }

  const results = db.search(query, category);
  res.json({
    success: true,
    count: results.length,
    results: results
  });
});

// View Document Inline (PDF, Image, Text preview)
app.get('/api/documents/:id/view', (req, res) => {
  const doc = db.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).send('Document record not found');
  }

  const filePath = path.join(UPLOADS_DIR, doc.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Document file missing from server storage');
  }

  if (doc.mimeType) {
    res.setHeader('Content-Type', doc.mimeType);
  }
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName || doc.fileName)}"`);
  res.sendFile(filePath);
});

// Download Document
app.get('/api/documents/:id/download', (req, res) => {
  const doc = db.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).send('Document not found');
  }

  const filePath = path.join(UPLOADS_DIR, doc.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File missing from server storage');
  }

  res.download(filePath, doc.originalName || doc.fileName);
});

/* =========================================================
   ADMIN ROUTES
   ========================================================= */

// Check admin session status
app.get('/api/admin/check-session', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ loggedIn: true, user: req.session.username });
  }
  res.json({ loggedIn: false });
});

// Admin Login (Protected by Login Rate Limiter)
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  try {
    const isValid = await db.verifyAdmin(username.trim(), password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    req.session.isAdmin = true;
    req.session.username = username.trim();
    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to logout cleanly' });
    }
    res.clearCookie('humers.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Change Admin Password
app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
  }

  try {
    await db.changePassword(currentPassword, newPassword);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Error updating password' });
  }
});

// Admin Stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, stats });
});

// Admin: Get all stored documents
app.get('/api/admin/documents', requireAdmin, (req, res) => {
  const docs = db.getAllDocuments();
  res.json({ success: true, documents: docs });
});

// Admin: Upload and store new document
app.post('/api/admin/documents', requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Document file is required' });
    }

    const { title, docNumber, category, clientName, description } = req.body;
    if (!title || !title.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Document title is required' });
    }

    const newDoc = db.addDocument({
      title,
      docNumber,
      category,
      clientName,
      description,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    res.status(201).json({
      success: true,
      message: 'Document stored successfully',
      document: newDoc
    });
  } catch (err) {
    console.error('Error adding document:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Failed to save document' });
  }
});

// Admin: Edit document metadata
app.put('/api/admin/documents/:id', requireAdmin, (req, res) => {
  try {
    const updated = db.updateDocument(req.params.id, req.body);
    res.json({ success: true, message: 'Document updated successfully', document: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || 'Failed to update document' });
  }
});

// Admin: Delete document
app.delete('/api/admin/documents/:id', requireAdmin, (req, res) => {
  try {
    const deleted = db.deleteDocument(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const filePath = path.join(UPLOADS_DIR, deleted.fileName);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not delete file from disk:', e.message);
      }
    }

    res.json({ success: true, message: 'Document deleted successfully', document: deleted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

// Admin HTML route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Central Error Handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File exceeds maximum allowed size of ${UPLOAD_MAX_MB}MB`
      });
    }
  }
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'production' ? 'An unexpected server error occurred.' : err.message
  });
});

// Initialize database
db.init();

// Start Server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Humers Infratech Portal running [${NODE_ENV.toUpperCase()}]`);
  console.log(` Listening on: http://localhost:${PORT}`);
  console.log(` Healthcheck:  http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

// Graceful Shutdown Handlers (Docker, Kubernetes, PM2)
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcefully terminating process after 10s timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
