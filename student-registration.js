const STORAGE_KEY = 'spLibraryStudentRegistrations';
const registrationForm = document.getElementById('student-registration-form');
const confirmation = document.getElementById('registration-confirmation');
const summaryContent = document.getElementById('summary-content');
const studentsTableContainer = document.getElementById('students-table-container');
const downloadJsonBtn = document.getElementById('download-json-btn');
const downloadCsvBtn = document.getElementById('download-csv-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const importJsonBtn = document.getElementById('import-json-btn');
const importJsonInput = document.getElementById('import-json-input');

function isApiAvailable() {
    return typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled;
}

function normalizeStudentsResponse(response) {
    if (!response) return [];
    return response.students || response.data || response.records || [];
}

async function getStudents() {
    if (isApiAvailable()) {
        try {
            const response = await apiClient.request('listStudents', {}, { method: 'POST' });
            return normalizeStudentsResponse(response);
        } catch (error) {
            console.error('Failed to fetch students from API:', error);
            return [];
        }
    }
    console.error('API not available: cannot fetch students. Configure api-client.js');
    return [];
}

async function saveStudent(studentData) {
    // Server-only save: require API and let the server assign sequential id atomically.
    if (!isApiAvailable()) {
        throw new Error('API not available: cannot save student. Please configure api-client.js');
    }

    try {
        // Use apiDataManager if available for consistent logging, otherwise fallback to direct apiClient
        const client = (typeof apiDataManager !== 'undefined' && apiDataManager && apiDataManager.students && apiDataManager.students.create) ? apiDataManager.students : { create: (s) => apiClient.request('createStudent', { student: s }, { method: 'POST' }) };
        const response = await client.create(studentData);
        // Depending on apiDataManager wrapper, response may be { student: {...} } or the raw response
        if (response && response.student) return { student: response.student, savedTo: 'Server API' };
        if (response && response.studentId) {
            // older response shape
            return { student: response, savedTo: 'Server API' };
        }
        throw new Error('Unexpected server response when creating student');
    } catch (error) {
        console.error('Failed to save student to server:', error);
        throw error;
    }
}

async function deleteStudentRecord(id) {
    if (!isApiAvailable()) {
        console.error('API not available: cannot delete student');
        return false;
    }
    try {
        await apiClient.request('deleteStudent', { id }, { method: 'POST' });
        return true;
    } catch (error) {
        console.error('Failed to delete student from API', error);
        return false;
    }
}

function formatStudentCard(student) {
    return `
        <div class="student-card">
            <div class="student-header">
                <h4>${student.studentName || 'N/A'}</h4>
                <button class="btn-delete" onclick="window.deleteStudent('${String(student.id || '').replace(/'/g, "\\'")}')">✕</button>
            </div>
            <div class="student-details">
                <p><strong>Phone:</strong> ${student.phone || 'N/A'}</p>
                <p><strong>Section:</strong> ${student.currentSection || '—'}</p>
                <p><strong>Seat:</strong> ${student.currentSeat || student.seatAllocated || '—'} <small>(${student.seatType || '—'})</small></p>
                <p><strong>Status:</strong> ${student.status || 'Active'}</p>
                <p><strong>Father's Name:</strong> ${student.fatherName || 'N/A'}</p>
                <p><strong>Gender:</strong> ${student.gender || 'N/A'}</p>
                <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
                <p><strong>Parent Phone:</strong> ${student.parentPhone || 'N/A'}</p>
                <p><strong>Aadhaar:</strong> ${student.adharNumber || 'N/A'}</p>
                <p><strong>DOB:</strong> ${student.dob || 'N/A'}</p>
                <p><strong>Joining Date:</strong> ${student.joinDate || 'N/A'}</p>
                <p><strong>Exam Prep:</strong> ${student.examPreparation || 'N/A'}</p>
                <p><strong>Address:</strong> ${student.address || 'N/A'}</p>
            </div>
        </div>
    `;
}

async function renderStudentsTable() {
    const students = await getStudents();
    if (students.length === 0) {
        studentsTableContainer.innerHTML = '<p class="text-center">No students registered yet.</p>';
        return;
    }

    let html = '<div class="students-list">';
    students.forEach((student) => {
        html += formatStudentCard(student);
    });
    html += '</div>';
    studentsTableContainer.innerHTML = html;
}

window.deleteStudent = async function(id) {
    if (confirm('Delete this student record?')) {
        const deleted = await deleteStudentRecord(id);
        if (deleted) {
            renderStudentsTable();
        } else {
            alert('Unable to delete student record.');
        }
    }
};

function downloadJSON() {
    getStudents().then((students) => {
        if (students.length === 0) {
            alert('No students to download.');
            return;
        }
        const dataStr = JSON.stringify(students, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sp-library-students-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

function downloadCSV() {
    getStudents().then((students) => {
        if (students.length === 0) {
            alert('No students to download.');
            return;
        }

        const headers = ['Name', 'Phone', 'Father Name', 'Gender', 'Email', 'Parent Phone', 'Aadhaar', 'DOB', 'Joining Date', 'Exam Prep', 'Address'];
        const extendedHeaders = ['Seat', 'Seat Type', 'Status'];
        const allHeaders = headers.concat(extendedHeaders);
        let csv = allHeaders.join(',') + '\n';

        students.forEach(student => {
            const row = [
                `"${student.studentName || ''}"`,
                `"${student.phone || ''}"`,
                `"${student.fatherName || ''}"`,
                `"${student.gender || ''}"`,
                `"${student.email || ''}"`,
                `"${student.parentPhone || ''}"`,
                `"${student.adharNumber || ''}"`,
                `"${student.dob || ''}"`,
                `"${student.joinDate || ''}"`,
                `"${student.examPreparation || ''}"`,
                `"${(student.address || '').replace(/"/g, '""')}"`,
                `"${student.currentSeat || student.seatAllocated || ''}"`,
                `"${student.seatType || ''}"`,
                `"${student.status || ''}"`
            ];
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sp-library-students-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

async function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const parsed = JSON.parse(String(reader.result));
            if (!Array.isArray(parsed)) {
                alert('Import failed: JSON must be an array of student objects');
                return;
            }

            const existing = await getStudents();
            const imported = [];
            let skipped = 0;

            for (const item of parsed) {
                const name = (item.studentName || item.name || '').toString().trim();
                const phone = (item.phone || '').toString().trim();
                const adhar = (item.adharNumber || item.aadhar || item.aadhaar || '').toString().trim();

                if (!name || !phone) {
                    skipped++;
                    continue;
                }

                const duplicate = existing.find(s => (s.phone && s.phone === phone) || (s.adharNumber && s.adharNumber === adhar && adhar));
                if (duplicate) {
                    skipped++;
                    continue;
                }

                const student = {
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    studentName: name,
                    fatherName: item.fatherName || '',
                    gender: item.gender || '',
                    phone,
                    parentPhone: item.parentPhone || '',
                    email: item.email || '',
                    adharNumber: adhar || item.adharNumber || '',
                    dob: item.dob || '',
                    joinDate: item.joinDate || '',
                    examPreparation: item.examPreparation || '',
                    address: item.address || '',
                    currentSeat: item.seatAllocated || item.seat || '',
                    seatType: item.seatType || '',
                    status: item.status || 'Active',
                    registeredAt: item.registeredAt || new Date().toISOString()
                };

                if (isApiAvailable()) {
                    try {
                        await apiClient.request('createStudent', { student }, { method: 'POST' });
                        imported.push(student);
                    } catch (err) {
                        console.warn('Failed to import student via API, skipping:', student, err);
                        skipped++;
                    }
                } else {
                    skipped++;
                }
            }

            // Do not save imported records locally — Sheets is the single source of truth.
            renderStudentsTable();
            alert(`Import finished — added: ${imported.length}, skipped: ${skipped}`);
            if (importJsonInput) importJsonInput.value = '';
        } catch (err) {
            alert('Failed to import JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}

importJsonBtn?.addEventListener('click', () => importJsonInput?.click());
importJsonInput?.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleImportFile(f);
});

registrationForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const studentName = document.getElementById('student-name').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!studentName || !phone) {
        alert('Student Name and Phone Number are required.');
        return;
    }

    const studentData = {
        studentName,
        fatherName: document.getElementById('father-name').value.trim(),
        gender: document.getElementById('gender').value,
        phone,
        parentPhone: document.getElementById('parent-phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        adharNumber: document.getElementById('adhar-number').value.trim(),
        dob: document.getElementById('dob').value,
        joinDate: document.getElementById('join-date').value,
        examPreparation: document.getElementById('exam-preparation').value.trim(),
        address: document.getElementById('address').value.trim(),
        currentSection: document.getElementById('seat-section') ? document.getElementById('seat-section').value.trim() : '',
        currentSeat: document.getElementById('seat-allocated').value.trim(),
        seatType: document.getElementById('seat-type').value,
        status: document.getElementById('status').value || 'Active',
        registeredAt: new Date().toISOString()
    };

    try {
        const result = await saveStudent(studentData);
        confirmation.style.display = 'block';
        // hide any API error box
        const apiErrEl = document.getElementById('registration-api-error');
        if (apiErrEl) { apiErrEl.style.display = 'none'; apiErrEl.innerHTML = ''; }

        summaryContent.innerHTML = `
            <div class="booking-summary-item"><strong>Name:</strong><span>${studentName}</span></div>
            <div class="booking-summary-item"><strong>Phone:</strong><span>${phone}</span></div>
            <div class="booking-summary-item"><strong>Saved to:</strong><span>${result.savedTo}</span></div>
            <div class="booking-summary-item"><strong>Total Students:</strong><span>${(await getStudents()).length}</span></div>
        `;
        registrationForm.reset();
        renderStudentsTable();
    } catch (error) {
        // Show a friendly error UI with a link to open the API exec URL so you can see redirects/login pages
        const apiErrEl = document.getElementById('registration-api-error');
        const apiUrl = (typeof apiClient !== 'undefined' && apiClient && apiClient.API_BASE_URL) ? apiClient.API_BASE_URL : null;
        if (apiErrEl) {
            let html = `<strong>Could not register student:</strong> ${error && error.message ? error.message : String(error)} `;
            if (apiUrl) {
                const pingUrl = apiUrl + '?action=ping';
                html += `<br><a href="${pingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:8px 10px;background:#fff;border:1px solid #ddd;border-radius:6px;text-decoration:none;color:#333;">Open API URL (ping)</a>`;
                html += `<div style="margin-top:8px;font-size:0.9rem;color:#333;">If you see a Google sign-in page after opening the link, redeploy your Apps Script Web App with <strong>Execute as: Me</strong> and <strong>Who has access: Anyone (even anonymous)</strong>.</div>`;
            }
            apiErrEl.innerHTML = html;
            apiErrEl.style.display = 'block';
        }
        alert('Could not register student: ' + (error && error.message ? error.message : String(error)));
    }
});

downloadJsonBtn?.addEventListener('click', downloadJSON);
downloadCsvBtn?.addEventListener('click', downloadCSV);
clearAllBtn?.addEventListener('click', async () => {
    if (!confirm('Delete ALL student records? This cannot be undone.')) return;

    if (isApiAvailable()) {
        alert('Bulk delete is not yet supported through the API. Use the Google Sheets backend to clear records manually.');
        return;
    }
    // Without API we cannot perform bulk delete — inform the user
    alert('API not configured: cannot clear records from Sheets.');
});

window.addEventListener('DOMContentLoaded', () => {
    renderStudentsTable();
});
