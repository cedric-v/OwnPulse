"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sale, Expense } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Period } from "@/components/dashboard/period-selector"
import { useLanguage } from "@/components/i18n/language-context"

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
    const { t } = useLanguage()
    const totalSales = sales.reduce((acc, s) => acc + (s.price_ht || 0), 0)

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

    const proExpenses = expenses.filter(e => e.category !== "Rémunération")
    const remunerationExpenses = expenses.filter(e => e.category === "Rémunération")
    const totalProExpenses = proExpenses.reduce((acc, e) => acc + (e.price_ht || 0), 0)
    const totalActualRemuneration = remunerationExpenses.reduce((acc, e) => acc + (e.price_ht || 0), 0)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center text-primary text-xl">{t('cfo.netResult')}</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="real" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="real">{t('cfo.real')}</TabsTrigger>
                        <TabsTrigger value="forecast">{t('cfo.forecast')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="real" className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span>{t('cfo.revenue')}</span>
                            <span>{totalSales.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>

                        {/* Professional Expenses */}
                        <div className="flex justify-between items-center text-sm">
                            <span>{t('cfo.proExpenses')}</span>
                            <span>- {totalProExpenses.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>

                        {/* Actual Remuneration */}
                        <div className="flex justify-between items-center text-sm text-pink-600 font-medium">
                            <span>{t('cfo.remuneration')} ({t('cfo.real')})</span>
                            <span>- {totalActualRemuneration.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>

                        {/* Target Remuneration (Reference) */}
                        <div className="flex justify-between items-center text-xs text-muted-foreground italic pl-4">
                            <span>{t('cfo.targetRemuneration')} ({monthCount}m)</span>
                            <span>{targetRemuneration.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>{t('cfo.socialContributions')} (est. {socialRate}%)</span>
                            <span>- {socialContributions.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>{t('cfo.taxes')} (est. {taxRate}%)</span>
                            <span>- {taxes.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>

                        <div className="flex flex-col items-center mt-8 gap-2">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('cfo.netBenefit')}</span>
                            <span className="bg-pink-100 text-pink-800 text-lg font-bold px-4 py-1 rounded-full">
                                {(totalSales - totalProExpenses - totalActualRemuneration - socialContributions - taxes).toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                            </span>
                        </div>
                    </TabsContent>

                    <TabsContent value="forecast" className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span>{t('cfo.revenue')} (Est.)</span>
                            <span>{(totalSales * 1.2).toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>{t('cfo.proExpenses')} (Est.)</span>
                            <span>- {(totalProExpenses * 1.1).toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-blue-600 font-medium">
                            <span>{t('cfo.targetRemuneration')}</span>
                            <span>- {targetRemuneration.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex justify-center mt-8">
                            <span className="bg-blue-100 text-blue-800 text-lg font-bold px-4 py-1 rounded-full">
                                {(totalSales * 1.2 - totalProExpenses * 1.1 - targetRemuneration).toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                            </span>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
