/**
 * SP Library Apps Script API
 *
 * Instructions:
 * 1. Copy this file into Google Apps Script.
 * 2. Replace SPREADSHEET_ID with your spreadsheet ID.
 * 3. Deploy as Web App (execute as: Me, access: Anyone with link).
 * 4. Use the Web App URL in api-client.js.
 */

const SPREADSHEET_ID = '1L6bIvvoInzfPCRUw8DyDRjBxm0xuuBvd_KBp3Ul9QEs';
const PHOTO_FOLDER_NAME = 'SP Library Student Photos';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours
const OPEN_ACTIONS = [
  'login',
  'ping',
  'createBooking',
  'createStudent',
  'listStudents',
  'listBookings',
  'listPayments',
  'listNotices',
  'listDeletedStudents',
  'monthlyCollectionSummary',
  'dashboardSummary',
  'uploadStudentPhoto'
];
const LOG_ERRORS = true;

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function doOptions(e) {
  return corsResponse({});
}

function handleRequest(e) {
  try {
    const action = getAction(e);
    if (!action) return jsonResponse({ error: 'Missing action' }, getCallback(e));
 
    const body = getRequestBody(e);
    const auth = requireAuth(e);
    const callback = getCallback(e);
 
    switch (action) {
      case 'login':
        return jsonResponse(handleLogin(body.payload || {}), callback);
      case 'validateToken':
        return jsonResponse(handleValidateToken(auth), callback);
      case 'ping':
        return jsonResponse({ ok: true, action: 'ping' }, callback);
      default:
        if (OPEN_ACTIONS.includes(action)) {
          return jsonResponse(dispatchAction(action, body.payload || {}), callback);
        }
        if (!auth) return jsonResponse({ error: 'Unauthorized' }, callback);
        return jsonResponse(dispatchAction(action, body.payload || {}), callback);
    }
  } catch (error) {
    logError('handleRequest', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, getCallback(e));
  }
}

function dispatchAction(action, payload) {
  switch (action) {
    case 'dashboardSummary':
      return handleDashboardSummary(payload);
    case 'listStudents':
      return handleListStudents();
    case 'uploadStudentPhoto':
      return handleUploadStudentPhoto(payload);
    case 'createStudent':
      return handleCreateStudent(payload.student || {});
    case 'updateStudent':
      return handleUpdateStudent(payload.student || {});
    case 'deleteStudent':
      return handleDeleteStudent(payload.id, payload.deletedBy, payload.reason);
    case 'restoreStudent':
      return handleRestoreStudent(payload.id);
    case 'toggleStudentStatus':
      return handleToggleStudentStatus(payload.id);
    case 'listDeletedStudents':
      return handleListDeletedStudents();
    case 'createPayment':
      return handleCreatePayment(payload.payment || {});
    case 'updatePayment':
      return handleUpdatePayment(payload.payment || {});
    case 'deletePayment':
      return handleDeletePayment(payload.paymentId);
    case 'listPayments':
      return handleListPayments(payload);
    case 'monthlyCollectionSummary':
      return handleMonthlyCollectionSummary(payload);
    case 'listBookings':
      return handleListBookings(payload);
    case 'createBooking':
      return handleCreateBooking(payload.booking || {});
    case 'approveBooking':
      return handleApproveBooking(payload.bookingId || '', payload.approvedBy || '');
    case 'rejectBooking':
      return handleRejectBooking(payload.bookingId || '', payload.reason || '');
    case 'listNotices':
      return handleListNotices(payload);
    case 'createNotice':
      return handleCreateNotice(payload.notice || {});
    case 'updateNotice':
      return handleUpdateNotice(payload.notice || {});
    case 'deleteNotice':
      return handleDeleteNotice(payload.id);
    default:
      return { error: `Unknown action ${action}` };
  }
}

function handleLogin(payload) {
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();
  if (!username || !password) return { error: 'Username and password are required' };

  const adminsSheet = getOrCreateSheet('Admins');
  ensureDefaultAdminExists(adminsSheet);
  const admins = getRows(adminsSheet);
  const admin = admins.find(row => String(row.username) === username && String(row.password) === password);
  if (!admin) return { error: 'Invalid credentials' };

  const token = generateId('token');
  saveTokenData(token, {
    username: admin.username,
    role: admin.role || 'admin',
    userId: admin.id || '',
  });

  return {
    token,
    username: admin.username,
    role: admin.role || 'admin',
    loginTime: new Date().toISOString(),
  };
}

function handleValidateToken(auth) {
  if (!auth) return { valid: false };
  return {
    valid: true,
    username: auth.username,
    role: auth.role,
    issuedAt: auth.issuedAt,
  };
}

function handleDashboardSummary(payload) {
  const students = getRows(getOrCreateSheet('Students'));
  const payments = getRows(getOrCreateSheet('Payments'));
  const bookings = getRows(getOrCreateSheet('Bookings'));

  const totalStudents = students.length;
  const activeStudents = students.filter(s => String(s.status || 'Active') === 'Active').length;
  const inactiveStudents = totalStudents - activeStudents;
  const seatsOccupied = students.filter(s => String(s.currentSeat || '').trim() !== '').length;
  const currentMonth = payload.month || new Date().getMonth() + 1;
  const currentYear = payload.year || new Date().getFullYear();

  const sections = ['A', 'B', 'C', 'D'];
  const sectionSummary = sections.map(section => {
    const sectionStudents = students.filter(s => String(s.currentSection || '').toUpperCase() === section);
    const taken = sectionStudents.length;
    return { section, taken, available: Math.max(60 - taken, 0) };
  });

  const monthPayments = payments.filter(p => String(p.month) === String(currentMonth) && String(p.year) === String(currentYear));
  const totalPaid = monthPayments.reduce((sum, p) => sum + parseNumber(p.paidAmount), 0);
  const totalAmount = monthPayments.reduce((sum, p) => sum + parseNumber(p.amount), 0);
  const totalDue = monthPayments.reduce((sum, p) => sum + Math.max(parseNumber(p.amount) - parseNumber(p.paidAmount), 0), 0);
  const pendingBookings = bookings.filter(b => String(b.status || '').toUpperCase() === 'PENDING').length;

  return {
    summary: {
      totalStudents,
      activeStudents,
      inactiveStudents,
      seatsOccupied,
      sectionSummary,
      month: Number(currentMonth),
      year: Number(currentYear),
      monthlyCollection: totalPaid,
      monthlyExpected: totalAmount,
      monthlyDue: totalDue,
      pendingBookings,
    },
  };
}

function handleListStudents() {
  return { students: getRows(getOrCreateSheet('Students')) };
}

function handleCreateStudent(student) {
  student = student || {};
  const sheet = getOrCreateSheet('Students');

  // Acquire a script lock to ensure next id allocation is atomic across concurrent requests
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    let lastId = parseInt(props.getProperty('lastStudentId') || '0', 10);

    // Read existing rows to append and to compute fallback max id if needed
    const rows = getRows(sheet);

    // If no stored lastId, compute from existing rows to be safe
    if (!lastId || lastId <= 0) {
      lastId = rows.reduce((m, r) => {
        const val = parseInt(String(r.id || '0'), 10) || 0;
        return Math.max(m, val);
      }, 0);
    }

    const nextId = lastId + 1;

    const newStudent = {
      id: String(nextId),
      studentName: student.studentName || '',
      phone: student.phone || '',
      adharNumber: student.adharNumber || '',
      email: student.email || '',
      fatherName: student.fatherName || '',
      parentPhone: student.parentPhone || '',
      gender: student.gender || '',
      dob: student.dob || '',
      joinDate: student.joinDate || '',
      monthlyFee: String(student.monthlyFee || ''),
      address: student.address || '',
      examPreparation: student.examPreparation || '',
      currentSection: student.currentSection || '',
      currentSeat: student.currentSeat || '',
      seatType: student.seatType || '',
      status: student.status || 'Active',
      paymentStatus: student.paymentStatus || 'Not Paid',
      dueAmount: String(student.dueAmount || ''),
      photoDriveUrl: student.photoDriveUrl || '',
      registeredAt: student.registeredAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    rows.push(newStudent);
    writeRows(sheet, rows);

    // Persist the lastStudentId for future allocations
    props.setProperty('lastStudentId', String(nextId));

    return { student: newStudent };
  } finally {
    // Always release the lock
    try { lock.releaseLock(); } catch (e) { /* ignore */ }
  }
}

function handleUpdateStudent(student) {
  const sheet = getOrCreateSheet('Students');
  const rows = getRows(sheet);
  const index = rows.findIndex(row => String(row.id) === String(student.id));
  if (index === -1) return { error: 'Student not found' };

  rows[index] = {
    ...rows[index],
    ...student,
    updatedAt: new Date().toISOString(),
  };
  writeRows(sheet, rows);
  return { student: rows[index] };
}

function handleDeleteStudent(id, deletedBy, reason) {
  const sheet = getOrCreateSheet('Students');
  const rows = getRows(sheet);
  const index = rows.findIndex(row => String(row.id) === String(id));
  if (index === -1) return { error: 'Student not found' };

  const deletedRow = {
    ...rows[index],
    deletedAt: new Date().toISOString(),
    deletedBy: deletedBy || '',
    deleteReason: reason || 'Moved to archive',
  };
  const deletedSheet = getOrCreateSheet('DeletedStudents');
  const deletedRows = getRows(deletedSheet);
  deletedRows.push(deletedRow);
  writeRows(deletedSheet, deletedRows);

  const remaining = rows.filter(row => String(row.id) !== String(id));
  writeRows(sheet, remaining);
  return { success: true };
}

function handleRestoreStudent(id) {
  const deletedSheet = getOrCreateSheet('DeletedStudents');
  const deletedRows = getRows(deletedSheet);
  const index = deletedRows.findIndex(row => String(row.id) === String(id));
  if (index === -1) return { error: 'Deleted student not found' };

  const restored = { ...deletedRows[index] };
  delete restored.deletedAt;
  delete restored.deletedBy;
  delete restored.deleteReason;
  restored.updatedAt = new Date().toISOString();

  const activeSheet = getOrCreateSheet('Students');
  const activeRows = getRows(activeSheet);
  activeRows.push(restored);
  writeRows(activeSheet, activeRows);

  const remaining = deletedRows.filter(row => String(row.id) !== String(id));
  writeRows(deletedSheet, remaining);
  return { student: restored };
}

function handleToggleStudentStatus(id) {
  const sheet = getOrCreateSheet('Students');
  const rows = getRows(sheet);
  const index = rows.findIndex(row => String(row.id) === String(id));
  if (index === -1) return { error: 'Student not found' };

  rows[index].status = String(rows[index].status || 'Active') === 'Active' ? 'Inactive' : 'Active';
  rows[index].updatedAt = new Date().toISOString();
  writeRows(sheet, rows);
  return { student: rows[index] };
}

function handleListDeletedStudents() {
  return { deletedStudents: getRows(getOrCreateSheet('DeletedStudents')) };
}

function handleCreatePayment(payment) {
  const sheet = getOrCreateSheet('Payments');
  const rows = getRows(sheet);
  const requestedMonth = parseInt(payment.month, 10);
  const requestedYear = parseInt(payment.year, 10);
  const dateValue = requestedMonth >= 1 && requestedMonth <= 12 && requestedYear >= 2020
    ? new Date(requestedYear, requestedMonth - 1, 1)
    : payment.paymentDate ? new Date(payment.paymentDate) : new Date();
  const amount = parseNumber(payment.amount);
  const paidAmount = parseNumber(payment.paidAmount);
  const newPayment = {
    paymentId: generateId('pay'),
    studentId: payment.studentId || '',
    studentName: payment.studentName || '',
    fatherName: payment.fatherName || '',
    joinDate: payment.joinDate || '',
    currentSection: payment.currentSection || '',
    currentSeat: payment.currentSeat || '',
    paymentDate: dateValue.toISOString().split('T')[0],
    month: String(requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : dateValue.getMonth() + 1),
    year: String(requestedYear >= 2020 ? requestedYear : dateValue.getFullYear()),
    amount: String(amount),
    paidAmount: String(paidAmount),
    dueAmount: String(parseNumber(payment.dueAmount)),
    paymentStatus: payment.paymentStatus || (paidAmount >= amount ? 'Paid' : 'Due'),
    mode: payment.mode || '',
    receivedBy: payment.receivedBy || '',
    remarks: payment.remarks || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rows.push(newPayment);
  writeRows(sheet, rows);
  updateStudentBalanceAfterPayment(newPayment.studentId);
  return { payment: newPayment };
}

function updateStudentBalanceAfterPayment(studentId) {
  if (!studentId) return null;

  const studentsSheet = getOrCreateSheet('Students');
  const students = getRows(studentsSheet);
  const index = students.findIndex(row => String(row.id) === String(studentId));
  if (index === -1) return null;

  const student = students[index];
  const monthlyFee = parseNumber(student.monthlyFee);
  const joinDate = parseDateOnly(student.joinDate);
  if (!monthlyFee || !joinDate) return student;

  const payments = getRows(getOrCreateSheet('Payments'))
    .filter(payment => String(payment.studentId) === String(studentId));
  const completedMonths = getCompletedBillingMonths(joinDate, new Date());
  const expected = monthlyFee * completedMonths;
  const paid = payments.reduce((total, payment) => total + parseNumber(payment.paidAmount), 0);
  const balance = expected - paid;
  const status = balance > 0 ? 'Due' : balance < 0 ? 'Advance' : completedMonths === 0 ? 'Not Due Yet' : 'Paid';

  students[index] = {
    ...student,
    dueAmount: String(Math.max(balance, 0)),
    paymentStatus: status,
    updatedAt: new Date().toISOString(),
  };
  writeRows(studentsSheet, students);
  return students[index];
}

function parseDateOnly(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const date = new Date(text.indexOf('T') === -1 ? `${text}T00:00:00` : text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCompletedBillingMonths(joinDate, currentDate) {
  let months = (currentDate.getFullYear() - joinDate.getFullYear()) * 12 + currentDate.getMonth() - joinDate.getMonth();
  if (currentDate.getDate() < joinDate.getDate()) months--;
  return Math.max(months, 0);
}

function handleUpdatePayment(payment) {
  const sheet = getOrCreateSheet('Payments');
  const rows = getRows(sheet);
  const index = rows.findIndex(row => String(row.paymentId) === String(payment.paymentId));
  if (index === -1) return { error: 'Payment not found' };

  const dateValue = payment.paymentDate ? new Date(payment.paymentDate) : new Date(rows[index].paymentDate || new Date());
  const amount = parseNumber(payment.amount);
  const paidAmount = parseNumber(payment.paidAmount);
  rows[index] = {
    ...rows[index],
    ...payment,
    paymentDate: dateValue.toISOString().split('T')[0],
    month: String(dateValue.getMonth() + 1),
    year: String(dateValue.getFullYear()),
    amount: String(amount),
    paidAmount: String(paidAmount),
    paymentStatus: payment.paymentStatus || (paidAmount >= amount ? 'Paid' : 'Due'),
    updatedAt: new Date().toISOString(),
  };
  writeRows(sheet, rows);
  return { payment: rows[index] };
}

function handleDeletePayment(paymentId) {
  const sheet = getOrCreateSheet('Payments');
  const rows = getRows(sheet);
  const filtered = rows.filter(row => String(row.paymentId) !== String(paymentId));
  if (filtered.length === rows.length) return { error: 'Payment not found' };
  writeRows(sheet, filtered);
  return { success: true };
}

function handleListPayments(payload) {
  let rows = getRows(getOrCreateSheet('Payments'));
  if (payload.month) rows = rows.filter(r => String(r.month) === String(payload.month));
  if (payload.year) rows = rows.filter(r => String(r.year) === String(payload.year));
  if (payload.studentId) rows = rows.filter(r => String(r.studentId) === String(payload.studentId));
  return { payments: rows };
}

function handleMonthlyCollectionSummary(payload) {
  const month = payload.month || new Date().getMonth() + 1;
  const year = payload.year || new Date().getFullYear();
  const rows = getRows(getOrCreateSheet('Payments')).filter(r => String(r.month) === String(month) && String(r.year) === String(year));
  const totalPaid = rows.reduce((sum, p) => sum + parseNumber(p.paidAmount), 0);
  const totalExpected = rows.reduce((sum, p) => sum + parseNumber(p.amount), 0);
  const totalDue = rows.reduce((sum, p) => sum + Math.max(parseNumber(p.amount) - parseNumber(p.paidAmount), 0), 0);
  return { summary: { month: Number(month), year: Number(year), totalPaid, totalDue, totalExpected, paymentsCount: rows.length } };
}

function handleListBookings(payload) {
  let rows = getRows(getOrCreateSheet('Bookings'));
  if (payload.status) rows = rows.filter(r => String(r.status || '').toUpperCase() === String(payload.status || '').toUpperCase());
  return { bookings: rows };
}

function handleCreateBooking(booking) {
  const sheet = getOrCreateSheet('Bookings');
  const rows = getRows(sheet);
  const dateValue = booking.requestedDate ? new Date(booking.requestedDate) : new Date();
  const record = {
    bookingId: generateId('book'),
    name: booking.name || '',
    phone: booking.phone || '',
    email: booking.email || '',
    purpose: booking.purpose || '',
    notes: booking.notes || '',
    requestedSection: booking.requestedSection || '',
    requestedSeatType: booking.requestedSeatType || '',
    requestedDate: dateValue.toISOString().split('T')[0],
    status: 'Pending',
    approvedBy: '',
    rejectedReason: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rows.push(record);
  writeRows(sheet, rows);
  return { booking: record };
}

function handleApproveBooking(bookingId, approvedBy) {
  const sheet = getOrCreateSheet('Bookings');
  const rows = getRows(sheet);
  const index = rows.findIndex(row => String(row.bookingId) === String(bookingId));
  if (index === -1) return { error: 'Booking not found' };
  rows[index].status = 'Approved';
  rows[index].approvedBy = approvedBy || '';
  rows[index].updatedAt = new Date().toISOString();
  writeRows(sheet, rows);
  return { booking: rows[index] };
}

function handleRejectBooking(bookingId, reason) {
  const sheet = getOrCreateSheet('Bookings');
  const rows = getRows(sheet);
  const index = rows.findIndex(row => String(row.bookingId) === String(bookingId));
  if (index === -1) return { error: 'Booking not found' };
  rows[index].status = 'Rejected';
  rows[index].rejectedReason = reason || '';
  rows[index].updatedAt = new Date().toISOString();
  writeRows(sheet, rows);
  return { booking: rows[index] };
}

function handleListNotices(payload) {
  return { notices: getRows(getOrCreateSheet('Notices')) };
}

function handleCreateNotice(notice) {
  const sheet = getOrCreateSheet('Notices');
  const rows = getRows(sheet);
  const newNotice = {
    id: generateId('notice'),
    title: notice.title || '',
    content: notice.content || '',
    expiryDate: notice.expiryDate || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rows.push(newNotice);
  writeRows(sheet, rows);
  return { notice: newNotice };
}

function handleUpdateNotice(notice) {
  const sheet = getOrCreateSheet('Notices');
  const rows = getRows(sheet);
  const index = rows.findIndex(row => String(row.id) === String(notice.id));
  if (index === -1) return { error: 'Notice not found' };
  rows[index] = {
    ...rows[index],
    ...notice,
    updatedAt: new Date().toISOString(),
  };
  writeRows(sheet, rows);
  return { notice: rows[index] };
}

function handleDeleteNotice(id) {
  const sheet = getOrCreateSheet('Notices');
  const rows = getRows(sheet);
  const filtered = rows.filter(row => String(row.id) !== String(id));
  if (filtered.length === rows.length) return { error: 'Notice not found' };
  writeRows(sheet, filtered);
  return { success: true };
}

function handleUploadStudentPhoto(payload) {
  const dataUrl = String(payload.dataUrl || payload.photoDataUrl || '').trim();
  const fileName = String(payload.fileName || `student-photo-${Date.now()}`).trim();
  const mimeType = String(payload.mimeType || payload.contentType || 'image/png').trim();
  if (!dataUrl) return { error: 'Missing photo data' };

  const file = savePhotoDataUrl(dataUrl, fileName, mimeType);
  const photoDriveUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
  return { fileId: file.getId(), photoDriveUrl, webViewLink: file.getUrl() };
}

function savePhotoDataUrl(dataUrl, fileName, mimeType) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (!match) throw new Error('Invalid photo data format');

  const folder = getPhotoFolder();
  const blob = Utilities.newBlob(Utilities.base64Decode(match[2]), mimeType || match[1], fileName || `photo_${Date.now()}`);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file;
}

function getPhotoFolder() {
  const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
}

function getHeadersForSheet(name) {
  const headers = {
    Students: ['id', 'studentName', 'phone', 'adharNumber', 'email', 'fatherName', 'parentPhone', 'gender', 'dob', 'joinDate', 'monthlyFee', 'address', 'examPreparation', 'currentSection', 'currentSeat', 'seatType', 'status', 'paymentStatus', 'dueAmount', 'photoDriveUrl', 'registeredAt', 'updatedAt'],
    DeletedStudents: ['id', 'studentName', 'phone', 'adharNumber', 'email', 'fatherName', 'parentPhone', 'gender', 'dob', 'joinDate', 'monthlyFee', 'address', 'examPreparation', 'currentSection', 'currentSeat', 'seatType', 'status', 'paymentStatus', 'dueAmount', 'photoDriveUrl', 'registeredAt', 'updatedAt', 'deletedAt', 'deletedBy', 'deleteReason'],
    Payments: ['paymentId', 'studentId', 'studentName', 'fatherName', 'joinDate', 'currentSection', 'currentSeat', 'paymentDate', 'month', 'year', 'amount', 'paidAmount', 'dueAmount', 'paymentStatus', 'mode', 'receivedBy', 'remarks', 'createdAt', 'updatedAt'],
    Bookings: ['bookingId', 'name', 'phone', 'email', 'purpose', 'notes', 'requestedSection', 'requestedSeatType', 'requestedDate', 'status', 'approvedBy', 'rejectedReason', 'createdAt', 'updatedAt'],
    Notices: ['id', 'title', 'content', 'expiryDate', 'createdAt', 'updatedAt'],
    Admins: ['id', 'username', 'password', 'role', 'createdAt'],
  };
  return headers[name] || [];
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  const headers = getHeadersForSheet(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers.length) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }
  if (headers.length) {
    const lastColumn = Math.max(sheet.getLastColumn(), 1);
    const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0] || [];
    const normalized = existing.map(h => String(h || '').trim());
    if (!normalized.some(Boolean)) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const missingHeaders = headers.filter(header => !normalized.includes(header));
      if (missingHeaders.length) {
        sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      }
    }
  }
  return sheet;
}

function getRows(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (!values || !values.length) return [];
  const headers = values[0] || [];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== '' ? row[index] : '';
    });
    return obj;
  });
}

function writeRows(sheet, rows) {
  if (!sheet) return;
  const headers = rows.length ? Object.keys(rows[0]) : getHeadersForSheet(sheet.getName());
  const values = [headers].concat(rows.map(row => headers.map(key => row[key] || '')));
  sheet.clearContents();
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
}

function ensureDefaultAdminExists(sheet) {
  const rows = getRows(sheet);
  const hasAdmin = rows.some(row => String(row.username || '').trim() === 'admin' && String(row.password || '').trim() === 'admin123');
  if (!hasAdmin) {
    sheet.appendRow(['admin_1', 'admin', 'admin123', 'super_admin', new Date().toISOString()]);
  }
}

function getRequestBody(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      // ignore parse error and fall back to parameter parsing
    }
  }
  if (e.parameter) {
    const body = {};
    if (e.parameter.action) body.action = e.parameter.action;
    if (e.parameter.payload) {
      try {
        body.payload = JSON.parse(e.parameter.payload);
      } catch (error) {
        body.payload = { raw: e.parameter.payload };
      }
    }
    return body;
  }
  return {};
}

function getCallback(e) {
  if (!e || !e.parameter || !e.parameter.callback) return null;
  const callback = String(e.parameter.callback || '').trim();
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) return callback;
  return null;
}

function getAction(e) {
  if (e.parameter && e.parameter.action) return e.parameter.action;
  const body = getRequestBody(e);
  return body.action || null;
}

function getAuthorizationToken(e) {
  const headers = (e && e.headers) || {};
  const authHeader = headers.Authorization || headers.authorization || '';
  const match = authHeader.match(/Bearer\s+(.+)/i);
  return match ? match[1] : null;
}

function getPayloadToken(e) {
  const body = getRequestBody(e);
  return body && body.payload && body.payload.token ? String(body.payload.token) : null;
}

function requireAuth(e) {
  const token = getAuthorizationToken(e) || getPayloadToken(e);
  if (!token) return null;
  return loadTokenData(token);
}

function getTokenStore() {
  return PropertiesService.getScriptProperties();
}

function saveTokenData(token, data) {
  const now = Date.now();
  getTokenStore().setProperty(token, JSON.stringify({ ...data, issuedAt: now }));
}

function loadTokenData(token) {
  const raw = getTokenStore().getProperty(token);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (Date.now() - data.issuedAt > TOKEN_TTL_MS) {
      getTokenStore().deleteProperty(token);
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
}

function generateId(prefix) {
  return `${prefix || 'id'}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function corsResponse(data, callback) {
  // Support both JSON and JSONP responses. JSONP is required for cross-origin browser requests
  // from local or remote static sites when the Apps Script web app does not provide CORS headers.
  const payload = callback ? `${callback}(${JSON.stringify(data)});` : JSON.stringify(data);
  const output = ContentService.createTextOutput(payload);
  output.setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  return output;
}

function jsonResponse(data, callback) {
  return corsResponse(data, callback);
}

function logError(action, error) {
  if (!LOG_ERRORS) return;
  Logger.log(`[${new Date().toISOString()}] [ERROR] ${action}: ${error && error.toString ? error.toString() : error}`);
}
