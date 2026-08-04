"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { Offer, Sale } from "@/types"

interface NewSaleFormProps {
    onSuccess: () => void
    defaultContactId?: string
    defaultCompanyId?: string
    initialData?: Sale | null
}

import { useLanguage } from "@/components/i18n/language-context"

export function NewSaleForm({ onSuccess, defaultContactId, defaultCompanyId, initialData }: NewSaleFormProps) {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(false)
    const [contacts, setContacts] = useState<{ id: string, first_name: string | null, last_name: string | null, company_id: string | null }[]>([])
    const [companies, setCompanies] = useState<{ id: string, name: string }[]>([])
    const [offers, setOffers] = useState<Offer[]>([])
    const [currency, setCurrency] = useState("CHF")
    const { toast } = useToast()
    const supabase = createClient()

    // Form state
    const [offerName, setOfferName] = useState(initialData?.offer_name || "")
    const [date, setDate] = useState(initialData?.sale_date?.split('T')[0] || new Date().toISOString().split('T')[0])
    const [price, setPrice] = useState(initialData?.price_ht?.toString() || "")
    const [vat, setVat] = useState(initialData?.vat_rate?.toString() || "8.1")
    const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "1")
    const initialTerms = initialData?.payment_terms || "commande_100"
    const [paymentTerms, setPaymentTerms] = useState(
        initialTerms.includes("% commande / solde fin")
            ? "staggered"
            : initialTerms.startsWith("Échelonné") && initialTerms.endsWith("mois")
                ? "installments"
                : initialTerms
    )
    const [paymentDelay, setPaymentDelay] = useState(initialData?.payment_delay || "immediat")
    const [contactId, setContactId] = useState(initialData?.contact_id || defaultContactId || "")
    const [companyId, setCompanyId] = useState(initialData?.company_id || defaultCompanyId || "")
    const [staggeredValue, setStaggeredValue] = useState(
        initialTerms.includes("% commande / solde fin") ? initialTerms.split("%")[0] : "50"
    )
    const [installmentsValue, setInstallmentsValue] = useState(
        initialTerms.startsWith("Échelonné") && initialTerms.endsWith("mois")
            ? (initialTerms.match(/\d+/)?.[0] || "3")
            : "3"
    )

    useEffect(() => {
        async function fetchData() {
            const [contactsRes, companiesRes, offersRes, currencyRes, vatRes] = await Promise.all([
                supabase.from('contacts').select('id, first_name, last_name, company_id').order('last_name'),
                supabase.from('companies').select('id, name').order('name'),
                supabase.from('offers').select('*').order('name'),
                supabase.from('settings').select('value').eq('key', 'currency').single(),
                supabase.from('settings').select('value').eq('key', 'vat_rate').single()
            ])
            if (contactsRes.data) setContacts(contactsRes.data as { id: string, first_name: string | null, last_name: string | null, company_id: string | null }[])
            if (companiesRes.data) setCompanies(companiesRes.data as { id: string, name: string }[])
            if (offersRes.data) setOffers(offersRes.data as Offer[])
            if (currencyRes.data) setCurrency(currencyRes.data.value)

            // Only set default VAT if not editing
            if (!initialData && vatRes.data) setVat(vatRes.data.value)
        }
        fetchData()
    }, [supabase, initialData])

    const handleOfferChange = (name: string) => {
        setOfferName(name)
        const selectedOffer = offers.find(o => o.name === name)
        if (selectedOffer) {
            setPrice(selectedOffer.default_price.toString())
        }
    }

    const handleCompanyChange = (value: string) => {
        setCompanyId(value)
        // Reset the contact if it does not belong to the newly selected company
        if (value && value !== "none") {
            const selectedContact = contacts.find(c => c.id === contactId)
            if (selectedContact && selectedContact.company_id !== value) {
                setContactId("")
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            offer_name: offerName,
            sale_date: date,
            price_ht: parseFloat(price),
            vat_rate: parseFloat(vat),
            quantity: parseInt(quantity),
            payment_terms: paymentTerms === "staggered"
                ? `${staggeredValue}% commande / solde fin`
                : paymentTerms === "installments"
                    ? `Échelonné ${installmentsValue} mois`
                    : paymentTerms,
            payment_delay: paymentDelay,
            contact_id: contactId === "none" ? null : (contactId || null),
            company_id: companyId === "none" ? null : (companyId || null)
        }

        const query = initialData
            ? supabase.from('sales').update(payload).eq('id', initialData.id)
            : supabase.from('sales').insert(payload)

        const { error } = await query

        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            if (!initialData && contactId && contactId !== "none") {
                const { data: currentContact } = await supabase
                    .from('contacts')
                    .select('customer_conversion_date')
                    .eq('id', contactId)
                    .single()
                if (currentContact && !currentContact.customer_conversion_date) {
                    await supabase
                        .from('contacts')
                        .update({ customer_conversion_date: new Date(date).toISOString() })
                        .eq('id', contactId)
                }
            }
            toast({ title: t('common.success'), description: initialData ? "Sale updated successfully" : "Sale recorded successfully" })
            if (!initialData) {
                setOfferName("")
                setPrice("")
            }
            onSuccess()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('cfo.offer')}</Label>
                    <Select onValueChange={handleOfferChange} value={offerName}>
                        <SelectTrigger><SelectValue placeholder={t('cfo.chooseOffer')} /></SelectTrigger>
                        <SelectContent>
                            {offers.map(offer => (
                                <SelectItem key={offer.id} value={offer.name}>{offer.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.saleDate')}</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t('cfo.company')}</Label>
                <Select onValueChange={handleCompanyChange} value={companyId}>
                    <SelectTrigger><SelectValue placeholder={t('cfo.associateCompany')} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t('common.all')}</SelectItem>
                        {companies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>{t('cfo.client')}</Label>
                <Select onValueChange={setContactId} value={contactId}>
                    <SelectTrigger><SelectValue placeholder={t('cfo.associateContact')} /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">{t('common.all')}</SelectItem>
                        {contacts
                            .filter(c => !companyId || companyId === "none" || c.company_id === companyId)
                            .map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.first_name} {c.last_name}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>{t('cfo.priceHt')} ({currency})</Label>
                    <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={`0 ${currency}`} />
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.vat')}</Label>
                    <Input type="number" value={vat} onChange={e => setVat(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>{t('cfo.quantity')}</Label>
                    <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t('cfo.paymentTerms')}</Label>
                <RadioGroup value={paymentTerms} onValueChange={setPaymentTerms}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="commande_100" id="r1" />
                        <Label htmlFor="r1">{t('cfo.allAtOrder')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mission_100" id="r2" />
                        <Label htmlFor="r2">{t('cfo.allAtEnd')}</Label>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="staggered" id="r3" />
                            <Input
                                type="number"
                                className="w-16 h-8 text-center"
                                value={staggeredValue}
                                onChange={e => {
                                    setStaggeredValue(e.target.value)
                                    setPaymentTerms("staggered")
                                }}
                            />
                            <Label htmlFor="r3">{t('cfo.staggeredOrder')}</Label>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="installments" id="r4" />
                            <Label htmlFor="r4">{t('cfo.installments')}</Label>
                            <Input
                                type="number"
                                className="w-16 h-8 text-center"
                                value={installmentsValue}
                                onChange={e => {
                                    setInstallmentsValue(e.target.value)
                                    setPaymentTerms("installments")
                                }}
                            />
                            <Label htmlFor="r4">{t('cfo.months')}</Label>
                        </div>
                    </div>
                </RadioGroup>
            </div>

            <div className="space-y-2">
                <Label>{t('cfo.paymentDelay')}</Label>
                <Select value={paymentDelay} onValueChange={setPaymentDelay}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="immediat">{t('cfo.immediate')}</SelectItem>
                        <SelectItem value="30_jours">{t('cfo.days30')}</SelectItem>
                        <SelectItem value="60_jours">{t('cfo.days60')}</SelectItem>
                        <SelectItem value="90_jours">{t('cfo.days90')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('common.save')}
            </Button>
        </form>
    )
}
