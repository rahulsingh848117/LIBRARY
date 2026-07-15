# API Setup & Dashboard Guide

## 🔧 Recent Improvements

### 1. **API Client Enhancements** (`api-client.js`)
- ✅ **Better Token Handling**: Tokens now sent via Authorization header for protected endpoints
- ✅ **Retry Logic**: Automatic retries with exponential backoff (up to 2 retries)
- ✅ **Timeout Protection**: 15-second timeout on all requests
- ✅ **JSON Content-Type**: Changed from form-encoded to JSON for cleaner data handling
- ✅ **Error Logging**: Better error messages and logging
- ✅ **Token Management**: Improved token storage and retrieval

### 2. **Google Apps Script Improvements** (`google-apps-script.gs`)
- ✅ **Error Handling**: Try-catch blocks on all functions
- ✅ **Better Request Parsing**: Handles both JSON and form-encoded requests
- ✅ **Status Codes**: Proper HTTP status codes for errors
- ✅ **New Endpoints**: Added `listNotices`, `createNotice`, `updateNotice`, `deleteNotice`
- ✅ **Booking Stats**: Dashboard now tracks pending bookings
- ✅ **Validation**: Better input validation and error messages

### 3. **Admin Dashboard Rebuild** (`admin-dashboard.html`)
The dashboard now displays all database features:

#### 📊 Statistics Dashboard
- 👥 **Total Students**: Shows active/inactive counts
- 💺 **Seat Occupancy**: Real-time seat allocation
- 💰 **Monthly Collections**: Payment summary with due amounts
- 📅 **Pending Bookings**: Quick overview of requests

#### 📍 Section Capacity
- Shows occupancy for all sections (A, B, C, D)
- Visual progress bars for each section
- Capacity percentage calculation

#### 💳 Payment Management
- **Monthly Summary Tab**: Total expected, paid, due, and payment count
- **Payment List Tab**: Detailed payment records
- **Quick Record Form**: Add payments directly from dashboard
- Supports: Cash, Check, UPI, Bank Transfer

#### 📋 Bookings & Inquiries
- **Pending Bookings**: New inquiries requiring approval
- **All Bookings**: Complete booking history
- **Booking Statistics**: Totals for Pending, Approved, Rejected
- **Quick Actions**: Approve/Reject buttons for each booking

#### 📢 Notices Management
- **Add New Notice**: Form to create notices with expiry dates
- **Active Notices**: List of current notices
- **Delete Function**: Remove expired or outdated notices

#### 👤 Admin Profile
- Shows logged-in admin username
- Display admin role
- Last login timestamp

---

## 🚀 Setup Instructions

### Step 1: Configure Google Apps Script
1. Open [Google Apps Script Console](https://script.google.com/)
2. Create a new project or open an existing one
3. Replace the entire content with the updated `google-apps-script.gs`
4. Find this line and update with your spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
   ```
5. To get your spreadsheet ID:
   - Open your Google Sheet
   - The ID is in the URL: `sheets.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`
6. Deploy as a web app:
   - Click "Deploy" → "New Deployment"
   - Type: "Web app"
   - Execute as: Your account
   - Who has access: "Anyone"
   - Click "Deploy"
7. Copy the deployment URL

### Step 2: Update API Client
1. Open `api-client.js`
2. Find this line:
   ```javascript
   const API_BASE_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```
3. Replace `YOUR_DEPLOYMENT_ID` with the ID from your deployment URL
4. Save the file

### Step 3: Set Up Google Sheet
Create a Google Sheet with these tabs (sheets):
- `Students` - Student records
- `Admins` - Admin accounts (default: admin/admin123)
- `Notices` - Notices for homepage
- `Payments` - Payment records
- `DeletedStudents` - Archived students
- `MonthlyRecords` - Monthly snapshots
- `SectionHistory` - Section changes
- `Bookings` - Booking inquiries

*Note: The script auto-creates tabs if missing*

### Step 4: Test the Connection
1. Go to admin-login.html
2. Login with: `admin` / `admin123`
3. You should see the dashboard with live data
4. Try creating a payment record - it should save to Google Sheets

---

## 📱 Dashboard Features Overview

### Available Actions
| Feature | Location | Action |
|---------|----------|--------|
| Student Stats | Top Cards | Auto-refreshes every minute |
| Payments | Payment Tab | Add/View payment records |
| Bookings | Bookings Tab | Approve or reject inquiries |
| Notices | Notices Tab | Create/Delete announcements |
| Section Info | Capacity Card | View occupancy per section |

### Data Refresh
- Dashboard refreshes every 60 seconds automatically
- Manual refresh by reloading page
- Each section loads independently

---

## 🔐 Security Features
- Token-based authentication
- 4-hour token expiration
- Secure storage in browser (session/local)
- Authorization headers on protected endpoints
- Input validation on all forms

---

## 🐛 Troubleshooting

### "API not configured" Error
- Check that API_BASE_URL in `api-client.js` is correct
- Verify deployment URL format: `https://script.google.com/macros/s/[ID]/exec`

### Dashboard shows only local data
- Verify Google Sheet ID is correct in `google-apps-script.gs`
- Check that deployment is "Anyone" access level
- Look at browser console (F12) for error messages

### Payments not saving
- Ensure Payments sheet exists in Google Sheet
- Check Admin has proper role in Admins sheet
- Verify API token is valid (try logout/login)

### "Unauthorized" errors
- Login again to refresh token
- Check token expiration (4 hours)
- Verify action is not in OPEN_ACTIONS list if it needs auth

---

## 📊 Data Structure

### Students Collection
```
id, studentName, phone, adharNumber, email, fatherName,
parentPhone, gender, dob, address, examPreparation,
currentSection, currentSeat, seatType, status, paymentStatus,
dueAmount, photoDriveUrl, registeredAt, updatedAt
```

### Payments Collection
```
paymentId, studentId, studentName, paymentDate, month, year,
amount, paidAmount, paymentStatus, mode, receivedBy, remarks,
createdAt, updatedAt
```

### Bookings Collection
```
bookingId, name, phone, email, purpose, notes, requestedSection,
requestedSeatType, requestedDate, status, approvedBy, 
rejectedReason, createdAt, updatedAt
```

---

## 🔄 API Endpoints

### Public Endpoints (No Auth Required)
- `login` - Admin login
- `createBooking` - New booking inquiry
- `ping` - Health check

### Protected Endpoints (Require Auth)
- `dashboardSummary` - Get summary statistics
- `listStudents` - Get all students
- `createStudent` - Add new student
- `listPayments` - Get payment records
- `createPayment` - Record payment
- `listBookings` - Get bookings
- `approveBooking` - Approve booking
- `rejectBooking` - Reject booking
- `listNotices` - Get notices
- `createNotice` - Add notice
- `deleteNotice` - Remove notice

---

## ✅ Success Indicators
- Dashboard loads with real student counts
- Section breakdown shows capacity
- Payment form submits successfully
- Bookings appear in the list
- Notices save and display
- Token persists across page reloads

For detailed endpoint documentation, see `google-apps-script.gs` source code.
