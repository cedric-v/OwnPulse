// Vibe CRM Content Script
const SUPABASE_URL = 'https://qleflestlmwvgicyebey.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y3gHLB3whyO8woaGpEXkrQ_0mySZxqa'; // Public Anon Key

function createFloatingButton() {
    if (document.getElementById('vibe-crm-btn')) return;

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
    btn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    btn.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    btn.addEventListener('click', async () => {
        btn.innerText = 'Scraping...';
        const profileData = scrapeProfile();
        console.log('Scraped Data:', profileData);

        btn.innerText = 'Saving...';
        try {
            await saveToSupabase(profileData);
            btn.innerText = 'Saved!';
            btn.style.backgroundColor = '#057642'; // Green
        } catch (error) {
            console.error('Error saving to CRM:', error);
            btn.innerText = 'Error';
            btn.style.backgroundColor = '#d11124'; // Red
        }

        setTimeout(() => {
            btn.innerText = 'Add to OwnPulse';
            btn.style.backgroundColor = '#6366f1';
        }, 3000);
    });

    document.body.appendChild(btn);
}

function scrapeProfile() {
    const url = window.location.href;
    let name = '';
    let companyRole = 'Unknown Role';
    let avatarUrl = null;
    let platformUrl = url;

    if (url.includes('linkedin.com')) {
        const nameElement = document.querySelector('.text-heading-xlarge') || document.querySelector('h1.text-heading-xlarge');
        const roleElement = document.querySelector('.text-body-medium');
        const avatarElement = document.querySelector('.pv-top-card-profile-picture__image--show') || document.querySelector('img.pv-top-card-profile-picture__image');

        name = nameElement ? nameElement.innerText.trim() : '';
        if (!name) {
            const title = document.title;
            if (title.includes(' | LinkedIn')) {
                name = title.split(' | LinkedIn')[0];
            }
        }
        companyRole = roleElement ? roleElement.innerText.trim() : 'Unknown Role';
        avatarUrl = avatarElement ? avatarElement.src : null;
    } else if (url.includes('threads.net') || url.includes('threads.com')) {
        const username = url.split('@')[1]?.split('/')[0] || '';

        // 1. Try meta tags (best for full name)
        const ogTitle = document.querySelector('meta[property="og:title"]')?.content || document.title;
        if (ogTitle && ogTitle.includes('(@')) {
            name = ogTitle.split(' (@')[0].trim();
        }

        // 2. If name is still username or not found, search in h1
        if (!name || name.toLowerCase() === username.toLowerCase()) {
            const h1s = Array.from(document.querySelectorAll('h1'));
            for (const h1 of h1s) {
                const text = h1.innerText.trim();
                if (text && text.toLowerCase() !== username.toLowerCase()) {
                    name = text;
                    break;
                }
            }
        }

        // 3. Last fallback
        if (!name) {
            const h1Element = document.querySelector('h1');
            name = h1Element ? h1Element.innerText.trim() : 'Unknown';
        }

        // Bio extraction
        const bioElement = document.querySelector('header div span') || document.querySelector('header ~ div span') || document.querySelector('span div span');
        companyRole = bioElement ? bioElement.innerText.trim() : 'Threads Profile';

        const avatarElement = document.querySelector('img[alt*="profile picture"]');
        avatarUrl = avatarElement ? avatarElement.src : null;
    } else if (url.includes('instagram.com')) {
        const username = url.pathname.split('/')[1] || '';
        const pageTitle = document.title;

        if (pageTitle && pageTitle.includes('(@')) {
            name = pageTitle.split(' (@')[0].trim();
        }

        if (!name || name.toLowerCase() === username.toLowerCase()) {
            const nameElement = document.querySelector('header h2') || document.querySelector('h2');
            name = nameElement ? nameElement.innerText.trim() : (name || 'Unknown');
        }

        const bioElement = document.querySelector('header section div:last-child span');
        companyRole = bioElement ? bioElement.innerText.trim() : 'Instagram Profile';

        const avatarElement = document.querySelector('header img');
        avatarUrl = avatarElement ? avatarElement.src : null;
    }

    // Cleaning name
    if (!name || name === 'Unknown Name') {
        name = 'Unknown';
    }

    const nameParts = name.split(' ').filter(p => p.trim() !== '');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ');

    const profileData = {
        first_name: firstName,
        last_name: lastName || '', // No more 'Name' default
        company_role: companyRole,
        linkedin_url: null,
        threads_url: null,
        instagram_url: null,
        avatar_url: avatarUrl,
        status: 'N/A',
        list: 'Prospects'
    };

    if (url.includes('linkedin.com')) {
        profileData.linkedin_url = platformUrl;
    } else if (url.includes('threads.net') || url.includes('threads.com')) {
        profileData.threads_url = platformUrl;
    } else if (url.includes('instagram.com')) {
        profileData.instagram_url = platformUrl;
    }

    return profileData;
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
