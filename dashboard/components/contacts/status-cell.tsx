
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
import { supabase } from "@/lib/supabaseClient"
import { Contact } from "@/types"

interface StatusCellProps {
    contact: Contact
}

export function StatusCell({ contact }: StatusCellProps) {
    const [status, setStatus] = useState(contact.status || "Prospect")
    const [loading, setLoading] = useState(false)

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
            case "Customer": return "bg-green-500 hover:bg-green-600"
            case "Prospect": return "bg-blue-500 hover:bg-blue-600"
            case "Lost": return "bg-red-500 hover:bg-red-600"
            case "Lead": return "bg-yellow-500 hover:bg-yellow-600"
            default: return "bg-gray-500 hover:bg-gray-600"
        }
    }

    return (
        <Select value={status} onValueChange={handleValueChange} disabled={loading}>
            <SelectTrigger className={`w-[130px] h-8 text-white border-0 ${getStatusColor(status)}`}>
                <SelectValue placeholder="Status" />
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
