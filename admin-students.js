// Admin students management script - API ONLY (No localStorage)
(function(){
    const session = adminAuth.requireAdmin();
    if (!session) return;

    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const seatFilter = document.getElementById('seat-filter');
    const examFilter = document.getElementById('exam-filter');
    const tbody = document.getElementById('students-tbody');
    const exportJsonBtn = document.getElementById('export-json');
    const exportCsvBtn = document.getElementById('export-csv');
    const logoutLink = document.getElementById('logout-link');

    logoutLink?.addEventListener('click', (e)=>{ e.preventDefault(); adminAuth.logout(); });

    function isApiAvailable(){
        return typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled;
    }

    if (!isApiAvailable()) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:18px;color:red;font-weight:bold;">⚠️ API Configuration Error: Google Sheets API not configured. Please set API_BASE_URL in api-client.js</td></tr>';
        return;
    }

    async function getStudents(){
        try {
            const response = await apiClient.request('listStudents', {}, { method: 'POST' });
            return response.students || [];
        } catch (error) {
            console.error('Failed to fetch students from API:', error);
            alert('❌ Failed to load students from database. Check API configuration.');
            return [];
        }
    }

    async function updateStudent(updated) {
        try {
            await apiClient.request('updateStudent', { student: updated }, { method: 'POST' });
            return true;
        } catch (error) {
            console.error('❌ Failed to update student:', error);
            alert('Failed to save student changes. Please try again.');
            return false;
        }
    }

    async function deleteStudent(id) {
        try {
            await apiClient.request('deleteStudent', { id }, { method: 'POST' });
            return true;
        } catch (error) {
            console.error('❌ Failed to delete student:', error);
            alert('Failed to delete student. Please try again.');
            return false;
        }
    }

    async function toggleStudentStatus(id) {
        try {
            await apiClient.request('toggleStudentStatus', { id }, { method: 'POST' });
            return true;
        } catch (error) {
            console.error('❌ Failed to toggle status:', error);
            alert('Failed to update student status. Please try again.');
            return false;
        }
    }

    function uniqueValues(list, key){
        const set = new Set();
        list.forEach(i=>{ if (i[key]) set.add(i[key]); });
        return Array.from(set).sort();
    }

    async function buildExamOptions(){
        const students = await getStudents();
        const exams = uniqueValues(students, 'examPreparation');
        examFilter.innerHTML = '<option value="">All Exams</option>' + exams.map(e=>`<option value="${e}">${e}</option>`).join('');
    }

    async function applyFilters(){
        const q = (searchInput.value||'').toLowerCase().trim();
        const status = statusFilter.value;
        const seat = seatFilter.value;
        const exam = examFilter.value;
        let students = await getStudents();
        if (status) students = students.filter(s => (s.status||'Active') === status);
        if (seat) students = students.filter(s => (s.seatType||'') === seat);
        if (exam) students = students.filter(s => (s.examPreparation||'') === exam);
        if (q) students = students.filter(s => (s.studentName||'').toLowerCase().includes(q) || (s.phone||'').includes(q) || (s.adharNumber||'').includes(q));
        renderTable(students);
    }

    function renderTable(list){
        tbody.innerHTML = '';
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:18px">No records found</td></tr>'; return; }
        list.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.studentName||''}</td>
                <td>${s.phone||''}</td>
                    <td>${s.currentSeat || s.seatAllocated||''}</td>
                <td>${s.seatType||''}</td>
                <td>${s.status||'Active'}</td>
                <td>${s.examPreparation||''}</td>
                <td>
                    <button class="action-btn" data-action="edit" data-id="${s.id}">Edit</button>
                    <button class="action-btn" data-action="toggle" data-id="${s.id}">Toggle Status</button>
                    <button class="action-btn" data-action="delete" data-id="${s.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const modal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const modalName = document.getElementById('modal-name');
    const modalPhone = document.getElementById('modal-phone');
    const modalAdhar = document.getElementById('modal-adhar');
    const modalDob = document.getElementById('modal-dob');
    const modalJoin = document.getElementById('modal-joinDate');
    const modalSeat = document.getElementById('modal-seat');
    const modalSeatType = document.getElementById('modal-seatType');
    const modalStatus = document.getElementById('modal-status');
    const modalExam = document.getElementById('modal-exam');
    const modalAddress = document.getElementById('modal-address');
    const modalCancel = document.getElementById('modal-cancel');
    let editingId = null;

    async function openEditModal(id){
        const students = await getStudents();
        const s = students.find(x => x.id === id);
        if (!s) return alert('Student not found');
        editingId = id;
        modalName.value = s.studentName || '';
        modalPhone.value = s.phone || '';
        modalAdhar.value = s.adharNumber || '';
        modalDob.value = s.dob || '';
        modalJoin.value = s.joinDate || '';
        modalSeat.value = s.currentSeat || s.seatAllocated || '';
        modalSeatType.value = s.seatType || '';
        modalStatus.value = s.status || 'Active';
        modalExam.value = s.examPreparation || '';
        modalAddress.value = s.address || '';
        modal.style.display = 'flex';
    }

    function closeModal(){
        editingId = null;
        modal.style.display = 'none';
        editForm.reset();
    }

    modalCancel.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
    modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });

    editForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        if (!editingId) return closeModal();
        const name = modalName.value.trim();
        const phone = modalPhone.value.trim();
        if (!name || !phone) return alert('Name and phone are required');

        const students = await getStudents();
        const current = students.find(s => s.id === editingId);
        if (!current) return alert('Student not found');

        const updated = {
            ...current,
            studentName: name,
            phone: phone,
            adharNumber: modalAdhar.value.trim(),
            dob: modalDob.value.trim(),
            joinDate: modalJoin.value.trim(),
            currentSeat: modalSeat.value.trim(),
            seatType: modalSeatType.value,
            status: modalStatus.value,
            examPreparation: modalExam.value.trim(),
            address: modalAddress.value.trim(),
            updatedAt: new Date().toISOString()
        };

        const success = await updateStudent(updated);
        if (!success) return alert('Failed to save changes');
        await buildExamOptions();
        await applyFilters();
        closeModal();
    });

    async function handleToggleStatus(id){
        const success = await toggleStudentStatus(id);
        if (!success) return alert('Unable to toggle status');
        await applyFilters();
    }

    async function handleDelete(id){
        if (!confirm('Delete this student?')) return;
        const success = await deleteStudent(id);
        if (!success) return alert('Unable to delete student');
        await buildExamOptions();
        await applyFilters();
    }

    document.getElementById('students-table').addEventListener('click', async (e)=>{
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = Number(btn.getAttribute('data-id'));
        const act = btn.getAttribute('data-action');
        if (act === 'edit') await openEditModal(id);
        if (act === 'toggle') await handleToggleStatus(id);
        if (act === 'delete') await handleDelete(id);
    });

    [searchInput, statusFilter, seatFilter, examFilter].forEach(el=>el?.addEventListener('change', applyFilters));
    searchInput?.addEventListener('input', applyFilters);

    exportJsonBtn?.addEventListener('click', async ()=>{
        const students = await getStudents();
        const blob = new Blob([JSON.stringify(students, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `students-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    exportCsvBtn?.addEventListener('click', async ()=>{
        const students = await getStudents();
        if (!students.length) return alert('No records found');
        const headers = ['Name','Phone','Seat','Seat Type','Status','Exam','Aadhaar','DOB','Joining Date','Address'];
        let csv = headers.join(',') + '\n';
        students.forEach(s=>{
            const row = [
                `"${s.studentName||''}"`,
                `"${s.phone||''}"`,
                `"${s.currentSeat || s.seatAllocated||''}"`,
                `"${s.seatType||''}"`,
                `"${s.status||''}"`,
                `"${s.examPreparation||''}"`,
                `"${s.adharNumber||''}"`,
                `"${s.dob||''}"`,
                `"${s.joinDate||''}"`,
                `"${(s.address||'').replace(/"/g,'""')}"`
            ];
            csv += row.join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `students-${new Date().toISOString().split('T')[0]}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    // Student Detail Modal and Payment recording are handled by admin-dashboard.js
    // to avoid code duplication. This page provides a simpler table-based edit interface.

    // init
    buildExamOptions();
    applyFilters();
})();
