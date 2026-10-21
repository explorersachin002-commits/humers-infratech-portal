// Humers Infratech - Public Search & Navigation App
let currentCategory = '';
let lastSearchQuery = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Handle URL hash navigation
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);

  // Monitor search input for clear button visibility
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (searchInput && clearBtn) {
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim().length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    });

    // Keyboard shortcut: '/' to focus search, 'Escape' to close modal
    document.addEventListener('keydown', (e) => {
      const viewerModal = document.getElementById('viewerModal');
      if (e.key === 'Escape' && !viewerModal.classList.contains('hidden')) {
        closeViewerModal(true);
        return;
      }
      if (e.key === '/' && document.activeElement !== searchInput && !document.getElementById('viewSearch').classList.contains('hidden')) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }
});

// Navigation between Page 1 (Search) and Page 2 (Thank You)
function navigateTo(page) {
  const viewSearch = document.getElementById('viewSearch');
  const viewThankYou = document.getElementById('viewThankYou');
  const navBtnSearch = document.getElementById('navBtnSearch');
  const navBtnExit = document.getElementById('navBtnExit');

  if (page === 'thankyou') {
    // Hide Search Page, Show Thank You Page (Matches Drawing 2)
    viewSearch.classList.add('hidden');
    viewThankYou.classList.remove('hidden');
    navBtnSearch.classList.remove('hidden');
    navBtnExit.classList.add('hidden');
    window.location.hash = '#thankyou';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    // Show Search Page (Matches Drawing 1)
    viewSearch.classList.remove('hidden');
    viewThankYou.classList.add('hidden');
    navBtnSearch.classList.add('hidden');
    navBtnExit.classList.remove('hidden');
    window.location.hash = '#search';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-focus search input
    setTimeout(() => {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.focus();
    }, 100);
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Check URL Hash
function handleHashChange() {
  const hash = window.location.hash.toLowerCase();
  if (hash === '#thankyou') {
    navigateTo('thankyou');
  } else {
    navigateTo('search');
  }
}

// Quick Category Filtering
function quickFilter(category) {
  currentCategory = category;

  // Update pills styling
  document.querySelectorAll('.cat-pill').forEach(btn => {
    if (btn.getAttribute('data-cat') === category) {
      btn.className = 'cat-pill active px-3 py-1 rounded-full bg-brand-800 text-white font-medium transition-colors';
    } else {
      btn.className = 'cat-pill px-3 py-1 rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium transition-colors';
    }
  });

  const query = document.getElementById('searchInput').value.trim();
  if (query) {
    performSearch(query, currentCategory);
  }
}

// Clear Search
function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const resultsSection = document.getElementById('searchResultsSection');
  const sketchArrowHint = document.getElementById('sketchArrowHint');

  searchInput.value = '';
  clearBtn.classList.add('hidden');
  resultsSection.classList.add('hidden');
  sketchArrowHint.classList.remove('hidden');
  lastSearchQuery = '';
  searchInput.focus();
}

// Form Submit Handler
function handleSearch(event) {
  event.preventDefault();
  const searchInput = document.getElementById('searchInput');
  const query = searchInput.value.trim();

  if (!query) {
    searchInput.focus();
    return;
  }

  performSearch(query, currentCategory);
}

// Perform API Search Call
async function performSearch(query, category = '') {
  lastSearchQuery = query;
  const resultsSection = document.getElementById('searchResultsSection');
  const searchLoading = document.getElementById('searchLoading');
  const noResultsBox = document.getElementById('noResultsBox');
  const documentsList = document.getElementById('documentsList');
  const resultsCountText = document.getElementById('resultsCountText');
  const resultsQuerySubtext = document.getElementById('resultsQuerySubtext');
  const sketchArrowHint = document.getElementById('sketchArrowHint');

  // Show results area & loading spinner
  resultsSection.classList.remove('hidden');
  sketchArrowHint.classList.add('hidden');
  searchLoading.classList.remove('hidden');
  noResultsBox.classList.add('hidden');
  documentsList.innerHTML = '';

  try {
    const url = `/api/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;
    const response = await fetch(url);
    const data = await response.json();

    searchLoading.classList.add('hidden');

    if (!data.success || !data.results || data.results.length === 0) {
      noResultsBox.classList.remove('hidden');
      document.getElementById('noResultsMsg').textContent = `No documents matching "${query}" were found. Please check the spelling or document reference number.`;
      resultsCountText.textContent = '0 Documents Found';
      resultsQuerySubtext.textContent = `Search results for "${query}"`;
      return;
    }

    resultsCountText.textContent = `${data.results.length} Document${data.results.length > 1 ? 's' : ''} Found`;
    resultsQuerySubtext.textContent = `Showing verified records matching "${query}"`;

    // Render result cards
    renderDocumentCards(data.results);

    // Scroll smoothly to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error('Search error:', err);
    searchLoading.classList.add('hidden');
    noResultsBox.classList.remove('hidden');
    document.getElementById('noResultsMsg').textContent = 'An error occurred while connecting to the document repository. Please try again.';
  }
}

// Render Documents
function renderDocumentCards(documents) {
  const container = document.getElementById('documentsList');
  container.innerHTML = '';

  documents.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-card bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between';

    const fileSizeFormatted = formatFileSize(doc.fileSize);
    const fileIcon = getFileIcon(doc.originalName, doc.mimeType);
    const dateFormatted = new Date(doc.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 tracking-wider font-mono">
              ${escapeHtml(doc.docNumber || 'DOC-REF')}
            </span>
            <span class="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-600">
              ${escapeHtml(doc.category || 'General')}
            </span>
          </div>
          <div class="text-xs text-slate-400 flex items-center gap-1 shrink-0">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
            <span>${dateFormatted}</span>
          </div>
        </div>

        <h3 class="font-bold text-slate-900 text-base sm:text-lg mt-3 leading-snug hover:text-brand-800 transition-colors">
          ${escapeHtml(doc.title)}
        </h3>

        ${doc.clientName ? `
          <div class="text-xs text-brand-700 font-semibold mt-1 flex items-center gap-1">
            <i data-lucide="briefcase" class="w-3 h-3 text-amber-600"></i>
            <span>${escapeHtml(doc.clientName)}</span>
          </div>
        ` : ''}

        ${doc.description ? `
          <p class="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
            ${escapeHtml(doc.description)}
          </p>
        ` : ''}
      </div>

      <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <i data-lucide="${fileIcon.icon}" class="w-4 h-4 text-amber-600"></i>
          <span>${fileSizeFormatted}</span>
        </div>

        <div class="flex items-center gap-2">
          <!-- View button -->
          <button 
            onclick="openViewerModal('${doc.id}', '${encodeURIComponent(doc.title)}', '${encodeURIComponent(doc.docNumber || '')}', '${encodeURIComponent(doc.mimeType || '')}')" 
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5"
            title="Preview Document"
          >
            <i data-lucide="eye" class="w-3.5 h-3.5 text-slate-600"></i>
            <span>View</span>
          </button>

          <!-- Download button -->
          <a 
            href="/api/documents/${doc.id}/download" 
            class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-800 hover:bg-brand-900 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            title="Download Document"
          >
            <i data-lucide="download" class="w-3.5 h-3.5 text-amber-400"></i>
            <span>Download</span>
          </a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Open Document Viewer Modal
function openViewerModal(id, encodedTitle, encodedDocNumber, encodedMimeType) {
  const title = decodeURIComponent(encodedTitle);
  const docNumber = decodeURIComponent(encodedDocNumber);
  const mimeType = decodeURIComponent(encodedMimeType);

  const modal = document.getElementById('viewerModal');
  const modalTitle = document.getElementById('modalDocTitle');
  const modalMeta = document.getElementById('modalDocMeta');
  const modalDownload = document.getElementById('modalDownloadLink');
  const contentArea = document.getElementById('modalViewerContent');

  modalTitle.textContent = title;
  modalMeta.textContent = `${docNumber ? docNumber + ' • ' : ''}Humers Infratech Sikar`;
  modalDownload.href = `/api/documents/${id}/download`;

  // Render appropriate preview based on mime type
  const viewUrl = `/api/documents/${id}/view`;

  if (mimeType.includes('image')) {
    contentArea.innerHTML = `
      <div class="max-h-full max-w-full flex items-center justify-center p-4">
        <img src="${viewUrl}" alt="${escapeHtml(title)}" class="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200" />
      </div>
    `;
  } else if (mimeType.includes('pdf')) {
    contentArea.innerHTML = `
      <iframe src="${viewUrl}" class="w-full h-full min-h-[70vh] rounded-lg border-0 bg-white" title="${escapeHtml(title)}"></iframe>
    `;
  } else {
    // For text or documents that can be framed or shown
    contentArea.innerHTML = `
      <iframe src="${viewUrl}" class="w-full h-full min-h-[70vh] rounded-lg border-0 bg-white p-4" title="${escapeHtml(title)}"></iframe>
    `;
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Close Document Viewer Modal
// Parameter toThankYou: if true, immediately transitions to Page 2 ("Have a nice day / Thank You")
function closeViewerModal(toThankYou = false) {
  const modal = document.getElementById('viewerModal');
  const contentArea = document.getElementById('modalViewerContent');

  modal.classList.add('hidden');
  contentArea.innerHTML = '';
  document.body.style.overflow = '';

  if (toThankYou) {
    // User selected "Show Thank You page automatically when user closes or navigates back from a document"
    navigateTo('thankyou');
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

// Utility: File Icon Mapping
function getFileIcon(filename, mimeType) {
  if (!filename && !mimeType) return { icon: 'file' };
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (mimeType?.includes('pdf') || ext === 'pdf') {
    return { icon: 'file-text' };
  }
  if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) {
    return { icon: 'image' };
  }
  if (['dwg', 'dxf', 'cad'].includes(ext)) {
    return { icon: 'ruler' };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { icon: 'file-type' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { icon: 'file-spreadsheet' };
  }
  return { icon: 'file' };
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
