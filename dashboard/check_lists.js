const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const env = fs.readFileSync('.env.local', 'utf8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim()
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()

const supabase = createClient(url, key)

async function run() {
    const { data, error } = await supabase.from('contacts').select('list')
    if (error) {
        console.error(error)
        return
    }
    const counts = {}
    data.forEach(c => {
        const val = c.list || 'NULL'
        counts[val] = (counts[val] || 0) + 1
    })
    console.log('Lists in DB:', counts)
}
run()
