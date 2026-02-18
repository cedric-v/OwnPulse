
/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

async function migrate() {
    console.log('--- COMPANY MIGRATION START ---')

    const env = fs.readFileSync('.env.local', 'utf8')
    const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim()
    const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
    const supabase = createClient(url, key)

    // 1. DDL: Create companies table and update contacts
    console.log('Applying schema updates...')
    // We try to use a simple approach since we don't have rpc for raw sql usually
    // Normally we'd use migrations, but let's try to do it via a series of checks or assume it's done via schema.sql and just migrate data.

    // Actually, I'll assume the user might need to run the SQL in Supabase dashboard for DDL.
    // But I'll attempt to migrate data if columns exist.

    console.log('Fetching contacts with company names...')
    const { data: contacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id, company')
        .not('company', 'is', null)

    if (fetchError) {
        console.error('Fetch error:', fetchError.message)
        return
    }

    const uniqueCompanies = [...new Set(contacts.map(c => c.company.trim()))].filter(Boolean)
    console.log(`Found ${uniqueCompanies.length} unique companies.`)

    for (const companyName of uniqueCompanies) {
        console.log(`Processing: ${companyName}...`)

        // Find or Create company
        let { data: existing, error: findError } = await supabase
            .from('companies')
            .select('id')
            .eq('name', companyName)
            .single()

        if (findError && findError.code !== 'PGRST116') {
            console.error(`Error finding company ${companyName}:`, findError.message)
            continue
        }

        let companyId
        if (existing) {
            companyId = existing.id
        } else {
            const { data: created, error: createError } = await supabase
                .from('companies')
                .insert({ name: companyName })
                .select('id')
                .single()

            if (createError) {
                console.error(`Error creating company ${companyName}:`, createError.message)
                continue
            }
            companyId = created.id
        }

        // Link all contacts with this company name
        const { error: updateError } = await supabase
            .from('contacts')
            .update({ company_id: companyId })
            .eq('company', companyName)

        if (updateError) {
            console.error(`Error linking contacts for ${companyName}:`, updateError.message)
        }
    }

    console.log('--- MIGRATION COMPLETE ---')
}

migrate()
