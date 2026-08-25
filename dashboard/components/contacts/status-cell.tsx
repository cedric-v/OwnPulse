
"use client"

import { useState, useEffect } from "react"
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
import { useLanguage } from "@/components/i18n/language-context"

export function StatusCell({ contact }: { contact: Contact }) {
    const { t } = useLanguage()
    const [status, setStatus] = useState(contact.status)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStatus(contact.status)
    }, [contact.status])

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

    const getStatusLabel = (s: string | null) => {
        switch (s) {
            case "N/A": return t('contacts.statuses.notAvailable')
            case "Cold": return t('contacts.statuses.cold')
            case "Prospect": return t('contacts.statuses.prospect')
            case "Engaged": return t('contacts.statuses.engaged')
            case "Interested": return t('contacts.statuses.interested')
            case "Warm": return t('contacts.statuses.warm')
            case "Client":
            case "Customer": return t('contacts.statuses.client')
            case "Ghosted": return t('contacts.statuses.ghosted')
            case "Closed": return t('contacts.statuses.closed')
            case "Deal Won": return t('contacts.statuses.dealWon')
            case "Lost": return t('contacts.statuses.lost')
            default: return s || t('contacts.statuses.notAvailable')
        }
    }

    const getStatusColor = (s: string) => {
        switch (s) {
            case "Customer":
            case "Client": return "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
            case "Warm": return "bg-orange-500 hover:bg-orange-600 text-white border-transparent"
            case "Interested": return "bg-amber-500 hover:bg-amber-600 text-white border-transparent"
            case "Engaged": return "bg-blue-500 hover:bg-blue-600 text-white border-transparent"
            case "Prospect": return "bg-indigo-500 hover:bg-indigo-600 text-white border-transparent"
            case "Lead": return "bg-cyan-500 hover:bg-cyan-600 text-white border-transparent"
            case "Cold": return "bg-slate-400 hover:bg-slate-500 text-white border-transparent"
            case "Ghosted": return "bg-zinc-400 hover:bg-zinc-500 text-white border-transparent"
            case "Closed":
            case "Deal Won": return "bg-gray-600 hover:bg-gray-700 text-white border-transparent"
            case "Lost": return "bg-red-500 hover:bg-red-600 text-white border-transparent"
            case "N/A": return "bg-gray-400 hover:bg-gray-500 text-white border-transparent"
            default: return "bg-gray-400 hover:bg-gray-500 text-white border-transparent"
        }
    }

    return (
        <Select value={status || undefined} onValueChange={handleValueChange} disabled={loading}>
            <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('contacts.statuses.placeholder')}>
                    <Badge variant="outline" className={getStatusColor(status || "N/A")}>
                        {getStatusLabel(status)}
                    </Badge>
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="N/A">{t('contacts.statuses.notAvailable')}</SelectItem>
                <SelectItem value="Cold">{t('contacts.statuses.cold')}</SelectItem>
                <SelectItem value="Prospect">{t('contacts.statuses.prospect')}</SelectItem>
                <SelectItem value="Engaged">{t('contacts.statuses.engaged')}</SelectItem>
                <SelectItem value="Interested">{t('contacts.statuses.interested')}</SelectItem>
                <SelectItem value="Warm">{t('contacts.statuses.warm')}</SelectItem>
                <SelectItem value="Client">{t('contacts.statuses.client')}</SelectItem>
                <SelectItem value="Ghosted">{t('contacts.statuses.ghosted')}</SelectItem>
                <SelectItem value="Closed">{t('contacts.statuses.closed')}</SelectItem>
                <SelectItem value="Deal Won">{t('contacts.statuses.dealWon')}</SelectItem>
                <SelectItem value="Lost">{t('contacts.statuses.lost')}</SelectItem>
            </SelectContent>
        </Select>
    )
}
