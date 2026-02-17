"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"

export type Period = "30d" | "90d" | "6m" | "12m" | "ytd" | "lastYear" | "all" | "next30d" | "next90d" | "nextYear" | "lastQuarter" | "currentQuarter" | "nextQuarter" | "Q1" | "Q2" | "Q3" | "Q4"

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
                    <SelectItem value="next30d">{t('periods.next30d')}</SelectItem>
                    <SelectItem value="next90d">{t('periods.next90d')}</SelectItem>
                    <SelectItem value="nextQuarter">{t('periods.nextQuarter')}</SelectItem>
                    <SelectItem value="nextYear">{t('periods.nextYear')}</SelectItem>
                    <SelectItem value="currentQuarter">{t('periods.currentQuarter')}</SelectItem>
                    <SelectItem value="30d">{t('periods.30d')}</SelectItem>
                    <SelectItem value="90d">{t('periods.90d')}</SelectItem>
                    <SelectItem value="6m">{t('periods.6m')}</SelectItem>
                    <SelectItem value="12m">{t('periods.12m')}</SelectItem>
                    <SelectItem value="ytd">{t('periods.ytd')}</SelectItem>
                    <SelectItem value="lastQuarter">{t('periods.lastQuarter')}</SelectItem>
                    <SelectItem value="lastYear">{t('periods.lastYear')}</SelectItem>
                    <SelectItem value="all">{t('periods.all')}</SelectItem>
                    <div className="mx-2 my-1 h-px bg-muted" />
                    <SelectItem value="Q1">{t('periods.Q1')}</SelectItem>
                    <SelectItem value="Q2">{t('periods.Q2')}</SelectItem>
                    <SelectItem value="Q3">{t('periods.Q3')}</SelectItem>
                    <SelectItem value="Q4">{t('periods.Q4')}</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
