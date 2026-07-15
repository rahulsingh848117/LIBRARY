const shiftSelect = document.getElementById('shift-select');
const seatTypeDisplay = document.getElementById('seat-type');
const durationBtns = document.querySelectorAll('.duration-btn');
const discountCheckbox = document.getElementById('use-discount');
const discountInputs = document.getElementById('discount-inputs');
const discountPercentInput = document.getElementById('discount-percent');
const discountLabelInput = document.getElementById('discount-label');
const addToCartBtn = document.getElementById('add-to-cart');
const bookingList = document.getElementById('booking-list');
const bookingSummary = document.getElementById('booking-summary');
const totalBookingsDisplay = document.getElementById('total-bookings');
const bookingTotalDisplay = document.getElementById('booking-total');
const clearBookingsBtn = document.getElementById('clear-bookings');
const pendingBookingKey = 'spLibraryBookingDraft';

let currentShift = null;
let currentDuration = 30;
let useDiscount = false;
let bookings = JSON.parse(sessionStorage.getItem('spLibraryBookings') || '[]') || [];

const durationLabels = {
    30: '1 Month',
    90: '3 Months',
    180: '6 Months',
    365: '1 Year'
};

const durationFactors = {
    30: 1,
    90: 3,
    180: 6,
    365: 12
};

function setDurationButton(duration) {
    durationBtns.forEach(btn => {
        const value = parseInt(btn.getAttribute('data-duration'), 10);
        btn.classList.toggle('active', value === duration);
    });
    currentDuration = duration;
    updateCalculation();
}

durationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setDurationButton(parseInt(btn.getAttribute('data-duration'), 10));
    });
});

shiftSelect?.addEventListener('change', () => {
    if (!shiftSelect.value) {
        currentShift = null;
        seatTypeDisplay.textContent = 'Select a shift to see seat type';
        seatTypeDisplay.className = 'seat-badge';
        updateCalculation();
        return;
    }

    const parts = shiftSelect.value.split('|');
    currentShift = {
        name: shiftSelect.options[shiftSelect.selectedIndex].text,
        time: parts[0],
        price: parseInt(parts[1], 10),
        hours: parseFloat(parts[2]),
        seatType: parts[3]
    };

    if (currentShift.seatType === 'fixed') {
        seatTypeDisplay.textContent = '✓ Fixed Seat';
        seatTypeDisplay.className = 'seat-badge fixed';
    } else {
        seatTypeDisplay.textContent = '⚠ Random Seat — may be assigned daily in peak hours';
        seatTypeDisplay.className = 'seat-badge random';
    }

    updateCalculation();
});

discountCheckbox?.addEventListener('change', () => {
    useDiscount = discountCheckbox.checked;
    discountInputs.classList.toggle('hidden', !useDiscount);
    updateCalculation();
});

discountPercentInput?.addEventListener('input', updateCalculation);
discountLabelInput?.addEventListener('input', updateCalculation);

function updateCalculation() {
    const dailyRateEl = document.getElementById('daily-rate');
    const durationTextEl = document.getElementById('duration-text');
    const subtotalEl = document.getElementById('subtotal');
    const totalAmountEl = document.getElementById('total-amount');
    const discountRowEl = document.getElementById('discount-row');
    const discountLabelDisplayEl = document.getElementById('discount-label-display');
    const discountAmountEl = document.getElementById('discount-amount');

    if (!currentShift) {
        if (dailyRateEl) dailyRateEl.textContent = '₹0';
        if (durationTextEl) durationTextEl.textContent = durationLabels[currentDuration] || `${currentDuration} Days`;
        if (subtotalEl) subtotalEl.textContent = '₹0';
        if (totalAmountEl) totalAmountEl.textContent = '₹0';
        if (discountRowEl) discountRowEl.classList.add('hidden');
        return;
    }

    const shiftRate = currentShift.price;
    const durationFactor = durationFactors[currentDuration] || 1;
    const subtotal = shiftRate * durationFactor;
    const discountPercent = useDiscount ? parseInt(discountPercentInput.value, 10) || 0 : 0;
    const discount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discount;
    const discountLabel = discountLabelInput.value.trim() || `${discountPercent}% Off`;

    if (dailyRateEl) dailyRateEl.textContent = `₹${shiftRate}`;
    if (durationTextEl) durationTextEl.textContent = durationLabels[currentDuration] || `${currentDuration} Days`;
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
    if (totalAmountEl) totalAmountEl.textContent = `₹${total}`;

    if (useDiscount && discountPercent > 0) {
        if (discountRowEl) discountRowEl.classList.remove('hidden');
        if (discountLabelDisplayEl) discountLabelDisplayEl.textContent = `${discountLabel}:`;
        if (discountAmountEl) discountAmountEl.textContent = `-₹${discount}`;
    } else if (discountRowEl) {
        discountRowEl.classList.add('hidden');
    }
}

addToCartBtn?.addEventListener('click', () => {
    if (!currentShift) {
        alert('Please choose a shift before continuing to the booking form.');
        return;
    }

    const durationFactor = durationFactors[currentDuration] || 1;
    const subtotal = currentShift.price * durationFactor;
    const discountPercent = useDiscount ? parseInt(discountPercentInput.value, 10) || 0 : 0;
    const discount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discount;
    const durationText = durationLabels[currentDuration] || `${currentDuration} Days`;
    const label = discountLabelInput.value.trim() || '';

    const draftBooking = {
        id: Date.now(),
        shift: currentShift.name,
        time: currentShift.time,
        durationText,
        durationDays: currentDuration,
        seatType: currentShift.seatType,
        dailyRate: currentShift.price,
        subtotal,
        discountPercent,
        discountLabel: label,
        discountAmount: discount,
        total
    };

    sessionStorage.setItem(pendingBookingKey, JSON.stringify(draftBooking));
    window.location.href = 'booking.html';
});

function renderBookings() {
    if (!bookingList) return;

    if (bookings.length === 0) {
        bookingList.innerHTML = '<p class="empty-message">Your booking cart is empty. Add a plan from the calculator above.</p>';
        bookingSummary?.classList.add('hidden');
        return;
    }

    bookingList.innerHTML = '';
    let totalAmount = 0;

    bookings.forEach(booking => {
        const bookingPrice = booking.total || booking.price || 0;
        totalAmount += bookingPrice;
        const item = document.createElement('div');
        item.className = 'booking-item';
        item.innerHTML = `
            <div class="booking-details">
                <div class="booking-shift">${booking.shift}</div>
                <div class="booking-meta">${booking.durationText} • Seat: ${booking.seatType === 'fixed' ? 'Fixed' : 'Random'}</div>
            </div>
            <div class="booking-price">₹${bookingPrice}</div>
            <button class="booking-remove" type="button">Remove</button>
        `;

        item.querySelector('.booking-remove').addEventListener('click', () => {
            removeBooking(booking.id);
        });

        bookingList.appendChild(item);
    });

    totalBookingsDisplay.textContent = bookings.length;
    bookingTotalDisplay.textContent = `₹${totalAmount}`;
    bookingSummary?.classList.remove('hidden');
}

function removeBooking(id) {
    bookings = bookings.filter(booking => booking.id !== id);
    localStorage.setItem('spLibraryBookings', JSON.stringify(bookings));
    renderBookings();
}

clearBookingsBtn?.addEventListener('click', () => {
    if (confirm('Clear all bookings?')) {
        bookings = [];
        localStorage.setItem('spLibraryBookings', JSON.stringify(bookings));
        renderBookings();
    }
});

window.addEventListener('DOMContentLoaded', () => {
    if (durationBtns.length) {
        setDurationButton(30);
    }
    renderBookings();
    updateCalculation();
});