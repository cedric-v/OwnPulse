"use client"

import { useEffect, useState } from "react"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { GitMerge, Loader2, Check, AlertCircle } from "lucide-react"

interface RelatedCounts {
    tasks: number
    sales: number
    activities: number
}

interface MergeSelectedDialogProps {
    contacts: Contact[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (primaryId: string) => void
}

function contactDisplayName(c: { first_name: string | null; last_name: string | null }): string {
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ")
    return name || "Contact sans nom"
}

export function MergeSelectedDialog({
    contacts,
    open,
    onOpenChange,
    onSuccess,
}: MergeSelectedDialogProps) {
    const { t } = useLanguage()
    const supabase = createClient()

    const [primaryId, setPrimaryId] = useState<string | null>(contacts[0]?.id ?? null)
    const [related, setRelated] = useState<Record<string, RelatedCounts>>({})
    const [merging, setMerging] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset primary selection and load related counts each time the dialog opens.
    useEffect(() => {
        if (!open || contacts.length === 0) return
        let cancelled = false
        const load = async () => {
            setPrimaryId(contacts[0].id)
            setRelated({})
            setError(null)
            const ids = contacts.map(c => c.id)
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
        }
        void load()
        return () => { cancelled = true }
    }, [open, contacts, supabase])

    const primary = contacts.find(c => c.id === primaryId) ?? contacts[0]
    const duplicates = contacts.filter(c => c.id !== primary?.id)

    const handleMerge = async () => {
        if (!primary || duplicates.length === 0) return
        setMerging(true)
        setError(null)
        const { data, error: err } = await supabase.rpc('merge_contacts', {
            p_primary_id: primary.id,
            p_duplicate_ids: duplicates.map(c => c.id),
        })
        setMerging(false)
        if (err) {
            setError(err.message)
            return
        }
        onOpenChange(false)
        onSuccess?.(data)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {t('contacts.merge.titleCount', { count: contacts.length })}
                    </DialogTitle>
                    <DialogDescription>{t('contacts.merge.multiHint')}</DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words">{error}</span>
                    </div>
                )}

                <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                        {t('contacts.merge.rulePrimary')}
                    </p>
                    <RadioGroup
                        value={primary?.id ?? ""}
                        onValueChange={setPrimaryId}
                        className="max-h-72 space-y-2 overflow-auto pr-1"
                    >
                        {contacts.map(c => {
                            const counts = related[c.id]
                            const isPrimary = c.id === primary?.id
                            return (
                                <div
                                    key={c.id}
                                    className={`flex items-center gap-3 rounded-lg border p-3 ${isPrimary ? "border-emerald-300 dark:border-emerald-700" : "border-muted"}`}
                                >
                                    <RadioGroupItem value={c.id} id={`primary-${c.id}`} />
                                    <Label htmlFor={`primary-${c.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                                        {isPrimary && (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                <Check className="h-3 w-3" /> {t('contacts.merge.kept')}
                                            </span>
                                        )}
                                        <span className="truncate font-medium">{contactDisplayName(c)}</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {[c.email, c.company].filter(Boolean).join(" · ")}
                                        </span>
                                    </Label>
                                    {counts && (
                                        <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                                            {t('contacts.merge.related', {
                                                tasks: counts.tasks,
                                                sales: counts.sales,
                                                activities: counts.activities,
                                            })}
                                        </Badge>
                                    )}
                                </div>
                            )
                        })}
                    </RadioGroup>
                    <div className="space-y-1 rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground">
                        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {t('contacts.merge.ruleLists')}</p>
                        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {t('contacts.merge.ruleNotes')}</p>
                        <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> {t('contacts.merge.ruleRelated')}</p>
                    </div>
                    {primary && (
                        <p className="text-xs text-muted-foreground">
                            {duplicates.length} {duplicates.length > 1 ? "contacts" : "contact"} seront fusionné{duplicates.length > 1 ? "s" : ""} dans{' '}
                            <strong className="text-foreground">{contactDisplayName(primary)}</strong>
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleMerge} disabled={merging || !primary || duplicates.length === 0}>
                        {merging ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <GitMerge className="mr-2 h-4 w-4" />
                        )}
                        {t('contacts.merge.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
