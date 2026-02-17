"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/components/i18n/language-context"
import { Offer, OfferType, OfferActivity, SalesGoal, PaymentTerms } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { GripVertical, Plus, Trash2, Info } from "lucide-react"

interface OfferFormProps {
    offer?: Offer
    onSave: (offer: Partial<Offer>) => void
    onCancel: () => void
    currency: string
}

const OFFER_TYPES: OfferType[] = [
    "Consulting ou coaching individuel",
    "Formation d'entreprise / Accompagnement collectif",
    "Mission freelance",
    "Produit digital",
    "Autre"
]

const MONTHS = ["Jan.", "Fév.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]

export function OfferForm({ offer, onSave, onCancel, currency }: OfferFormProps) {
    const { t } = useLanguage()

    // General
    const [name, setName] = useState(offer?.name || "")
    const [type, setType] = useState<OfferType>(offer?.type || "Consulting ou coaching individuel")
    const [description, setDescription] = useState(offer?.description || "")
    const [price, setPrice] = useState(offer?.default_price?.toString() || "")
    const [cost, setCost] = useState(offer?.unit_cost?.toString() || "")

    // Work Time
    const [activities, setActivities] = useState<OfferActivity[]>(offer?.work_time || [
        { description: "Temps passé en avant-vente", hours: 1, per_sale: true },
        { description: "Temps passé avec le client", hours: 3, per_sale: true },
        { description: "Temps passé en inter-séance", hours: 1, per_sale: true }
    ])

    // Goals (Default to current year)
    const currentYear = new Date().getFullYear()
    const [goals, setGoals] = useState<SalesGoal[]>(() => {
        const initial = offer?.sales_goals || []
        if (initial.some(g => g.year === currentYear)) return initial
        return [...initial, { year: currentYear, monthly_counts: Array(12).fill(0) }]
    })
    const [selectedYear, setSelectedYear] = useState(currentYear)

    // Terms
    const [terms, setTerms] = useState<PaymentTerms>(offer?.payment_terms || {
        mode: "100% à la commande",
        delay: "Immédiat"
    })

    // Computed
    const totalHours = activities.reduce((sum, act) => sum + (act.hours || 0), 0)
    const priceNum = parseFloat(price) || 0
    const costNum = parseFloat(cost) || 0
    const margin = priceNum - costNum
    const hourlyRate = totalHours > 0 ? margin / totalHours : 0

    const handleSave = () => {
        onSave({
            name,
            type,
            description,
            default_price: priceNum,
            unit_cost: costNum,
            work_time: activities,
            sales_goals: goals,
            payment_terms: terms
        })
    }

    const updateGoal = (monthIndex: number, value: string) => {
        const num = parseInt(value) || 0
        setGoals(prev => prev.map(g => {
            if (g.year === selectedYear) {
                const newCounts = [...g.monthly_counts]
                newCounts[monthIndex] = num
                return { ...g, monthly_counts: newCounts }
            }
            return g
        }))
    }

    const currentGoal = goals.find(g => g.year === selectedYear) || { year: selectedYear, monthly_counts: Array(12).fill(0) }
    const totalSales = currentGoal.monthly_counts.reduce((a, b) => a + b, 0)
    const totalRevenue = totalSales * priceNum

    return (
        <div className="space-y-8 overflow-y-auto max-h-[80vh] p-1">
            {/* Characteristics */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">{t('offers.characteristics')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('offers.propName')}</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Coaching 3 mois" />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('offers.type')}</Label>
                        <Select value={type} onValueChange={(v) => setType(v as OfferType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {OFFER_TYPES.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label>{t('offers.description')} ({t('common.optional')})</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-slate-50 border-none" />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('offers.priceHt')}</Label>
                        <div className="relative">
                            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} className="bg-slate-50 border-none pr-8" />
                            <span className="absolute right-3 top-2 text-muted-foreground">{currency}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('offers.unitCost')} ({t('common.optional')})</Label>
                        <div className="relative">
                            <Input type="number" value={cost} onChange={e => setCost(e.target.value)} className="bg-slate-50 border-none pr-8" />
                            <span className="absolute right-3 top-2 text-muted-foreground">{currency}</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm font-medium">
                    <div>{t('offers.margin')}: {margin.toFixed(2)} {currency}</div>
                    <div>{t('offers.hourlyRate')}: {hourlyRate.toFixed(2)} {currency}/h</div>
                </div>
            </section>

            {/* Work Time */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">{t('offers.workTime')}</h3>
                    <span className="text-sm font-medium text-primary">
                        {totalHours} {t('offers.hours')} {t('offers.or')} {(totalHours / 4).toFixed(2)} / {t('common.week')}
                        <Info className="inline h-4 w-4 ml-1" />
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <div className="col-span-1"></div>
                        <div className="col-span-7">{t('offers.activity')}</div>
                        <div className="col-span-2 text-center">{t('offers.timeSpent')}</div>
                        <div className="col-span-2 text-center">{t('offers.perSale')}</div>
                    </div>

                    {activities.map((activity, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-md">
                            <div className="col-span-1 flex justify-center cursor-move text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="col-span-7">
                                <Input
                                    value={activity.description}
                                    onChange={(e) => {
                                        const newActs = [...activities]
                                        newActs[index].description = e.target.value
                                        setActivities(newActs)
                                    }}
                                    className="border-none bg-transparent h-8 font-medium"
                                />
                            </div>
                            <div className="col-span-2">
                                <Input
                                    type="number"
                                    value={activity.hours || ''}
                                    onChange={(e) => {
                                        const newActs = [...activities]
                                        newActs[index].hours = parseFloat(e.target.value) || 0
                                        setActivities(newActs)
                                    }}
                                    className="border-none bg-white h-8 text-center"
                                />
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <Checkbox
                                    checked={activity.per_sale}
                                    onCheckedChange={(c) => {
                                        const newActs = [...activities]
                                        newActs[index].per_sale = c === true
                                        setActivities(newActs)
                                    }}
                                />
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <Button variant="ghost" size="sm" onClick={() => setActivities(activities.filter((_, i) => i !== index))}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button variant="secondary" size="sm" onClick={() => setActivities([...activities, { description: "", hours: 0, per_sale: true }])} className="w-full mt-2">
                        {t('offers.addActivity')}
                    </Button>
                </div>
            </section>

            {/* Sales Goals */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">{t('offers.salesGoals')}</h3>
                    <div className="text-right text-sm">
                        <div className="font-medium text-primary">
                            {t('offers.for')} {selectedYear} : {totalSales} {t('offers.sales')} {t('offers.soit')} {totalRevenue.toFixed(0)} {currency} HT
                        </div>
                        <div className="text-muted-foreground text-xs">
                            Total: {totalSales} {t('offers.sales')} {t('offers.soit')} {totalRevenue.toFixed(0)} {currency} HT
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {MONTHS.map((month, i) => (
                        <div key={month} className="text-center space-y-1">
                            <Label className="text-xs">{month}</Label>
                            <Input
                                type="number"
                                value={currentGoal.monthly_counts[i] || ''}
                                onChange={(e) => updateGoal(i, e.target.value)}
                                className="h-8 text-center bg-slate-50 border-none"
                            />
                        </div>
                    ))}
                </div>
            </section>

            {/* Payment Terms */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">{t('offers.paymentTerms')}</h3>
                    <RadioGroup
                        value={terms.mode}
                        onValueChange={(v) => setTerms({ ...terms, mode: v as any })}
                        className="space-y-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="100% à la commande" id="r1" />
                            <Label htmlFor="r1">{t('cfo.allAtOrder')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="100% en fin de mission" id="r2" />
                            <Label htmlFor="r2">{t('cfo.allAtEnd')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Échelonné" id="r3" />
                            <Label htmlFor="r3">{t('cfo.installments')}</Label>
                        </div>

                        {terms.mode === "Échelonné" && (
                            <div className="pl-6 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-normal text-muted-foreground w-auto">{t('offers.installmentsCount')} :</Label>
                                    <Input
                                        type="number"
                                        min="2"
                                        max="12"
                                        className="w-20 h-8"
                                        value={terms.installments_count || 3}
                                        onChange={(e) => setTerms({ ...terms, installments_count: parseInt(e.target.value) || 3 })}
                                    />
                                </div>
                            </div>
                        )}
                    </RadioGroup>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">{t('offers.paymentDelay')}</h3>
                    <Select value={terms.delay} onValueChange={(v) => setTerms({ ...terms, delay: v as any })}>
                        <SelectTrigger className="bg-slate-50 border-none">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Immédiat">{t('cfo.immediate')}</SelectItem>
                            <SelectItem value="30 jours">{t('cfo.days30')}</SelectItem>
                            <SelectItem value="60 jours">{t('cfo.days60')}</SelectItem>
                            <SelectItem value="90 jours">{t('cfo.days90')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </section>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button onClick={handleSave}>{t('common.save')}</Button>
            </div>
        </div>
    )
}
