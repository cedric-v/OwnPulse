"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sale, Expense } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Period } from "@/components/dashboard/period-selector"

interface NetResultProps {
    sales: Sale[]
    expenses: Expense[]
    currency: string
    socialRate: number
    taxRate: number
    targetMonthlySalary: number
    period: Period
}

export function NetResult({ sales, expenses, currency, socialRate, taxRate, targetMonthlySalary, period }: NetResultProps) {
    const totalSales = sales.reduce((acc, s) => acc + (s.price_ht || 0), 0)
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.price_ht || 0), 0)

    const getMonthCount = () => {
        if (period === "30d") return 1
        if (period === "90d") return 3
        if (period === "6m") return 6
        if (period === "12m") return 12
        if (period === "ytd") {
            const now = new Date()
            return now.getMonth() + 1
        }
        if (period === "all") {
            const allDates = [
                ...sales.map(s => s.sale_date),
                ...expenses.map(e => e.created_at)
            ].filter(Boolean).map(d => new Date(d!))

            if (allDates.length === 0) return 1
            const firstDate = new Date(Math.min(...allDates.map(d => d.getTime())))
            const now = new Date()
            return (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth()) + 1
        }
        return 12
    }

    const monthCount = getMonthCount()
    const targetRemuneration = targetMonthlySalary * monthCount
    const socialContributions = targetRemuneration * (socialRate / 100)
    const taxes = totalSales * (taxRate / 100)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center text-primary text-xl">Résultat net</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="real" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="real">Réel</TabsTrigger>
                        <TabsTrigger value="forecast">Prévisionnel</TabsTrigger>
                    </TabsList>

                    <TabsContent value="real" className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span>Chiffre d'affaires</span>
                            <span>{totalSales.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>Rémunération cible ({monthCount} mois x {targetMonthlySalary.toLocaleString('fr-CH')} {currency})</span>
                            <div className="flex items-center gap-2">
                                <span>-</span>
                                <span className="font-medium text-foreground">{targetRemuneration.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>Contributions sociales (est. {socialRate}%)</span>
                            <span>- {socialContributions.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>Taxes et impôts (est. {taxRate}%)</span>
                            <span>- {taxes.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>Frais professionnels</span>
                            <span>- {totalExpenses.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>

                        <div className="flex flex-col items-center mt-8 gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Bénéfice Net après charges et salaire</span>
                            <span className="bg-pink-100 text-pink-800 text-lg font-bold px-4 py-1 rounded-full">
                                {(totalSales - totalExpenses - targetRemuneration - socialContributions - taxes).toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                            </span>
                        </div>
                    </TabsContent>

                    <TabsContent value="forecast" className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span>Chiffre d'affaires (Est.)</span>
                            <span>{(totalSales * 1.2).toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>Frais professionnels (Est.)</span>
                            <span>- {(totalExpenses * 1.1).toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-center mt-8">
                            <span className="bg-blue-100 text-blue-800 text-lg font-bold px-4 py-1 rounded-full">
                                {(totalSales * 1.2 - totalExpenses * 1.1).toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                            </span>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
