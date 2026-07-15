# SP Library Google Sheets Schema

Use this schema when creating the Google Sheet for the Apps Script backend.

## Required sheet tabs

### `Students`
Columns:
- id
- studentName
- phone
- adharNumber
- seatAllocated
- section
- seatNumber
- seatType
- status
- paymentStatus
- dueAmount
- examPreparation
- address
- joinDate
- dob
- registeredAt
- updatedAt

### `Admins`
Columns:
- id
- username
- password
- role
- createdAt

Create at least one row for admin access:
- id: 1
- username: admin
- password: admin123
- role: super_admin
- createdAt: <today's date>

### `Notices`
Columns:
- id
- title
- content
- expiryDate
- createdAt
- updatedAt

### `Payments`
Columns:
- id
- studentId
- amount
- paidAmount
- dueAmount
- paymentStatus
- paidAt
- invoiceNumber
- note
- createdAt
- updatedAt

### `Seats`
Columns:
- id
- section
- seatNumber
- seatLabel
- seatType
- status
- assignedTo
- assignedAt
- updatedAt

## Deployment steps
1. Create a Google Sheet and add the tabs above.
2. Open Apps Script for the sheet.
3. Paste `google-apps-script.gs` into the script editor.
4. Replace `YOUR_SPREADSHEET_ID` in the script with the actual sheet ID.
5. Deploy as a web app with "Anyone" access or the desired sharing setting.
6. Copy the deployment URL and update `api-client.js` `API_BASE_URL`.
7. Test login via `admin-login.html`.
