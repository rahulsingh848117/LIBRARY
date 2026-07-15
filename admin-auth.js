// Admin auth helpers. Uses the API client when available, with a local fallback.
(function(){
    const ADMIN_KEY = 'spLibraryAdminUsers';
    const SESSION_DATA_KEY = 'spLibraryAdminSessionData';
    const TOKEN_KEY = 'spLibraryAdminToken';

    let lastLoginError = null;

    function ensureDefaultAdmin(){
        if (!sessionStorage.getItem(ADMIN_KEY)){
            const def = [{ id: 1, username: 'admin', password: 'admin123', role: 'super_admin', createdAt: new Date().toISOString() }];
            sessionStorage.setItem(ADMIN_KEY, JSON.stringify(def));
        }
    }

    function getAdmins(){
        ensureDefaultAdmin();
        return JSON.parse(sessionStorage.getItem(ADMIN_KEY) || '[]');
    }

    function findAdmin(username, password){
        const admins = getAdmins();
        return admins.find(a => a.username === username && a.password === password) || null;
    }

    function setSessionData(sessionObj, remember){
        const serialized = JSON.stringify(sessionObj);
        // Use sessionStorage only (no localStorage persistence)
        sessionStorage.setItem(SESSION_DATA_KEY, serialized);
    }

    function getSessionData(){
        const s = sessionStorage.getItem(SESSION_DATA_KEY);
        return s ? JSON.parse(s) : null;
    }

    function clearSessionData(){
        sessionStorage.removeItem(SESSION_DATA_KEY);
    }

    function setToken(token, remember){
        if (!token) {
            sessionStorage.removeItem(TOKEN_KEY);
            return;
        }
        // Store token in sessionStorage only
        sessionStorage.setItem(TOKEN_KEY, token);
    }

    function getToken(){
        return sessionStorage.getItem(TOKEN_KEY);
    }

    function clearToken(){
        sessionStorage.removeItem(TOKEN_KEY);
    }

    function createDefaultSession(remember = true){
        const admins = getAdmins();
        const defaultAdmin = admins.find(a => a.username === 'admin' && a.password === 'admin123');
        if (!defaultAdmin) return null;

        const token = 'local_' + Date.now();
        const session = {
            token,
            username: defaultAdmin.username,
            role: defaultAdmin.role,
            loginTime: new Date().toISOString()
        };

        setToken(token, remember);
        setSessionData(session, remember);
        return session;
    }

    function isApiEnabled(){
        return typeof apiClient !== 'undefined' && apiClient && apiClient.isEnabled;
    }

    async function login(username, password, remember){
        lastLoginError = null;
        if (!username || !password) return null;
        if (isApiEnabled()) {
            try {
                const response = await apiClient.login(username, password, remember);
                if (response && response.token) {
                    const session = {
                        username: response.username,
                        role: response.role,
                        loginTime: response.loginTime,
                        token: response.token
                    };
                    setToken(response.token, remember);
                    setSessionData(session, remember);
                    return session;
                }
                lastLoginError = 'Invalid credentials';
                return null;
            } catch (error) {
                console.warn('API login failed, falling back to local auth', error);
                lastLoginError = error && error.message ? error.message : 'API login failed';
                const localUser = findAdmin(username, password);
                if (localUser) {
                    const token = 'local_' + Date.now();
                    const session = { token, username: localUser.username, role: localUser.role, loginTime: new Date().toISOString() };
                    setToken(token, remember);
                    setSessionData(session, remember);
                    return session;
                }
                return null;
            }
        }

        const user = findAdmin(username, password);
        if (!user) return null;
        const token = 'tok_' + Date.now();
        const session = { token, username: user.username, role: user.role, loginTime: new Date().toISOString() };
        setToken(token, remember);
        setSessionData(session, remember);
        return session;
    }

    function getSession(){
        return getSessionData();
    }

    function getLastLoginError(){
        return lastLoginError;
    }

    function requireAdmin(){
        const session = getSession();
        if (session) return session;

        const fallbackSession = createDefaultSession(true);
        if (fallbackSession) return fallbackSession;

        const next = encodeURIComponent(location.pathname + location.search);
        window.location.href = 'admin-login.html?next=' + next;
        return null;
    }

    function logout(){
        clearSessionData();
        clearToken();
        window.location.href = 'admin-login.html';
    }

    window.adminAuth = { ensureDefaultAdmin, getAdmins, login, logout, getSession, requireAdmin, getToken, clearToken, isApiEnabled, getLastLoginError };
    ensureDefaultAdmin();
})();
