// Humers Infratech - Admin Portal Management Logic
let allAdminDocs = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  checkAdminSession();
});

// Check if admin is currently authenticated
async function checkAdminSession() {
  try {
    const res = await fetch('/api/admin/check-session');
    const data = await res.json();

    const loginSection = document.getElementById('adminLoginSection');
    const dashboardSection = document.getElementById('adminDashboardSection');
    const authActions = document.getElementById('authActions');

    if (data.loggedIn) {
      loginSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      authActions.classList.remove('hidden');
      loadAdminDashboardData();
    } else {
      loginSection.classList.remove('hidden');
      dashboardSection.classList.add('hidden');
      authActions.classList.add('hidden');
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
}

// Handle Admin Login Submission
async function handleAdminLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('adminUsername');
  const passwordInput = document.getElementById('adminPassword');
  const alertBox = document.getElementById('loginAlert');
  const alertText = document.getElementById('loginAlertText');
  const submitBtn = document.getElementById('loginSubmitBtn');

  alertBox.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.classList.add('opacity-75');

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value
      })
    });

    const data = await res.json();
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-75');

    if (data.success) {
      usernameInput.value = '';
      passwordInput.value = '';
      checkAdminSession();
    } else {
      alertText.textContent = data.message || 'Invalid username or password';
      alertBox.classList.remove('hidden');
    }
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-75');
    alertText.textContent = 'Server connection error during login';
    alertBox.classList.remove('hidden');
  }
}

// Admin Logout
async function adminLogout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
    checkAdminSession();
  } catch (err) {
    console.error('Logout error:', err);
    window.location.reload();
  }
}

// Load Dashboard Data (Stats & All Documents)
async function loadAdminDashboardData() {
  await Promise.all([loadStats(), loadDocuments()]);
}

// Fetch and display repository statistics
async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('statTotalDocs').textContent = data.stats.totalDocs;
      document.getElementById('statTotalSize').textContent = formatFileSize(data.stats.totalBytes);
      document.getElementById('statCategories').textContent = data.stats.categoriesCount;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

// Fetch all stored documents
async function loadDocuments() {
  try {
    const res = await fetch('/api/admin/documents');
    const data = await res.json();
    if (data.success) {
      allAdminDocs = data.documents || [];
      renderAdminDocs(allAdminDocs);
    }
  } catch (err) {
    console.error('Failed to load admin documents:', err);
  }
}

// Render Admin Documents Table
function renderAdminDocs(docs) {
  const tbody = document.getElementById('adminDocsTableBody');
  const emptyState = document.getElementById('adminEmptyState');
  tbody.innerHTML = '';

  if (!docs || docs.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  docs.forEach(doc => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors';

    const fileSizeFormatted = formatFileSize(doc.fileSize);

    tr.innerHTML = `
      <td class="py-3 px-3">
        <div class="font-bold text-slate-800 text-xs sm:text-sm">${escapeHtml(doc.title)}</div>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="font-mono text-[10px] text-amber-700 font-semibold">${escapeHtml(doc.docNumber || 'N/A')}</span>
          <span class="text-[10px] text-slate-400">• ${new Date(doc.createdAt).toLocaleDateString()}</span>
        </div>
      </td>
      <td class="py-3 px-3">
        <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
          ${escapeHtml(doc.category || 'General')}
        </span>
      </td>
      <td class="py-3 px-3 text-slate-600 font-medium">
        ${escapeHtml(doc.clientName || '-')}
      </td>
      <td class="py-3 px-3 text-slate-500 font-mono text-[11px]">
        ${fileSizeFormatted}
      </td>
      <td class="py-3 px-3 text-right">
        <div class="flex items-center justify-end gap-1">
          <!-- View inline -->
          <a href="/api/documents/${doc.id}/view" target="_blank" class="p-1.5 text-slate-600 hover:text-brand-800 rounded-lg hover:bg-slate-100 transition-colors" title="View Document">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </a>
          <!-- Download -->
          <a href="/api/documents/${doc.id}/download" class="p-1.5 text-slate-600 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition-colors" title="Download File">
            <i data-lucide="download" class="w-4 h-4"></i>
          </a>
          <!-- Edit Metadata -->
          <button onclick="openEditModal('${doc.id}')" class="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors" title="Edit Metadata">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <!-- Delete Document -->
          <button onclick="deleteDoc('${doc.id}', '${encodeURIComponent(doc.title)}')" class="p-1.5 text-slate-600 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Delete Document">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Filter Documents in Admin Table
function filterAdminDocs() {
  const query = document.getElementById('adminDocFilter').value.toLowerCase().trim();
  if (!query) {
    renderAdminDocs(allAdminDocs);
    return;
  }

  const filtered = allAdminDocs.filter(d => {
    return (d.title && d.title.toLowerCase().includes(query)) ||
           (d.docNumber && d.docNumber.toLowerCase().includes(query)) ||
           (d.category && d.category.toLowerCase().includes(query)) ||
           (d.clientName && d.clientName.toLowerCase().includes(query));
  });

  renderAdminDocs(filtered);
}

// Update File Input Label when a file is selected
function updateFileLabel(input) {
  const label = document.getElementById('fileSelectedLabel');
  const sub = document.getElementById('fileSelectedSub');

  if (input.files && input.files[0]) {
    const file = input.files[0];
    label.textContent = file.name;
    sub.textContent = `${formatFileSize(file.size)} • Ready to upload`;
    label.classList.add('text-amber-700', 'font-bold');
  } else {
    label.textContent = 'Click or drag file here (PDF, DOCX, XLSX, DWG, Images up to 50MB)';
    sub.textContent = 'Supports all common document formats';
    label.classList.remove('text-amber-700', 'font-bold');
  }
}

// Handle Document Upload
async function handleDocumentUpload(event) {
  event.preventDefault();

  const titleInput = document.getElementById('docTitle');
  const numberInput = document.getElementById('docNumber');
  const categoryInput = document.getElementById('docCategory');
  const clientInput = document.getElementById('docClient');
  const descInput = document.getElementById('docDescription');
  const fileInput = document.getElementById('docFile');
  const alertBox = document.getElementById('uploadAlert');
  const submitBtn = document.getElementById('uploadSubmitBtn');

  if (!fileInput.files || !fileInput.files[0]) {
    showUploadAlert('Please select a document file to upload.', false);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add('opacity-75');
  submitBtn.innerHTML = `
    <div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
    <span>Uploading and Storing...</span>
  `;

  const formData = new FormData();
  formData.append('title', titleInput.value.trim());
  formData.append('docNumber', numberInput.value.trim());
  formData.append('category', categoryInput.value);
  formData.append('clientName', clientInput.value.trim());
  formData.append('description', descInput.value.trim());
  formData.append('file', fileInput.files[0]);

  try {
    const res = await fetch('/api/admin/documents', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-75');
    submitBtn.innerHTML = `
      <i data-lucide="check-circle" class="w-4 h-4 text-amber-400"></i>
      <span>Upload & Save Document</span>
    `;

    if (data.success) {
      showUploadAlert('Document uploaded and stored successfully!', true);
      // Reset form fields
      document.getElementById('documentUploadForm').reset();
      updateFileLabel(fileInput);
      loadAdminDashboardData();
    } else {
      showUploadAlert(data.message || 'Failed to upload document', false);
    }
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-75');
    submitBtn.innerHTML = `
      <i data-lucide="check-circle" class="w-4 h-4 text-amber-400"></i>
      <span>Upload & Save Document</span>
    `;
    showUploadAlert('Network error occurred while uploading.', false);
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Show alert inside upload card
function showUploadAlert(msg, isSuccess) {
  const alertBox = document.getElementById('uploadAlert');
  alertBox.className = isSuccess 
    ? 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800'
    : 'mb-4 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 border border-red-200 text-red-700';

  alertBox.innerHTML = `
    <i data-lucide="${isSuccess ? 'check-circle-2' : 'alert-circle'}" class="w-4 h-4 shrink-0"></i>
    <span>${escapeHtml(msg)}</span>
  `;
  alertBox.classList.remove('hidden');

  if (window.lucide) {
    lucide.createIcons();
  }

  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 5000);
}

// Open Edit Document Modal
function openEditModal(docId) {
  const doc = allAdminDocs.find(d => d.id === docId);
  if (!doc) return;

  document.getElementById('editDocId').value = doc.id;
  document.getElementById('editDocTitle').value = doc.title || '';
  document.getElementById('editDocNumber').value = doc.docNumber || '';
  document.getElementById('editDocCategory').value = doc.category || 'General Document';
  document.getElementById('editDocClient').value = doc.clientName || '';
  document.getElementById('editDocDescription').value = doc.description || '';

  document.getElementById('editDocModal').classList.remove('hidden');
}

// Close Edit Modal
function closeEditModal() {
  document.getElementById('editDocModal').classList.add('hidden');
}

// Handle Edit Submit
async function handleEditDocSubmit(event) {
  event.preventDefault();
  const docId = document.getElementById('editDocId').value;
  const updates = {
    title: document.getElementById('editDocTitle').value.trim(),
    docNumber: document.getElementById('editDocNumber').value.trim(),
    category: document.getElementById('editDocCategory').value,
    clientName: document.getElementById('editDocClient').value.trim(),
    description: document.getElementById('editDocDescription').value.trim()
  };

  try {
    const res = await fetch(`/api/admin/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (data.success) {
      closeEditModal();
      loadAdminDashboardData();
    } else {
      alert(data.message || 'Failed to update document');
    }
  } catch (err) {
    alert('Network error while saving document edits');
  }
}

// Delete Document
async function deleteDoc(docId, encodedTitle) {
  const title = decodeURIComponent(encodedTitle);
  if (!confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/documents/${docId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      loadAdminDashboardData();
    } else {
      alert(data.message || 'Failed to delete document');
    }
  } catch (err) {
    alert('Network error while deleting document');
  }
}

// Change Password Modal
function openChangePasswordModal() {
  document.getElementById('changePasswordForm').reset();
  document.getElementById('passwordAlert').classList.add('hidden');
  document.getElementById('changePasswordModal').classList.remove('hidden');
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.add('hidden');
}

// Handle Password Change Submit
async function handleChangePasswordSubmit(event) {
  event.preventDefault();
  const currentPassword = document.getElementById('currentPass').value;
  const newPassword = document.getElementById('newPass').value;
  const confirmPassword = document.getElementById('confirmPass').value;
  const alertBox = document.getElementById('passwordAlert');

  if (newPassword !== confirmPassword) {
    alertBox.className = 'my-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 border border-red-200 text-red-700';
    alertBox.innerHTML = '<span>New passwords do not match.</span>';
    alertBox.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (data.success) {
      alertBox.className = 'my-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800';
      alertBox.innerHTML = '<span>Password updated successfully!</span>';
      alertBox.classList.remove('hidden');
      setTimeout(() => {
        closeChangePasswordModal();
      }, 1500);
    } else {
      alertBox.className = 'my-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 border border-red-200 text-red-700';
      alertBox.innerHTML = `<span>${escapeHtml(data.message || 'Error updating password')}</span>`;
      alertBox.classList.remove('hidden');
    }
  } catch (err) {
    alertBox.className = 'my-3 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 border border-red-200 text-red-700';
    alertBox.innerHTML = '<span>Server error updating password</span>';
    alertBox.classList.remove('hidden');
  }
}

// Scroll to upload form
function scrollToUpload() {
  const el = document.getElementById('uploadSection');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('docTitle').focus();
  }
}

// Utility: Format File Size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Utility: HTML Escaping
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
