// Admin Dashboard v2.0 - Complete Rewrite
const session = adminAuth.requireAdmin();
if (session) {
    document.getElementById('admin-display-name').textContent = session.username;
    document.getElementById('admin-display-role').textContent = session.role;

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        adminAuth.logout();
    });
}

function canUseRemoteApi() {
    return (typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled) || false;
}

let seatMatrixView = 'grid';
let seatMatrixSection = 'all';
let seatMatrixShowPhotos = false;

function setSeatMatrixView(view) {
    seatMatrixView = view;
    renderSeatMatrix();
}

function setSeatMatrixSection(section) {
    seatMatrixSection = section;
    renderSeatMatrix();
}

function toggleSeatMatrixPhotos() {
    seatMatrixShowPhotos = !seatMatrixShowPhotos;
    const button = document.getElementById('seat-matrix-photo-btn');
    if (button) button.textContent = seatMatrixShowPhotos ? '🖼️ Hide Photos' : '🖼️ Show Photos';
    renderSeatMatrix();
}

function parseSeatInfo(student) {
    const sectionFromStudent = student.currentSection || student.section || student.sectionName || '';
    let seatNumber = student.currentSeat || student.seatNumber || '';
    let section = String(sectionFromStudent || '').toUpperCase();

    if (!seatNumber && student.seatAllocated) {
        const match = String(student.seatAllocated).match(/([A-Za-z])(\d+)/);
        if (match) {
            section = match[1].toUpperCase();
            seatNumber = match[2];
        } else {
            seatNumber = String(student.seatAllocated).replace(/[^0-9]/g, '');
        }
    }

    return {
        section: String(section || '').toUpperCase(),
        seatNumber: String(seatNumber || '').trim()
    };
}

function findSeatStudent(section, seatNumber) {
    const normalizedSection = String(section || '').toUpperCase();
    const normalizedSeat = String(seatNumber || '').trim();
    return allStudents.find(student => {
        const info = parseSeatInfo(student);
        return info.section === normalizedSection && info.seatNumber === normalizedSeat;
    }) || null;
}

function renderSeatMatrix() {
    const container = document.getElementById('seat-matrix-container');
    if (!container) return;

    const sections = ['A', 'B', 'C', 'D'];
    const targetSections = seatMatrixSection === 'all' ? sections : [seatMatrixSection.toUpperCase()];

    if (!allStudents.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🪑</div>No student seat data available yet.</div>';
        return;
    }

    let html = '';
    targetSections.forEach(section => {
        const seats = [];
        for (let seatNumber = 1; seatNumber <= 65; seatNumber++) {
            const student = findSeatStudent(section, seatNumber);
            const isReserved = Boolean(student);
            const reservedClass = isReserved ? 'reserved' : 'empty';
            const badgeText = isReserved ? (student.seatType === 'Fixed' ? 'Fixed' : 'Reserved') : 'Open';

            if (seatMatrixView === 'grid') {
                seats.push(`
                    <div class="seat-box ${reservedClass}">
                        <div>
                            <div class="seat-number">${section}${seatNumber}</div>
                            <div class="seat-student">${isReserved ? (student.studentName || 'Reserved') : 'Open Seat'}</div>
                            <div class="seat-meta">${isReserved ? (student.phone || 'No phone') : 'Available'}</div>
                            <div class="seat-meta">${isReserved ? badgeText : 'No allocation'}</div>
                        </div>
                        <div>
                            ${isReserved && student.photoDriveUrl ? `<img class="seat-photo" src="${student.photoDriveUrl}" alt="${student.studentName || 'Student photo'}">` : ''}
                        </div>
                    </div>
                `);
            } else {
                seats.push(`
                    <div class="seat-list-item ${reservedClass}">
                        <div style="font-weight:700; min-width:70px;">${section}${seatNumber}</div>
                        <div style="flex:1;">
                            <div style="font-weight:600;">${isReserved ? (student.studentName || 'Reserved') : 'Open Seat'}</div>
                            <div class="seat-meta">${isReserved ? (student.phone || 'No phone') : 'Available for allocation'}</div>
                            <div class="seat-meta">${isReserved ? `${badgeText} • ${student.currentSection || section}` : 'No reservation'}</div>
                        </div>
                        ${isReserved && student.photoDriveUrl ? `<img class="seat-photo" src="${student.photoDriveUrl}" alt="${student.studentName || 'Student photo'}">` : ''}
                    </div>
                `);
            }
        }

        html += `
            <div style="margin-bottom: 24px;">
                <h3 style="margin-bottom: 12px;">Section ${section}</h3>
                <div class="${seatMatrixView === 'grid' ? 'seat-matrix-grid' : 'seat-list'}">
                    ${seats.join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Enhanced matrix: groups students sharing the same flexible seat.
function findSeatStudents(section, seatNumber) {
    const normalizedSection = String(section || '').toUpperCase();
    const normalizedSeat = String(seatNumber || '').trim();
    return allStudents.filter(student => {
        const info = parseSeatInfo(student);
        return info.section === normalizedSection && info.seatNumber === normalizedSeat;
    });
}

function getSeatPhotoMarkup(student) {
    if (!seatMatrixShowPhotos || !student?.photoDriveUrl) return '';
    const urls = typeof getDrivePhotoUrls === 'function'
        ? getDrivePhotoUrls(student.photoDriveUrl, 250)
        : { primary: student.photoDriveUrl, fallback: '' };
    return `<img class="seat-photo" src="${urls.primary}" data-fallback="${urls.fallback || ''}" onerror="if(this.dataset.fallback){this.onerror=function(){this.style.display='none';};this.src=this.dataset.fallback;}else{this.style.display='none';}" alt="${student.studentName || 'Student'}">`;
}

function seatStudentDetails(student) {
    return `<div class="seat-occupant">${getSeatPhotoMarkup(student)}<div class="seat-student">${student.studentName || 'Reserved'}</div><div class="seat-meta">ID: ${student.id || '—'}</div><div class="seat-meta">${student.phone || 'No phone'}</div></div>`;
}

function renderSeatMatrix() {
    const container = document.getElementById('seat-matrix-container');
    if (!container) return;
    const sections = ['A', 'B', 'C', 'D'];
    const targetSections = seatMatrixSection === 'all' ? sections : [seatMatrixSection.toUpperCase()];
    if (!allStudents.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🪑</div>No student seat data available yet.</div>';
        return;
    }

    let html = '';
    targetSections.forEach(section => {
        const seats = [];
        for (let seatNumber = 1; seatNumber <= 65; seatNumber++) {
            const students = findSeatStudents(section, seatNumber);
            const isReserved = students.length > 0;
            const isSharedFlexible = students.length > 1;
            const seatClass = isSharedFlexible ? 'shared' : isReserved ? 'reserved' : 'empty';
            const badgeText = isSharedFlexible ? `Flexible shared · ${students.length} students` : isReserved ? (String(students[0].seatType || '').toLowerCase() === 'fixed' ? 'Fixed reserved' : 'Flexible reserved') : 'Open';
            const span = Math.min(Math.max(students.length, 2), 6);
            const occupants = isReserved ? `<div class="seat-occupants" style="--occupant-count:${isSharedFlexible ? students.length : 1};">${students.map(seatStudentDetails).join('')}</div>` : '<div class="seat-student">Open Seat</div>';

            if (seatMatrixView === 'grid') {
                seats.push(`<div class="seat-box ${seatClass}" ${isSharedFlexible ? `style="--seat-span:${span};"` : ''}><div><div class="seat-number">${section}${seatNumber}</div><div class="seat-meta">${isReserved ? badgeText : 'Available · No allocation'}</div></div>${occupants}</div>`);
            } else {
                seats.push(`<div class="seat-list-item ${seatClass}"><div style="font-weight:700;min-width:70px;">${section}${seatNumber}</div><div style="flex:1;"><div class="seat-meta">${isReserved ? badgeText : 'Available for allocation'}</div>${occupants}</div></div>`);
            }
        }
        const viewClass = seatMatrixView === 'grid' ? `seat-matrix-grid${seatMatrixShowPhotos ? ' seat-matrix-photos' : ''}` : `seat-list${seatMatrixShowPhotos ? ' seat-matrix-photos' : ''}`;
        html += `<div style="margin-bottom:24px;"><h3 style="margin-bottom:12px;">Section ${section}</h3><div class="${viewClass}">${seats.join('')}</div></div>`;
    });
    container.innerHTML = html;
}

async function loadSeatMatrixData() {
    try {
        if (canUseRemoteApi()) allStudents = await apiDataManager.students.getAll();
        renderSeatMatrix();
    } catch (error) {
        console.error('Could not load seat matrix students:', error);
        const container = document.getElementById('seat-matrix-container');
        if (container) container.innerHTML = `<div class="empty-state">Could not load seat data: ${error.message}</div>`;
    }
}

function printSeatMatrix() {
    const matrix = document.getElementById('seat-matrix-container');
    if (!matrix?.innerHTML) return alert('Seat Matrix is not ready to print.');
    const selected = seatMatrixSection === 'all' ? 'All Sections' : `Section ${seatMatrixSection}`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow pop-ups to print the Seat Matrix.');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Seat Matrix - ${selected}</title><style>@page{margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#222;font-size:10px}.print-action{margin:0 0 14px;padding:10px 18px;background:#2563eb;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer}h1{margin:0;font-size:20px}.print-info{margin:5px 0 14px;color:#555}h3{margin:14px 0 7px;font-size:14px}.seat-matrix-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.seat-list{display:flex;flex-direction:column;gap:6px}.seat-box,.seat-list-item{border:1px solid #bbb;border-radius:7px;padding:6px;background:#fff;break-inside:avoid;page-break-inside:avoid}.seat-box.reserved,.seat-list-item.reserved{border-color:#2e7d32;background:#eff9f0}.seat-box.empty,.seat-list-item.empty{border-color:#c62828;background:#fff2f2}.seat-box.shared,.seat-list-item.shared{border-color:#6a1b9a;background:#f7effb;grid-column:span var(--seat-span,2)}.seat-number{font-size:11px;font-weight:bold;margin-bottom:3px}.seat-student{font-size:10px;font-weight:bold}.seat-meta{color:#555;font-size:9px;line-height:1.25}.seat-occupants{display:grid;grid-template-columns:repeat(var(--occupant-count,1),minmax(0,1fr));gap:4px;margin-top:4px}.seat-occupant{min-width:0;padding:3px;border-radius:4px;background:rgba(255,255,255,.7)}.seat-photo{width:62px;height:62px;object-fit:cover;border-radius:5px;display:block;margin:0 auto 3px}.seat-matrix-photos .seat-box{min-height:125px}@media print{.print-action{display:none}}</style></head><body><button class="print-action" onclick="window.print()">Open Print Settings</button><h1>S P Library — Seat Matrix</h1><div class="print-info">${selected} · Printed ${new Date().toLocaleString()}</div>${matrix.innerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 750);
}

// ==================== Tab Switching ====================
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) targetTab.style.display = 'block';
    
    document.querySelectorAll('.admin-nav-tab').forEach(btn => btn.classList.remove('active'));
    const activeButton = document.querySelector('.admin-nav-tab[data-tab="' + tabName + '"]');
    if (activeButton) activeButton.classList.add('active');

    if (tabName === 'dashboard') loadDashboardData();
    else if (tabName === 'students') loadStudentsData();
    else if (tabName === 'seatmatrix') {
        loadSeatMatrixData();
    }
    else if (tabName === 'deleted') loadDeletedStudentsData();
    else if (tabName === 'payments') loadPaymentsData();
    else if (tabName === 'bookings') loadBookingsData();
    else if (tabName === 'notices') loadNoticesData();
}

// ==================== Data Management ====================
let allStudents = [];
let studentFiltersApplied = false;
let allPayments = [];
let paymentFiltersApplied = false;
let allBookings = [];
let allNotices = [];
let allDeletedStudents = [];
let deletedFiltersApplied = false;
let showDeletedStudentPhotos = false;
let showStudentPhotos = false;
let selectedStudentPhotoData = '';
let currentPrintData = {
    students: [],
    deletedStudents: [],
    payments: [],
    bookings: [],
    notices: [],
    reports: null
};

function updateDashboardStats(summary) {
    const total = Number(summary.totalStudents || 0);
    const active = Number(summary.activeStudents || 0);
    const inactive = Math.max(total - active, 0);
    const seats = Number(summary.seatsOccupied || 0);
    const paid = Number(summary.monthlyCollection || 0);
    const due = Number(summary.monthlyDue || 0);

    const totalEl = document.getElementById('stat-total');
    const activeEl = document.getElementById('stat-active');
    const inactiveEl = document.getElementById('stat-inactive');
    const seatsEl = document.getElementById('stat-seats');
    const paidEl = document.getElementById('stat-paid');
    const dueEl = document.getElementById('stat-due');
    const breakdownEl = document.getElementById('section-breakdown');

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.innerHTML = `✓ Active: ${active}`;
    if (inactiveEl) inactiveEl.innerHTML = `✗ Inactive: ${inactive}`;
    if (seatsEl) seatsEl.textContent = seats;
    if (paidEl) paidEl.textContent = `₹${paid.toLocaleString()}`;
    if (dueEl) dueEl.innerHTML = `📌 Due: ₹${due.toLocaleString()}`;

    if (breakdownEl && Array.isArray(summary.sectionSummary)) {
        breakdownEl.innerHTML = summary.sectionSummary.map(item => `
            <div class="section-row">
                <div class="section-name">Section ${item.section}</div>
                <div class="section-info">${item.taken} taken • ${item.available} available</div>
            </div>
        `).join('');
    }
}

function updatePaymentSummary(summary) {
    const paidEl = document.getElementById('stat-paid');
    const dueEl = document.getElementById('stat-due');
    if (paidEl) paidEl.textContent = `₹${Number(summary.totalPaid || 0).toLocaleString()}`;
    if (dueEl) dueEl.innerHTML = `📌 Due: ₹${Number(summary.totalDue || 0).toLocaleString()}`;
}

function showApiUnavailableDashboard() {
    // Populate dashboard with empty/placeholder values and show an informational notice
    updateDashboardStats({ totalStudents: 0, activeStudents: 0, seatsOccupied: 0, monthlyCollection: 0, monthlyDue: 0, sectionSummary: [] });
    const bookingsEl = document.getElementById('stat-bookings');
    if (bookingsEl) bookingsEl.textContent = 'N/A';
    const alertEl = document.getElementById('dashboard-error');
    if (alertEl) {
        alertEl.style.display = 'block';
        alertEl.textContent = '⚠️ API not configured. Connect the Google Sheets backend to load live data.';
    } else {
        console.warn('API not configured. Dashboard will show empty data.');
    }
}

function renderNoticesList(notices) {
    const container = document.getElementById('notices-list') || document.getElementById('notices-container');
    if (!container) return;
    const list = Array.isArray(notices) ? notices : [];
    if (!list.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📢</div>No notices found.</div>';
        return;
    }
    container.innerHTML = list.map(notice => `
        <div class="list-item">
            <strong>${notice.title || 'Untitled notice'}</strong>
            <div style="margin-top:6px;color:#666;">${notice.content || ''}</div>
        </div>
    `).join('');
}

async function loadDashboardData() {
    try {
        if (!canUseRemoteApi()) {
            showApiUnavailableDashboard();
            return;
        }

        let summary = null;
        let paymentSummary = null;
        let bookings = null;

        try {
            summary = await apiClient.request('dashboardSummary', {}, { method: 'POST' });
            if (summary.summary) updateDashboardStats(summary.summary);
        } catch (error) {
            console.warn('Dashboard summary unavailable.', error);
        }

        try {
            paymentSummary = await apiClient.request('monthlyCollectionSummary', {}, { method: 'POST' });
            if (paymentSummary.summary) updatePaymentSummary(paymentSummary.summary);
        } catch (error) {
            console.warn('Payment summary unavailable.', error);
        }

        try {
            bookings = await apiClient.request('listBookings', {}, { method: 'POST' });
            if (bookings.bookings) {
                document.getElementById('stat-bookings').textContent = bookings.bookings.filter(b => String(b.status || '').toUpperCase() === 'PENDING').length;
            }
        } catch (error) {
            console.warn('Booking summary unavailable.', error);
        }

    } catch (error) {
        console.warn('Dashboard load error:', error);
        showApiUnavailableDashboard();
    }
}

async function loadStudentsData() {
    try {
        if (!studentFiltersApplied) {
            const tbody = document.getElementById('students-tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#777;">Choose filters and click Apply Filters to load student records.</td></tr>';
            return;
        }
        if (canUseRemoteApi()) {
            try {
                const response = await apiClient.request('listStudents', {}, { method: 'POST' });
                allStudents = response.students || [];
            } catch (error) {
                console.error('Failed to load students from API:', error);
                allStudents = [];
            }
        } else {
            console.error('API not available: cannot load students');
            allStudents = [];
        }
        renderStudentsTable(allStudents);
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadDeletedStudentsData() {
    try {
        if (!deletedFiltersApplied) {
            const tbody = document.getElementById('deleted-students-tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#777;">Choose filters and click Apply Filters to load deleted student records.</td></tr>';
            return;
        }
        if (canUseRemoteApi()) {
            try {
                const response = await apiClient.request('listDeletedStudents', {}, { method: 'POST' });
                allDeletedStudents = response.deletedStudents || [];
            } catch (error) {
                console.warn('Using empty deleted-student data because the API request failed:', error);
            }
        }

        if (!Array.isArray(allDeletedStudents)) {
            allDeletedStudents = [];
        }
        renderDeletedStudentsTable(allDeletedStudents);
    } catch (error) {
        console.warn('Error loading deleted students:', error);
    }
}

if (session) {
    switchTab('dashboard');
}

// Check API status and show a visible banner so diagnosis is easy for admins
async function checkApiStatus() {
    const el = document.getElementById('dashboard-error');
    if (!el) return;

    if (!canUseRemoteApi()) {
        el.style.display = 'block';
        el.style.background = '#fff3cd';
        el.style.border = '1px solid #ffeeba';
        el.textContent = '⚠️ API not configured. Dashboard will show empty data. Please set API_BASE_URL in api-client.js to your Apps Script Web App URL and ensure the Web App is deployed as "Anyone, even anonymous".';
        return;
    }

    try {
        el.style.display = 'block';
        el.style.background = '#fff3cd';
        el.style.border = '1px solid #ffeeba';
        el.textContent = 'Checking API connectivity...';

        const pong = await apiClient.ping();
        el.style.background = '#d4edda';
        el.style.border = '1px solid #c3e6cb';
        el.innerHTML = `✅ API reachable at <code>${apiClient.API_BASE_URL}</code>.`; 
    } catch (err) {
        el.style.display = 'block';
        el.style.background = '#f8d7da';
        el.style.border = '1px solid #f5c6cb';
        // Provide a one-click open link so admins can load the raw exec URL and see redirects/login pages
        const pingUrl = apiClient.API_BASE_URL + '?action=ping';
        el.innerHTML = `⚠️ API unreachable at <code>${apiClient.API_BASE_URL}</code> — ${err.message}.<br>Please verify your Apps Script Web App deployment: Execute as \"Me\" and Who has access \"Anyone, even anonymous\".<br><a href="${pingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:8px 10px;background:#fff;border:1px solid #ddd;border-radius:6px;text-decoration:none;color:#333;">Open API URL (ping)</a>`;
    }
}

// Run API status check after load so admins see immediate diagnostics
window.addEventListener('DOMContentLoaded', () => {
    checkApiStatus();
});

async function loadPaymentsData() {
    try {
        if (!paymentFiltersApplied) {
            const tbody = document.getElementById('payments-tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px; color:#777;">Choose filters and click Apply to load payment records.</td></tr>';
            updatePaymentManagementSummary([], 'Choose filters');
            return;
        }
        if (canUseRemoteApi()) {
            try {
                const response = await apiClient.request('listPayments', {}, { method: 'POST' });
                allPayments = response.payments || [];
                const studentsResponse = await apiClient.request('listStudents', {}, { method: 'POST' });
                allStudents = studentsResponse.students || [];

                const summary = await apiClient.request('monthlyCollectionSummary', {}, { method: 'POST' });
                if (summary.summary) updatePaymentSummary(summary.summary);
            } catch (error) {
                console.warn('Using local payment data because the API request failed:', error);
            }
        }

        if (!Array.isArray(allPayments) || allPayments.length === 0) {
            allPayments = [];
        }
        applyPaymentFilters(true);
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

async function loadBookingsData() {
    try {
        if (canUseRemoteApi()) {
            try {
                const response = await apiClient.request('listBookings', {}, { method: 'POST' });
                allBookings = response.bookings || [];
            } catch (error) {
                console.warn('Using local booking data because the API request failed:', error);
            }
        }

        if (!Array.isArray(allBookings) || allBookings.length === 0) {
            allBookings = [];
        }
        renderBookingsTable(allBookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

async function loadNoticesData() {
    try {
        if (canUseRemoteApi()) {
            try {
                const response = await apiClient.request('listNotices', {}, { method: 'POST' });
                allNotices = response.notices || [];
            } catch (error) {
                console.warn('Using local notice data because the API request failed:', error);
            }
        }

        if (!Array.isArray(allNotices) || allNotices.length === 0) {
            allNotices = [];
        }
        renderNoticesList(allNotices);
    } catch (error) {
        console.error('Error loading notices:', error);
    }
}

// ==================== Rendering Functions ====================
function getDrivePhotoUrls(url, size = 200) {
    const value = String(url || '').trim();
    const match = value.match(/[?&]id=([^&]+)/) || value.match(/\/d\/([^/?]+)/);
    if (!match) return { primary: value, fallback: '' };
    const id = encodeURIComponent(match[1]);
    return {
        primary: `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`,
        fallback: `https://drive.google.com/uc?export=view&id=${id}`
    };
}

function studentPhotoMarkup(student, size = 42) {
    if (!student?.photoDriveUrl) return '';
    const urls = getDrivePhotoUrls(student.photoDriveUrl, Math.max(size * 3, 160));
    const name = String(student.studentName || 'Student').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    return `<img src="${urls.primary}" alt="${name}" title="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;vertical-align:middle;border:1px solid #d6d6d6;" onerror="if(this.dataset.fallback){this.onerror=function(){this.style.display='none';};this.src=this.dataset.fallback;}else{this.style.display='none';}" data-fallback="${urls.fallback}">`;
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('students-tbody');
    currentPrintData.students = Array.isArray(students) ? students : [];
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${showStudentPhotos ? 8 : 7}" style="text-align:center; padding: 40px; color: #999;">No students found</td></tr>`;
        return;
    }

    students.forEach(student => {
        const row = document.createElement('tr');
        const photoCell = showStudentPhotos ? `<td style="width:58px;min-width:58px;padding-right:4px;">${studentPhotoMarkup(student)}</td>` : '';
        row.innerHTML = `
            <td><strong>${student.id || '—'}</strong></td>
            ${photoCell}
            <td style="min-width:105px;overflow-wrap:anywhere;"><strong>${student.studentName || '—'}</strong></td>
            <td style="white-space:nowrap;">${student.phone || '—'}</td>
            <td><strong>${student.currentSection || '—'}</strong></td>
            <td>${student.currentSeat || '—'}</td>
            <td><span class="badge ${student.status === 'Active' ? 'badge-success' : 'badge-danger'}">${student.status || '—'}</span></td>
            <td><div class="btn-group"><button class="btn-small btn-primary" onclick="editStudent('${student.id}')">Edit</button><button class="btn-small btn-secondary" onclick="deleteStudent('${student.id}')">Delete</button></div></td>
        `;
        tbody.appendChild(row);
    });
}

function renderDeletedStudentsTable(students) {
    const tbody = document.getElementById('deleted-students-tbody');
    currentPrintData.deletedStudents = Array.isArray(students) ? students : [];
    tbody.innerHTML = '';
    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${showDeletedStudentPhotos ? 8 : 7}" style="text-align:center; padding: 40px; color: #999;">No deleted students found</td></tr>`;
        return;
    }
    students.forEach(student => {
        const row = document.createElement('tr');
        const seat = [student.currentSection || student.section, student.currentSeat || student.seatNumber || student.seatAllocated].filter(Boolean).join('') || '—';
        const photoCell = showDeletedStudentPhotos ? `<td style="width:58px;min-width:58px;padding-right:4px;">${studentPhotoMarkup(student)}</td>` : '';
        row.innerHTML = `
            <td><strong>${student.id || '—'}</strong></td>
            ${photoCell}
            <td><strong>${student.studentName || '—'}</strong></td>
            <td>${student.phone || '—'}</td>
            <td>${seat}</td>
            <td><span class="badge ${student.status === 'Active' ? 'badge-success' : 'badge-danger'}">${student.status || '—'}</span></td>
            <td>${student.deletedAt || '—'}</td>
            <td><button class="btn-small btn-primary" onclick="restoreStudent('${student.id}')">Restore</button></td>
        `;
        tbody.appendChild(row);
    });
}

async function applyDeletedFilters() {
    if (!canUseRemoteApi()) return alert('Google Sheets API is not available.');
    try {
        const response = await apiClient.request('listDeletedStudents', {}, { method: 'POST' });
        allDeletedStudents = response.deletedStudents || [];
        deletedFiltersApplied = true;
    } catch (error) {
        console.error('Could not load deleted students:', error);
        return alert(`Could not load deleted students: ${error.message}`);
    }
    const query = (document.getElementById('search-deleted')?.value || '').toLowerCase().trim();
    const section = document.getElementById('filter-deleted-section')?.value || '';
    const seat = (document.getElementById('filter-deleted-seat')?.value || '').trim();
    let rows = Array.isArray(allDeletedStudents) ? allDeletedStudents.slice() : [];
    if (query) rows = rows.filter(student => (student.studentName || '').toLowerCase().includes(query) || String(student.phone || '').includes(query) || String(student.adharNumber || '').includes(query) || String(student.id || '').includes(query));
    if (section) rows = rows.filter(student => String(student.currentSection || student.section || '').toUpperCase() === String(section).toUpperCase());
    if (seat) rows = rows.filter(student => String(student.currentSeat || student.seatNumber || student.seatAllocated || '').includes(seat));
    renderDeletedStudentsTable(rows);
}

function toggleDeletedStudentPhotos() {
    if (!deletedFiltersApplied) return alert('Click Apply Filters before showing deleted student photos.');
    showDeletedStudentPhotos = !showDeletedStudentPhotos;
    const button = document.getElementById('toggle-deleted-photos-btn');
    const heading = document.getElementById('deleted-photo-heading');
    if (button) button.textContent = showDeletedStudentPhotos ? '🖼️ Hide Photos' : '🖼️ Show Photos';
    if (heading) heading.style.display = showDeletedStudentPhotos ? 'table-cell' : 'none';
    renderDeletedStudentsTable(currentPrintData.deletedStudents || []);
}

function sortDeletedStudents(key) {
    if (!deletedFiltersApplied) return alert('Click Apply Filters before sorting deleted student records.');
    const rows = (currentPrintData.deletedStudents || []).slice();
    const direction = window.deletedStudentSort?.key === key ? -window.deletedStudentSort.direction : 1;
    window.deletedStudentSort = { key, direction };
    rows.sort((a, b) => {
        const valueA = key === 'currentSeat' ? [a.currentSection || a.section, a.currentSeat || a.seatNumber || a.seatAllocated].filter(Boolean).join('') : (a[key] || '');
        const valueB = key === 'currentSeat' ? [b.currentSection || b.section, b.currentSeat || b.seatNumber || b.seatAllocated].filter(Boolean).join('') : (b[key] || '');
        return String(valueA).localeCompare(String(valueB), undefined, { numeric:true }) * direction;
    });
    renderDeletedStudentsTable(rows);
}

function exportDeletedStudentsData() {
    if (!deletedFiltersApplied) return alert('Click Apply Filters before exporting deleted student records.');
    const rows = currentPrintData.deletedStudents || [];
    const headers = ['ID', 'Name', 'Phone', 'Seat', 'Status', 'Deleted On'];
    const csv = [headers, ...rows.map(student => [student.id || '', student.studentName || '', student.phone || '', [student.currentSection || student.section, student.currentSeat || student.seatNumber || student.seatAllocated].filter(Boolean).join(''), student.status || '', student.deletedAt || ''])]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `deleted-students-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

function formatPaymentPeriod(payment) {
    const month = Number(payment.month);
    const year = payment.year || '';
    if (month >= 1 && month <= 12) return `${new Date(2000, month - 1, 1).toLocaleString('en', { month: 'short' })} ${year}`;
    if (payment.month) return `${payment.month} ${year}`;
    return payment.paymentDate || '—';
}

function calculatePaymentBilling(student, payments, referenceDate = new Date()) {
    const monthlyFee = Number(student?.monthlyFee);
    const joinDate = student?.joinDate ? new Date(`${String(student.joinDate).split('T')[0]}T00:00:00`) : null;
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0 || !joinDate || Number.isNaN(joinDate.getTime())) {
        return { configured: false, expected: 0, paid: 0, balance: Number(student?.dueAmount) || 0, dueMonths: 0, nextDueDate: null, status: 'Not configured' };
    }
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    let dueMonths = (today.getFullYear() - joinDate.getFullYear()) * 12 + today.getMonth() - joinDate.getMonth();
    if (today.getDate() < joinDate.getDate()) dueMonths--;
    dueMonths = Math.max(dueMonths, 0);
    const expected = monthlyFee * dueMonths;
    const paid = payments.reduce((sum, payment) => sum + (Number(payment.paidAmount) || 0), 0);
    const balance = expected - paid;
    const nextDueDate = new Date(joinDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + dueMonths + 1);
    return { configured: true, monthlyFee, expected, paid, balance, dueMonths, nextDueDate, status: balance > 0 ? 'Due' : balance < 0 ? 'Advance' : dueMonths ? 'Paid' : 'Not Due Yet' };
}

function getStudentForPayment(payment) {
    const paymentId = String(payment.studentId || '').trim();
    const paymentIdNumber = parseInt(paymentId, 10);
    return allStudents.find(student => String(student.id) === paymentId || (Number.isFinite(paymentIdNumber) && parseInt(student.id, 10) === paymentIdNumber)) || null;
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('payments-tbody');
    currentPrintData.payments = Array.isArray(payments) ? payments : [];
    tbody.innerHTML = '';
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 40px; color: #999;">No payments found</td></tr>';
        return;
    }

    payments.forEach(payment => {
        const row = document.createElement('tr');
        const due = parseFloat(payment.amount || 0) - parseFloat(payment.paidAmount || 0);
        const student = getStudentForPayment(payment);
        const section = payment.currentSection || student?.currentSection || '';
        const seat = payment.currentSeat || student?.currentSeat || student?.seatAllocated || '';
        row.innerHTML = `
            <td><strong>${payment.studentId || ''}</strong></td>
            <td>${[section, seat].filter(Boolean).join('-') || '—'}</td>
            <td>${formatPaymentPeriod(payment)}</td>
            <td><strong>${payment.studentName || '—'}</strong></td>
            <td>${payment.paymentDate || '—'}</td>
            <td>₹${payment.amount || 0}</td>
            <td style="color: #27ae60; font-weight: 600;">₹${payment.paidAmount || 0}</td>
            <td style="color:#e74c3c;">₹${payment.dueAmount ?? Math.max(due, 0)}</td>
            <td>${payment.mode || '—'}</td>
            <td><span class="badge ${payment.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${payment.paymentStatus || '—'}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function updatePaymentManagementSummary(rows, label = 'All payments') {
    const expected = rows.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const paid = rows.reduce((sum, payment) => sum + (Number(payment.paidAmount) || 0), 0);
    const due = rows.reduce((sum, payment) => sum + (Number(payment.dueAmount ?? Math.max((Number(payment.amount) || 0) - (Number(payment.paidAmount) || 0), 0)) || 0), 0);
    const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
    set('pm-month', label);
    set('pm-expected', `₹${expected.toLocaleString()}`);
    set('pm-paid', `₹${paid.toLocaleString()}`);
    set('pm-due', `₹${due.toLocaleString()}`);
    set('pm-count', rows.length);
}

async function applyPaymentFilters(skipFetch = false) {
    if (!skipFetch) {
        if (!canUseRemoteApi()) return alert('Google Sheets API is not available.');
        try {
            const [paymentsResponse, studentsResponse] = await Promise.all([
                apiClient.request('listPayments', {}, { method: 'POST' }),
                apiClient.request('listStudents', {}, { method: 'POST' })
            ]);
            allPayments = paymentsResponse.payments || [];
            allStudents = studentsResponse.students || [];
            paymentFiltersApplied = true;
        } catch (error) {
            console.error('Could not load payment records:', error);
            return alert(`Could not load payments: ${error.message}`);
        }
    }
    const selectedMonth = document.getElementById('filter-month')?.value || '';
    const status = document.getElementById('filter-payment-status')?.value || '';
    const mode = document.getElementById('filter-mode')?.value || '';
    let rows = Array.isArray(allPayments) ? allPayments.slice() : [];
    if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const monthName = new Date(2000, Number(month) - 1, 1).toLocaleString('en', { month: 'long' });
        rows = rows.filter(payment => String(payment.year) === year && (String(payment.month) === String(Number(month)) || String(payment.month).toLowerCase() === monthName.toLowerCase()));
    }
    if (status) rows = rows.filter(payment => String(payment.paymentStatus || '').toLowerCase() === status.toLowerCase());
    if (mode) rows = rows.filter(payment => String(payment.mode || '').toLowerCase() === mode.toLowerCase());
    renderPaymentsTable(rows);
    updatePaymentManagementSummary(rows, selectedMonth || 'All payments');
}

function sortPayments(key) {
    const rows = currentPrintData.payments?.length ? currentPrintData.payments.slice() : allPayments.slice();
    const direction = window.paymentSort?.key === key ? -window.paymentSort.direction : 1;
    window.paymentSort = { key, direction };
    rows.sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || ''), undefined, { numeric: true }) * direction);
    renderPaymentsTable(rows);
    updatePaymentManagementSummary(rows, document.getElementById('filter-month')?.value || 'All payments');
}

function exportPaymentsData() {
    const rows = currentPrintData.payments?.length ? currentPrintData.payments : allPayments;
    const headers = ['Student ID', 'Student', 'Seat', 'Paid Month', 'Payment Date', 'Amount', 'Paid Amount', 'Due Amount', 'Mode', 'Received By', 'Remarks', 'Status'];
    const csv = [headers, ...rows.map(payment => [payment.studentId, payment.studentName, [payment.currentSection, payment.currentSeat].filter(Boolean).join('-'), formatPaymentPeriod(payment), payment.paymentDate, payment.amount, payment.paidAmount, payment.dueAmount, payment.mode, payment.receivedBy, payment.remarks, payment.paymentStatus])]
        .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
}

async function showDueList() {
    const container = document.getElementById('due-list-container');
    if (!container) return;
    try {
        const students = await apiDataManager.students.getAll();
        const payments = await apiDataManager.payments.getAll();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const currentPeriod = now.getFullYear() * 12 + now.getMonth();
        const dueRows = students.map(student => {
            const studentPayments = payments.filter(payment => String(payment.studentId) === String(student.id));
            const periodValue = payment => {
                const numericMonth = Number(payment.month);
                const month = numericMonth >= 1 && numericMonth <= 12 ? numericMonth - 1 : new Date(`${payment.month || 'January'} 1, 2000`).getMonth();
                return (Number(payment.year) || 0) * 12 + month;
            };
            const lastPayment = studentPayments.slice().sort((a, b) => periodValue(b) - periodValue(a) || new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0))[0];
            const dueMonths = lastPayment ? Math.max(currentPeriod - periodValue(lastPayment), 0) : 0;
            const nextDueDate = student.nextDueDate ? new Date(`${String(student.nextDueDate).split('T')[0]}T00:00:00`) : null;
            const daysToDue = nextDueDate && !Number.isNaN(nextDueDate.getTime()) ? Math.ceil((nextDueDate - now) / 86400000) : null;
            return { student, lastPayment, dueMonths, nextDueDate, dueSoon: daysToDue !== null && daysToDue >= 0 && daysToDue <= 7, overdue: daysToDue !== null && daysToDue < 0 };
        }).filter(row => row.dueMonths > 0 || row.dueSoon || row.overdue).sort((a, b) => b.dueMonths - a.dueMonths || Number(a.student.id) - Number(b.student.id));

        if (!dueRows.length) {
            container.innerHTML = '<div class="empty-state">No students are currently due or due within the next 7 days.</div>';
            container.style.display = 'block';
            return;
        }
        container.innerHTML = `
            <div class="dashboard-section" style="margin:0;border:1px solid rgba(0,0,0,.08);">
                <h3 style="margin-top:0;">Due List <small style="font-weight:400;color:#777;">(${dueRows.length} students)</small></h3>
                <div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>ID</th><th>Student</th><th>Seat</th><th>Last Paid Month</th><th>Last Payment Date</th><th>Due Months</th><th>Due Date / Mark</th><th>Remarks</th><th>Actions</th></tr></thead>
                <tbody>${dueRows.map(({ student, lastPayment, dueSoon, overdue, dueMonths, nextDueDate }) => `<tr>
                    <td><strong>${student.id || ''}</strong></td><td>${student.studentName || ''}<br><small>${student.phone || ''}</small></td><td>${[student.currentSection, student.currentSeat].filter(Boolean).join('-') || '—'}</td>
                    <td>${lastPayment ? formatPaymentPeriod(lastPayment) : 'No payment'}</td><td>${lastPayment?.paymentDate || '—'}</td><td>${dueMonths}</td>
                    <td>${nextDueDate ? nextDueDate.toLocaleDateString() : 'Not set'}${dueSoon ? ' <strong style="color:#f57c00;">(within 7 days)</strong>' : overdue ? ' <strong style="color:#e74c3c;">(overdue)</strong>' : ''}</td><td>${lastPayment?.remarks || '—'}</td>
                    <td><button class="btn-small btn-secondary" onclick="viewStudentDetailsById('${student.id}')">Details</button> <button class="btn-small btn-primary" onclick="startPaymentForStudent('${student.id}')">Record</button></td>
                </tr>`).join('')}</tbody></table></div>
            </div>`;
        container.style.display = 'block';
    } catch (error) {
        console.error('Could not build due list:', error);
        container.innerHTML = `<div class="empty-state">Could not load the due list: ${error.message}</div>`;
        container.style.display = 'block';
    }
}

function viewStudentDetailsById(studentId) {
    const lookup = document.getElementById('dashboard-lookup-student');
    const button = document.getElementById('dashboard-lookup-btn');
    if (!lookup || !button) return;
    lookup.value = studentId;
    button.click();
}

function startPaymentForStudent(studentId) {
    const detailModal = document.getElementById('dashboard-student-detail-modal');
    if (detailModal) detailModal.style.display = 'none';
    switchTab('payments');
    const input = document.getElementById('pay-student');
    const button = document.getElementById('pay-lookup-student');
    if (input && button) {
        input.value = studentId;
        button.click();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookings-tbody');
    currentPrintData.bookings = Array.isArray(bookings) ? bookings : [];
    tbody.innerHTML = '';
    
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #999;">No bookings found</td></tr>';
        return;
    }

    bookings.forEach(booking => {
        const badgeClass = booking.status === 'Pending' ? 'badge-warning' : booking.status === 'Approved' ? 'badge-success' : 'badge-danger';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${booking.name || '—'}</strong></td>
            <td>${booking.phone || '—'}</td>
            <td>${booking.purpose || '—'}</td>
            <td>${booking.requestedSection || '—'}</td>
            <td><span class="badge ${badgeClass}">${booking.status || '—'}</span></td>
            <td>
                ${booking.status === 'Pending' ? `
                    <button class="btn-small btn-primary" onclick="approveBooking('${booking.bookingId}')">Approve</button>
                    <button class="btn-small btn-danger" onclick="rejectBooking('${booking.bookingId}')">Reject</button>
                ` : '—'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== Utility Actions (filters, export, print, sort) ====================

async function applyStudentFilters() {
    if (!canUseRemoteApi()) return alert('Google Sheets API is not available.');
    try {
        const response = await apiClient.request('listStudents', {}, { method: 'POST' });
        allStudents = response.students || [];
        studentFiltersApplied = true;
    } catch (error) {
        console.error('Could not load students:', error);
        return alert(`Could not load students: ${error.message}`);
    }
    const q = (document.getElementById('search-students')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filter-status')?.value || '';
    const section = document.getElementById('filter-section')?.value || '';
    const seat = (document.getElementById('filter-seat')?.value || '').trim();
    const seatType = document.getElementById('filter-seat-type')?.value || '';
    const payment = document.getElementById('filter-payment')?.value || '';

    let list = Array.isArray(allStudents) ? allStudents.slice() : [];
    if (status) list = list.filter(s => String(s.status||'').toLowerCase() === status.toLowerCase());
    if (section) list = list.filter(s => String((s.currentSection||s.section||'')).toUpperCase() === String(section).toUpperCase());
    if (seat) list = list.filter(s => String(s.currentSeat||s.seatAllocated||'').includes(seat));
    if (seatType) list = list.filter(s => String(s.seatType||'').toLowerCase() === seatType.toLowerCase());
    if (payment) list = list.filter(s => String(s.paymentStatus||'').toLowerCase() === payment.toLowerCase());
    if (q) list = list.filter(s => (s.studentName||'').toLowerCase().includes(q) || (s.phone||'').includes(q) || (s.adharNumber||'').includes(q));

    renderStudentsTable(list);
}

function exportStudentsData() {
    if (!studentFiltersApplied) return alert('Click Apply Filters before exporting student records.');
    const rows = currentPrintData.students && currentPrintData.students.length ? currentPrintData.students : allStudents;
    const headers = ['ID','Name','Phone','Section','Seat','Status','Aadhaar','DOB','JoinDate','Address'];
    let csv = headers.join(',') + '\n';
    (rows || []).forEach(s => {
        const row = [
            `"${(String(s.id || '')).replace(/"/g,'""')}"`,
            `"${(s.studentName||'').replace(/"/g,'""')}"`,
            `"${(s.phone||'').replace(/"/g,'""')}"`,
            `"${(s.currentSection||s.section||'').replace(/"/g,'""')}"`,
            `"${(s.currentSeat||s.seatAllocated||'').replace(/"/g,'""')}"`,
            `"${(s.status||'').replace(/"/g,'""')}"`,
            `"${(s.adharNumber||'').replace(/"/g,'""')}"`,
            `"${(s.dob||'').replace(/"/g,'""')}"`,
            `"${(s.joinDate||'').replace(/"/g,'""')}"`,
            `"${(s.address||'').replace(/"/g,'""')}"`
        ];
        csv += row.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `students-export-${new Date().toISOString().split('T')[0]}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function printCurrentView(viewName) {
    let rows = [];
    let title = 'Report';
    if (viewName === 'students') { rows = currentPrintData.students; title = 'Students'; }
    else if (viewName === 'deleted') { rows = currentPrintData.deletedStudents; title = 'Deleted Students'; }
    else if (viewName === 'payments') { rows = currentPrintData.payments; title = 'Payments'; }
    else if (viewName === 'bookings') { rows = currentPrintData.bookings; title = 'Bookings'; }
    else if (viewName === 'notices') { rows = currentPrintData.notices; title = 'Notices'; }
    else { rows = []; }

    const printWindow = window.open('', '_blank');
    const isStudentList = viewName === 'students';
    const headers = viewName === 'payments'
        ? ['ID','Seat','Paid Month','Student','Date','Amount','Paid','Due','Mode','Status']
        : isStudentList
            ? ['ID','Name','Phone','Section','Seat','Status']
            : ['Name','Phone','Section','Seat','Status','Payment'];
    const rowsHtml = (rows || []).map(r => {
        if (viewName === 'payments') return `<tr><td>${r.studentId||''}</td><td>${[r.currentSection,r.currentSeat].filter(Boolean).join('-')}</td><td>${formatPaymentPeriod(r)}</td><td>${r.studentName||''}</td><td>${r.paymentDate||''}</td><td>₹${r.amount||0}</td><td>₹${r.paidAmount||0}</td><td>₹${r.dueAmount ?? 0}</td><td>${r.mode||''}</td><td>${r.paymentStatus||''}</td></tr>`;
        if (isStudentList) return `<tr><td>${r.id||''}</td><td>${r.studentName||''}</td><td>${r.phone||''}</td><td>${r.currentSection||r.section||''}</td><td>${r.currentSeat||r.seatAllocated||''}</td><td>${r.status||''}</td></tr>`;
        return `<tr><td>${r.studentName||''}</td><td>${r.phone||''}</td><td>${r.currentSection||r.section||''}</td><td>${r.currentSeat||r.seatAllocated||''}</td><td>${r.status||''}</td><td>${r.paymentStatus||''}</td></tr>`;
    }).join('\n');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial;color:#333;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}</style></head><body><h2>${title}</h2><p>Printed on ${new Date().toLocaleString()}</p><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

let currentSort = { key: null, dir: 1 };
function sortStudents(key) {
    if (!key) return;
    if (!studentFiltersApplied) return alert('Click Apply Filters before sorting student records.');
    if (currentSort.key === key) currentSort.dir = -currentSort.dir; else { currentSort.key = key; currentSort.dir = 1; }
    allStudents.sort((a,b)=>{
        const va = (a[key] || '').toString().toLowerCase();
        const vb = (b[key] || '').toString().toLowerCase();
        if (va < vb) return -1 * currentSort.dir; if (va > vb) return 1 * currentSort.dir; return 0;
    });
    renderStudentsTable(allStudents);
}

function toggleStudentPhotos() {
    if (!studentFiltersApplied) return alert('Click Apply Filters before showing student photos.');
    showStudentPhotos = !showStudentPhotos;
    const btn = document.getElementById('toggle-photos-btn');
    const heading = document.getElementById('students-photo-heading');
    if (btn) btn.textContent = showStudentPhotos ? '🖼️ Hide Photos' : '🖼️ Show Photos';
    if (heading) heading.style.display = showStudentPhotos ? 'table-cell' : 'none';
    renderStudentsTable(allStudents);
}


// Expose key functions to global scope for inline `onclick` handlers in HTML
try {
    window.switchTab = switchTab;
    window.setSeatMatrixView = setSeatMatrixView;
    window.setSeatMatrixSection = setSeatMatrixSection;
    window.toggleSeatMatrixPhotos = toggleSeatMatrixPhotos;
    window.printSeatMatrix = printSeatMatrix;
    window.applyDeletedFilters = applyDeletedFilters;
    window.toggleDeletedStudentPhotos = toggleDeletedStudentPhotos;
    window.sortDeletedStudents = sortDeletedStudents;
    window.exportDeletedStudentsData = exportDeletedStudentsData;
    window.deleteStudent = async function(id) {
        if (!id) return;
        if (!confirm('Delete this student record?')) return;
        try {
            if (canUseRemoteApi()) {
                await apiClient.request('deleteStudent', { id });
                await loadStudentsData();
                alert('Student deleted from server.');
                return;
            } else {
                alert('API not available: cannot delete student.');
                return;
            }
        } catch (err) {
            console.error('Failed to delete student on server:', err);
            alert('Failed to delete student on server. See console for details.');
            return;
        }
    };

    window.restoreStudent = async function(id) {
        if (!id) return;
        try {
            if (canUseRemoteApi()) {
                const res = await apiClient.request('restoreStudent', { id });
                await loadDeletedStudentsData();
                await loadStudentsData();
                alert('Student restored on server.');
                return;
            }
        } catch (err) {
            console.warn('Server restore failed', err);
            alert('Restore failed on server. See console for details.');
            return;
        }
    };

    window.approveBooking = async function(bookingId) {
        if (!bookingId) return;
        if (!confirm('Approve this booking?')) return;
        try {
            if (canUseRemoteApi()) {
                await apiClient.request('approveBooking', { bookingId });
                await loadBookingsData();
                alert('Booking approved.');
                return;
            }
        } catch (err) {
            console.warn('Approve booking failed', err);
        }
        alert('Could not approve booking (server unavailable).');
    };

    window.rejectBooking = async function(bookingId) {
        if (!bookingId) return;
        const reason = prompt('Reason for rejection (optional)');
        try {
            if (canUseRemoteApi()) {
                await apiClient.request('rejectBooking', { bookingId, reason });
                await loadBookingsData();
                alert('Booking rejected.');
                return;
            }
        } catch (err) {
            console.warn('Reject booking failed', err);
        }
        alert('Could not reject booking (server unavailable).');
    };
} catch (e) {
    console.warn('Could not expose globals for admin-dashboard:', e);
}

// ==================== Student Registration ====================
// The dashboard form must explicitly submit to the API; without this listener the
// browser reloads and no student is sent to Google Sheets.
(function() {
    const studentForm = document.getElementById('student-form');
    const photoInput = document.getElementById('student-photo');
    const photoPreview = document.getElementById('student-photo-preview');

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read the selected photo.'));
            reader.readAsDataURL(file);
        });
    }

    photoInput?.addEventListener('change', async () => {
        const file = photoInput.files?.[0];
        selectedStudentPhotoData = '';
        if (!file) {
            if (photoPreview) photoPreview.style.display = 'none';
            return;
        }
        try {
            selectedStudentPhotoData = await readFileAsDataUrl(file);
            if (photoPreview) {
                photoPreview.innerHTML = `<img src="${selectedStudentPhotoData}" alt="Selected student photo" style="width:90px;height:90px;object-fit:cover;border-radius:8px;">`;
                photoPreview.style.display = 'block';
            }
        } catch (error) {
            console.error('Could not preview student photo:', error);
            alert(error.message);
        }
    });

    studentForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!canUseRemoteApi()) return alert('Google Sheets API is not available. Please check the API status.');

        const student = {
            studentName: document.getElementById('student-name').value.trim(),
            phone: document.getElementById('student-phone').value.trim(),
            adharNumber: document.getElementById('student-adhar').value.trim(),
            fatherName: document.getElementById('student-father').value.trim(),
            parentPhone: document.getElementById('student-parent-phone').value.trim(),
            gender: document.getElementById('student-gender').value,
            dob: document.getElementById('student-dob').value,
            joinDate: document.getElementById('student-join-date').value,
            monthlyFee: document.getElementById('student-monthly-fee').value,
            nextDueDate: document.getElementById('student-next-due-date').value,
            address: document.getElementById('student-address').value.trim(),
            examPreparation: document.getElementById('student-exam').value.trim(),
            currentSection: document.getElementById('student-section').value,
            currentSeat: document.getElementById('student-seat').value.trim(),
            seatType: document.getElementById('student-seat-type').value,
            status: document.getElementById('student-status').value,
            paymentStatus: document.getElementById('student-payment-status').value,
            dueAmount: document.getElementById('student-due').value || '0'
        };
        if (!student.studentName || !student.currentSection || !student.currentSeat || !student.joinDate || Number(student.monthlyFee) <= 0) {
            return alert('Student name, joining date, monthly fee, section, and seat number are required.');
        }

        try {
            const latestStudents = await apiDataManager.students.getAll();
            const seatAssignees = latestStudents.filter(item =>
                String(item.currentSection || '').toUpperCase() === student.currentSection.toUpperCase() &&
                String(item.currentSeat || '').trim() === student.currentSeat
            );
            if (seatAssignees.length && String(student.seatType).toLowerCase() === 'fixed') {
                const assigned = seatAssignees.map(item => `ID ${item.id}: ${item.studentName || 'Unnamed'}`).join(', ');
                return alert(`Fixed seat ${student.currentSection}-${student.currentSeat} is already assigned to ${assigned}. Choose another seat or select Flexible.`);
            }
            if (seatAssignees.length && String(student.seatType).toLowerCase() === 'flexible') {
                const assigned = seatAssignees.map(item => `ID ${item.id}: ${item.studentName || 'Unnamed'}`).join('\n');
                if (!confirm(`Seat ${student.currentSection}-${student.currentSeat} already has these students:\n${assigned}\n\nDo you still want to allot this Flexible seat?`)) return;
            }

            const selectedPhoto = photoInput?.files?.[0];
            if (selectedPhoto && selectedStudentPhotoData) {
                const upload = await apiClient.uploadStudentPhoto(selectedPhoto.name, selectedStudentPhotoData, selectedPhoto.type);
                student.photoDriveUrl = upload.photoDriveUrl || upload.webViewLink || '';
            }

            const response = await apiDataManager.students.create(student);
            if (!response?.student?.id) throw new Error('The server did not return a student ID.');

            alert(`Student saved successfully. Assigned ID: ${response.student.id}`);
            studentForm.reset();
            selectedStudentPhotoData = '';
            if (photoPreview) {
                photoPreview.innerHTML = '';
                photoPreview.style.display = 'none';
            }
            await Promise.all([loadStudentsData(), loadDashboardData()]);
        } catch (error) {
            console.error('Student registration failed:', error);
            alert(`Could not save the student: ${error.message}`);
        }
    });
})();

// ==================== Edit Student ====================
(function() {
    const modal = document.getElementById('edit-student-modal');
    const form = document.getElementById('edit-student-form');
    const closeButton = document.getElementById('edit-student-close');
    const cancelButton = document.getElementById('edit-student-cancel');

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value ?? '';
    }
    function asDateInput(value) {
        return value ? String(value).split('T')[0] : '';
    }
    function closeModal() {
        if (modal) modal.style.display = 'none';
    }
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read the selected photo.'));
            reader.readAsDataURL(file);
        });
    }

    window.editStudent = async function(id) {
        try {
            const students = await apiDataManager.students.getAll();
            const student = students.find(item => String(item.id) === String(id));
            if (!student) return alert('Student not found.');
            setValue('edit-id', student.id); setValue('edit-name', student.studentName); setValue('edit-phone', student.phone);
            setValue('edit-adhar', student.adharNumber); setValue('edit-email', student.email); setValue('edit-father', student.fatherName);
            setValue('edit-parent-phone', student.parentPhone); setValue('edit-gender', student.gender); setValue('edit-dob', asDateInput(student.dob));
            setValue('edit-join-date', asDateInput(student.joinDate)); setValue('edit-monthly-fee', student.monthlyFee); setValue('edit-next-due-date', asDateInput(student.nextDueDate));
            setValue('edit-address', student.address); setValue('edit-exam', student.examPreparation); setValue('edit-section', student.currentSection);
            setValue('edit-seat', student.currentSeat); setValue('edit-seat-type', student.seatType || 'Fixed'); setValue('edit-status', student.status || 'Active');
            setValue('edit-payment-status', student.paymentStatus || 'Not Paid'); setValue('edit-due', student.dueAmount || '0'); setValue('edit-photo', '');
            modal.style.display = 'flex';
        } catch (error) {
            console.error('Could not open student editor:', error);
            alert(`Could not load student details: ${error.message}`);
        }
    };

    closeButton?.addEventListener('click', closeModal);
    cancelButton?.addEventListener('click', closeModal);
    modal?.addEventListener('click', event => { if (event.target === modal) closeModal(); });

    form?.addEventListener('submit', async event => {
        event.preventDefault();
        const student = {
            id: document.getElementById('edit-id').value,
            studentName: document.getElementById('edit-name').value.trim(), phone: document.getElementById('edit-phone').value.trim(),
            adharNumber: document.getElementById('edit-adhar').value.trim(), email: document.getElementById('edit-email').value.trim(),
            fatherName: document.getElementById('edit-father').value.trim(), parentPhone: document.getElementById('edit-parent-phone').value.trim(),
            gender: document.getElementById('edit-gender').value, dob: document.getElementById('edit-dob').value, joinDate: document.getElementById('edit-join-date').value,
            monthlyFee: document.getElementById('edit-monthly-fee').value, nextDueDate: document.getElementById('edit-next-due-date').value,
            address: document.getElementById('edit-address').value.trim(), examPreparation: document.getElementById('edit-exam').value.trim(),
            currentSection: document.getElementById('edit-section').value, currentSeat: document.getElementById('edit-seat').value.trim(), seatType: document.getElementById('edit-seat-type').value,
            status: document.getElementById('edit-status').value, paymentStatus: document.getElementById('edit-payment-status').value, dueAmount: document.getElementById('edit-due').value || '0'
        };
        if (!student.studentName || !student.joinDate || Number(student.monthlyFee) <= 0 || !student.currentSection || !student.currentSeat) return alert('Name, joining date, monthly fee, section, and seat are required.');
        try {
            const students = await apiDataManager.students.getAll();
            const assignees = students.filter(item => String(item.id) !== String(student.id) && String(item.currentSection || '').toUpperCase() === student.currentSection.toUpperCase() && String(item.currentSeat || '').trim() === student.currentSeat);
            if (assignees.length && String(student.seatType).toLowerCase() === 'fixed') return alert(`Fixed seat ${student.currentSection}-${student.currentSeat} is already assigned to ${assignees.map(item => `ID ${item.id}: ${item.studentName}`).join(', ')}.`);
            if (assignees.length && String(student.seatType).toLowerCase() === 'flexible' && !confirm(`This Flexible seat already has:\n${assignees.map(item => `ID ${item.id}: ${item.studentName}`).join('\n')}\n\nContinue with this allocation?`)) return;

            const photo = document.getElementById('edit-photo').files?.[0];
            if (photo) {
                const upload = await apiClient.uploadStudentPhoto(photo.name, await readFile(photo), photo.type);
                student.photoDriveUrl = upload.photoDriveUrl || upload.webViewLink || '';
            }
            const response = await apiDataManager.students.update(student);
            if (!response?.student?.id) throw new Error('The server did not confirm the update.');
            alert(`Student ID ${response.student.id} updated successfully.`);
            closeModal();
            if (studentFiltersApplied) await applyStudentFilters();
        } catch (error) {
            console.error('Student update failed:', error);
            alert(`Could not update student: ${error.message}`);
        }
    });
})();

// ==================== Quick Payment Recording ====================
(function() {
    const quickPaymentForm = document.getElementById('payment-form');
    const studentInput = document.getElementById('pay-student');
    const lookupButton = document.getElementById('pay-lookup-student');
    const photoButton = document.getElementById('pay-show-photo');
    const photoContainer = document.getElementById('pay-photo-container');
    let selectedPaymentStudent = null;
    let selectedPaymentBilling = null;

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value || '—';
    }

    function getPhotoUrl(url) {
        const value = String(url || '');
        const match = value.match(/[?&]id=([^&]+)/) || value.match(/\/d\/([^/]+)/);
        return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : value;
    }

    function getPhotoThumbnailUrl(url) {
        const value = String(url || '');
        const match = value.match(/[?&]id=([^&]+)/) || value.match(/\/d\/([^/]+)/);
        return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500` : value;
    }

    function populateStudentDetails(student, billing) {
        selectedPaymentStudent = student;
        selectedPaymentBilling = billing;
        setText('pay-student-name', student.studentName);
        setText('pay-father-name', student.fatherName);
        setText('pay-joining-date', student.joinDate);
        setText('pay-seat-number', [student.currentSection, student.currentSeat].filter(Boolean).join('-'));
        document.getElementById('pay-amount').value = '';
        document.getElementById('pay-due').value = '';
        document.getElementById('pay-next-due-date').value = student.nextDueDate || '';
        if (photoButton) photoButton.disabled = !student.photoDriveUrl;
    }

    function updateDuePreview() {
        const note = document.getElementById('pay-due-note');
        if (note) note.textContent = 'Enter 0 for a full payment, or the remaining amount for a partial payment.';
    }

    async function lookupPaymentStudent(showError = true) {
        const query = studentInput?.value.trim();
        if (!query) {
            if (showError) alert('Enter a Student ID first.');
            return null;
        }
        const students = await apiDataManager.students.getAll();
        const matches = students.filter(student => String(student.id) === query);
        if (matches.length !== 1) {
            selectedPaymentStudent = null;
            setText('pay-student-name', 'Student not found');
            setText('pay-father-name', '—');
            setText('pay-joining-date', '—');
            setText('pay-seat-number', '—');
            if (photoButton) photoButton.disabled = true;
            if (photoContainer) { photoContainer.innerHTML = ''; photoContainer.style.display = 'none'; }
            const note = document.getElementById('pay-due-note');
            if (note) note.textContent = 'Find a student, then enter the remaining due manually.';
            if (showError) alert('Student ID not found. Please enter the exact ID from the Students list.');
            return null;
        }
        const payments = await apiDataManager.payments.getByStudentId(matches[0].id);
        populateStudentDetails(matches[0], calculatePaymentBilling(matches[0], payments));
        return matches[0];
    }

    const today = new Date();
    const monthField = document.getElementById('pay-month');
    const yearField = document.getElementById('pay-year');
    if (monthField) monthField.value = String(today.getMonth() + 1);
    if (yearField) yearField.value = String(today.getFullYear());
    if (document.getElementById('pay-collection-date')) document.getElementById('pay-collection-date').value = today.toISOString().split('T')[0];
    if (document.getElementById('pay-received-by')) document.getElementById('pay-received-by').value = session?.username || '';

    lookupButton?.addEventListener('click', async () => {
        try {
            await lookupPaymentStudent();
        } catch (error) {
            console.error('Student lookup failed:', error);
            alert(`Could not load student details: ${error.message}`);
        }
    });
    photoButton?.addEventListener('click', () => {
        if (!selectedPaymentStudent?.photoDriveUrl || !photoContainer) return;
        const visible = photoContainer.style.display === 'block';
        photoContainer.style.display = visible ? 'none' : 'block';
        if (!visible) photoContainer.innerHTML = `<img src="${getPhotoUrl(selectedPaymentStudent.photoDriveUrl)}" onerror="this.onerror=null;this.src='${getPhotoThumbnailUrl(selectedPaymentStudent.photoDriveUrl)}';" alt="${selectedPaymentStudent.studentName || 'Student'}" style="width:130px;height:130px;object-fit:cover;border-radius:10px;border:2px solid #667eea;">`;
    });
    studentInput?.addEventListener('change', () => {
        lookupPaymentStudent(false).catch(error => console.error('Student lookup failed:', error));
    });
    document.getElementById('pay-amount')?.addEventListener('input', updateDuePreview);

    quickPaymentForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!canUseRemoteApi()) return alert('Google Sheets API is not available. Please check the API status.');

        const paidAmount = Number(document.getElementById('pay-amount').value);
        const dueAmount = Number(document.getElementById('pay-due').value);
        const mode = document.getElementById('pay-mode').value;
        const paymentMonth = Number(monthField?.value);
        const paymentYear = Number(yearField?.value);
        const collectionDate = document.getElementById('pay-collection-date').value;
        if (!Number.isFinite(paidAmount) || paidAmount <= 0 || !Number.isFinite(dueAmount) || dueAmount < 0 || !collectionDate || !mode || paymentMonth < 1 || paymentMonth > 12 || paymentYear < 2020) {
            return alert('Enter a collection date, valid paid and remaining-due amounts, payment month/year, and payment mode.');
        }

        try {
            const student = selectedPaymentStudent && String(selectedPaymentStudent.id) === studentInput.value.trim()
                ? selectedPaymentStudent
                : await lookupPaymentStudent();
            if (!student) return;
            const response = await apiDataManager.payments.create({
                studentId: student.id,
                studentName: student.studentName || '',
                fatherName: student.fatherName || '',
                joinDate: student.joinDate || '',
                currentSection: student.currentSection || '',
                currentSeat: student.currentSeat || '',
                paymentDate: collectionDate,
                month: String(paymentMonth),
                year: String(paymentYear),
                amount: paidAmount + dueAmount,
                paidAmount,
                dueAmount,
                nextDueDate: document.getElementById('pay-next-due-date').value,
                paymentStatus: dueAmount === 0 ? 'Paid' : 'Partial',
                mode,
                receivedBy: document.getElementById('pay-received-by').value.trim() || session?.username || '',
                remarks: document.getElementById('pay-remarks').value.trim()
            });
            if (!response?.payment?.paymentId) throw new Error('The server did not return a payment ID.');

            alert(`Payment saved successfully. Receipt ID: ${response.payment.paymentId}`);
            quickPaymentForm.reset();
            selectedPaymentStudent = null;
            selectedPaymentBilling = null;
            if (photoButton) photoButton.disabled = true;
            if (photoContainer) { photoContainer.innerHTML = ''; photoContainer.style.display = 'none'; }
            setText('pay-student-name', '—');
            setText('pay-father-name', '—');
            setText('pay-joining-date', '—');
            setText('pay-seat-number', '—');
            if (monthField) monthField.value = String(today.getMonth() + 1);
            if (yearField) yearField.value = String(today.getFullYear());
            if (document.getElementById('pay-collection-date')) document.getElementById('pay-collection-date').value = today.toISOString().split('T')[0];
            if (document.getElementById('pay-received-by')) document.getElementById('pay-received-by').value = session?.username || '';
            await Promise.all([loadPaymentsData(), loadStudentsData(), loadDashboardData()]);
        } catch (error) {
            console.error('Quick payment recording failed:', error);
            alert(`Could not save the payment: ${error.message}`);
        }
    });
})();

// Student Detail Modal for Dashboard
(function() {
    const lookupBtn = document.getElementById('dashboard-lookup-btn');
    const lookupInput = document.getElementById('dashboard-lookup-student');
    const detailModal = document.getElementById('dashboard-student-detail-modal');
    const detailModalClose = document.getElementById('dashboard-detail-modal-close');
    const detailContent = document.getElementById('dashboard-student-detail-content');

    function formatCurrency(amount) {
        return '₹' + (parseFloat(amount) || 0).toFixed(2);
    }

    function getStatusBadge(status) {
        const statusMap = {
            'Active': { bg: 'rgba(76,175,80,0.2)', color: '#2e7d32', label: '✓ Active' },
            'Inactive': { bg: 'rgba(244,67,54,0.2)', color: '#c62828', label: '✗ Inactive' },
            'Paid': { bg: 'rgba(76,175,80,0.2)', color: '#2e7d32', label: '✓ Paid' },
            'Pending': { bg: 'rgba(255,193,7,0.2)', color: '#f57f17', label: '⏱ Pending' },
            'Partial': { bg: 'rgba(33,150,243,0.2)', color: '#1565c0', label: '◐ Partial' },
            'Overdue': { bg: 'rgba(244,67,54,0.2)', color: '#c62828', label: '⚠ Overdue' }
        };
        const info = statusMap[status] || { bg: 'rgba(0,0,0,0.1)', color: '#666', label: status };
        return info;
    }

    function calculateStudentBilling(student, payments) {
        const monthlyFee = Number(student.monthlyFee);
        const joinDate = student.joinDate ? new Date(`${String(student.joinDate).split('T')[0]}T00:00:00`) : null;
        if (!Number.isFinite(monthlyFee) || monthlyFee <= 0 || !joinDate || Number.isNaN(joinDate.getTime())) {
            return { configured: false, status: 'Not Due Yet', expected: 0, paid: 0, balance: 0, nextDueDate: null };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let completedMonths = (today.getFullYear() - joinDate.getFullYear()) * 12 + today.getMonth() - joinDate.getMonth();
        if (today.getDate() < joinDate.getDate()) completedMonths--;
        completedMonths = Math.max(completedMonths, 0);

        const expected = completedMonths * monthlyFee;
        const paid = payments.reduce((total, payment) => total + (Number(payment.paidAmount) || 0), 0);
        const balance = expected - paid;
        const nextDueDate = new Date(joinDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + completedMonths + 1);
        const status = balance > 0 ? 'Due' : balance < 0 ? 'Advance' : completedMonths === 0 ? 'Not Due Yet' : 'Paid';
        return { configured: true, status, expected, paid, balance, nextDueDate, monthlyFee, completedMonths };
    }

    function getPhotoImageUrls(url) {
        const value = String(url || '');
        const idMatch = value.match(/[?&]id=([^&]+)/) || value.match(/\/d\/([^/]+)/);
        if (!idMatch) return { primary: value, fallback: '' };
        const id = encodeURIComponent(idMatch[1]);
        return {
            primary: `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
            fallback: `https://drive.google.com/uc?export=view&id=${id}`
        };
    }

    async function displayStudentDetail(student) {
        window.currentDashboardStudent = student;
        let payments = [];
        try {
            payments = await apiDataManager.payments.getByStudentId(student.id);
        } catch (error) {
            console.error('Could not load student payment history:', error);
        }
        payments.sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0));
        const billing = calculateStudentBilling(student, payments);
        
        const statusInfo = getStatusBadge(student.status || 'Active');
        const paymentStatusInfo = getStatusBadge(billing.status);

        let paymentHistoryHTML = '';
        if (payments && payments.length > 0) {
            paymentHistoryHTML = `
                <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; color: #2c3e50; margin-bottom: 16px;">💳 Payment History</h3>
                    <div style="display: grid; gap: 12px;">
                        ${payments.map((p, idx) => {
                            const pStatusInfo = getStatusBadge(p.paymentStatus || 'Pending');
                            return `
                                <div style="background: #f8f9fa; border-left: 4px solid ${pStatusInfo.color}; padding: 14px 16px; border-radius: 8px; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px;">
                                    <div>
                                        <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Date</div>
                                        <div style="font-weight: 600; color: #2c3e50;">${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Amount</div>
                                        <div style="font-weight: 600; color: #667eea;">${formatCurrency(p.paidAmount)}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Status</div>
                                        <div style="padding: 4px 10px; background: ${pStatusInfo.bg}; color: ${pStatusInfo.color}; border-radius: 6px; display: inline-block; font-size: 0.8rem; font-weight: 600;">${pStatusInfo.label}</div>
                                    </div>
                                    <div>
                                        <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Invoice</div>
                                        <div style="font-weight: 600; color: #2c3e50;">${p.invoiceNumber || 'N/A'}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } else {
            paymentHistoryHTML = `
                <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; color: #2c3e50; margin-bottom: 16px;">💳 Payment History</h3>
                    <div style="text-align: center; padding: 28px 20px; background: #f8f9fa; border-radius: 10px; color: #999;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">📋</div>
                        <p style="margin: 0;">No payment records found</p>
                    </div>
                </div>
            `;
        }

        const photoUrls = getPhotoImageUrls(student.photoDriveUrl);
        const profilePhoto = student.photoDriveUrl
            ? `<img src="${photoUrls.primary}" data-fallback="${photoUrls.fallback}" onerror="if(this.dataset.fallback){this.onerror=function(){this.style.display='none';};this.src=this.dataset.fallback;}else{this.style.display='none';}" alt="${student.studentName || 'Student'}" style="width:108px;height:108px;flex:0 0 108px;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,0.72);background:#fff;">`
            : `<div style="width:108px;height:108px;flex:0 0 108px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,0.18);font-size:1.5rem;">Student</div>`;

        detailContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                <!-- Left Column: Basic Info -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px;">
                    <div style="margin-bottom: 16px; display:flex; gap:16px; align-items:center;">
                        ${profilePhoto}
                        <div><div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 4px;">Student Name · ID ${student.id || 'N/A'}</div><div style="font-size: 1.4rem; font-weight: 700;">${student.studentName || 'N/A'}</div></div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 4px; text-transform: uppercase;">Phone</div>
                                <div style="font-weight: 600;">${student.phone || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; opacity: 0.9; margin-bottom: 4px; text-transform: uppercase;">Status</div>
                                <div style="padding: 4px 10px; background: rgba(255,255,255,0.2); border-radius: 6px; display: inline-block; font-weight: 600;">${statusInfo.label}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Key Metrics -->
                <div style="display: grid; grid-template-rows: auto auto; gap: 12px;">
                    <div style="background: linear-gradient(135deg, ${paymentStatusInfo.color}22 0%, ${paymentStatusInfo.color}11 100%); border-left: 4px solid ${paymentStatusInfo.color}; padding: 16px; border-radius: 10px;">
                        <div style="font-size: 0.85rem; color: #999; margin-bottom: 6px; font-weight: 600;">Payment Status</div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 1.1rem; font-weight: 700; color: ${paymentStatusInfo.color};">${paymentStatusInfo.label}</span>
                            <span style="font-size: 1.2rem; font-weight: 700; color: ${paymentStatusInfo.color};">${formatCurrency(Math.abs(billing.balance || 0))}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #999; margin-top: 6px;">${billing.status === 'Advance' ? 'Advance Balance' : billing.status === 'Not Due Yet' ? 'First payment due after one month' : 'Due Amount'}</div>
                    </div>
                    <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 16px; border-radius: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #999; font-weight: 600; margin-bottom: 4px; text-transform: uppercase;">Seat</div>
                                <div style="font-weight: 700; color: #2c3e50; font-size: 1rem;">${[student.currentSection, student.currentSeat].filter(Boolean).join('-') || student.seatAllocated || 'N/A'}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; color: #999; font-weight: 600; margin-bottom: 4px; text-transform: uppercase;">Seat Type</div>
                                <div style="font-weight: 700; color: #2c3e50; font-size: 1rem;">${student.seatType || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Full Width Details -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px;">
                <div style="background: #f8f9fa; padding: 14px; border-radius: 10px; border-left: 3px solid #667eea;">
                    <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Aadhaar Number</div>
                    <div style="font-weight: 600; color: #2c3e50;">${student.adharNumber || 'N/A'}</div>
                </div>
                <div style="background: #f8f9fa; padding: 14px; border-radius: 10px; border-left: 3px solid #667eea;">
                    <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Date of Birth</div>
                    <div style="font-weight: 600; color: #2c3e50;">${student.dob || 'N/A'}</div>
                </div>
                <div style="background: #f8f9fa; padding: 14px; border-radius: 10px; border-left: 3px solid #667eea;">
                    <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Joining Date</div>
                    <div style="font-weight: 600; color: #2c3e50;">${student.joinDate || 'N/A'}</div>
                </div>
                <div style="background: #f8f9fa; padding: 14px; border-radius: 10px; border-left: 3px solid #667eea;">
                    <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Exam Preparation</div>
                    <div style="font-weight: 600; color: #2c3e50;">${student.examPreparation || 'N/A'}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px;">
                <div style="background:#f8f9fa;padding:14px;border-radius:10px;border-left:3px solid #667eea;"><div style="font-size:.75rem;color:#999;font-weight:600;text-transform:uppercase;margin-bottom:4px;">Monthly Fee</div><div style="font-weight:700;color:#2c3e50;">${billing.configured ? formatCurrency(billing.monthlyFee) : 'Not set'}</div></div>
                <div style="background:#f8f9fa;padding:14px;border-radius:10px;border-left:3px solid #667eea;"><div style="font-size:.75rem;color:#999;font-weight:600;text-transform:uppercase;margin-bottom:4px;">Expected Until Today</div><div style="font-weight:700;color:#2c3e50;">${billing.configured ? formatCurrency(billing.expected) : '—'}</div></div>
                <div style="background:#f8f9fa;padding:14px;border-radius:10px;border-left:3px solid #667eea;"><div style="font-size:.75rem;color:#999;font-weight:600;text-transform:uppercase;margin-bottom:4px;">Total Paid</div><div style="font-weight:700;color:#2c3e50;">${formatCurrency(billing.paid)}</div></div>
                <div style="background:#f8f9fa;padding:14px;border-radius:10px;border-left:3px solid #667eea;"><div style="font-size:.75rem;color:#999;font-weight:600;text-transform:uppercase;margin-bottom:4px;">Next Due Date</div><div style="font-weight:700;color:#2c3e50;">${billing.nextDueDate ? billing.nextDueDate.toLocaleDateString() : 'Set fee & joining date'}</div></div>
            </div>

            <!-- Address -->
            <div style="background: #f8f9fa; padding: 14px; border-radius: 10px; border-left: 3px solid #667eea; margin-bottom: 24px;">
                <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Address</div>
                <div style="font-weight: 600; color: #2c3e50; line-height: 1.5;">${student.address || 'N/A'}</div>
            </div>

            ${paymentHistoryHTML}

            <!-- Action Buttons -->
            <div style="display: flex; gap: 10px; margin-top: 24px; padding-top: 24px; border-top: 2px solid rgba(0,0,0,0.05);">
                <button onclick="startPaymentForStudent('${student.id}')" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Record Payment</button>
                <button onclick="window.printDashboardStudentDetails(window.currentDashboardStudent)" style="flex: 1; padding: 12px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">🖨️ Print Details</button>
                <button type="button" onclick="document.getElementById('dashboard-student-detail-modal').style.display='none'" style="flex: 1; padding: 12px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
            </div>
        `;

        detailModal.style.display = 'flex';
    }

    async function handleStudentLookup() {
        const query = (lookupInput.value || '').trim();
        if (!query) return alert('Please enter a student ID, name, or phone number');

        try {
            // Get students from API
            const students = await apiDataManager.students.getAll();
            
            if (!students.length) {
                return alert('❌ No students found in database. Please check API configuration.');
            }

            let student = null;
            const queryNum = parseInt(query, 10);

            // Try exact numeric ID match first (both string and numeric comparison)
            student = students.find(s => {
                const studentId = parseInt(s.id, 10);
                return studentId === queryNum || String(s.id) === query;
            });

            // If not found, try to match by name or phone
            if (!student) {
                const lowerQuery = query.toLowerCase();
                student = students.find(s => 
                    (s.studentName && s.studentName.toLowerCase().includes(lowerQuery)) ||
                    (s.phone && s.phone.includes(query))
                );
            }

            if (!student) return alert('❌ Student not found. Please check the ID, name, or phone number.');

            await displayStudentDetail(student);
        } catch (error) {
            console.error('❌ Search error:', error);
            alert('❌ Error searching student. Check API configuration and console.');
        }
    }

    window.printDashboardStudentDetails = function(studentData) {
        if (!studentData) return alert('Student data not found');
        const statusBadge = getStatusBadge(studentData.status || 'Active');
        const paymentStatusBadge = getStatusBadge(studentData.paymentStatus || 'Pending');

        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Please allow pop-ups to print student details.');
        const photoUrls = getPhotoImageUrls(studentData.photoDriveUrl);
        const printPhoto = studentData.photoDriveUrl
            ? `<img class="student-photo" src="${photoUrls.primary}" data-fallback="${photoUrls.fallback}" onerror="if(this.dataset.fallback){this.onerror=function(){this.style.display='none';};this.src=this.dataset.fallback;}else{this.style.display='none';}" alt="${studentData.studentName || 'Student'}">`
            : '';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Student Details - ${studentData.studentName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px; }
                    .header h1 { margin: 0; color: #2c3e50; }
                    .student-photo { width: 130px; height: 130px; object-fit: cover; border-radius: 50%; border: 3px solid #667eea; display: block; margin: 0 auto 14px; }
                    .section { margin-bottom: 25px; page-break-inside: avoid; }
                    .section-title { font-size: 16px; font-weight: bold; color: #667eea; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 12px; }
                    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .field { margin-bottom: 12px; }
                    .field-label { font-size: 12px; color: #999; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
                    .field-value { font-size: 14px; color: #2c3e50; font-weight: 600; }
                    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${printPhoto}
                    <h1>📚 S P Library - Student Details</h1>
                    <p>Printed on ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="section">
                    <div class="section-title">Personal Information</div>
                    <div class="row">
                        <div class="field">
                            <div class="field-label">Student ID</div>
                            <div class="field-value">${studentData.id || 'N/A'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Student Name</div>
                            <div class="field-value">${studentData.studentName || 'N/A'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Phone</div>
                            <div class="field-value">${studentData.phone || 'N/A'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Aadhaar Number</div>
                            <div class="field-value">${studentData.adharNumber || 'N/A'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Date of Birth</div>
                            <div class="field-value">${studentData.dob || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Academic & Seat Details</div>
                    <div class="row">
                        <div class="field">
                            <div class="field-label">Exam Preparation</div>
                            <div class="field-value">${studentData.examPreparation || 'N/A'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Seat Allocated</div>
                            <div class="field-value">${[studentData.currentSection, studentData.currentSeat].filter(Boolean).join('-') || studentData.seatAllocated || 'N/A'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Seat Type</div>
                            <div class="field-value">${studentData.seatType || 'N/A'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Status</div>
                            <div class="field-value">${statusBadge.label}</div>
                        </div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Payment Information</div>
                    <div class="row">
                        <div class="field">
                            <div class="field-label">Payment Status</div>
                            <div class="field-value">${paymentStatusBadge.label}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Due Amount</div>
                            <div class="field-value">${formatCurrency(studentData.dueAmount || 0)}</div>
                        </div>
                    </div>
                </div>
                <div class="section">
                    <div class="section-title">Address</div>
                    <div class="field">
                        <div class="field-value">${studentData.address || 'N/A'}</div>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an official document from S P Library Student Management System</p>
                </div>
            </body>
            </html>
        `;
        printWindow.onload = () => printWindow.print();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    lookupBtn?.addEventListener('click', handleStudentLookup);
    lookupInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleStudentLookup();
    });

    detailModalClose?.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });

    detailModal?.addEventListener('click', (e) => {
        if (e.target === detailModal) detailModal.style.display = 'none';
    });

    // ===== PAYMENT RECORDING FEATURE (Dashboard) =====
    const paymentModal = document.getElementById('dashboard-payment-modal');
    const paymentForm = document.getElementById('dashboard-payment-form');
    const paymentModalClose = document.getElementById('dashboard-payment-modal-close');
    const paymentCancelBtn = document.getElementById('dashboard-payment-cancel-btn');
    let currentDisplayedStudentId = null;
    let currentDisplayedStudent = null;

    window.openDashboardPaymentModal = function(studentId) {
        if (!studentId) return alert('❌ No student selected');
        currentDisplayedStudentId = studentId;
        
        // Get student info
        apiDataManager.students.getById(studentId).then(student => {
            if (student) {
                currentDisplayedStudent = student;
                document.getElementById('dashboard-payment-student-name').textContent = student.studentName || 'Student';
                document.getElementById('dashboard-payment-date').valueAsDate = new Date();
                paymentModal.style.display = 'flex';
            }
        }).catch(err => {
            console.error('Error fetching student:', err);
            alert('❌ Error loading student information');
        });
    };

    paymentModalClose?.addEventListener('click', () => {
        paymentModal.style.display = 'none';
        paymentForm.reset();
    });

    paymentCancelBtn?.addEventListener('click', () => {
        paymentModal.style.display = 'none';
        paymentForm.reset();
    });

    paymentModal?.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            paymentModal.style.display = 'none';
            paymentForm.reset();
        }
    });

    paymentForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const amount = parseFloat(document.getElementById('dashboard-payment-amount').value);
            const date = document.getElementById('dashboard-payment-date').value;
            const status = document.getElementById('dashboard-payment-status').value;
            const invoice = document.getElementById('dashboard-payment-invoice').value;
            const note = document.getElementById('dashboard-payment-note').value;

            if (!amount || amount <= 0) return alert('❌ Please enter a valid amount');
            if (!date) return alert('❌ Please select a payment date');

            // Create payment record via API
            const paymentData = {
                studentId: currentDisplayedStudentId,
                studentName: currentDisplayedStudent?.studentName || '',
                paymentDate: date,
                amount: Number(currentDisplayedStudent?.dueAmount) || amount,
                paidAmount: amount,
                paymentStatus: status,
                mode: '',
                receivedBy: session?.username || '',
                remarks: `${invoice ? `Invoice ${invoice}. ` : ''}${note}`.trim()
            };

            const response = await apiDataManager.payments.create(paymentData);
            
            if (response?.payment?.paymentId) {
                alert('✅ Payment recorded successfully!');
                paymentModal.style.display = 'none';
                paymentForm.reset();
                detailModal.style.display = 'none';
                lookupInput.value = '';
                await Promise.all([loadPaymentsData(), loadStudentsData(), loadDashboardData()]);
            } else {
                alert('❌ Failed to record payment. Check console for details.');
            }
        } catch (error) {
            console.error('❌ Payment recording error:', error);
            alert('❌ Error recording payment: ' + error.message);
        }
    });
})();
