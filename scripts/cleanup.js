
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../dashboard/.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanup() {
    console.log("Cleaning up duplicates...");

    // 1. Fetch all contacts
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, linkedin_url, created_at')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching contacts:", error);
        return;
    }

    const seenUrls = new Set();
    const idsToDelete = [];

    contacts.forEach(c => {
        if (c.linkedin_url) {
            if (seenUrls.has(c.linkedin_url)) {
                idsToDelete.push(c.id);
            } else {
                seenUrls.add(c.linkedin_url);
            }
        }
    });

    if (idsToDelete.length === 0) {
        console.log("No duplicates found by URL.");
        return;
    }

    console.log(`Deleting ${idsToDelete.length} duplicates...`);

    // Batch delete
    const chunkSize = 100;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error: delError } = await supabase
            .from('contacts')
            .delete()
            .in('id', chunk);

        if (delError) {
            console.error("Error deleting chunk:", delError);
        } else {
            console.log(`Deleted ${i + chunk.length}/${idsToDelete.length}`);
        }
    }

    console.log("Cleanup complete!");
}

cleanup();
