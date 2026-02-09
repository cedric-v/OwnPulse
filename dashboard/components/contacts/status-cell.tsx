
"use client"

import { useState } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Contact } from "@/types"

export function StatusCell({ contact }: { contact: Contact }) {
    const [status, setStatus] = useState(contact.status)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const handleValueChange = async (value: string) => {
        setStatus(value)
        setLoading(true)

        const { error } = await supabase
            .from('contacts')
            .update({ status: value })
            .eq('id', contact.id)

        if (error) {
            console.error("Error updating status:", error)
            // Revert on error?
        }
        setLoading(false)
    }

    const getStatusColor = (s: string) => {
        switch (s) {
            case "Customer": return "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
            case "Warm": return "bg-orange-500 hover:bg-orange-600 text-white border-transparent"
            case "Interested": return "bg-amber-500 hover:bg-amber-600 text-white border-transparent"
            case "Engaged": return "bg-blue-500 hover:bg-blue-600 text-white border-transparent"
            case "Prospect": return "bg-indigo-500 hover:bg-indigo-600 text-white border-transparent"
            case "Lead": return "bg-cyan-500 hover:bg-cyan-600 text-white border-transparent"
            case "Cold": return "bg-slate-400 hover:bg-slate-500 text-white border-transparent"
            case "Ghosted": return "bg-zinc-400 hover:bg-zinc-500 text-white border-transparent"
            case "Closed": return "bg-gray-600 hover:bg-gray-700 text-white border-transparent"
            case "Lost": return "bg-red-500 hover:bg-red-600 text-white border-transparent"
            case "N/A": return "bg-gray-400 hover:bg-gray-500 text-white border-transparent"
            default: return "bg-gray-400 hover:bg-gray-500 text-white border-transparent"
        }
    }

    return (
        <Select value={status || undefined} onValueChange={handleValueChange} disabled={loading}>
            <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status">
                    <Badge variant="outline" className={getStatusColor(status || "N/A")}>
                        {status || "N/A"}
                    </Badge>
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="N/A">N/A</SelectItem>
                <SelectItem value="Prospect">Prospect</SelectItem>
                <SelectItem value="Cold">Cold</SelectItem>
                <SelectItem value="Engaged">Engaged</SelectItem>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Warm">Warm</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Ghosted">Ghosted</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
            </SelectContent>
        </Select>
    )
}
