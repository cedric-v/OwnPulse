"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Contact } from "@/types"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { GitMerge, Loader2, Search, Check, AlertCircle, UserPlus } from "lucide-react"

type MergeCandidate = Pick<
    Contact,
    | "id" | "first_name" | "last_name" | "email" | "company" | "company_role"
    | "status" | "list" | "value" | "phone" | "location" | "website"
    | "linkedin_url" | "threads_url" | "instagram_url" | "notes" | "created_at"
>

interface RelatedCounts {
    tasks: number
    sales: number
    activities: number
}

interface MergeContactDialogProps {
    contact: Contact
    currency: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

const CANDIDATE_SELECT = [
    "id", "first_name", "last_name", "email", "company", "company_role",
    "status", "list", "value", "phone", "location", "website",
    "linkedin_url", "threads_url", "instagram_url", "notes", "created_at",
].join(", ")

function contactDisplayName(c: { first_name: string | null; last_name: string | null }): string {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ")
    return name || "Contact sans nom"
}

function formatDate(d: string | null | undefined): string {
    if (!d) return ""
    const date = new Date(d)
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString()
}

export function MergeContactDialog({ contact, currency, open, onOpenChange }: MergeContactDialogProps) {
    const { t } = useLanguage()
    const supabase = createClient()
    const router = useRouter()

    const [candidates, setCandidates] = useState<MergeCandidate[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [selected, setSelected] = useState<MergeCandidate | null>(null)
    const [primary, setPrimary] = useState<"current" | "other">("current")
    const [related, setRelated] = useState<Record<string, RelatedCounts>>({})
    const [merging, setMerging] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset + load candidate list each time the dialog opens.
    useEffect(() => {
        if (!open) return
        let cancelled = false
        const load = async () => {
            setSearch("")
            setSelected(null)
            setPrimary("current")
            setRelated({})
            setError(null)
            setLoading(true)
            const { data, error: err } = await supabase
                .from('contacts')
                .select(CANDIDATE_SELECT)
                .neq('id', contact.id)
                .order('created_at', { ascending: false })
            if (cancelled) return
            if (err) {
                setError(err.message)
            } else {
                setCandidates((data || []) as unknown as MergeCandidate[])
            }
            setLoading(false)
        }
        void load()
        return () => { cancelled = true }
    }, [open, contact.id, supabase])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return candidates
        return candidates.filter(c =>
            (c.first_name || "").toLowerCase().includes(q) ||
            (c.last_name || "").toLowerCase().includes(q) ||
            `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            (c.company || "").toLowerCase().includes(q) ||
            (c.linkedin_url || "").toLowerCase().includes(q) ||
            (c.threads_url || "").toLowerCase().includes(q) ||
            (c.instagram_url || "").toLowerCase().includes(q)
        )
    }, [candidates, search])

    // Count tasks / sales / activities for the two contacts involved.
    useEffect(() => {
        if (!selected) return
        let cancelled = false
        ;(async () => {
            const ids = [contact.id, selected.id]
            const [tasksRes, salesRes, actsRes] = await Promise.all([
                supabase.from('tasks').select('contact_id').in('contact_id', ids),
                supabase.from('sales').select('contact_id').in('contact_id', ids),
                supabase.from('contact_activities').select('contact_id').in('contact_id', ids),
            ])
            if (cancelled) return
            const counts: Record<string, RelatedCounts> = {}
            for (const id of ids) {
                counts[id] = {
                    tasks: (tasksRes.data || []).filter(r => r.contact_id === id).length,
                    sales: (salesRes.data || []).filter(r => r.contact_id === id).length,
                    activities: (actsRes.data || []).filter(r => r.contact_id === id).length,
                }
            }
            setRelated(counts)
        })()
        return () => { cancelled = true }
    }, [selected, contact.id, supabase])

    const primaryContact = primary === "current" ? contact : selected
    const duplicateContact = primary === "current" ? selected : contact

    const handleMerge = async () => {
        if (!selected || !primaryContact || !duplicateContact) return
        setMerging(true)
        setError(null)
        const { data, error: err } = await supabase.rpc('merge_contacts', {
            p_primary_id: primaryContact.id,
            p_duplicate_ids: [duplicateContact.id],
        })
        setMerging(false)
        if (err) {
            setError(err.message)
            return
        }
        onOpenChange(false)
        router.push(`/contacts/${data}`)
    }

    const renderContactColumn = (
        c: MergeCandidate | Contact,
        counts: RelatedCounts | undefined,
        isPrimary: boolean
    ) => {
        return (
            <div className={`flex flex-col rounded-lg border p-3 ${isPrimary ? "border-emerald-300 dark:border-emerald-700" : "border-muted"}`}>
                <div className="mb-2 flex items-center gap-2">
                    <RadioGroupItem value={c.id} id={`primary-${c.id}`} className={isPrimary ? "border-emerald-500 text-emerald-600" : ""} />
                    <Label htmlFor={`primary-${c.id}`} className="cursor-pointer text-sm font-semibold">
                        {isPrimary && (
                            <span className="mr-1 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3 w-3" /> {t('contacts.merge.kept')}
                            </span>
                        )}
                        {contactDisplayName(c)}
                    </Label>
                </div>
                {counts && (
                    <p className="mb-2 text-[10px] text-muted-foreground">
                        {t('contacts.merge.related', { tasks: counts.tasks, sales: counts.sales, activities: counts.activities })}
                    </p>
                )}
                <div className="space-y-1 text-xs">
                    {c.email && <p className="truncate">{c.email}</p>}
                    {c.phone && <p className="truncate">{c.phone}</p>}
                    {c.company && <p className="truncate">{c.company}{c.company_role ? ` — ${c.company_role}` : ""}</p>}
                    {c.status && <p className="truncate">{c.status}</p>}
                    {c.list && <p className="truncate">Listes: {c.list}</p>}
                    {c.value != null && c.value !== 0 && (
                        <p className="truncate">Valeur: {c.value.toLocaleString('fr-CH', { style: 'currency', currency })}</p>
                    )}
                    {c.location && <p className="truncate">{c.location}</p>}
                    {c.website && <p className="truncate">{c.website}</p>}
                    {c.linkedin_url && <p className="truncate">LinkedIn: {c.linkedin_url}</p>}
                    {c.threads_url && <p className="truncate">Threads: {c.threads_url}</p>}
                    {c.instagram_url && <p className="truncate">Instagram: {c.instagram_url}</p>}
                    {c.notes && <p className="truncate">{c.notes.length > 80 ? c.notes.slice(0, 80) + "…" : c.notes}</p>}
                    <p className="text-[10px] text-muted-foreground">Créé le {formatDate(c.created_at)}</p>
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('contacts.merge.title')}</DialogTitle>
                    <DialogDescription>{t('contacts.merge.description')}</DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">{error}</span>
                    </div>
                )}

                {!selected && (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('contacts.merge.searchPlaceholder')}
                                className="pl-9"
                            />
                        </div>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="max-h-64 space-y-1 overflow-auto pr-1">
                                {filtered.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-muted-foreground italic">
                                        {t('contacts.merge.noResults')}
                                    </p>
                                ) : (
                                    filtered.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setSelected(c)}
                                            className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:border-blue-300 hover:bg-accent"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span className="truncate font-medium">{contactDisplayName(c)}</span>
                                                {c.email && <span className="truncate text-xs text-muted-foreground">{c.email}</span>}
                                            </span>
                                            <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {selected && (
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                            {t('contacts.merge.rulePrimary')}
                        </p>
                        <RadioGroup
                            value={primary === "current" ? contact.id : selected.id}
                            onValueChange={v => setPrimary(v === contact.id ? "current" : "other")}
                            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                        >
                            {renderContactColumn(contact, related[contact.id], primary === "current")}
                            {renderContactColumn(selected, related[selected.id], primary === "other")}
                        </RadioGroup>
                        <div className="space-y-1 rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground">
                            <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {t('contacts.merge.ruleLists')}</p>
                            <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {t('contacts.merge.ruleNotes')}</p>
                            <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {t('contacts.merge.ruleRelated')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                                {t('common.cancel')}
                            </Button>
                            <p className="text-[11px] text-muted-foreground">
                                {t('contacts.merge.chooseAnother')}
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {!selected ? (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
                                {t('common.cancel')}
                            </Button>
                            <Button onClick={handleMerge} disabled={merging}>
                                {merging ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <GitMerge className="mr-2 h-4 w-4" />
                                )}
                                {t('contacts.merge.confirm')}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
