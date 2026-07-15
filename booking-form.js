const bookingFormElement = document.getElementById('booking-form-sheet');
const summaryContent = document.getElementById('summary-content');
const confirmationMessage = document.getElementById('confirmation-message');
const pendingBookingKey = 'spLibraryBookingDraft';
const savedRecordsKey = 'spLibraryBookingRecords';
const emailRecipient = 'rahulsingh848117@gmail.com';

function loadDraftBooking() {
    const draftText = sessionStorage.getItem(pendingBookingKey);
    if (!draftText) {
        summaryContent.innerHTML = `
            <p class="text-center">No booking has been selected yet. Please return to the calculator and choose a shift first.</p>
            <div class="text-center" style="margin-top:16px;"><a href="booking.html" class="cta-link">Go back to Booking</a></div>
        `;
        bookingFormElement?.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
        return null;
    }

    const draftBooking = JSON.parse(draftText);
    summaryContent.innerHTML = `
        <div class="booking-summary-item"><strong>Shift</strong><span>${draftBooking.shift}</span></div>
        <div class="booking-summary-item"><strong>Time</strong><span>${draftBooking.time}</span></div>
        <div class="booking-summary-item"><strong>Seat Type</strong><span>${draftBooking.seatType === 'fixed' ? 'Fixed' : 'Random'}</span></div>
        <div class="booking-summary-item"><strong>Duration</strong><span>${draftBooking.durationText}</span></div>
        <div class="booking-summary-item"><strong>Shift Rate</strong><span>₹${draftBooking.dailyRate}</span></div>
        <div class="booking-summary-item"><strong>Subtotal</strong><span>₹${draftBooking.subtotal}</span></div>
        <div class="booking-summary-item"><strong>Discount</strong><span>${draftBooking.discountPercent}%</span></div>
        <div class="booking-summary-item" style="font-weight:800; color: var(--bhagwa-dark);"><strong>Total</strong><span>₹${draftBooking.total}</span></div>
    `;
    return draftBooking;
}

function downloadBookingFile(record) {
    const text = [
        'S P Library Booking Request',
        '===========================',
        `Name: ${record.customer.name}`,
        `Father's Name: ${record.customer.fatherName}`,
        `Gender: ${record.customer.gender}`,
        `Email: ${record.customer.email}`,
        `Phone: ${record.customer.phone}`,
        `Address: ${record.customer.address}`,
        `Notes: ${record.customer.notes}`,
        '',
        `Shift: ${record.shift}`,
        `Time: ${record.time}`,
        `Seat Type: ${record.seatType}`,
        `Duration: ${record.durationText}`,
        `Shift Rate: ₹${record.dailyRate}`,
        `Subtotal: ₹${record.subtotal}`,
        `Discount: ${record.discountPercent}% (${record.discountLabel || 'N/A'})`,
        `Discount Amount: -₹${record.discountAmount}`,
        `Total: ₹${record.total}`,
        `Submitted At: ${record.submittedAt}`
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sp-library-booking-${record.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function sendBookingEmail(record) {
    const subject = encodeURIComponent('S P Library Booking Submission');
    const body = encodeURIComponent(`Hello S P Library team,%0D%0A%0D%0AI have submitted a booking request with the following details:%0D%0A%0D%0AName: ${record.customer.name}%0D%0AFather's Name: ${record.customer.fatherName}%0D%0AGender: ${record.customer.gender}%0D%0AEmail: ${record.customer.email}%0D%0APhone: ${record.customer.phone}%0D%0AAddress: ${record.customer.address}%0D%0ANotes: ${record.customer.notes}%0D%0A%0D%0AShift: ${record.shift}%0D%0ATime: ${record.time}%0D%0ASeat Type: ${record.seatType}%0D%0ADuration: ${record.durationText}%0D%0AShift Rate: ₹${record.dailyRate}%0D%0ASubtotal: ₹${record.subtotal}%0D%0ADiscount: ${record.discountPercent}% (${record.discountLabel || 'N/A'})%0D%0ADiscount Amount: -₹${record.discountAmount}%0D%0ATotal: ₹${record.total}%0D%0A%0D%0AThanks!`);
    window.location.href = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;
}

async function handleFormSubmission(draftBooking) {
    bookingFormElement?.addEventListener('submit', async event => {
        event.preventDefault();
        if (!draftBooking) return;

        const name = document.getElementById('full-name').value.trim();
        const fatherName = document.getElementById('father-name').value.trim();
        const gender = document.getElementById('gender').value;
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address').value.trim();
        const notes = document.getElementById('notes').value.trim();

        if (!name || !fatherName || !gender || !email || !phone) {
            alert('Please complete all required fields before submitting.');
            return;
        }

        const bookingPayload = {
            name,
            fatherName,
            gender,
            email,
            phone,
            address,
            notes,
            purpose: 'Library Booking',
            requestedSection: draftBooking.shift || '',
            requestedSeatType: draftBooking.seatType || '',
            requestedDate: new Date().toISOString().split('T')[0]
        };

        let record;
        if (typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled) {
            try {
                const response = await apiClient.request('createBooking', { booking: bookingPayload }, { method: 'POST' });
                record = response.booking || { ...bookingPayload, bookingId: Date.now() };
            } catch (error) {
                console.error('Booking API failed, saving locally as fallback', error);
                record = null;
            }
        }

        if (!record) {
            record = {
                bookingId: Date.now(),
                ...bookingPayload,
                status: 'Pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const existingRecords = JSON.parse(localStorage.getItem(savedRecordsKey)) || [];
            existingRecords.push(record);
            localStorage.setItem(savedRecordsKey, JSON.stringify(existingRecords));
        }

        localStorage.removeItem(pendingBookingKey);
        downloadBookingFile(record);
        confirmationMessage.style.display = 'block';
        sendBookingEmail(record);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const draftBooking = loadDraftBooking();
    handleFormSubmission(draftBooking);
});
