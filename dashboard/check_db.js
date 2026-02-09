const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
    console.log('Fetching contacts...')
    const { data, error } = await supabase.from('contacts').select('id, first_name, last_name, status, list').limit(50)
    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Fetched', data.length, 'contacts')
        const lists = [...new Set(data.map(c => c.list))]
        console.log('Unique list values in DB:', lists)
        console.log('Sample data (first 5):', JSON.stringify(data.slice(0, 5), null, 2))
    }
}
run()
