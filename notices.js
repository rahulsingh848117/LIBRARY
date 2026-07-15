// Notice Management System (Server-backed)
(function() {
    async function getNotices() {
        if (typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled) {
            try {
                const res = await apiClient.request('listNotices', {}, { method: 'POST' });
                return res.notices || [];
            } catch (err) {
                console.error('Failed to load notices from API:', err);
                return [];
            }
        }
        console.error('API not available: cannot load notices');
        return [];
    }

    async function addNotice(title, content, expiryDate = null) {
        if (!(typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled)) {
            throw new Error('API not available: cannot add notice');
        }
        try {
            const payload = { notice: { title, content, expiryDate } };
            const res = await apiClient.request('createNotice', payload, { method: 'POST' });
            return res.notice || null;
        } catch (err) {
            console.error('Failed to create notice:', err);
            throw err;
        }
    }

    async function deleteNotice(id) {
        if (!(typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled)) {
            throw new Error('API not available: cannot delete notice');
        }
        try {
            await apiClient.request('deleteNotice', { id }, { method: 'POST' });
            return true;
        } catch (err) {
            console.error('Failed to delete notice:', err);
            return false;
        }
    }

    async function getActiveNotices() {
        const notices = await getNotices();
        const now = new Date();
        return notices.filter(n => {
            if (n.active === false) return false;
            if (n.expiryDate && new Date(n.expiryDate) < now) return false;
            return true;
        });
    }

    async function renderNotices(containerId, limit = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const activeNotices = (await getActiveNotices()).slice(0, limit);
        if (activeNotices.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No active notices</p>';
            return;
        }
        let html = '<div class="notices-grid">';
        activeNotices.forEach(notice => {
            html += `
                <div class="notice-card" data-id="${notice.id}">
                    <div class="notice-title">${notice.title}</div>
                    <div class="notice-content">${notice.content}</div>
                    <div class="notice-meta">${new Date(notice.createdAt).toLocaleDateString()}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // Expose global API
    window.noticeManager = {
        add: addNotice,
        delete: deleteNotice,
        getActive: getActiveNotices,
        getAll: getNotices,
        render: renderNotices
    };
})();
