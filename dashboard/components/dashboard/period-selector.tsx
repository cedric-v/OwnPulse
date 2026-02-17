"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"

export type Period = "30d" | "90d" | "6m" | "12m" | "ytd" | "all"

interface PeriodSelectorProps {
    value: Period
    onValueChange: (value: Period) => void
}

export function PeriodSelector({ value, onValueChange }: PeriodSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={value} onValueChange={(v) => onValueChange(v as Period)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Choisir une période" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="30d">30 derniers jours</SelectItem>
                    <SelectItem value="90d">90 derniers jours</SelectItem>
                    <SelectItem value="6m">6 derniers mois</SelectItem>
                    <SelectItem value="12m">12 derniers mois</SelectItem>
                    <SelectItem value="ytd">Cette année</SelectItem>
                    <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
