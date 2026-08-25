
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function AddLeadDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        company: "",
        email: "",
        linkedin_url: "",
        threads_url: "",
        instagram_url: "",
        list: "Prospects",
        value: 0,
        acquisition_channel: "",
        // A lead can be created before any contact has taken place. Keep this
        // empty rather than presenting the creation date as a first contact.
        first_contact_date: ""
    })
    const [channels, setChannels] = useState<{ id: string, name: string }[]>([])
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function fetchChannels() {
            const { data } = await supabase.from('acquisition_channels').select('*').order('name')
            if (data) setChannels(data)
        }
        fetchChannels()
    }, [supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { data, error } = await supabase
            .from('contacts')
            .insert([
                {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    company: formData.company,
                    email: formData.email,
                    linkedin_url: formData.linkedin_url || null,
                    threads_url: formData.threads_url || null,
                    instagram_url: formData.instagram_url || null,
                    list: formData.list,
                    value: formData.value,
                    acquisition_channel: formData.acquisition_channel || null,
                    first_contact_date: formData.first_contact_date || null,
                    status: "Prospect" // Default status
                }
            ])
            .select()

        setLoading(false)
        if (error) {
            alert("Error adding lead: " + error.message)
        } else {
            setOpen(false)
            setOpen(false)
            setFormData({
                first_name: "", last_name: "", company: "", email: "",
                linkedin_url: "", threads_url: "", instagram_url: "",
                list: "Prospects", value: 0, acquisition_channel: "",
                first_contact_date: ""
            })
            router.refresh()
            if (data && data[0]) {
                router.push(`/contacts/${data[0].id}`)
            }
        }
    }

    const LIST_OPTIONS = ["Prospects", "Customers", "Partnerships", "Network/Peers", "Podcast"]

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add a Lead
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add a New Lead</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <Tabs defaultValue="basic" className="w-full pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="marketing">Marketing Info</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                        placeholder="Jean"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                        placeholder="Dupont"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">Company</Label>
                                <Input
                                    id="company"
                                    value={formData.company}
                                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                                    placeholder="Acme Corp"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                                    <Input
                                        id="linkedin_url"
                                        value={formData.linkedin_url}
                                        onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                        placeholder="https://linkedin.com/in/..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="threads_url">Threads URL</Label>
                                    <Input
                                        id="threads_url"
                                        value={formData.threads_url}
                                        onChange={e => setFormData({ ...formData, threads_url: e.target.value })}
                                        placeholder="https://threads.net/@..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="instagram_url">Instagram URL</Label>
                                    <Input
                                        id="instagram_url"
                                        value={formData.instagram_url}
                                        onChange={e => setFormData({ ...formData, instagram_url: e.target.value })}
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="jean@exemple.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lists</Label>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                                    {LIST_OPTIONS.map(option => {
                                        const currentLists = formData.list.split(',').map(l => l.trim().toLowerCase())
                                        const isChecked = currentLists.includes(option.toLowerCase())

                                        return (
                                            <div key={option} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`new-list-${option}`}
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        let lists = formData.list.split(',').map(l => l.trim()).filter(l => l !== "")
                                                        if (checked) {
                                                            if (!lists.some(l => l.toLowerCase() === option.toLowerCase())) {
                                                                lists.push(option)
                                                            }
                                                        } else {
                                                            lists = lists.filter(l => l.toLowerCase() !== option.toLowerCase())
                                                        }
                                                        setFormData({ ...formData, list: lists.join(', ') })
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`new-list-${option}`}
                                                    className="text-xs font-medium leading-none cursor-pointer"
                                                >
                                                    {option}
                                                </label>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value">Value (CHF)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    step="0.01"
                                    value={formData.value}
                                    onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    onFocus={e => e.target.select()}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="marketing" className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Acquisition Channel</Label>
                                <Select
                                    value={formData.acquisition_channel}
                                    onValueChange={v => setFormData({ ...formData, acquisition_channel: v })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select a channel" /></SelectTrigger>
                                    <SelectContent>
                                        {channels.map(channel => (
                                            <SelectItem key={channel.id} value={channel.name}>{channel.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Date of First Contact <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                <Input
                                    type="date"
                                    value={formData.first_contact_date}
                                    onChange={e => setFormData({ ...formData, first_contact_date: e.target.value })}
                                    className={!formData.first_contact_date ? "text-muted-foreground" : ""}
                                    aria-describedby="first-contact-date-help"
                                />
                                <p id="first-contact-date-help" className="text-xs text-muted-foreground">
                                    {formData.first_contact_date
                                        ? "Date enregistrée comme premier contact."
                                        : "Date inconnue — elle ne sera pas remplacée par la date d’aujourd’hui."}
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Lead
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
