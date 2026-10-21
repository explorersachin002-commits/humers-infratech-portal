# Humers Infratech - Document Storage & Retrieval Portal (Sikar)

An official corporate document management web application custom-built for **Humers Infratech, Sikar**.

---

## 🌟 Key Features

1. **Two-Page User Experience (Matching Hand-Drawn Design)**:
   - **Page 1 (Search Screen)**:
     - Prominent corporate branding: **Humers Infratech • Sikar**.
     - Centerpiece search bar with placeholder: **`Let's Find.....`**.
     - **Strict Privacy**: Stored documents are **never visible on the main screen initially**.
     - **Dynamic Search Results**: Only after entering a query or reference number, matching documents appear with rich details (Title, Ref ID, Category, Client, File Size, Date).
     - **Inline Document Preview**: Supports viewing PDFs, images, and text files directly in a clean modal viewer with download capabilities.
   - **Page 2 (Exit / Thank You Screen)**:
     - Displays the exact sketch design:
       - **Have a nice day**
       - **Thank You**
       - *Humers Infratech • Sikar*
     - Reached automatically when closing a document viewer, clicking "Finished Viewing", or clicking the "Finish / Exit" button in the navigation.
     - Includes a button to safely return to search at any time.

2. **Secure Admin Portal (`/admin`)**:
   - **Restricted Access**: Only the administrator can upload and store documents.
   - **Default Admin Credentials**:
     - **Username**: `admin`
     - **Password**: `admin123` *(Can be updated directly from the Admin Dashboard)*.
   - **Document Upload Form**:
     - Document Title (required)
     - Document Reference Number (e.g., `HMR-SKR-2026-001`)
     - Category (Blueprints & Drawings, Contracts & Agreements, NOC & Clearances, Invoices, Site Inspection Reports, etc.)
     - Client / Project Name
     - Notes & Description
     - File Upload (PDF, DOCX, XLSX, DWG, PNG, JPG up to 50MB)
   - **Repository Management**:
     - Live search and filter for all stored documents.
     - Document statistics: Total documents, storage consumed, categories count.
     - Actions: Inline Preview, Download, Edit Metadata, Delete Document.

---

## 🚀 How to Run the Website

### Prerequisites
- Node.js (v18 or newer recommended, tested on Node v24)
- npm

### 1. Start Server
Run the following command from this directory:
```bash
npm start
```

### 2. Access the Application
- **Public Search Portal**: [http://localhost:3000](http://localhost:3000)
- **Admin Management Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 📁 Project Structure

```
humers web doc/
├── server.js               # Express application server and REST API
├── database.js             # Data store & search logic for documents and admin
├── package.json            # Node.js dependencies and run scripts
├── README.md               # Documentation and usage instructions
├── data/
│   └── documents.json      # JSON document metadata and hashed admin credentials
├── uploads/                # Secure server storage for uploaded files
└── public/
    ├── index.html          # Public Search & Thank You (Page 1 & Page 2)
    ├── admin.html          # Admin Login & Management Dashboard
    ├── css/
    │   └── styles.css      # Custom styling, corporate theme & animations
    └── js/
        ├── app.js          # Search, navigation, and modal viewer logic
        └── admin.js        # Admin authentication, uploads, and repository controls
```

---

## 🔒 Security & Privacy Highlights
- Non-admin users cannot browse stored documents without a specific search query.
- Passwords are securely hashed with `bcryptjs`.
- Session management ensures admin routes cannot be accessed without proper login.
- Uploaded file names are sanitized with random unique timestamps to avoid file collision and path traversal.
