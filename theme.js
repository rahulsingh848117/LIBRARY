// Theme Management System
(function() {
    const STORAGE_KEY = 'spLibraryTheme';
    
    const themes = {
        default: {
            name: 'Default (Bhagwa)',
            primary: '#FF9933',
            primaryDark: '#E67E22',
            secondary: '#7a5a2b',
            background: '#fffef9',
            backgroundAlt: '#f8f0e5',
            text: '#1F1F1F',
            textLight: '#4A4A4A',
            cardBg: '#FFFFFF',
            border: 'rgba(255, 153, 51, 0.12)'
        },
        dark: {
            name: 'Dark Mode',
            primary: '#FF9933',
            primaryDark: '#E67E22',
            secondary: '#c4b5a0',
            background: '#1a1a1a',
            backgroundAlt: '#2a2a2a',
            text: '#f5f5f5',
            textLight: '#b0b0b0',
            cardBg: '#252525',
            border: 'rgba(255, 153, 51, 0.2)'
        },
        pink: {
            name: 'Pink Theme',
            primary: '#E91E63',
            primaryDark: '#C2185B',
            secondary: '#8B4789',
            background: '#FFF3F8',
            backgroundAlt: '#FDE8F0',
            text: '#1F1F1F',
            textLight: '#4A4A4A',
            cardBg: '#FFFFFF',
            border: 'rgba(233, 30, 99, 0.12)'
        },
        skyblue: {
            name: 'Sky Blue Theme',
            primary: '#00BCD4',
            primaryDark: '#0097A7',
            secondary: '#0277BD',
            background: '#E0F7FA',
            backgroundAlt: '#B3E5FC',
            text: '#01579B',
            textLight: '#0277BD',
            cardBg: '#FFFFFF',
            border: 'rgba(0, 188, 212, 0.12)'
        },
        baghwa: {
            name: 'Baghwa (Orange)',
            primary: '#FF6F00',
            primaryDark: '#E65100',
            secondary: '#D84315',
            background: '#FFF3E0',
            backgroundAlt: '#FFE0B2',
            text: '#1F1F1F',
            textLight: '#4A4A4A',
            cardBg: '#FFFFFF',
            border: 'rgba(255, 111, 0, 0.12)'
        }
    };

    function applyTheme(themeName) {
        const theme = themes[themeName] || themes.default;
        const root = document.documentElement;

        // Apply CSS variables
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-primary-dark', theme.primaryDark);
        root.style.setProperty('--theme-secondary', theme.secondary);
        root.style.setProperty('--theme-background', theme.background);
        root.style.setProperty('--theme-background-alt', theme.backgroundAlt);
        root.style.setProperty('--theme-text', theme.text);
        root.style.setProperty('--theme-text-light', theme.textLight);
        root.style.setProperty('--theme-card-bg', theme.cardBg);
        root.style.setProperty('--theme-border', theme.border);

        // Update body background
        document.body.style.background = `linear-gradient(180deg, ${theme.background} 0%, ${theme.backgroundAlt} 100%)`;
        document.body.style.color = theme.text;

        // Store preference (ephemeral session storage instead of localStorage)
        try { sessionStorage.setItem(STORAGE_KEY, themeName); } catch (e) { console.warn('Could not save theme to sessionStorage', e); }
        
        // Update selector if it exists
        const selector = document.getElementById('theme-selector');
        if (selector) {
            selector.value = themeName;
        }
    }

    function getCurrentTheme() {
        return sessionStorage.getItem(STORAGE_KEY) || 'default';
    }

    function getAvailableThemes() {
        return Object.keys(themes).map(key => ({
            id: key,
            name: themes[key].name
        }));
    }

    // Initialize theme on page load
    function init() {
        const savedTheme = getCurrentTheme();
        applyTheme(savedTheme);

        // Setup event listener for theme selector if it exists
        const selector = document.getElementById('theme-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                applyTheme(e.target.value);
            });
        }
    }

    // Expose global API
    window.themeManager = {
        apply: applyTheme,
        getCurrent: getCurrentTheme,
        getAvailable: getAvailableThemes,
        init: init
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
