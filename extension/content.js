// Vibe CRM Content Script
const SUPABASE_URL = 'https://qleflestlmwvgicyebey.supabase.co';
const SUPABASE_KEY = 'sb_publishable_y3gHLB3whyO8woaGpEXkrQ_0mySZxqa'; // Public Anon Key

function createFloatingButton() {
    if (document.getElementById('vibe-crm-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'vibe-crm-btn';
    btn.innerText = 'Add to Vibe';
    btn.style.position = 'fixed';
    btn.style.top = '80px';
    btn.style.right = '20px';
    btn.style.zIndex = '9999';
    btn.style.padding = '10px 20px';
    btn.style.backgroundColor = '#0a66c2'; // LinkedIn Blue
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
            btn.innerText = 'Add to Vibe';
            btn.style.backgroundColor = '#0a66c2';
        }, 3000);
    });

    document.body.appendChild(btn);
}

function scrapeProfile() {
    // Selectors might need adjustment based on LinkedIn's dynamic classes
    const nameElement = document.querySelector('.text-heading-xlarge') || document.querySelector('h1.text-heading-xlarge');
    const roleElement = document.querySelector('.text-body-medium');
    const avatarElement = document.querySelector('.pv-top-card-profile-picture__image--show') || document.querySelector('img.pv-top-card-profile-picture__image');

    let name = nameElement ? nameElement.innerText.trim() : '';
    if (!name) {
        // Fallback to document title
        const title = document.title;
        if (title.includes(' | LinkedIn')) {
            name = title.split(' | LinkedIn')[0];
        } else {
            name = 'Unknown Name';
        }
    }

    // Split name for simple first/last
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const companyRole = roleElement ? roleElement.innerText.trim() : 'Unknown Role';
    const avatarUrl = avatarElement ? avatarElement.src : null;
    const linkedinUrl = window.location.href;

    return {
        first_name: firstName,
        last_name: lastName,
        company_role: companyRole,
        linkedin_url: linkedinUrl,
        avatar_url: avatarUrl,
        status: 'Cold',
        list: 'Prospects'
    };
}

async function saveToSupabase(data) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        alert('Please configure Supabase URL and Key in content.js');
        throw new Error('Missing Config');
    }

    // Check if contact exists
    const searchUrl = `${SUPABASE_URL}/rest/v1/contacts?linkedin_url=eq.${encodeURIComponent(data.linkedin_url)}`;
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
