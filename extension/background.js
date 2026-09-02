// OwnPulse CRM — background service worker
// Manages the Supabase session so the content script can refresh CLAIMED
// contacts as an authenticated user. With the anon key alone, the
// refresh_contact_from_capture RPC intentionally only touches unclaimed
// rows (owner-or-unclaimed invariant).
const SUPABASE_URL = 'https://qleflestlmwvgicyebey.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y3gHLB3whyO8woaGpEXkrQ_0mySZxqa'; // Public Anon Key

const STORAGE_KEY = 'ownpulse_session';

async function getSession() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return stored[STORAGE_KEY] || null;
}

async function saveSession(session) {
    await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

async function clearSession() {
    await chrome.storage.local.remove(STORAGE_KEY);
}

async function fetchToken(grantType, body) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grantType}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error_description || data.msg || data.error || `Auth error (${res.status})`);
    }
    return data;
}

function buildSession(data, fallbackEmail) {
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        email: data.user?.email || fallbackEmail || null
    };
}

async function getAccessToken() {
    const session = await getSession();
    if (!session?.refresh_token) return { accessToken: null, loggedIn: false };

    // Return the cached token while it is still valid (30s margin).
    if (session.access_token && session.expires_at && Date.now() < session.expires_at - 30000) {
        return { accessToken: session.access_token, loggedIn: true, email: session.email };
    }

    try {
        const data = await fetchToken('refresh_token', { refresh_token: session.refresh_token });
        const refreshed = buildSession(data, session.email);
        await saveSession(refreshed);
        return { accessToken: refreshed.access_token, loggedIn: true, email: refreshed.email };
    } catch (e) {
        // Invalid/expired refresh token: force a new login.
        await clearSession();
        return { accessToken: null, loggedIn: false, error: e.message };
    }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
        switch (msg?.type) {
            case 'getAccessToken':
                sendResponse(await getAccessToken());
                break;
            case 'getSessionInfo': {
                const session = await getSession();
                sendResponse({ loggedIn: !!session?.refresh_token, email: session?.email || null });
                break;
            }
            case 'login': {
                try {
                    const data = await fetchToken('password', { email: msg.email, password: msg.password });
                    const session = buildSession(data);
                    await saveSession(session);
                    sendResponse({ ok: true, email: session.email });
                } catch (e) {
                    sendResponse({ ok: false, error: e.message });
                }
                break;
            }
            case 'logout':
                await clearSession();
                sendResponse({ ok: true });
                break;
            default:
                sendResponse({ ok: false, error: 'Unknown message type' });
        }
    })();
    return true; // keep the channel open for the async response
});
