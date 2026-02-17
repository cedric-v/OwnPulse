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
            console.log('Scraped Data:', profileData);

            if (!profileData || (!profileData.first_name && !profileData.instagram_url)) {
                throw new Error('Failed to scrape meaningful data');
            }

            btn.innerText = 'Saving...';
            await saveToSupabase(profileData);
            btn.innerText = '✔ Saved to CRM';
            btn.style.backgroundColor = '#059669'; // Emerald 600
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

    console.log('[OwnPulse] Scraping starting. URL:', url);

    // Helper to safely get unique string value
    const getSafeString = (val) => {
        if (typeof val === 'string') return val.trim();
        return '';
    };

    try {
        if (url.includes('linkedin.com/')) {
            const nameEl = document.querySelector('.text-heading-xlarge') || document.querySelector('h1.text-heading-xlarge');
            const roleEl = document.querySelector('.text-body-medium');
            const avatarEl = document.querySelector('.pv-top-card-profile-picture__image--show') || document.querySelector('img.pv-top-card-profile-picture__image');

            name = getSafeString(nameEl?.innerText);
            if (!name) {
                const title = document.title || "";
                if (title.includes(' | LinkedIn')) {
                    name = title.split(' | LinkedIn')[0];
                }
            }
            companyRole = getSafeString(roleEl?.innerText) || 'LinkedIn Profile';
            avatarUrl = avatarEl?.src || null;
            console.log('[OwnPulse] LinkedIn data found:', { name, companyRole });

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
            company_role: companyRole,
            linkedin_url: url.includes('linkedin.com') ? url : null,
            threads_url: (url.includes('threads.net') || url.includes('threads.com')) ? url : null,
            instagram_url: null,
            avatar_url: avatarUrl,
            status: 'N/A',
            list: 'Prospects'
        };
        console.log('[OwnPulse] Final scrape result:', finalData);
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

async function saveToSupabase(data) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        alert('Please configure Supabase URL and Key in content.js');
        throw new Error('Missing Config');
    }

    // Check if contact exists by any social URL
    const searchUrl = `${SUPABASE_URL}/rest/v1/contacts?or=(linkedin_url.eq.${encodeURIComponent(data.linkedin_url || 'null')},threads_url.eq.${encodeURIComponent(data.threads_url || 'null')},instagram_url.eq.${encodeURIComponent(data.instagram_url || 'null')})`;
    const searchRes = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const existing = await searchRes.json();
    if (existing && existing.length > 0) {
        console.log('Contact already exists, skipping create.');
        // Optional: Update logic here
        return;
    }

    // Create new contact
    const createUrl = `${SUPABASE_URL}/rest/v1/contacts`;
    const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
    }
}

// Run loop to check for page changes (SPA navigation)
setInterval(createFloatingButton, 1000);
