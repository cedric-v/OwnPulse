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
    threads_url: string | null
    instagram_url: string | null
    company: string | null
    company_id: string | null
    company_role: string | null
    status: string | null
    list: string | null
    avatar_url: string | null
    notes: string | null
    value: number | null
    created_at: string
    acquisition_channel?: string | null
    first_contact_date?: string | null
    customer_conversion_date?: string | null
    offers_purchased?: { name: string, count: number }[] | null
}

export type Sale = {
    id: string
    offer_name: string
    sale_date: string
    price_ht: number
    vat_rate: number
    quantity: number
    payment_terms: string | null
    payment_delay: string | null
    contact_id: string | null
    created_at: string
    contacts?: { first_name: string | null, last_name: string | null } | null
}

export type Expense = {
    id: string
    description: string
    category: string
    importance: 'Mandatory' | 'Important' | 'Optional'
    price_ht: number
    vat_rate: number
    payment_frequency: string | null
    date: string
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

export type Setting = {
    id: string
    key: string
    value: string
    updated_at: string
}

export type OfferType =
    | "Consulting ou coaching individuel"
    | "Formation d'entreprise / Accompagnement collectif"
    | "Mission freelance"
    | "Produit digital"
    | "Autre"

export type OfferActivity = {
    description: string
    hours: number
    per_sale: boolean
}

export type SalesGoal = {
    year: number
    monthly_counts: number[] // Array of 12 numbers
}

export type PaymentTerms = {
    mode: "100% à la commande" | "100% en fin de mission" | "% à la commande et le solde en fin de mission" | "Échelonné"
    deposit_percentage?: number
    installments_count?: number
    delay: "Immédiat" | "30 jours" | "60 jours" | "90 jours"
}

export type Offer = {
    id: string
    name: string
    type?: OfferType
    description?: string
    default_price: number
    unit_cost?: number
    work_time?: OfferActivity[]
    sales_goals?: SalesGoal[]
    payment_terms?: PaymentTerms
    created_at: string
}

export type AcquisitionChannel = {
    id: string
    name: string
    created_at: string
}
