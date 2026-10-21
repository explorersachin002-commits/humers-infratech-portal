const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'documents.json');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

// Helper to ensure data directory exists
function ensureDbDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Atomically save data to disk using temporary file
function saveData(data) {
  ensureDbDir();
  const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
    throw err;
  }
}

// Load data from disk
function loadData() {
  ensureDbDir();
  if (!fs.existsSync(DB_FILE)) {
    const defaultUser = process.env.ADMIN_DEFAULT_USER || 'admin';
    const defaultPass = process.env.ADMIN_DEFAULT_PASS || 'admin123';
    const salt = bcrypt.genSaltSync(10);

    const initialData = {
      admin: {
        username: defaultUser,
        passwordHash: bcrypt.hashSync(defaultPass, salt),
        name: 'Humers Admin'
      },
      documents: [
        {
          id: 'doc-sample-1',
          title: 'Sikar Bypass Road Infrastructure Blueprint',
          docNumber: 'HMR-SKR-2026-001',
          category: 'Blueprints & Drawings',
          clientName: 'PWD Sikar & Urban Development',
          description: 'Structural and civil blueprints for the dual-lane Sikar bypass corridor and drainage system.',
          fileName: 'sample-blueprint.txt',
          originalName: 'Sikar_Bypass_Blueprint.txt',
          fileSize: 1024,
          mimeType: 'text/plain',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'doc-sample-2',
          title: 'Commercial Complex Structural Agreement',
          docNumber: 'HMR-AGR-2026-015',
          category: 'Contracts & Agreements',
          clientName: 'Sikar Commercial Hub Ltd.',
          description: 'Official construction contract, milestones, compliance obligations, and payment terms.',
          fileName: 'sample-agreement.txt',
          originalName: 'Commercial_Agreement_2026.txt',
          fileSize: 2048,
          mimeType: 'text/plain',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'doc-sample-3',
          title: 'Municipal Building NOC & Environmental Clearance',
          docNumber: 'HMR-NOC-2026-088',
          category: 'Government NOC & Clearances',
          clientName: 'Municipal Council Sikar',
          description: 'Environmental impact assessment approval and municipal fire safety NOC certification.',
          fileName: 'sample-noc.txt',
          originalName: 'Municipal_NOC_Clearance.txt',
          fileSize: 1536,
          mimeType: 'text/plain',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      settings: {
        companyName: 'Humers Infratech',
        location: 'Sikar',
        tagline: 'Civil Engineering & Infrastructure Documentation Portal'
      }
    };
    saveData(initialData);

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(UPLOADS_DIR, 'sample-blueprint.txt'), 'HUMERS INFRATECH - SIKAR\nDocument: Sikar Bypass Road Infrastructure Blueprint\nRef No: HMR-SKR-2026-001\nStatus: Approved & Verified.');
    fs.writeFileSync(path.join(UPLOADS_DIR, 'sample-agreement.txt'), 'HUMERS INFRATECH - SIKAR\nDocument: Commercial Complex Structural Agreement\nRef No: HMR-AGR-2026-015\nStatus: Executed.');
    fs.writeFileSync(path.join(UPLOADS_DIR, 'sample-noc.txt'), 'HUMERS INFRATECH - SIKAR\nDocument: Municipal Building NOC & Environmental Clearance\nRef No: HMR-NOC-2026-088\nStatus: Certified by Municipal Council Sikar.');

    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('CRITICAL: Error reading database file:', err);
    throw err;
  }
}

// Database helper functions
const db = {
  init() {
    return loadData();
  },

  async verifyAdmin(username, password) {
    const data = loadData();
    if (!data.admin || data.admin.username !== username) {
      return false;
    }
    return bcrypt.compareSync(password, data.admin.passwordHash);
  },

  async changePassword(currentPassword, newPassword) {
    const data = loadData();
    const isValid = bcrypt.compareSync(currentPassword, data.admin.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    data.admin.passwordHash = bcrypt.hashSync(newPassword, 10);
    saveData(data);
    return true;
  },

  search(query, category) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return [];
    }

    const data = loadData();
    const q = query.trim().toLowerCase();
    const cat = category ? category.trim().toLowerCase() : '';

    return (data.documents || []).filter(doc => {
      if (cat && cat !== 'all' && doc.category && doc.category.toLowerCase() !== cat) {
        return false;
      }

      const matchTitle = doc.title && doc.title.toLowerCase().includes(q);
      const matchDocNo = doc.docNumber && doc.docNumber.toLowerCase().includes(q);
      const matchClient = doc.clientName && doc.clientName.toLowerCase().includes(q);
      const matchDesc = doc.description && doc.description.toLowerCase().includes(q);
      const matchCat = doc.category && doc.category.toLowerCase().includes(q);

      return matchTitle || matchDocNo || matchClient || matchDesc || matchCat;
    }).map(doc => ({
      id: doc.id,
      title: doc.title,
      docNumber: doc.docNumber,
      category: doc.category,
      clientName: doc.clientName,
      description: doc.description,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      originalName: doc.originalName,
      createdAt: doc.createdAt
    }));
  },

  getAllDocuments() {
    const data = loadData();
    return data.documents || [];
  },

  getDocumentById(id) {
    const data = loadData();
    return (data.documents || []).find(d => d.id === id);
  },

  addDocument(docInfo) {
    const data = loadData();
    if (!data.documents) data.documents = [];

    const newDoc = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
      title: docInfo.title.trim(),
      docNumber: docInfo.docNumber ? docInfo.docNumber.trim() : `HMR-${Date.now().toString().slice(-6)}`,
      category: docInfo.category ? docInfo.category.trim() : 'General Document',
      clientName: docInfo.clientName ? docInfo.clientName.trim() : '',
      description: docInfo.description ? docInfo.description.trim() : '',
      fileName: docInfo.fileName,
      originalName: docInfo.originalName,
      fileSize: docInfo.fileSize,
      mimeType: docInfo.mimeType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.documents.unshift(newDoc);
    saveData(data);
    return newDoc;
  },

  updateDocument(id, updates) {
    const data = loadData();
    const index = (data.documents || []).findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error('Document not found');
    }

    const doc = data.documents[index];
    if (updates.title) doc.title = updates.title.trim();
    if (updates.docNumber) doc.docNumber = updates.docNumber.trim();
    if (updates.category) doc.category = updates.category.trim();
    if (updates.clientName !== undefined) doc.clientName = updates.clientName.trim();
    if (updates.description !== undefined) doc.description = updates.description.trim();
    doc.updatedAt = new Date().toISOString();

    data.documents[index] = doc;
    saveData(data);
    return doc;
  },

  deleteDocument(id) {
    const data = loadData();
    const index = (data.documents || []).findIndex(d => d.id === id);
    if (index === -1) {
      return null;
    }

    const [deleted] = data.documents.splice(index, 1);
    saveData(data);
    return deleted;
  },

  getStats() {
    const data = loadData();
    const docs = data.documents || [];
    const totalDocs = docs.length;
    const totalBytes = docs.reduce((acc, d) => acc + (d.fileSize || 0), 0);
    const categories = {};
    docs.forEach(d => {
      const cat = d.category || 'General';
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return {
      totalDocs,
      totalBytes,
      categoriesCount: Object.keys(categories).length,
      categories
    };
  }
};

module.exports = db;
