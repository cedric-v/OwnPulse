
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parser');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../dashboard/.env.local');
const envConfig = require('dotenv').config({ path: envPath });

if (envConfig.error) {
    console.error("Error loading .env.local file. Please make sure it exists in the dashboard folder.");
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // For script, anon key is fine if RLS is open. For restricted RLS, use SERVICE_ROLE_KEY.

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const csvFilePath = path.resolve(__dirname, '../2026-02-09-backup-BreackCold-leads.csv');
const results = [];

console.log("Reading CSV file...");

fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
        console.log(`Parsed ${results.length} rows.`);

        const contacts = results.map(row => {
            // Map CSV columns to Supabase columns
            // CSV: id, email, first_name, last_name, linkedin_url, company, company_role, avatar_url, notes (maybe), status_names (maybe)

            // Enhanced mapping logic
            const listName = row.list_names ? row.list_names.split(',')[0] : 'Prospects'; // Take first list if multiple
            const statusName = row.status_names ? row.status_names.split(',')[0] : 'Cold';

            // Fix LinkedIn URL if it's just a handle
            let linkedinUrl = row.linkedin_url;
            if (linkedinUrl && !linkedinUrl.startsWith('http')) {
                linkedinUrl = `https://www.linkedin.com/in/${linkedinUrl}`;
            }

            return {
                id: row.id.length > 0 ? row.id : undefined,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                linkedin_url: linkedinUrl,
                company: row.company,
                company_role: row.company_role,
                avatar_url: row.avatar_url,
                notes: row.notes,
                status: statusName,
                list: listName, // New column
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString()
            };
        });

        console.log("Upserting contacts to Supabase...");

        // Batch Insert (Supabase limits request size, so chunk it)
        const chunkSize = 100;
        for (let i = 0; i < contacts.length; i += chunkSize) {
            const chunk = contacts.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('contacts')
                .upsert(chunk, { onConflict: 'id' }); // Upsert based on ID

            if (error) {
                console.error(`Error inserting chunk ${i / chunkSize}:`, error);
            } else {
                console.log(`Inserted rows ${i} to ${i + chunk.length}`);
            }
        }

        console.log("Import complete!");
    });
