
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Company } from "@/types"
import { useLanguage } from "@/components/i18n/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Building, Search, ExternalLink, Users, Globe, MapPin } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { AddCompanyDialog } from "@/components/companies/add-company-dialog"

type CompanyWithContacts = Company & { contacts?: { id: string }[]; contactCount?: number }

const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('fr-CH', {
        style: 'currency',
        currency: currency,
    }).format(value)
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<CompanyWithContacts[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(true)
    const [currency, setCurrency] = useState("CHF")
    const supabase = createClient()
    const { t } = useLanguage()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            // Fetch companies and join with contacts to get counts if possible, 
            // or just fetch companies and then fetch counts.
            const { data, error } = await supabase
                .from('companies')
                .select('*, contacts(id)')
                .order('name')

            if (!error && data) {
                const formatted = (data as CompanyWithContacts[]).map((c) => ({
                    ...c,
                    contactCount: c.contacts?.length || 0
                }))
                setCompanies(formatted)
            }

            const { data: settingsData } = await supabase.from('settings').select('value').eq('key', 'currency').single()
            if (settingsData) setCurrency(settingsData.value)

            setLoading(false)
        }
        fetchData()
    }, [supabase])

    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="container mx-auto space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("sidebar.companies")}</h1>
                <div className="sticky top-16 z-20 -mx-4 border-y bg-slate-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <AddCompanyDialog />
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher une entreprise..."
                                className="w-full pl-8 sm:w-80"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">Chargement des entreprises...</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                    {filteredCompanies.map(company => (
                        <Card key={company.id} className="hover:shadow-md transition-shadow group">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <Link href={`/companies/${company.id}`} className="hover:underline">
                                                <CardTitle className="text-lg">{company.name}</CardTitle>
                                            </Link>
                                            {company.city && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <MapPin className="h-3 w-3" />
                                                    {company.city}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" asChild>
                                        <Link href={`/companies/${company.id}`}>
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Users className="h-4 w-4" />
                                            <span>{company.contactCount || 0} leads</span>
                                        </div>
                                        <Badge variant="secondary" className="font-bold text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50">
                                            {formatCurrency(Number(company.value) || 0, currency)}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {company.linkedin_url && (
                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild>
                                                <a href={company.linkedin_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                                            </Button>
                                        )}
                                        {company.website_url && (
                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild>
                                                <a href={company.website_url} target="_blank" rel="noreferrer"><Globe className="h-3.5 w-3.5" /></a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredCompanies.length === 0 && (
                        <div className="col-span-full text-center py-20 text-muted-foreground italic">
                            Aucune entreprise trouvée.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
