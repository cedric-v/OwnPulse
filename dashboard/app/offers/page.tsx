"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const { data: offersData } = await supabase.from('offers').select('*')
        const { data: salesData } = await supabase.from('sales').select('*')

        if (offersData) setOffers(offersData)
        if (salesData) setSales(salesData)
        setLoading(false)
    }

    // Hepler to filter sales by date
    const filterSalesByPeriod = (salesArray: Sale[], period: string) => {
        const now = new Date()
        const oneDay = 24 * 60 * 60 * 1000

        return salesArray.filter(sale => {
            const date = new Date(sale.sale_date)
            const diffDays = Math.round((now.getTime() - date.getTime()) / oneDay)
            const year = date.getFullYear()
            const currentYear = now.getFullYear()

            switch (period) {
                case "30d": return diffDays <= 30
                case "90d": return diffDays <= 90
                case "6m": return diffDays <= 180
                case "12m": return diffDays <= 365
                case "ytd": return year === currentYear
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
    if (period === "30d") weeksInPeriod = 4
    if (period === "90d") weeksInPeriod = 12
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

        // Real Hourly Rate for this offer based on actual sales
        // (RealizedRevenue - (UnitCost * RealizedQty)) / (HoursPerUnit * RealizedQty)
        const unitCost = offer.unit_cost || 0
        const hoursPerUnit = offer.work_time?.reduce((h, act) => act.per_sale ? h + act.hours : h, 0) || 0
        const totalRealizedHours = hoursPerUnit * realizedQty
        const realizedCost = unitCost * realizedQty

        const realHourlyRate = totalRealizedHours > 0 ? (realizedRevenue - realizedCost) / totalRealizedHours : 0

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
            currency: 'EUR', // Should verify uses settings currency, but defaulting EUR/CHF based on previous context. 
            // Previous files used simple suffix or looked up settings.
            // Let's us string concatenation for now or minimal formatting to match screenshot style.
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('EUR', '€') // Hack to match "4 500 €" style if needed, or just let Intl handle it.
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 2 }).format(num)
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">{t('offersDashboard.title')}</h1>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px] bg-white">
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
                    <div className="text-4xl font-bold text-slate-900">{Math.round(avgHourlyRate)} €/h</div>
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
                        <Button variant="outline" size="sm" className="gap-2">
                            <Filter className="w-4 h-4" />
                            {t('offersDashboard.filter')}
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
                                    <TableCell className="text-right font-bold text-slate-900 bg-slate-100">{Math.round(offer.realHourlyRate)} €/h</TableCell>
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
