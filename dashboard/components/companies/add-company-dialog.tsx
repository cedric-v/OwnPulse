
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
import { Building, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function AddCompanyDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        city: "",
        website_url: "",
    })
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { data, error } = await supabase
            .from('companies')
            .insert([formData])
            .select()
            .single()

        setLoading(false)
        if (error) {
            alert("Error adding company: " + error.message)
        } else {
            setOpen(false)
            setFormData({ name: "", city: "", website_url: "" })
            router.refresh()
            if (data) {
                router.push(`/companies/${data.id}`)
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full gap-2 sm:w-auto">
                    <Building className="h-4 w-4" />
                    Ajouter une entreprise
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter une entreprise</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom de l&apos;entreprise</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Acme Corp"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                            id="city"
                            value={formData.city}
                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                            placeholder="New York, USA"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="website">Site web</Label>
                        <Input
                            id="website"
                            type="url"
                            value={formData.website_url}
                            onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                            placeholder="https://example.com"
                        />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Créer l&apos;entreprise
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
