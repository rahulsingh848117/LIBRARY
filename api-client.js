// Shared API client for Google Apps Script backend integration.
(function(){
    const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxBbRhd6hBaoE7uSdoBGeCvHHw98EgCwJAPcQvVXLQEPzwBsvJMfRBN2oNtj7ak0BE/exec';
    const TOKEN_STORAGE_KEY = 'spLibraryAdminToken';
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 15000;

    function hasPlaceholderUrl() {
        return API_BASE_URL.includes('YOUR_DEPLOYMENT_ID');
    }

    function getStoredToken() {
        // Use sessionStorage for token persistence (no localStorage for security / single-source-of-truth preference)
        return sessionStorage.getItem(TOKEN_STORAGE_KEY);
    }

    function saveToken(token, remember) {
        // Always save token in sessionStorage to avoid relying on localStorage persistence
        try {
            sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
        } catch (e) {
            console.warn('Could not save token to sessionStorage', e);
        }
    }

    function clearToken() {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
 
    function shouldUseJsonp() {
        // Google Apps Script web apps already expose Access-Control-Allow-Origin: * for web app responses.
        // Use standard fetch for better reliability and JSON handling instead of JSONP.
        return false;
    }
 
    function jsonpRequest(url) {
        return new Promise((resolve, reject) => {
            const callbackName = `spLibraryApiCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
            window[callbackName] = function(response) {
                cleanup();
                resolve(response);
            };
 
            function cleanup() {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                clearTimeout(timeoutId);
                delete window[callbackName];
            }
 
            const callbackParam = `callback=${encodeURIComponent(callbackName)}`;
            const script = document.createElement('script');
            script.src = url + (url.includes('?') ? '&' : '?') + callbackParam;
            script.async = true;
            script.onerror = function(event) {
                cleanup();
                reject(new Error('JSONP request failed to load the API script.'));
            };
            const timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`API request timeout after ${TIMEOUT_MS}ms`));
            }, TIMEOUT_MS);
            document.head.appendChild(script);
        });
    }
 
    async function request(action, payload = {}, options = {}) {
        if (!action) throw new Error('API action is required');
        if (hasPlaceholderUrl()) {
            throw new Error('API_BASE_URL is not configured. Replace YOUR_DEPLOYMENT_ID with your Apps Script deployment ID.');
        }

        let lastError;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await _makeRequest(action, payload, options);
            } catch (error) {
                lastError = error;
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
                }
            }
        }
        throw lastError;
    }

    async function _makeRequest(action, payload = {}, options = {}) {
        const url = new URL(API_BASE_URL);
        url.searchParams.set('action', action);
 
        const token = getStoredToken();
        const headers = { 'Accept': 'application/json' };
        const method = (options && options.method && String(options.method).toUpperCase() === 'POST') ? 'POST' : 'GET';
        const useJsonp = shouldUseJsonp();
        const fetchOptions = { method, headers, credentials: 'omit', redirect: 'follow', mode: 'cors', cache: 'no-store' };
 
        // Attach token in request payload for authenticated actions.
        const openActions = [
            'login',
            'createBooking',
            'createStudent',
            'ping'
        ];
        if (token && !openActions.includes(action)) {
            payload = { ...(payload || {}), token };
        }
 
        if (useJsonp) {
            if (payload && Object.keys(payload).length) {
                url.searchParams.set('payload', JSON.stringify(payload));
            }
            return await jsonpRequest(url.toString());
        }
 
        if (method === 'POST') {
            headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
            const formBody = new URLSearchParams();
            if (payload && Object.keys(payload).length) {
                formBody.set('payload', JSON.stringify(payload));
            }
            fetchOptions.body = formBody.toString();
        } else if (payload && Object.keys(payload).length) {
            url.searchParams.set('payload', JSON.stringify(payload));
        }
 
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
 
        try {
            const response = await fetch(url.toString(), { ...fetchOptions, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const text = await response.text();
                console.error(`API ${response.status} ${response.statusText}:`, text, 'URL:', url.toString());
                throw new Error(`API error ${response.status} ${response.statusText}: ${text.substring(0, 200)}`);
            }

            const contentType = response.headers.get('Content-Type') || '';
            if (!contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Unexpected API response content type:', contentType, 'body:', text, 'URL:', url.toString());
                throw new Error(`Unexpected response content type: ${contentType}`);
            }

            const data = await response.json();
            if (data && data.error) {
                throw new Error(data.error);
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`API request timeout after ${TIMEOUT_MS}ms`);
            }
            throw error;
        }
    }

    async function login(username, password, remember) {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        if (hasPlaceholderUrl()) {
            throw new Error('API not configured');
        }

        try {
            const response = await request('login', { username, password }, { method: 'POST' });
            if (response && response.token) {
                saveToken(response.token, remember === true);
                return response;
            }
            throw new Error(response?.error || 'Login failed');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async function validateToken() {
        const token = getStoredToken();
        if (!token || hasPlaceholderUrl()) return null;
        try {
            return await request('validateToken', {}, { method: 'POST' });
        } catch (error) {
            console.warn('Token validation failed:', error);
            return null;
        }
    }

    async function ping() {
        if (hasPlaceholderUrl()) return null;
        try {
            return await request('ping', {}, { method: 'POST' });
        } catch (error) {
            console.warn('Ping failed:', error);
            return null;
        }
    }

    async function uploadStudentPhoto(fileName, dataUrl, mimeType) {
        return await request('uploadStudentPhoto', { fileName, dataUrl, mimeType }, { method: 'POST' });
    }

    function logout() {
        clearToken();
        window.location.href = 'admin-login.html';
    }

    window.apiClient = {
        isEnabled: !hasPlaceholderUrl(),
        request,
        login,
        validateToken,
        ping,
        logout,
        getToken: getStoredToken,
        saveToken,
        clearToken,
        uploadStudentPhoto,
        API_BASE_URL
    };
})();
