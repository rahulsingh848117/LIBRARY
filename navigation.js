// Smooth scroll + cross-page anchor handling + simple scrollspy
(function(){
    const header = document.querySelector('.header');
    const headerHeight = header ? header.offsetHeight : 0;

    function scrollToHash(hash){
        try{
            const target = document.querySelector(hash);
            if (!target) return false;
            const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 8;
            window.scrollTo({ top, behavior: 'smooth' });
            return true;
        }catch(e){ return false; }
    }

    document.addEventListener('click', (e)=>{
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        e.preventDefault();
        const hash = href.split('#')[1] ? ('#' + href.split('#')[1]) : href;
        // if current page is index.html or root, scroll; otherwise navigate to index.html#hash
        const path = window.location.pathname.split('/').pop();
        if (!path || path === 'index.html' || path === ''){
            scrollToHash(hash);
            history.replaceState(null,'',hash);
        } else {
            window.location.href = 'index.html' + hash;
        }
    });

    // simple scrollspy
    const navLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
    const sections = navLinks.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
    function onScroll(){
        const fromTop = window.scrollY + headerHeight + 12;
        let current = null;
        for (const sec of sections){
            if (sec.offsetTop <= fromTop) current = sec;
        }
        if (!current) return;
        navLinks.forEach(l=> l.classList.toggle('active', l.getAttribute('href') === ('#'+ current.id)));
    }
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', ()=>{ /* recalc header height if needed */ });
    // run on load if there is a hash
    window.addEventListener('DOMContentLoaded', ()=>{
        if (location.hash) scrollToHash(location.hash);
        onScroll();
    });
})();
