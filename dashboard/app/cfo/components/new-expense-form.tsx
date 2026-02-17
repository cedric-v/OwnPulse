"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

interface NewExpenseFormProps {
    onSuccess: () => void
    initialData?: any // Added for editing support
}

import { useLanguage } from "@/components/i18n/language-context"

export function NewExpenseForm({ onSuccess, initialData }: NewExpenseFormProps) {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(false)
    const [currency, setCurrency] = useState("CHF")
    const { toast } = useToast()
    const supabase = createClient()

    useEffect(() => {
        async function fetchSettings() {
            const [currencyRes, vatRes] = await Promise.all([
                supabase.from('settings').select('value').eq('key', 'currency').single(),
                supabase.from('settings').select('value').eq('key', 'vat_rate').single()
            ])
            if (currencyRes.data) setCurrency(currencyRes.data.value)
            if (vatRes.data) setVat(vatRes.data.value)
        }
        fetchSettings()
    }, [supabase])

    // Form state
    const [description, setDescription] = useState(initialData?.description || "")
    const [category, setCategory] = useState(initialData?.category || "")
    const [importance, setImportance] = useState<"Mandatory" | "Important" | "Optional">(initialData?.importance || "Mandatory")
    const [price, setPrice] = useState(initialData?.price_ht?.toString() || "")
    const [vat, setVat] = useState(initialData?.vat_rate?.toString() || "8.1")
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    const [frequency, setFrequency] = useState(initialData?.payment_frequency || "unique")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        let error

        if (initialData?.id) {
            const { error: updateError } = await supabase
                .from('expenses')
                .update({
                    description,
                    category,
                    importance,
                    price_ht: parseFloat(price),
                    vat_rate: parseFloat(vat),
                    date,
                    payment_frequency: frequency
                })
                .eq('id', initialData.id)
            error = updateError
        } else {
            const { error: insertError } = await supabase.from('expenses').insert({
                description,
                category,
                importance,
                price_ht: parseFloat(price),
                vat_rate: parseFloat(vat),
                date,
                payment_frequency: frequency
            })
            error = insertError
        }

        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            toast({ title: t('common.success'), description: "Expense recorded successfully" })
            setDescription("")
            setPrice("")
            onSuccess()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold text-primary">{t('cfo.newExpense')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>{t('cfo.description')}</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Abonnement Logiciel" />
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.category')}</Label>
                    <Select onValueChange={setCategory} value={category}>
                        <SelectTrigger><SelectValue placeholder={t('cfo.chooseCategory')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Logiciels">{t('cfo.software')}</SelectItem>
                            <SelectItem value="Matériel">{t('cfo.hardware')}</SelectItem>
                            <SelectItem value="Marketing">{t('cfo.marketing')}</SelectItem>
                            <SelectItem value="Prestations">{t('cfo.services')}</SelectItem>
                            <SelectItem value="Formation">{t('cfo.training')}</SelectItem>
                            <SelectItem value="Déplacements">{t('cfo.travel')}</SelectItem>
                            <SelectItem value="Rémunération">{t('cfo.remuneration')}</SelectItem>
                            <SelectItem value="Taxes">{t('cfo.taxes')}</SelectItem>
                            <SelectItem value="Divers">{t('cfo.others')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.importance')}</Label>
                    <Select onValueChange={(v: any) => setImportance(v)} value={importance}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Mandatory">{t('cfo.mandatory')}</SelectItem>
                            <SelectItem value="Important">{t('cfo.important')}</SelectItem>
                            <SelectItem value="Optional">{t('cfo.optional')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label>{t('cfo.priceHt')}</Label>
                    <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={`0 ${currency}`} />
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.vat')}</Label>
                    <Input type="number" value={vat} onChange={e => setVat(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.frequency')}</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unique">{t('cfo.unique')}</SelectItem>
                            <SelectItem value="mensuel">{t('cfo.monthly')}</SelectItem>
                            <SelectItem value="annuel">{t('cfo.annual')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.expenseDate')}</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading ? t('common.loading') : t('common.save')}
                </Button>
            </div>
        </form>
    )
}
