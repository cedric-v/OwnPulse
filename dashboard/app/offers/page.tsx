"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PeriodSelector } from "@/components/dashboard/period-selector"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, MoreVertical, Filter } from "lucide-react"
import Link from "next/link"
import { Offer, Sale } from "@/types"

export default function OffersPage() {
    const { t, language } = useLanguage()
    const [period, setPeriod] = useState("ytd")
    const [offers, setOffers] = useState<Offer[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [showOnlyWithGoals, setShowOnlyWithGoals] = useState(true)
    const [loading, setLoading] = useState(true)
    const [currency, setCurrency] = useState("EUR")
    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [offersRes, salesRes, currencyRes] = await Promise.all([
            supabase.from('offers').select('*'),
            supabase.from('sales').select('*'),
            supabase.from('settings').select('value').eq('key', 'currency').single()
        ])

        if (offersRes.data) setOffers(offersRes.data)
        if (salesRes.data) setSales(salesRes.data)
        if (currencyRes.data) setCurrency(currencyRes.data.value)
        setLoading(false)
    }

    // Hepler to filter sales by date
    const filterSalesByPeriod = (salesArray: Sale[], period: string) => {
        const oneDay = 24 * 60 * 60 * 1000

        return salesArray.filter(sale => {
            const date = new Date(sale.sale_date)
            // Reset hours for accurate comparison
            date.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const diffTime = date.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / oneDay)

            const year = date.getFullYear()
            const currentYear = today.getFullYear()

            // Quarters helper
            const getQuarter = (d: Date) => Math.floor(d.getMonth() / 3) + 1
            const currentQuarter = getQuarter(today)

            switch (period) {
                // Past
                case "30d": return diffDays <= 0 && diffDays >= -30
                case "90d": return diffDays <= 0 && diffDays >= -90
                case "6m": return diffDays <= 0 && diffDays >= -180
                case "12m": return diffDays <= 0 && diffDays >= -365
                case "ytd": return year === currentYear && date <= today
                case "lastYear": return year === currentYear - 1
                case "lastQuarter": {
                    const lastQ = currentQuarter === 1 ? 4 : currentQuarter - 1
                    const targetYear = currentQuarter === 1 ? currentYear - 1 : currentYear
                    return getQuarter(date) === lastQ && year === targetYear
                }

                // Future
                case "next30d": return diffDays >= 0 && diffDays <= 30
                case "next90d": return diffDays >= 0 && diffDays <= 90
                case "nextYear": return year === currentYear + 1
                case "nextQuarter": {
                    const nextQ = currentQuarter === 4 ? 1 : currentQuarter + 1
                    const targetYear = currentQuarter === 4 ? currentYear + 1 : currentYear
                    return getQuarter(date) === nextQ && year === targetYear
                }

                // Specific Quarters (Current Year)
                case "Q1": return year === currentYear && getQuarter(date) === 1
                case "Q2": return year === currentYear && getQuarter(date) === 2
                case "Q3": return year === currentYear && getQuarter(date) === 3
                case "Q4": return year === currentYear && getQuarter(date) === 4

                case "all": return true
                default: return true
            }
        })
    }

    const filteredSales = filterSalesByPeriod(sales, period)
    const currentYear = new Date().getFullYear()

    // --- KPIs Calculations ---

    // 1. Revenue
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.price_ht || 0), 0)

    // 2. Goal (Sum of goals for the current year, proportionate? No, usually absolute goal for the year)
    // The screenshot shows "objectif de 4 500 €". This seems to be the SUM of all offer goals.
    // If period is YTD or ALL, we take the full year goal. If period is shorter, maybe we should pro-rate?
    // For simplicity, let's sum the goals of all offers for the current year.
    const totalRevenueGoal = offers.reduce((sum, offer) => {
        const goal = offer.sales_goals?.find(g => g.year === currentYear)
        if (!goal) return sum
        const totalSalesGoal = goal.monthly_counts.reduce((a, b) => a + b, 0)
        return sum + (totalSalesGoal * offer.default_price)
    }, 0)

    const revenueProgress = totalRevenueGoal > 0 ? (totalRevenue / totalRevenueGoal) * 100 : 0

    // 3. Client Working Time (Weekly Average)
    // Formula: Sum(Quantity * WorkTimePerSale) / NumberOfWeeksInPeriod
    // Default to 52 for year, or days/7.
    let weeksInPeriod = 52
    if (period === "30d" || period === "next30d") weeksInPeriod = 4
    if (period === "90d" || period === "next90d" || period.startsWith("Q") || period === "lastQuarter" || period === "currentQuarter" || period === "nextQuarter") weeksInPeriod = 12
    if (period === "6m") weeksInPeriod = 26
    if (period === "ytd") {
        const now = new Date()
        const start = new Date(now.getFullYear(), 0, 1)
        const diff = now.getTime() - start.getTime()
        weeksInPeriod = Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)) || 1
    }

    const totalHoursSold = filteredSales.reduce((sum, sale) => {
        const offer = offers.find(o => o.name === sale.offer_name) // Link by name, fallback needed?
        if (!offer || !offer.work_time) return sum

        const offerHours = offer.work_time.reduce((h, act) => {
            if (act.per_sale) return h + act.hours
            // If fixed time, how to distribute? Ignored for "Client Working Time" usually, unless retained.
            return h
        }, 0)

        return sum + (offerHours * (sale.quantity || 1))
    }, 0)

    const hoursPerWeek = totalHoursSold / weeksInPeriod

    // 4. Commercial Margin
    // (Revenue - Cost) / Revenue
    const totalCost = filteredSales.reduce((sum, sale) => {
        const offer = offers.find(o => o.name === sale.offer_name)
        const cost = offer?.unit_cost || 0
        return sum + (cost * (sale.quantity || 1))
    }, 0)

    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

    // 5. Avg Hourly Rate
    // (Revenue - Cost) / TotalHoursSold
    const avgHourlyRate = totalHoursSold > 0 ? (totalRevenue - totalCost) / totalHoursSold : 0


    // --- Table Data ---
    const tableData = offers.map(offer => {
        const goal = offer.sales_goals?.find(g => g.year === currentYear)
        const totalQtyGoal = goal ? goal.monthly_counts.reduce((a, b) => a + b, 0) : 0
        const revenueGoal = totalQtyGoal * offer.default_price

        // Sales for this SPECIFIC offer in the period
        const offerSales = filteredSales.filter(s => s.offer_name === offer.name)
        const realizedQty = offerSales.reduce((sum, s) => sum + (s.quantity || 1), 0)
        const realizedRevenue = offerSales.reduce((sum, s) => sum + (s.price_ht || 0), 0)

        const salesRemaining = Math.max(0, totalQtyGoal - realizedQty)

        // Theoretical Hourly Rate (requested by user)
        // (DefaultPrice - UnitCost) / (TotalHours)
        const totalHours = offer.work_time?.reduce((sum, act) => sum + (act.hours || 0), 0) || 0
        const margin = (offer.default_price || 0) - (offer.unit_cost || 0)
        const realHourlyRate = totalHours > 0 ? margin / totalHours : 0

        return {
            ...offer,
            revenueGoal,
            realizedQty,
            salesRemaining,
            realHourlyRate,
            hasGoal: totalQtyGoal > 0
        }
    }).filter(o => !showOnlyWithGoals || o.hasGoal)


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2 }).format(num)
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">{t('offersDashboard.title')}</h1>
                <PeriodSelector value={period as any} onValueChange={setPeriod} />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">

                {/* 1. Revenue */}
                <Card className="flex flex-col justify-center items-center p-6 space-y-4">
                    <div className="text-sm font-medium text-indigo-500 text-center uppercase tracking-wider">{t('offersDashboard.revenue')}</div>
                    <div className="text-4xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">
                        {t('offersDashboard.objective')} {formatCurrency(totalRevenueGoal)}
                    </div>
                    {/* Progress Circle */}
                    <div className="relative size-24 mt-2 flex items-center justify-center rounded-full border-8 border-slate-100">
                        <div className="absolute inset-0 rounded-full border-8 border-indigo-500" style={{ clipPath: `inset(0 ${100 - Math.min(revenueProgress, 100)}% 0 0)` }}></div>
                        <span className="text-lg font-bold text-slate-700">{Math.round(revenueProgress)}%</span>
                    </div>
                </Card>

                {/* 2. Client Work Time */}
                <Card className="flex flex-col justify-center items-center p-6 space-y-4">
                    <div className="text-sm font-medium text-indigo-500 text-center uppercase tracking-wider">{t('offersDashboard.clientWorkTime')}</div>
                    <div className="text-4xl font-bold text-slate-900">
                        {Math.floor(hoursPerWeek)}h{Math.round((hoursPerWeek % 1) * 60).toString().padStart(2, '0')} {t('offersDashboard.perWeek')}
                    </div>
                </Card>

                {/* 3. Margin */}
                <Card className="flex flex-col justify-center items-center p-6 space-y-4">
                    <div className="text-sm font-medium text-indigo-500 text-center uppercase tracking-wider">{t('offersDashboard.commercialMargin')}</div>
                    <div className="text-4xl font-bold text-slate-900">{Math.round(margin)} %</div>
                </Card>

                {/* 4. Hourly Rate */}
                <Card className="flex flex-col justify-center items-center p-6 space-y-4">
                    <div className="text-sm font-medium text-indigo-500 text-center uppercase tracking-wider">{t('offersDashboard.avgHourlyRate')}</div>
                    <div className="text-4xl font-bold text-slate-900">{formatCurrency(Math.round(avgHourlyRate))}/h</div>
                </Card>
            </div>


            {/* Profitability Table */}
            <div className="space-y-4 pt-8">
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold text-indigo-600">{t('offersDashboard.profitability')}</h2>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className={`gap-2 ${showOnlyWithGoals ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}
                            onClick={() => setShowOnlyWithGoals(!showOnlyWithGoals)}
                        >
                            {showOnlyWithGoals ? <span>✓</span> : null}
                            {t('offersDashboard.hideNoGoals')}
                        </Button>
                        <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" asChild>
                            <Link href="/settings?tab=offers">
                                <Plus className="w-4 h-4" />
                                {t('offersDashboard.newOffer')}
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg border overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead className="font-semibold text-slate-700">{t('offersDashboard.offer')}</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">{t('offersDashboard.revenueGoal')}</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">{t('offersDashboard.priceHt')}</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">{t('offersDashboard.salesRealized')}</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">{t('offersDashboard.salesRemaining')}</TableHead>
                                <TableHead className="text-right font-semibold text-slate-700">{t('offersDashboard.realHourlyRate')}</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tableData.length > 0 ? tableData.map((offer) => (
                                <TableRow key={offer.id} className="hover:bg-slate-50/50">
                                    <TableCell><MoreVertical className="w-4 h-4 text-slate-300" /></TableCell>
                                    <TableCell className="font-medium text-slate-900 bg-slate-50/30">{offer.name}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(offer.revenueGoal)}</TableCell>
                                    <TableCell className="text-right text-slate-500 bg-slate-50/30">{formatCurrency(offer.default_price)}</TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 bg-slate-50/30">{offer.realizedQty}</TableCell>
                                    <TableCell className="text-right text-slate-500 bg-slate-50/30">{offer.salesRemaining}</TableCell>
                                    <TableCell className="text-right font-bold text-slate-900 bg-slate-100">{formatCurrency(Math.round(offer.realHourlyRate))}/h</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                            <Link href={`/settings?tab=offers&edit=${offer.id}`}>
                                                <MoreVertical className="w-4 h-4 text-slate-400" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        No offers found matching criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
