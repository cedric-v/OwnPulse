"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Language } from "@/lib/i18n/translations"
import { Setting, Offer, AcquisitionChannel } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Save, Loader2, Edit2, Check, X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function SettingsPage() {
    const { toast } = useToast()
    const { t, language: currentLanguage, setLanguage } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [currency, setCurrency] = useState("CHF")
    const [vatRate, setVatRate] = useState("8.1")
    const [socialRate, setSocialRate] = useState("45")
    const [taxRate, setTaxRate] = useState("5")
    const [targetNetSalary, setTargetNetSalary] = useState("4000")
    const [offers, setOffers] = useState<Offer[]>([])
    const [acquisitionChannels, setAcquisitionChannels] = useState<AcquisitionChannel[]>([])
    const supabase = createClient()

    // Offer state
    const [newOfferName, setNewOfferName] = useState("")
    const [newOfferPrice, setNewOfferPrice] = useState("")
    const [editingOfferId, setEditingOfferId] = useState<string | null>(null)
    const [editOfferName, setEditOfferName] = useState("")
    const [editOfferPrice, setEditOfferPrice] = useState("")

    // Acquisition Channel state
    const [newChannelName, setNewChannelName] = useState("")
    const [editingChannelId, setEditingChannelId] = useState<string | null>(null)
    const [editChannelName, setEditChannelName] = useState("")

    useEffect(() => {
        async function loadSettings() {
            setLoading(true)
            const [currencyRes, vatRes, socialRes, taxRes, salaryRes, offersRes, channelsRes] = await Promise.all([
                supabase.from('settings').select('*').eq('key', 'currency').single(),
                supabase.from('settings').select('*').eq('key', 'vat_rate').single(),
                supabase.from('settings').select('*').eq('key', 'social_rate').single(),
                supabase.from('settings').select('*').eq('key', 'tax_rate').single(),
                supabase.from('settings').select('*').eq('key', 'target_net_salary').single(),
                supabase.from('offers').select('*').order('name'),
                supabase.from('acquisition_channels').select('*').order('name')
            ])

            if (currencyRes.data) setCurrency(currencyRes.data.value)
            if (vatRes.data) setVatRate(vatRes.data.value)
            if (socialRes.data) setSocialRate(socialRes.data.value)
            if (taxRes.data) setTaxRate(taxRes.data.value)
            if (salaryRes.data) setTargetNetSalary(salaryRes.data.value)
            if (offersRes.data) setOffers(offersRes.data)
            if (channelsRes.data) setAcquisitionChannels(channelsRes.data)
            setLoading(false)
        }
        loadSettings()
    }, [supabase])

    const saveSettings = async () => {
        setSaving(true)
        const { error: currencyError } = await supabase
            .from('settings')
            .upsert({ key: 'currency', value: currency }, { onConflict: 'key' })

        const { error: vatError } = await supabase
            .from('settings')
            .upsert({ key: 'vat_rate', value: vatRate }, { onConflict: 'key' })

        const { error: socialError } = await supabase
            .from('settings')
            .upsert({ key: 'social_rate', value: socialRate }, { onConflict: 'key' })

        const { error: taxError } = await supabase
            .from('settings')
            .upsert({ key: 'tax_rate', value: taxRate }, { onConflict: 'key' })

        const { error: salaryError } = await supabase
            .from('settings')
            .upsert({ key: 'target_net_salary', value: targetNetSalary }, { onConflict: 'key' })

        if (currencyError || vatError || socialError || taxError || salaryError) {
            toast({ title: t('common.error'), description: (currencyError || vatError || socialError || taxError || salaryError)?.message, variant: "destructive" })
        } else {
            toast({ title: t('common.success'), description: t('common.success') })
        }
        setSaving(false)
    }

    const addOffer = async () => {
        if (!newOfferName) return
        const { data, error } = await supabase
            .from('offers')
            .insert({ name: newOfferName, default_price: parseFloat(newOfferPrice) || 0 })
            .select()
            .single()

        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            setOffers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewOfferName("")
            setNewOfferPrice("")
            toast({ title: t('common.success'), description: t('common.success') })
        }
    }

    const startEditOffer = (offer: Offer) => {
        setEditingOfferId(offer.id)
        setEditOfferName(offer.name)
        setEditOfferPrice(offer.default_price.toString())
    }

    const cancelEditOffer = () => {
        setEditingOfferId(null)
        setEditOfferName("")
        setEditOfferPrice("")
    }

    const updateOffer = async (id: string) => {
        setSaving(true)
        const { error } = await supabase
            .from('offers')
            .update({
                name: editOfferName,
                default_price: parseFloat(editOfferPrice) || 0
            })
            .eq('id', id)

        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            setOffers(prev => prev.map(o => o.id === id ? { ...o, name: editOfferName, default_price: parseFloat(editOfferPrice) || 0 } : o))
            setEditingOfferId(null)
            toast({ title: t('common.success'), description: t('common.success') })
        }
        setSaving(false)
    }

    const deleteOffer = async (id: string) => {
        const { error } = await supabase.from('offers').delete().eq('id', id)
        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            setOffers(prev => prev.filter(o => o.id !== id))
            toast({ title: t('common.success'), description: t('common.success') })
        }
    }

    // Acquisition Channel CRUD
    const addChannel = async () => {
        if (!newChannelName) return
        const { data, error } = await supabase
            .from('acquisition_channels')
            .insert({ name: newChannelName })
            .select()
            .single()

        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            setAcquisitionChannels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewChannelName("")
            toast({ title: t('common.success'), description: t('common.success') })
        }
    }

    const updateChannel = async (id: string) => {
        setSaving(true)
        const { error } = await supabase
            .from('acquisition_channels')
            .update({ name: editChannelName })
            .eq('id', id)

        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            setAcquisitionChannels(prev => prev.map(c => c.id === id ? { ...c, name: editChannelName } : c))
            setEditingChannelId(null)
            toast({ title: t('common.success'), description: t('common.success') })
        }
        setSaving(false)
    }

    const deleteChannel = async (id: string) => {
        const { error } = await supabase.from('acquisition_channels').delete().eq('id', id)
        if (error) {
            toast({ title: t('common.error'), description: error.message, variant: "destructive" })
        } else {
            setAcquisitionChannels(prev => prev.filter(c => c.id !== id))
            toast({ title: t('common.success'), description: t('common.success') })
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">{t('common.general')}</TabsTrigger>
                    <TabsTrigger value="finance">{t('settings.finance')}</TabsTrigger>
                    <TabsTrigger value="offers">{t('settings.offersManagement')}</TabsTrigger>
                    <TabsTrigger value="channels">{t('settings.channelsManagement')}</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.preferences')}</CardTitle>
                            <CardDescription>{t('settings.systemParams')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 max-w-sm">
                                <Label>{t('settings.defaultCurrency')}</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CHF">CHF (Franc Suisse)</SelectItem>
                                        <SelectItem value="EUR">€ (Euro)</SelectItem>
                                        <SelectItem value="USD">$ (Dollar US)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 max-w-sm">
                                <Label>{t('settings.interfaceLanguage')}</Label>
                                <Select value={currentLanguage} onValueChange={(v) => setLanguage(v as Language)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fr">Français</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={saveSettings} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {t('common.save')}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="finance" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.finance')}</CardTitle>
                            <CardDescription>{t('settings.systemParams')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>{t('settings.defaultVat')}</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={vatRate}
                                        onChange={e => setVatRate(e.target.value)}
                                        placeholder="8.1"
                                    />
                                    <p className="text-xs text-muted-foreground italic">{t('settings.vatNote')}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('settings.socialCharges')}</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={socialRate}
                                        onChange={e => setSocialRate(e.target.value)}
                                        placeholder="45"
                                    />
                                    <p className="text-xs text-muted-foreground italic">{t('settings.socialNote')}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('settings.taxesRate')}</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={taxRate}
                                        onChange={e => setTaxRate(e.target.value)}
                                        placeholder="5"
                                    />
                                    <p className="text-xs text-muted-foreground italic">{t('settings.taxesNote')}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('settings.targetSalary')} ({currency})</Label>
                                    <Input
                                        type="number"
                                        value={targetNetSalary}
                                        onChange={e => setTargetNetSalary(e.target.value)}
                                        placeholder="4000"
                                    />
                                    <p className="text-xs text-muted-foreground italic">{t('settings.salaryNote')}</p>
                                </div>
                            </div>
                            <Button onClick={saveSettings} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {t('common.save')}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="offers" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.offersManagement')}</CardTitle>
                            <CardDescription>{t('settings.offersNote')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-end gap-4 max-w-2xl">
                                <div className="space-y-2 flex-1">
                                    <Label>{t('settings.offerName')}</Label>
                                    <Input
                                        value={newOfferName}
                                        onChange={e => setNewOfferName(e.target.value)}
                                        placeholder="Nom de l'offre"
                                    />
                                </div>
                                <div className="space-y-2 w-32">
                                    <Label>{t('settings.defaultPrice')} ({currency})</Label>
                                    <Input
                                        type="number"
                                        value={newOfferPrice}
                                        onChange={e => setNewOfferPrice(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <Button onClick={addOffer}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('settings.addOffer')}
                                </Button>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('settings.offerName')}</TableHead>
                                            <TableHead className="text-right">{t('settings.defaultPrice')}</TableHead>
                                            <TableHead className="w-24"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {offers.map(offer => (
                                            <TableRow key={offer.id}>
                                                <TableCell>
                                                    {editingOfferId === offer.id ? (
                                                        <Input
                                                            value={editOfferName}
                                                            onChange={e => setEditOfferName(e.target.value)}
                                                        />
                                                    ) : offer.name}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {editingOfferId === offer.id ? (
                                                        <Input
                                                            type="number"
                                                            value={editOfferPrice}
                                                            onChange={e => setEditOfferPrice(e.target.value)}
                                                            className="text-right"
                                                        />
                                                    ) : (
                                                        `${offer.default_price.toLocaleString('fr-CH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {editingOfferId === offer.id ? (
                                                            <>
                                                                <Button size="icon" variant="ghost" onClick={() => updateOffer(offer.id)}>
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={cancelEditOffer}>
                                                                    <X className="h-4 w-4 text-red-600" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button size="icon" variant="ghost" onClick={() => startEditOffer(offer)}>
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={() => deleteOffer(offer.id)}>
                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {offers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                                    {t('settings.noOffersConfigured')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="channels" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.channelsManagement')}</CardTitle>
                            <CardDescription>{t('settings.channelsNote')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-end gap-4 max-w-md">
                                <div className="space-y-2 flex-1">
                                    <Label>{t('settings.channelName')}</Label>
                                    <Input
                                        value={newChannelName}
                                        onChange={e => setNewChannelName(e.target.value)}
                                        placeholder="LinkedIn, Threads, Instagram..."
                                    />
                                </div>
                                <Button onClick={addChannel}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('common.add')}
                                </Button>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('settings.channelName')}</TableHead>
                                            <TableHead className="w-24"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {acquisitionChannels.map(channel => (
                                            <TableRow key={channel.id}>
                                                <TableCell>
                                                    {editingChannelId === channel.id ? (
                                                        <Input
                                                            value={editChannelName}
                                                            onChange={e => setEditChannelName(e.target.value)}
                                                        />
                                                    ) : channel.name}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 justify-end">
                                                        {editingChannelId === channel.id ? (
                                                            <>
                                                                <Button size="icon" variant="ghost" onClick={() => updateChannel(channel.id)}>
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={() => setEditingChannelId(null)}>
                                                                    <X className="h-4 w-4 text-red-600" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button size="icon" variant="ghost" onClick={() => { setEditingChannelId(channel.id); setEditChannelName(channel.name) }}>
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={() => deleteChannel(channel.id)}>
                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {acquisitionChannels.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                                    {t('settings.noChannelsConfigured')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
