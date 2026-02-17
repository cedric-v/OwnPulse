"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Setting, Offer } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Save, Loader2, Pencil, Check, X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function SettingsPage() {
    const [currency, setCurrency] = useState("CHF")
    const [vatRate, setVatRate] = useState("8.1")
    const [socialRate, setSocialRate] = useState("20")
    const [taxRate, setTaxRate] = useState("3")
    const [targetNetSalary, setTargetNetSalary] = useState("4000")
    const [offers, setOffers] = useState<Offer[]>([])
    const [acquisitionChannels, setAcquisitionChannels] = useState<{ id: string, name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { toast } = useToast()
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
            toast({ title: "Error", description: (currencyError || vatError || socialError || taxError || salaryError)?.message, variant: "destructive" })
        } else {
            toast({ title: "Success", description: "Settings saved" })
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
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
            setOffers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewOfferName("")
            setNewOfferPrice("")
            toast({ title: "Success", description: "Offer added" })
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
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
            setOffers(prev => prev.map(o => o.id === id ? { ...o, name: editOfferName, default_price: parseFloat(editOfferPrice) || 0 } : o))
            setEditingOfferId(null)
            toast({ title: "Success", description: "Offer updated" })
        }
        setSaving(false)
    }

    const deleteOffer = async (id: string) => {
        const { error } = await supabase.from('offers').delete().eq('id', id)
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
            setOffers(prev => prev.filter(o => o.id !== id))
            toast({ title: "Success", description: "Offer deleted" })
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
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
            setAcquisitionChannels(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewChannelName("")
            toast({ title: "Success", description: "Channel added" })
        }
    }

    const updateChannel = async (id: string) => {
        setSaving(true)
        const { error } = await supabase
            .from('acquisition_channels')
            .update({ name: editChannelName })
            .eq('id', id)

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
            setAcquisitionChannels(prev => prev.map(c => c.id === id ? { ...c, name: editChannelName } : c))
            setEditingChannelId(null)
            toast({ title: "Success", description: "Channel updated" })
        }
        setSaving(false)
    }

    const deleteChannel = async (id: string) => {
        const { error } = await supabase.from('acquisition_channels').delete().eq('id', id)
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
            setAcquisitionChannels(prev => prev.filter(c => c.id !== id))
            toast({ title: "Success", description: "Channel deleted" })
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">Général</TabsTrigger>
                    <TabsTrigger value="offers">Offres</TabsTrigger>
                    <TabsTrigger value="channels">Canaux d'acquisition</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Préférences</CardTitle>
                            <CardDescription>Configurez vos paramètres système.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 max-w-sm">
                                <Label>Devise par défaut</Label>
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
                                <Label>TVA par défaut (%)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={vatRate}
                                    onChange={e => setVatRate(e.target.value)}
                                    placeholder="8.1"
                                />
                                <p className="text-xs text-muted-foreground italic">S'applique par défaut aux nouvelles ventes et dépenses.</p>
                            </div>

                            <div className="space-y-2 max-w-sm">
                                <Label>Contributions sociales (%)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={socialRate}
                                    onChange={e => setSocialRate(e.target.value)}
                                    placeholder="20"
                                />
                                <p className="text-xs text-muted-foreground italic">Estimation recommandée : ~45%</p>
                            </div>

                            <div className="space-y-2 max-w-sm">
                                <Label>Taxes et impôts (%)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={taxRate}
                                    onChange={e => setTaxRate(e.target.value)}
                                    placeholder="3"
                                />
                                <p className="text-xs text-muted-foreground italic">Estimation recommandée : ~5%</p>
                            </div>
                            <div className="space-y-2 max-w-sm">
                                <Label>Rémunération nette mensuelle cible ({currency})</Label>
                                <Input
                                    type="number"
                                    value={targetNetSalary}
                                    onChange={e => setTargetNetSalary(e.target.value)}
                                    placeholder="4000"
                                />
                                <p className="text-xs text-muted-foreground italic">Votre objectif de revenu net mensuel.</p>
                            </div>
                            <Button onClick={saveSettings} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Sauvegarder
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="offers" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gestion des Offres</CardTitle>
                            <CardDescription>Gérez vos services et leurs tarifs par défaut.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border p-4 rounded-lg bg-muted/20">
                                <div className="space-y-2">
                                    <Label>Nom de l'offre</Label>
                                    <Input value={newOfferName} onChange={e => setNewOfferName(e.target.value)} placeholder="Ex: Coaching Flash" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Prix par défaut ({currency})</Label>
                                    <Input type="number" value={newOfferPrice} onChange={e => setNewOfferPrice(e.target.value)} placeholder="0.00" />
                                </div>
                                <Button onClick={addOffer} className="w-full">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter l'offre
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead className="text-right">Prix par défaut</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {offers.map(offer => (
                                        <TableRow key={offer.id}>
                                            <TableCell className="font-medium">
                                                {editingOfferId === offer.id ? (
                                                    <Input
                                                        value={editOfferName}
                                                        onChange={e => setEditOfferName(e.target.value)}
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    offer.name
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {editingOfferId === offer.id ? (
                                                    <Input
                                                        type="number"
                                                        value={editOfferPrice}
                                                        onChange={e => setEditOfferPrice(e.target.value)}
                                                        className="h-8 text-right"
                                                    />
                                                ) : (
                                                    offer.default_price.toLocaleString('fr-CH', { style: 'currency', currency: currency })
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    {editingOfferId === offer.id ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-600"
                                                                onClick={() => updateOffer(offer.id)}
                                                                title="Enregistrer"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground"
                                                                onClick={cancelEditOffer}
                                                                title="Annuler"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => startEditOffer(offer)}
                                                                title="Modifier"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => deleteOffer(offer.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
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
                                                Aucune offre configurée.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="channels" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Canaux d'acquisition</CardTitle>
                            <CardDescription>Gérez les sources de vos leads et contacts.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4 items-end border p-4 rounded-lg bg-muted/20">
                                <div className="space-y-2 flex-1">
                                    <Label>Nom du canal</Label>
                                    <Input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Ex: Podcast, YouTube..." />
                                </div>
                                <Button onClick={addChannel}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {acquisitionChannels.map(channel => (
                                        <TableRow key={channel.id}>
                                            <TableCell className="font-medium">
                                                {editingChannelId === channel.id ? (
                                                    <Input
                                                        value={editChannelName}
                                                        onChange={e => setEditChannelName(e.target.value)}
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    channel.name
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    {editingChannelId === channel.id ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-emerald-600"
                                                                onClick={() => updateChannel(channel.id)}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground"
                                                                onClick={() => {
                                                                    setEditingChannelId(null)
                                                                    setEditChannelName("")
                                                                }}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => {
                                                                    setEditingChannelId(channel.id)
                                                                    setEditChannelName(channel.name)
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => deleteChannel(channel.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
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
                                                Aucun canal configuré.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
