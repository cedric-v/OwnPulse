
"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Company, Contact } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, Globe, Linkedin, MapPin, Building, ExternalLink, Users, Check, AlertCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('fr-CH', {
        style: 'currency',
        currency: currency,
    }).format(value)
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [company, setCompany] = useState<Company | null>(null)
    const [leads, setLeads] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [currency, setCurrency] = useState("CHF")
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const [companyRes, leadsRes, settingsRes] = await Promise.all([
                supabase.from('companies').select('*').eq('id', id).single(),
                supabase.from('contacts').select('*').eq('company_id', id),
                supabase.from('settings').select('value').eq('key', 'currency').single()
            ])

            if (!companyRes.error) {
                setCompany(companyRes.data)
            }
            if (!leadsRes.error) {
                setLeads(leadsRes.data || [])
            }
            if (settingsRes.data) setCurrency(settingsRes.data.value)
            setLoading(false)
        }
        fetchData()
    }, [id, supabase])

    // Debounced Auto-Save
    useEffect(() => {
        if (!company || loading) return

        const timer = setTimeout(async () => {
            setSaveStatus("saving")
            const { error } = await supabase
                .from('companies')
                .update({
                    name: company.name,
                    linkedin_url: company.linkedin_url,
                    website_url: company.website_url,
                    city: company.city,
                    notes: company.notes,
                    value: company.value
                })
                .eq('id', id)

            if (error) {
                setSaveStatus("error")
                console.error("Auto-save error:", error)
            } else {
                setSaveStatus("saved")
                setTimeout(() => setSaveStatus("idle"), 2000)
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [company, id, supabase, loading])

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this company? Related leads will be unlinked.")) return

        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id)

        if (error) {
            alert("Error deleting company: " + error.message)
        } else {
            router.push('/companies')
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>
    if (!company) return <div className="p-12 text-center">Company not found.</div>

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/companies">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {company.name}
                        </h1>
                        <div className="text-[10px] font-medium text-muted-foreground h-4">
                            {saveStatus === "saving" && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
                            {saveStatus === "saved" && <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> Saved</span>}
                        </div>
                    </div>
                </div>
                <div className="ml-auto">
                    <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Company
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Info */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Company Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Company Name</Label>
                                <Input
                                    id="name"
                                    value={company.name || ""}
                                    onChange={e => setCompany({ ...company, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value">Total Potential Value ({currency})</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    step="0.01"
                                    value={company.value || 0}
                                    onChange={e => setCompany({ ...company, value: parseFloat(e.target.value) || 0 })}
                                    onFocus={e => e.target.select()}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="website" className="flex items-center gap-2"><Globe className="h-3 w-3" /> Website</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="website"
                                        value={company.website_url || ""}
                                        onChange={e => setCompany({ ...company, website_url: e.target.value })}
                                        placeholder="https://acme.com"
                                    />
                                    {company.website_url && (
                                        <Button variant="outline" size="icon" asChild>
                                            <a href={company.website_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="linkedin" className="flex items-center gap-2"><Linkedin className="h-3 w-3" /> LinkedIn Page</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="linkedin"
                                        value={company.linkedin_url || ""}
                                        onChange={e => setCompany({ ...company, linkedin_url: e.target.value })}
                                        placeholder="https://linkedin.com/company/..."
                                    />
                                    {company.linkedin_url && (
                                        <Button variant="outline" size="icon" asChild>
                                            <a href={company.linkedin_url} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" /></a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="city" className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Headquarters City</Label>
                            <Input
                                id="city"
                                value={company.city || ""}
                                onChange={e => setCompany({ ...company, city: e.target.value })}
                                placeholder="Paris, France"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Company-wide Notes</Label>
                            <Textarea
                                id="notes"
                                rows={8}
                                value={company.notes || ""}
                                onChange={e => setCompany({ ...company, notes: e.target.value })}
                                placeholder="Shared knowledge about this organization..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Right: People linked */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                Linked Leads
                            </CardTitle>
                            <Badge variant="outline">{leads.length}</Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                {leads.map(lead => (
                                    <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={lead.avatar_url || undefined} />
                                                <AvatarFallback>{lead.first_name?.[0]}{lead.last_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <Link href={`/contacts/${lead.id}`} className="text-sm font-medium hover:underline block truncate">
                                                    {lead.first_name} {lead.last_name}
                                                </Link>
                                                <p className="text-xs text-muted-foreground truncate">{lead.company_role || "No role specified"}</p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] h-5">{formatCurrency(Number(lead.value) || 0, currency)}</Badge>
                                    </div>
                                ))}
                                {leads.length === 0 && (
                                    <div className="text-center py-6 text-sm text-muted-foreground italic">
                                        No leads linked to this company.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span>Total Deals Value</span>
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(leads.reduce((sum, l) => sum + (Number(l.value) || 0), 0), currency)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
