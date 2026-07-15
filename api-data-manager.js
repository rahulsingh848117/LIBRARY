/**
 * API Data Manager - Handles all data operations through Google Sheets API
 * No localStorage, all data fetched and saved to Google Sheets
 */

const apiDataManager = (() => {
    // Check if API is available
    function isApiReady() {
        if (!apiClient || !apiClient.isEnabled) {
            console.error('❌ API not available. Configure API_BASE_URL in api-client.js');
            return false;
        }
        return true;
    }

    // Student operations
    const students = {
        async getAll() {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('listStudents', {}, { method: 'POST' });
                return response.students || [];
            } catch (error) {
                console.error('❌ Failed to fetch students:', error);
                throw error;
            }
        },

        async getById(id) {
            const all = await this.getAll();
            const studentId = parseInt(id, 10);
            return all.find(s => parseInt(s.id, 10) === studentId || String(s.id) === String(id));
        },

        async create(studentData) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('createStudent', { student: studentData }, { method: 'POST' });
                console.log('✓ Student created:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to create student:', error);
                throw error;
            }
        },

        async update(studentData) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('updateStudent', { student: studentData }, { method: 'POST' });
                console.log('✓ Student updated:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to update student:', error);
                throw error;
            }
        },

        async delete(id) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('deleteStudent', { id }, { method: 'POST' });
                console.log('✓ Student deleted:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to delete student:', error);
                throw error;
            }
        },

        async toggleStatus(id) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('toggleStudentStatus', { id }, { method: 'POST' });
                console.log('✓ Student status toggled:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to toggle student status:', error);
                throw error;
            }
        }
    };

    // Payment operations
    const payments = {
        async getAll() {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('listPayments', {}, { method: 'POST' });
                return response.payments || [];
            } catch (error) {
                console.error('❌ Failed to fetch payments:', error);
                throw error;
            }
        },

        async getByStudentId(studentId) {
            const all = await this.getAll();
            return all.filter(p => parseInt(p.studentId, 10) === parseInt(studentId, 10));
        },

        async create(paymentData) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('createPayment', { payment: paymentData }, { method: 'POST' });
                console.log('✓ Payment created:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to create payment:', error);
                throw error;
            }
        },

        async update(paymentData) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('updatePayment', { payment: paymentData }, { method: 'POST' });
                console.log('✓ Payment updated:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to update payment:', error);
                throw error;
            }
        },

        async delete(paymentId) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('deletePayment', { paymentId }, { method: 'POST' });
                console.log('✓ Payment deleted:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to delete payment:', error);
                throw error;
            }
        }
    };

    // Booking operations
    const bookings = {
        async getAll() {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('listBookings', {}, { method: 'POST' });
                return response.bookings || [];
            } catch (error) {
                console.error('❌ Failed to fetch bookings:', error);
                throw error;
            }
        },

        async create(bookingData) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('createBooking', { booking: bookingData }, { method: 'POST' });
                console.log('✓ Booking created:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to create booking:', error);
                throw error;
            }
        },

        async approve(bookingId) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('approveBooking', { bookingId }, { method: 'POST' });
                console.log('✓ Booking approved:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to approve booking:', error);
                throw error;
            }
        },

        async reject(bookingId, reason) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('rejectBooking', { bookingId, reason }, { method: 'POST' });
                console.log('✓ Booking rejected:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to reject booking:', error);
                throw error;
            }
        }
    };

    // Notice operations
    const notices = {
        async getAll() {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('listNotices', {}, { method: 'POST' });
                return response.notices || [];
            } catch (error) {
                console.error('❌ Failed to fetch notices:', error);
                throw error;
            }
        },

        async create(noticeData) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('createNotice', { notice: noticeData }, { method: 'POST' });
                console.log('✓ Notice created:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to create notice:', error);
                throw error;
            }
        },

        async update(noticeData) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('updateNotice', { notice: noticeData }, { method: 'POST' });
                console.log('✓ Notice updated:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to update notice:', error);
                throw error;
            }
        },

        async delete(noticeId) {
            if (!isApiReady()) throw new Error('API not ready');
            try {
                const response = await apiClient.request('deleteNotice', { noticeId }, { method: 'POST' });
                console.log('✓ Notice deleted:', response);
                return response;
            } catch (error) {
                console.error('❌ Failed to delete notice:', error);
                throw error;
            }
        }
    };

    // Utility functions
    const utils = {
        clearAllLocalStorage() {
            console.log('🗑️ Clearing all localStorage (no longer used)...');
            localStorage.removeItem('spLibraryStudentRegistrations');
            localStorage.removeItem('spLibraryPayments');
            localStorage.removeItem('spLibraryBookings');
            localStorage.removeItem('spLibraryNotices');
            sessionStorage.clear();
            console.log('✓ localStorage cleared');
        },

        formatCurrency(amount) {
            return '₹' + (parseFloat(amount) || 0).toFixed(2);
        },

        getStatusBadge(status) {
            const statusMap = {
                'Active': { bg: 'rgba(76,175,80,0.2)', color: '#2e7d32', label: '✓ Active' },
                'Inactive': { bg: 'rgba(244,67,54,0.2)', color: '#c62828', label: '✗ Inactive' },
                'Paid': { bg: 'rgba(76,175,80,0.2)', color: '#2e7d32', label: '✓ Paid' },
                'Pending': { bg: 'rgba(255,193,7,0.2)', color: '#f57f17', label: '⏱ Pending' },
                'Partial': { bg: 'rgba(33,150,243,0.2)', color: '#1565c0', label: '◐ Partial' },
                'Overdue': { bg: 'rgba(244,67,54,0.2)', color: '#c62828', label: '⚠ Overdue' }
            };
            return statusMap[status] || { bg: 'rgba(0,0,0,0.1)', color: '#666', label: status };
        }
    };

    // Public API
    return {
        students,
        payments,
        bookings,
        notices,
        utils,
        isApiReady
    };
})();

// Log initialization
console.log('✓ API Data Manager loaded (No localStorage, API-only mode)');
