"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"

export type Period = "30d" | "90d" | "6m" | "12m" | "ytd" | "all"

interface PeriodSelectorProps {
    value: Period
    onValueChange: (value: Period) => void
}

export function PeriodSelector({ value, onValueChange }: PeriodSelectorProps) {
    const { t } = useLanguage()

    return (
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={value} onValueChange={(v) => onValueChange(v as Period)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('common.period')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="30d">{t('periods.30d')}</SelectItem>
                    <SelectItem value="90d">{t('periods.90d')}</SelectItem>
                    <SelectItem value="6m">{t('periods.6m')}</SelectItem>
                    <SelectItem value="12m">{t('periods.12m')}</SelectItem>
                    <SelectItem value="ytd">{t('periods.ytd')}</SelectItem>
                    <SelectItem value="all">{t('periods.all')}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
