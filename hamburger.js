// Mobile navigation hamburger menu
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburger-btn');
    const nav = document.getElementById('main-nav');
    const navLinks = nav?.querySelectorAll('a');

    // Toggle hamburger menu
    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', hamburger.classList.contains('active'));
        });
    }

    // Close menu when a link is clicked
    if (navLinks) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Close menu on resize to desktop
    window.addEventListener('resize', () => {
        // Close menu if screen is wide enough for desktop nav
        if (window.innerWidth > 768) {
            hamburger?.classList.remove('active');
            nav?.classList.remove('active');
            hamburger?.setAttribute('aria-expanded', 'false');
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header')) {
            hamburger?.classList.remove('active');
            nav?.classList.remove('active');
            hamburger?.setAttribute('aria-expanded', 'false');
        }
    });
});

