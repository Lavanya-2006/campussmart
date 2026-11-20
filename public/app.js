const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved'];
const CATEGORY_ICONS = {
  Classroom: '▤',
  'Wi-Fi': '⌁',
  'Drinking Water': '◉',
  'Laboratory Equipment': '⚙',
  Washroom: '◌',
  'Hostel Maintenance': '⌂',
  Other: '＋'
};

const elements = {
  studentView: document.getElementById('student-view'),
  adminView: document.getElementById('admin-view'),
  complaintForm: document.getElementById('complaint-form'),
  description: document.getElementById('description'),
  category: document.getElementById('category'),
  charCount: document.getElementById('char-count'),
  suggestionRow: document.getElementById('suggestion-row'),
  suggestionText: document.getElementById('suggestion-text'),
  applySuggestion: document.getElementById('apply-suggestion'),
  studentComplaints: document.getElementById('student-complaints'),
  searchForm: document.getElementById('search-form'),
  searchId: document.getElementById('search-id'),
  searchResult: document.getElementById('search-result'),
  adminComplaints: document.getElementById('admin-complaints'),
  filterCategory: document.getElementById('filter-category'),
  filterStatus: document.getElementById('filter-status'),
  tableCount: document.getElementById('table-count'),
  tableFooterText: document.getElementById('table-footer-text'),
  toast: document.getElementById('toast')
};

let toastTimer;
let suggestedCategory = '';
let adminComplaintsCache = [];

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch {
    throw new Error('Cannot reach the server. Check that the app is running and try again.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function statusClass(status) {
  return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

function priorityClass(priority) {
  return `priority-${priority.toLowerCase()}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', isError);
  elements.toast.classList.add('show');
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 3600);
}

function setView(view) {
  const isAdmin = view === 'admin';
  document.querySelectorAll('.nav-link').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  elements.studentView.classList.toggle('active', !isAdmin);
  elements.studentView.hidden = isAdmin;
  elements.adminView.classList.toggle('active', isAdmin);
  elements.adminView.hidden = !isAdmin;
  document.getElementById('page-crumb').textContent = isAdmin ? 'Admin dashboard' : 'Student portal';
  if (isAdmin) loadAdminData();
}

function categorizeLocally(description) {
  const text = description.toLowerCase();
  const rules = [
    { category: 'Wi-Fi', keywords: ['wifi', 'wi-fi', 'internet', 'network', 'connection', 'router'] },
    { category: 'Drinking Water', keywords: ['water', 'drinking', 'dispenser', 'tap', 'filter'] },
    { category: 'Laboratory Equipment', keywords: ['lab', 'laboratory', 'equipment', 'microscope', 'instrument', 'machine'] },
    { category: 'Washroom', keywords: ['washroom', 'toilet', 'bathroom', 'restroom', 'flush', 'sink'] },
    { category: 'Hostel Maintenance', keywords: ['hostel', 'dormitory', 'room repair', 'maintenance'] },
    { category: 'Classroom', keywords: ['classroom', 'class', 'lecture hall', 'desk', 'board', 'fan', 'projector'] }
  ];
  return rules.find((rule) => rule.keywords.some((word) => text.includes(word)))?.category || '';
}

function suggestPriority(description) {
  const text = description.toLowerCase();
  if (/\b(urgent|emergency|danger|sparking|smoke|flood|injury|unsafe|not working at all)\b/.test(text)) return 'High';
  if (/\b(broken|leaking|blocked|unusable|repeatedly|keeps failing)\b/.test(text)) return 'Medium';
  return 'Low';
}

function updateSuggestion() {
  const text = elements.description.value;
  elements.charCount.textContent = text.length;
  suggestedCategory = categorizeLocally(text);
  if (!text.trim()) {
    elements.suggestionRow.hidden = true;
    return;
  }
  const priority = suggestPriority(text);
  const categoryMessage = suggestedCategory
    ? `Suggested category: ${suggestedCategory}. `
    : 'No category match found. ';
  elements.suggestionText.textContent = `${categoryMessage}Suggested priority: ${priority} (rule-based).`;
  elements.applySuggestion.textContent = suggestedCategory ? 'Apply category' : 'Keep priority';
  elements.applySuggestion.disabled = !suggestedCategory;
  elements.suggestionRow.hidden = false;
  elements.applySuggestion.dataset.priority = priority;
}

function renderStudentComplaints(complaints) {
  if (!complaints.length) {
    elements.studentComplaints.innerHTML = '<div class="empty-state">No complaints yet. Submit one above and it will appear here.</div>';
    return;
  }
  elements.studentComplaints.innerHTML = complaints.slice(0, 6).map((complaint) => `
    <article class="complaint-item">
      <span class="complaint-item-icon" aria-hidden="true">${escapeHtml(CATEGORY_ICONS[complaint.category] || '＋')}</span>
      <div class="complaint-item-copy">
        <strong>${escapeHtml(complaint.category)} issue</strong>
        <span>${escapeHtml(complaint.department)} · ${escapeHtml(formatDate(complaint.createdAt))}</span>
      </div>
      <div class="complaint-item-end">
        <span class="status-pill ${statusClass(complaint.status)}">${escapeHtml(complaint.status)}</span>
        <span class="complaint-id">${escapeHtml(complaint.complaintId)}</span>
      </div>
    </article>
  `).join('');
}

async function loadStudentComplaints() {
  elements.studentComplaints.innerHTML = '<div class="empty-state">Loading complaints…</div>';
  try {
    const { complaints } = await api('/api/complaints');
    renderStudentComplaints(complaints);
  } catch (error) {
    elements.studentComplaints.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function showSearchError(message) {
  elements.searchResult.innerHTML = `<div class="search-card"><p>${escapeHtml(message)}</p></div>`;
}

async function searchComplaint(event) {
  event.preventDefault();
  const complaintId = elements.searchId.value.trim().toUpperCase();
  if (!complaintId) {
    showSearchError('Enter your complaint ID to track its status.');
    elements.searchId.focus();
    return;
  }
  elements.searchResult.innerHTML = '<div class="search-card"><p>Looking up your complaint…</p></div>';
  try {
    const { complaints } = await api(`/api/complaints?complaintId=${encodeURIComponent(complaintId)}`);
    if (!complaints.length) {
      showSearchError(`No complaint found with ID ${complaintId}. Check the ID and try again.`);
      return;
    }
    const complaint = complaints[0];
    elements.searchResult.innerHTML = `
      <div class="search-card">
        <div class="search-card-top"><span class="search-id">${escapeHtml(complaint.complaintId)}</span><span class="status-pill ${statusClass(complaint.status)}">${escapeHtml(complaint.status)}</span></div>
        <p>${escapeHtml(complaint.category)} · Submitted ${escapeHtml(formatDate(complaint.createdAt))}<br>${escapeHtml(complaint.description)}</p>
      </div>`;
  } catch (error) {
    showSearchError(error.message);
  }
}

async function submitComplaint(event) {
  event.preventDefault();
  const button = elements.complaintForm.querySelector('button[type="submit"]');
  const payload = {
    studentName: document.getElementById('student-name').value.trim(),
    department: document.getElementById('department').value.trim(),
    category: elements.category.value,
    description: elements.description.value.trim(),
    priority: elements.applySuggestion.dataset.priority || 'Medium'
  };
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Sending…';
  try {
    const { complaint } = await api('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    elements.complaintForm.reset();
    elements.charCount.textContent = '0';
    elements.suggestionRow.hidden = true;
    elements.applySuggestion.dataset.priority = '';
    elements.searchId.value = complaint.complaintId;
    elements.searchResult.innerHTML = `
      <div class="search-card">
        <div class="search-card-top"><span class="search-id">${escapeHtml(complaint.complaintId)}</span><span class="status-pill status-pending">Pending</span></div>
        <p>Your complaint is submitted. Save this ID to track progress.</p>
      </div>`;
    showToast(`Complaint submitted. Your tracking ID is ${complaint.complaintId}`);
    await loadStudentComplaints();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Send complaint';
  }
}

function renderAdminComplaints(complaints) {
  adminComplaintsCache = complaints;
  elements.tableCount.textContent = complaints.length;
  elements.tableFooterText.textContent = `Showing ${complaints.length} complaint${complaints.length === 1 ? '' : 's'}`;
  if (!complaints.length) {
    elements.adminComplaints.innerHTML = '<tr><td class="table-empty" colspan="6">No complaints match these filters.</td></tr>';
    return;
  }
  elements.adminComplaints.innerHTML = complaints.map((complaint) => `
    <tr>
      <td class="complaint-cell"><strong>${escapeHtml(complaint.complaintId)}</strong><span>${escapeHtml(complaint.description.slice(0, 62))}${complaint.description.length > 62 ? '…' : ''}</span></td>
      <td class="student-cell"><strong>${escapeHtml(complaint.studentName)}</strong><span>${escapeHtml(complaint.department)}</span></td>
      <td>${escapeHtml(complaint.category)}</td>
      <td><span class="priority-pill ${priorityClass(complaint.priority)}">${escapeHtml(complaint.priority)}</span></td>
      <td>${escapeHtml(formatDate(complaint.createdAt))}</td>
      <td><label class="sr-only" for="status-${escapeHtml(complaint.complaintId)}">Update status for ${escapeHtml(complaint.complaintId)}</label><select class="status-select" id="status-${escapeHtml(complaint.complaintId)}" data-complaint-id="${escapeHtml(complaint.complaintId)}" aria-label="Update status for ${escapeHtml(complaint.complaintId)}">${STATUS_OPTIONS.map((status) => `<option${status === complaint.status ? ' selected' : ''}>${status}</option>`).join('')}</select></td>
    </tr>
  `).join('');
}

async function loadAdminData() {
  elements.adminComplaints.innerHTML = '<tr><td class="table-empty" colspan="6">Loading complaints…</td></tr>';
  try {
    const query = new URLSearchParams();
    if (elements.filterCategory.value) query.set('category', elements.filterCategory.value);
    if (elements.filterStatus.value) query.set('status', elements.filterStatus.value);
    const [stats, result] = await Promise.all([
      api('/api/complaints/stats'),
      api(`/api/complaints${query.size ? `?${query}` : ''}`)
    ]);
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-progress').textContent = stats.inProgress;
    document.getElementById('stat-resolved').textContent = stats.resolved;
    renderAdminComplaints(result.complaints);
  } catch (error) {
    elements.adminComplaints.innerHTML = `<tr><td class="table-empty" colspan="6">${escapeHtml(error.message)}</td></tr>`;
    showToast(error.message, true);
  }
}

async function updateStatus(event) {
  const select = event.target.closest('.status-select');
  if (!select) return;
  const { complaintId } = select.dataset;
  select.disabled = true;
  try {
    await api(`/api/complaints/${encodeURIComponent(complaintId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: select.value })
    });
    showToast(`${complaintId} updated to ${select.value}.`);
    await Promise.all([loadAdminData(), loadStudentComplaints()]);
  } catch (error) {
    showToast(error.message, true);
    await loadAdminData();
  } finally {
    select.disabled = false;
  }
}

function exportCsv() {
  if (!adminComplaintsCache.length) {
    showToast('There are no complaints to export.', true);
    return;
  }
  const columns = ['Complaint ID', 'Student', 'Department', 'Category', 'Description', 'Priority', 'Status', 'Submitted'];
  const rows = adminComplaintsCache.map((complaint) => [
    complaint.complaintId,
    complaint.studentName,
    complaint.department,
    complaint.category,
    complaint.description,
    complaint.priority,
    complaint.status,
    formatDate(complaint.createdAt)
  ]);
  const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const content = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `campus-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelectorAll('.nav-link').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});
document.querySelectorAll('[data-refresh="student"]').forEach((button) => {
  button.addEventListener('click', loadStudentComplaints);
});
document.querySelectorAll('[data-refresh="admin"]').forEach((button) => {
  button.addEventListener('click', loadAdminData);
});
elements.description.addEventListener('input', updateSuggestion);
elements.applySuggestion.addEventListener('click', () => {
  if (suggestedCategory) elements.category.value = suggestedCategory;
});
elements.complaintForm.addEventListener('submit', submitComplaint);
elements.searchForm.addEventListener('submit', searchComplaint);
elements.filterCategory.addEventListener('change', loadAdminData);
elements.filterStatus.addEventListener('change', loadAdminData);
elements.adminComplaints.addEventListener('change', updateStatus);
document.getElementById('export-button').addEventListener('click', exportCsv);
document.getElementById('current-year').textContent = new Date().getFullYear();

loadStudentComplaints();
