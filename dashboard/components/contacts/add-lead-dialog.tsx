
"use client"

import { useState } from "react"
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
        list: "Prospects"
    })
    const router = useRouter()
    const supabase = createClient()

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
                    list: formData.list,
                    status: "Prospect" // Default status
                }
            ])
            .select()

        setLoading(false)
        if (error) {
            alert("Error adding lead: " + error.message)
        } else {
            setOpen(false)
            setFormData({ first_name: "", last_name: "", company: "", email: "", list: "Prospects" })
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
                    Ajouter un Lead
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter un nouveau Lead</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">Prénom</Label>
                            <Input
                                id="first_name"
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                placeholder="Jean"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Nom</Label>
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
                        <Label htmlFor="company">Société</Label>
                        <Input
                            id="company"
                            value={formData.company}
                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                            placeholder="Acme Corp"
                        />
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
                        <Label>Listes</Label>
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
                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer le Lead
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
