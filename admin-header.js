// Adds admin indicator in header (only on non-admin pages)
(function(){
    try{
        if (!window.adminAuth) return;
        const s = adminAuth.getSession();
        if (!s) return;

        // Don't add to admin-dashboard or other admin pages - they have their own header
        const isAdminPage = window.location.pathname.includes('admin-dashboard') || 
                           window.location.pathname.includes('admin-students') ||
                           window.location.pathname.includes('admin-login');
        
        if (isAdminPage) return;

        // Reveal any register link placeholders
        const regLink = document.getElementById('nav-register-link');
        if (regLink) regLink.style.display = '';

        // Add small admin badge + logout on regular pages only
        const header = document.querySelector('.header .container') || document.querySelector('.header-inner') || document.querySelector('header');
        if (!header) return;

        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.marginLeft = '12px';

        const badge = document.createElement('div');
        badge.textContent = s.username;
        badge.style.background = 'var(--bhagwa-dark, #7a5a2b)';
        badge.style.color = '#fff';
        badge.style.padding = '6px 10px';
        badge.style.borderRadius = '10px';
        badge.style.fontWeight = '600';
        badge.style.marginRight = '8px';
        badge.style.fontSize = '0.85rem';

        const logout = document.createElement('a');
        logout.href = '#';
        logout.textContent = 'Logout';
        logout.className = 'cta-link';
        logout.style.fontSize = '0.85rem';
        logout.addEventListener('click', function(e){ e.preventDefault(); adminAuth.logout(); });

        wrapper.appendChild(badge);
        wrapper.appendChild(logout);

        // append to header (right side)
        header.appendChild(wrapper);
    }catch(e){ console.error(e); }
})();
