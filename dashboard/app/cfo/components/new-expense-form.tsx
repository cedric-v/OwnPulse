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
}

export function NewExpenseForm({ onSuccess }: NewExpenseFormProps) {
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
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("")
    const [importance, setImportance] = useState<"Mandatory" | "Important" | "Optional">("Mandatory")
    const [price, setPrice] = useState("")
    const [vat, setVat] = useState("20")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [frequency, setFrequency] = useState("unique")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase.from('expenses').insert({
            description,
            category,
            importance,
            price_ht: parseFloat(price),
            vat_rate: parseFloat(vat),
            date,
            payment_frequency: frequency
        })

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
            toast({ title: "Success", description: "Expense recorded successfully" })
            setDescription("")
            setPrice("")
            onSuccess()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold text-primary">Nouvelle dépense</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Abonnement Logiciel" />
                </div>
                <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select onValueChange={setCategory} value={category}>
                        <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Logiciels">Logiciels</SelectItem>
                            <SelectItem value="Matériel">Matériel</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Prestations">Prestations de services</SelectItem>
                            <SelectItem value="Formation">Formations</SelectItem>
                            <SelectItem value="Déplacements">Déplacements</SelectItem>
                            <SelectItem value="Taxes">Taxes et impôts</SelectItem>
                            <SelectItem value="Divers">Autres achats</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Importance</Label>
                    <Select onValueChange={(v: any) => setImportance(v)} value={importance}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Mandatory">Indispensable</SelectItem>
                            <SelectItem value="Important">Important</SelectItem>
                            <SelectItem value="Optional">Facultatif</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label>Prix HT</Label>
                    <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={`0 ${currency}`} />
                </div>
                <div className="space-y-2">
                    <Label>TVA %</Label>
                    <Input type="number" value={vat} onChange={e => setVat(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Fréquence</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unique">Paiement unique</SelectItem>
                            <SelectItem value="mensuel">Mensuel</SelectItem>
                            <SelectItem value="annuel">Annuel</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading ? "Enregistrement..." : "Enregistrer"}
                </Button>
            </div>
        </form>
    )
}
