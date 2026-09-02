// Vibe CRM Content Script
const SUPABASE_URL = 'https://qleflestlmwvgicyebey.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y3gHLB3whyO8woaGpEXkrQ_0mySZxqa'; // Public Anon Key

function createFloatingButton() {
    if (document.getElementById('ownpulse-crm-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'ownpulse-crm-btn';
    btn.innerText = 'Add to OwnPulse';
    btn.style.position = 'fixed';
    btn.style.top = '80px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.padding = '10px 20px';
    btn.style.backgroundColor = '#6366f1'; // OwnPulse Indigo (modernized)
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '24px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
    btn.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    btn.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    btn.style.outline = 'none';

    btn.addEventListener('click', async () => {
        const originalText = 'Add to OwnPulse';
        btn.innerText = 'Scraping...';
        btn.disabled = true;
        btn.style.opacity = '0.8';

        try {
            // Wait for DOM to be fully ready if needed
            if (document.readyState === 'loading') {
                await new Promise(r => document.addEventListener('DOMContentLoaded', r));
            }

            const profileData = scrapeProfile();

            if (!profileData || (!profileData.first_name && !profileData.instagram_url)) {
                throw new Error('Failed to scrape meaningful data');
            }

            btn.innerText = 'Saving...';
            const saveResult = await saveToSupabase(profileData);
            if (saveResult.status === 'updated') {
                btn.innerText = '✔ Profile updated';
                btn.style.backgroundColor = '#059669'; // Emerald 600
            } else if (saveResult.status === 'existing' && saveResult.needsLogin) {
                btn.innerText = 'Log in via popup to update';
                btn.style.backgroundColor = '#d97706'; // Amber 600
                btn.title = 'Open the OwnPulse toolbar icon and log in with your dashboard account';
                // Best-effort: open the extension popup automatically.
                try {
                    chrome.runtime.sendMessage({ type: 'openPopup' });
                } catch {
                    /* ignore — user can open it from the toolbar */
                }
            } else if (saveResult.status === 'existing') {
                btn.innerText = 'Already in CRM';
                btn.style.backgroundColor = '#d97706'; // Amber 600
            } else {
                btn.innerText = '✔ Saved to CRM';
                btn.style.backgroundColor = '#059669'; // Emerald 600
            }
            btn.style.transform = 'scale(1.05)';
            btn.style.opacity = '1';
        } catch (error) {
            console.error('Error during scraping/saving:', error);
            btn.innerText = '✖ Error';
            btn.style.backgroundColor = '#dc2626'; // Red 600
            btn.style.opacity = '1';
        } finally {
            btn.disabled = false;
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = '#6366f1';
                btn.style.transform = 'scale(1)';
                btn.style.opacity = '1';
            }, 5000); // Increased duration for readability
        }
    });

    document.body.appendChild(btn);
}

function scrapeProfile() {
    const url = String(window.location.href);
    let name = '';
    let firstName = 'Unknown';
    let lastName = '';
    let company = '';
    let companyRole = 'Profile';
    let avatarUrl = null;
    let platformUrl = url;

    // Helper to safely get unique string value
    const getSafeString = (val) => {
        if (typeof val === 'string') return val.trim();
        return '';
    };

    // Split a LinkedIn-style headline ("Founder & CEO @ Acme", "CEO chez X",
    // "CTO at Y") into role + company. Only @/chez/at reliably imply an
    // employer — separators like "|" or "-" are usually taglines, not
    // companies. Falls back to the whole headline as the role.
    const splitHeadline = (headline) => {
        const text = getSafeString(headline).replace(/\s+/g, ' ');
        const parts = text.split(/\s+(?:@|chez|at)\s+/i);
        if (parts.length >= 2 && parts[0].trim() && parts[parts.length - 1].trim()) {
            return { role: parts[0].trim(), company: parts[parts.length - 1].trim() };
        }
        return { role: text, company: '' };
    };

    try {
        if (url.includes('linkedin.com/')) {
            const nameEl = document.querySelector('.text-heading-xlarge') || document.querySelector('h1.text-heading-xlarge');
            const avatarEl = document.querySelector('.pv-top-card-profile-picture__image--show') || document.querySelector('img.pv-top-card-profile-picture__image');

            name = getSafeString(nameEl?.innerText);
            if (!name) {
                const title = document.title || "";
                if (title.includes(' | LinkedIn')) {
                    name = title.split(' | LinkedIn')[0];
                }
            }

            // Headline: LinkedIn's DOM changes often — try scoped selectors
            // first, then any non-empty .text-body-medium, then the page
            // title (which usually embeds the headline).
            let headline = '';
            const headlineCandidates = document.querySelectorAll(
                '.pv-text-details__left-panel .text-body-medium, main section .text-body-medium, .text-body-medium'
            );
            for (const el of headlineCandidates) {
                const text = getSafeString(el.innerText);
                if (text && text.length > 2 && !/^\d/.test(text)) {
                    headline = text;
                    break;
                }
            }
            if (!headline) {
                const title = document.title || '';
                if (title.includes(' | LinkedIn')) {
                    headline = title.split(' | LinkedIn')[0].replace(/^\(\d+\)\s*/, '');
                }
            }

            const parsedHeadline = splitHeadline(headline);
            companyRole = parsedHeadline.role || 'LinkedIn Profile';
            company = parsedHeadline.company;
            avatarUrl = avatarEl?.src || null;

        } else if (url.includes('threads.net/') || url.includes('threads.com/')) {
            // STRICT THREADS LOGIC - Only runs if threads.net/ is in URL
            console.log('[OwnPulse] Threads detected.');
            const username = (url.split('@')[1] || "").split('/')[0] || '';

            const ogTitle = document.querySelector('meta[property="og:title"]')?.content || document.title || "";
            if (ogTitle && ogTitle.includes('(@')) {
                name = ogTitle.split(' (@')[0].trim();
            }

            if (!name && username) {
                const h1s = Array.from(document.querySelectorAll('h1'));
                for (const h1 of h1s) {
                    const text = getSafeString(h1.innerText);
                    if (text && text.toLowerCase() !== username.toLowerCase()) {
                        name = text;
                        break;
                    }
                }
            }

            if (!name) name = getSafeString(document.querySelector('h1')?.innerText) || 'Unknown';
            const bioEl = document.querySelector('header div span') || document.querySelector('header ~ div span') || document.querySelector('span div span');
            companyRole = getSafeString(bioEl?.innerText) || 'Threads Profile';
            avatarUrl = document.querySelector('img[alt*="profile picture"]')?.src || null;

        } else if (url.includes('instagram.com/')) {
            console.log('[OwnPulse] Instagram detected.');
            const pathSegments = (window.location.pathname || "").split('/').filter(Boolean);
            const username = pathSegments[0] || '';

            const ogTitle = document.querySelector('meta[property="og:title"]')?.content || "";
            if (ogTitle && ogTitle.includes('(@')) {
                name = ogTitle.split(' (@')[0].trim();
            } else if (ogTitle) {
                const parts = ogTitle.split(' •');
                name = parts[1] ? parts[0].trim() : ogTitle.trim();
            }

            // Fallback Name
            if (!name || (username && name.toLowerCase() === username.toLowerCase())) {
                const nameElement = document.querySelector('header section span[dir="auto"]') ||
                    document.querySelector('header section > div:nth-child(2) span') ||
                    Array.from(document.querySelectorAll('span')).find(el => el.innerText.includes(username) && el.innerText.length > username.length);
                if (nameElement) {
                    const text = getSafeString(nameElement.innerText);
                    if (text.toLowerCase() !== username.toLowerCase()) name = text;
                }
            }

            // Bio
            const metaDesc = document.querySelector('meta[name="description"]')?.content || "";
            if (metaDesc) {
                const match = metaDesc.match(/[:«\"(]([^«»\"()]+)[»\")]?$/) || metaDesc.match(/sur Instagram : (.+)$/);
                if (match && match[1]) companyRole = getSafeString(match[1]);
            }

            if (!companyRole || companyRole === 'Profile' || companyRole.match(/^\d/) || companyRole.includes('Instagram')) {
                const bioCandidates = Array.from(document.querySelectorAll('span._ap3a, span[dir="auto"], main section span'));
                const bioEl = bioCandidates.find(el => {
                    const text = getSafeString(el.innerText);
                    const isStat = text.match(/^\d+ (publications|abonnés|abonnements|posts|followers|following|suivi)/i) ||
                        text.match(/^(publications|abonnés|followers|suivis)$/i);
                    return text && text.length > 5 && text !== name && !text.includes(username) && !isStat;
                });
                if (bioEl) companyRole = getSafeString(bioEl.innerText);
            }

            // Category
            const catEl = Array.from(document.querySelectorAll('span')).find(el => {
                const text = getSafeString(el.innerText);
                return text && text.length > 2 && el.classList.contains('x1lliihq') && !text.includes(' ') && !text.match(/\d/);
            });
            company = getSafeString(catEl?.innerText);

            // Avatar
            avatarUrl = document.querySelector('header img')?.src || document.querySelector('img[alt*="profil"]')?.src || null;

            // Name splitting
            const nameParts = (name || username || "").split(' ').filter(p => p.trim() !== '');
            firstName = nameParts[0] || 'Unknown';
            lastName = nameParts.slice(1).join(' ');

            return {
                first_name: firstName,
                last_name: lastName,
                company: company,
                company_role: companyRole || 'Instagram Profile',
                linkedin_url: null,
                threads_url: null,
                instagram_url: url,
                avatar_url: avatarUrl,
                status: 'N/A',
                list: 'Prospects'
            };
        }

        // Generic fallback
        if (!name || name === 'Unknown') name = 'Unknown';
        const parts = (name || "").split(' ').filter(p => p.trim() !== '');
        firstName = parts[0] || 'Unknown';
        lastName = parts.slice(1).join(' ');

        const finalData = {
            first_name: firstName,
            last_name: lastName || '',
            company: company,
            company_role: companyRole,
            linkedin_url: url.includes('linkedin.com') ? url : null,
            threads_url: (url.includes('threads.net') || url.includes('threads.com')) ? url : null,
            instagram_url: null,
            avatar_url: avatarUrl,
            status: 'N/A',
            list: 'Prospects'
        };
        return finalData;

    } catch (e) {
        console.error('[OwnPulse] Critical error in scrapeProfile:', e);
        return {
            first_name: 'Error',
            last_name: 'Scraping',
            company_role: 'Error',
            instagram_url: url,
            status: 'N/A',
            list: 'Prospects'
        };
    }
}

function normalizeSocialUrl(value) {
    if (!value) return null;
    try {
        const parsed = new URL(value);
        parsed.search = '';
        parsed.hash = '';
        parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/';
        return parsed.toString();
    } catch {
        return value;
    }
}

async function saveToSupabase(data) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        alert('Please configure Supabase URL and Key in content.js');
        throw new Error('Missing Config');
    }

    const normalizedData = {
        ...data,
        linkedin_url: normalizeSocialUrl(data.linkedin_url),
        threads_url: normalizeSocialUrl(data.threads_url),
        instagram_url: normalizeSocialUrl(data.instagram_url)
    };

    // Check if contact exists by any supplied social URL.
    // Do not include empty URLs in the OR filter: `eq.null` would match many
    // unrelated contacts and falsely report every new profile as a duplicate.
    // Queries the minimal `contact_urls` view (RLS hardening): the anonymous
    // key no longer has read access to the full `contacts` table.
    // Each URL is queried in both trailing-slash variants: contacts captured
    // before URL normalization may store the profile URL without a trailing
    // slash, and exact equality would otherwise miss them and create duplicates.
    const urlVariants = (value) => {
        const withoutSlash = value.replace(/\/+$/, '');
        const withSlash = withoutSlash + '/';
        return value.endsWith('/') ? [value, withoutSlash] : [value, withSlash];
    };

    const urlFilters = [
        ['linkedin_url', normalizedData.linkedin_url],
        ['threads_url', normalizedData.threads_url],
        ['instagram_url', normalizedData.instagram_url]
    ]
        .filter(([, value]) => value)
        .flatMap(([column, value]) =>
            urlVariants(value).map(variant => `${column}.eq.${encodeURIComponent(variant)}`)
        );

    let existing = [];
    if (urlFilters.length > 0) {
        const searchUrl = `${SUPABASE_URL}/rest/v1/contact_urls?or=(${urlFilters.join(',')})`;
        const searchRes = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!searchRes.ok) {
            throw new Error(`Deduplication request failed (${searchRes.status}): ${await searchRes.text()}`);
        }
        existing = await searchRes.json();
    }

    if (existing && existing.length > 0) {
        const existingId = existing[0].id;

        // Refresh whitelisted profile fields (company, role, names, avatar,
        // URLs) instead of just reporting the duplicate. The RPC enforces
        // ownership and never touches email/phone/notes/status/list/value.
        // CLAIMED contacts can only be refreshed by their owner: ask the
        // background worker for the user's access token (popup login). With
        // the anon key alone, the RPC only touches unclaimed rows.
        let accessToken = null;
        let loggedIn = false;
        try {
            const tokenResp = await chrome.runtime.sendMessage({ type: 'getAccessToken' });
            accessToken = tokenResp?.accessToken || null;
            loggedIn = !!tokenResp?.loggedIn;
        } catch {
            // Background worker unavailable — fall back to the anon key.
        }

        const refreshUrl = `${SUPABASE_URL}/rest/v1/rpc/refresh_contact_from_capture`;
        const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${accessToken || SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_contact_id: existingId, p_payload: normalizedData })
        });

        if (!refreshRes.ok) {
            throw new Error(`Refresh request failed (${refreshRes.status}): ${await refreshRes.text()}`);
        }

        const updatedId = await refreshRes.json();
        if (updatedId) {
            return { status: 'updated', id: existingId };
        }
        // RPC returned NULL: contact not owned by the caller.
        return { status: 'existing', needsLogin: !loggedIn, id: existingId };
    }

    // Create new contact via the whitelisted capture RPC (RLS hardening):
    // anonymous callers can no longer INSERT directly into `contacts`.
    // The function only accepts whitelisted fields and returns the new id.
    const createUrl = `${SUPABASE_URL}/rest/v1/rpc/capture_contact`;
    const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ p_payload: normalizedData })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }

    return { status: 'created' };
}

// Run loop to check for page changes (SPA navigation)
setInterval(createFloatingButton, 1000);
