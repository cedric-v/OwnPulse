export type Company = {
    id: string
    name: string
    linkedin_url: string | null
    website_url: string | null
    city: string | null
    logo_url: string | null
    notes: string | null
    value: number | null
    created_at: string
    updated_at: string
}

export type Contact = {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    location: string | null
    website: string | null
    linkedin_url: string | null
    company: string | null
    company_id: string | null
    company_role: string | null
    status: string | null
    list: string | null
    avatar_url: string | null
    notes: string | null
    value: number | null
    created_at: string
}

export type Task = {
    id: string
    description: string
    due_date: string | null
    completed: boolean
    priority: 'Low' | 'Medium' | 'High'
    category: string
    contact_id: string
}
