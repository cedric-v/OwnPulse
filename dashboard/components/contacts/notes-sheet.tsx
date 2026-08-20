
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { createClient } from "@/lib/supabase/client"
import { Contact } from "@/types"
import { StickyNote } from "lucide-react"
import { htmlToText } from "@/lib/html-to-text"

interface NotesSheetProps {
    contact: Contact
}

export function NotesSheet({ contact }: NotesSheetProps) {
    const [notes, setNotes] = useState(htmlToText(contact.notes))
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const [open, setOpen] = useState(false)

    const handleSave = async () => {
        setLoading(true)
        const { error } = await supabase
            .from('contacts')
            .update({ notes: notes })
            .eq('id', contact.id)

        if (error) {
            console.error("Error saving notes:", error)
            alert("Failed to save notes")
        } else {
            setOpen(false)
        }
        setLoading(false)
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <StickyNote className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Notes for {contact.first_name} {contact.last_name}</SheetTitle>
                    <SheetDescription>
                        Add or update notes for this contact.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notes
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3 h-60"
                        />
                    </div>
                </div>
                <SheetFooter>
                    <SheetClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save changes"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
