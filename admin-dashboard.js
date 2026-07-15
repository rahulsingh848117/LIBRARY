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

function setSeatMatrixView(view) {
    seatMatrixView = view;
    renderSeatMatrix();
}

function setSeatMatrixSection(section) {
    seatMatrixSection = section;
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
        loadStudentsData().finally(() => renderSeatMatrix());
    }
    else if (tabName === 'deleted') loadDeletedStudentsData();
    else if (tabName === 'payments') loadPaymentsData();
    else if (tabName === 'bookings') loadBookingsData();
    else if (tabName === 'notices') loadNoticesData();
}

// ==================== Data Management ====================
let allStudents = [];
let allPayments = [];
let allBookings = [];
let allNotices = [];
let allDeletedStudents = [];
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
        if (canUseRemoteApi()) {
            try {
                const response = await apiClient.request('listPayments', {}, { method: 'POST' });
                allPayments = response.payments || [];

                const summary = await apiClient.request('monthlyCollectionSummary', {}, { method: 'POST' });
                if (summary.summary) updatePaymentSummary(summary.summary);
            } catch (error) {
                console.warn('Using local payment data because the API request failed:', error);
            }
        }

        if (!Array.isArray(allPayments) || allPayments.length === 0) {
            allPayments = [];
        }
        renderPaymentsTable(allPayments);
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
function renderStudentsTable(students) {
    const tbody = document.getElementById('students-tbody');
    currentPrintData.students = Array.isArray(students) ? students : [];
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: #999;">No students found</td></tr>';
        return;
    }

    students.forEach(student => {
        const row = document.createElement('tr');
        const photoCell = showStudentPhotos && student.photoDriveUrl ? `<td><img src="${student.photoDriveUrl}" alt="${student.studentName}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;"></td>` : '';
        row.innerHTML = `
            <td><strong>${student.studentName || '—'}</strong>${photoCell}</td>
            <td>${student.phone || '—'}</td>
            <td><strong>${student.currentSection || '—'}</strong></td>
            <td>${student.currentSeat || '—'}</td>
            <td><span class="badge ${student.status === 'Active' ? 'badge-success' : 'badge-danger'}">${student.status || '—'}</span></td>
            <td><span class="badge ${student.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${student.paymentStatus || '—'}</span></td>
            <td><div class="btn-group"><button class="btn-small btn-secondary" onclick="deleteStudent('${student.id}')">Delete</button></div></td>
        `;
        tbody.appendChild(row);
    });
}

function renderDeletedStudentsTable(students) {
    const tbody = document.getElementById('deleted-students-tbody');
    currentPrintData.deletedStudents = Array.isArray(students) ? students : [];
    tbody.innerHTML = '';
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: #999;">No deleted students found</td></tr>';
        return;
    }
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${student.studentName || '—'}</strong></td>
            <td>${student.phone || '—'}</td>
            <td>${student.currentSection || '—'}</td>
            <td>${student.currentSeat || '—'}</td>
            <td><span class="badge ${student.status === 'Active' ? 'badge-success' : 'badge-danger'}">${student.status || '—'}</span></td>
            <td>${student.deletedAt || '—'}</td>
            <td><button class="btn-small btn-primary" onclick="restoreStudent('${student.id}')">Restore</button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('payments-tbody');
    currentPrintData.payments = Array.isArray(payments) ? payments : [];
    tbody.innerHTML = '';
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #999;">No payments found</td></tr>';
        return;
    }

    payments.forEach(payment => {
        const row = document.createElement('tr');
        const due = parseFloat(payment.amount || 0) - parseFloat(payment.paidAmount || 0);
        row.innerHTML = `
            <td><strong>${payment.studentName || '—'}</strong></td>
            <td>${payment.paymentDate || '—'}</td>
            <td>₹${payment.amount || 0}</td>
            <td style="color: #27ae60; font-weight: 600;">₹${payment.paidAmount || 0}</td>
            <td>${payment.mode || '—'}</td>
            <td><span class="badge ${payment.paymentStatus === 'Paid' ? 'badge-success' : 'badge-warning'}">${payment.paymentStatus || '—'}</span></td>
        `;
        tbody.appendChild(row);
    });
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

function applyStudentFilters() {
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
    const rows = currentPrintData.students && currentPrintData.students.length ? currentPrintData.students : allStudents;
    const headers = ['Name','Phone','Section','Seat','Status','Payment','Aadhaar','DOB','JoinDate','Address'];
    let csv = headers.join(',') + '\n';
    (rows || []).forEach(s => {
        const row = [
            `"${(s.studentName||'').replace(/"/g,'""')}"`,
            `"${(s.phone||'').replace(/"/g,'""')}"`,
            `"${(s.currentSection||s.section||'').replace(/"/g,'""')}"`,
            `"${(s.currentSeat||s.seatAllocated||'').replace(/"/g,'""')}"`,
            `"${(s.status||'').replace(/"/g,'""')}"`,
            `"${(s.paymentStatus||'').replace(/"/g,'""')}"`,
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
    const headers = viewName === 'payments' ? ['Student','Date','Amount','Paid','Mode','Status'] : ['Name','Phone','Section','Seat','Status','Payment'];
    const rowsHtml = (rows || []).map(r => {
        if (viewName === 'payments') return `<tr><td>${r.studentName||''}</td><td>${r.paymentDate||''}</td><td>₹${r.amount||0}</td><td>₹${r.paidAmount||0}</td><td>${r.mode||''}</td><td>${r.paymentStatus||''}</td></tr>`;
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
    if (currentSort.key === key) currentSort.dir = -currentSort.dir; else { currentSort.key = key; currentSort.dir = 1; }
    allStudents.sort((a,b)=>{
        const va = (a[key] || '').toString().toLowerCase();
        const vb = (b[key] || '').toString().toLowerCase();
        if (va < vb) return -1 * currentSort.dir; if (va > vb) return 1 * currentSort.dir; return 0;
    });
    renderStudentsTable(allStudents);
}

function toggleStudentPhotos() {
    showStudentPhotos = !showStudentPhotos;
    const btn = document.getElementById('toggle-photos-btn');
    if (btn) btn.textContent = showStudentPhotos ? '🖼️ Hide Photos' : '🖼️ Show Photos';
    renderStudentsTable(allStudents);
}


// Expose key functions to global scope for inline `onclick` handlers in HTML
try {
    window.switchTab = switchTab;
    window.setSeatMatrixView = setSeatMatrixView;
    window.setSeatMatrixSection = setSeatMatrixSection;
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

    async function displayStudentDetail(student) {
        window.currentDashboardStudent = student;
        const payments = [];
        
        const statusInfo = getStatusBadge(student.status || 'Active');
        const paymentStatusInfo = getStatusBadge(student.paymentStatus || 'Pending');

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
                                        <div style="font-weight: 600; color: #2c3e50;">${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'N/A'}</div>
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

        detailContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                <!-- Left Column: Basic Info -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px;">
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 4px;">Student Name</div>
                        <div style="font-size: 1.4rem; font-weight: 700;">${student.studentName || 'N/A'}</div>
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
                            <span style="font-size: 1.2rem; font-weight: 700; color: ${paymentStatusInfo.color};">${formatCurrency(student.dueAmount || 0)}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #999; margin-top: 6px;">Due Amount</div>
                    </div>
                    <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 16px; border-radius: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <div style="font-size: 0.75rem; color: #999; font-weight: 600; margin-bottom: 4px; text-transform: uppercase;">Seat</div>
                                <div style="font-weight: 700; color: #2c3e50; font-size: 1rem;">${student.seatAllocated || 'N/A'}</div>
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

            <!-- Address -->
            <div style="background: #f8f9fa; padding: 14px; border-radius: 10px; border-left: 3px solid #667eea; margin-bottom: 24px;">
                <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Address</div>
                <div style="font-weight: 600; color: #2c3e50; line-height: 1.5;">${student.address || 'N/A'}</div>
            </div>

            ${paymentHistoryHTML}

            <!-- Action Buttons -->
            <div style="display: flex; gap: 10px; margin-top: 24px; padding-top: 24px; border-top: 2px solid rgba(0,0,0,0.05);">
                <button onclick="window.openDashboardPaymentModal(currentDisplayedStudentId)" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Record Payment</button>
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
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Student Details - ${studentData.studentName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px; }
                    .header h1 { margin: 0; color: #2c3e50; }
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
                    <h1>📚 S P Library - Student Details</h1>
                    <p>Printed on ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="section">
                    <div class="section-title">Personal Information</div>
                    <div class="row">
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
                            <div class="field-value">${studentData.seatAllocated || 'N/A'}</div>
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
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
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

    window.openDashboardPaymentModal = function(studentId) {
        if (!studentId) return alert('❌ No student selected');
        currentDisplayedStudentId = studentId;
        
        // Get student info
        apiDataManager.students.getById(studentId).then(student => {
            if (student) {
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
                amount: amount,
                paidAmount: amount,
                paymentStatus: status,
                paidAt: date,
                invoiceNumber: invoice || `INV-${Date.now()}`,
                note: note,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const response = await apiDataManager.payments.create(paymentData);
            
            if (response && (response.success || response.id)) {
                alert('✅ Payment recorded successfully!');
                paymentModal.style.display = 'none';
                paymentForm.reset();
                detailModal.style.display = 'none';
                lookupInput.value = '';
            } else {
                alert('❌ Failed to record payment. Check console for details.');
            }
        } catch (error) {
            console.error('❌ Payment recording error:', error);
            alert('❌ Error recording payment: ' + error.message);
        }
    });
})();
