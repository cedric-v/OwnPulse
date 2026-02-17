"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Loader2, Users, Clock } from "lucide-react"
import { PeriodSelector, Period } from "@/components/dashboard/period-selector"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Contact, Sale } from "@/types"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function MarketingPage() {
    const { t } = useLanguage()
    const [contacts, setContacts] = useState<Contact[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<Period>("12m")

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const [contactsRes, salesRes] = await Promise.all([
                supabase.from('contacts').select('*'),
                supabase.from('sales').select('*')
            ])

            if (contactsRes.data) setContacts(contactsRes.data as Contact[])
            if (salesRes.data) setSales(salesRes.data as Sale[])
            setLoading(false)
        }
        fetchData()
    }, [supabase])

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    const isWithinPeriod = (dateString: string | null | undefined) => {
        if (!dateString) return false

        const date = new Date(dateString)
        // Reset hours for accurate comparison
        date.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const oneDay = 24 * 60 * 60 * 1000
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
            case "currentQuarter": return year === currentYear && getQuarter(date) === currentQuarter
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
    }

    // Filtered data based on period
    const filteredContacts = contacts.filter(c => {
        // For marketing stats, we check conversion date if they are clients, otherwise first contact date
        const dateToCheck = c.customer_conversion_date || c.first_contact_date
        return isWithinPeriod(dateToCheck)
    })

    const filteredSales = sales.filter(s => isWithinPeriod(s.sale_date))

    // 1. Acquisition Channels (Filtered for Customers only & Period)
    const channelCounts: Record<string, number> = {}
    filteredContacts
        .filter(c => (c.status || "").toLowerCase() === 'client')
        .forEach(c => {
            const channel = c.acquisition_channel || 'Unknown'
            channelCounts[channel] = (channelCounts[channel] || 0) + 1
        })
    const acquisitionData = Object.entries(channelCounts).map(([name, value]) => ({ name, value }))

    // 2. Conversion Time (Based on period)
    let totalConversionDays = 0
    let convertedCount = 0
    filteredContacts.forEach(c => {
        if (c.first_contact_date && c.customer_conversion_date) {
            const start = new Date(c.first_contact_date).getTime()
            const end = new Date(c.customer_conversion_date).getTime()
            const days = (end - start) / (1000 * 3600 * 24)
            if (days >= 0) {
                totalConversionDays += days
                convertedCount++
            }
        }
    })
    const avgConversionTime = convertedCount > 0 ? Math.round(totalConversionDays / convertedCount) : 0

    // 3. Top Selling Offers (Aggregated from Sales table & Period)
    const offerCounts: Record<string, number> = {}
    filteredSales.forEach(s => {
        const name = s.offer_name || 'Unknown Offer'
        const count = s.quantity || 1
        offerCounts[name] = (offerCounts[name] || 0) + count
    })
    const offersData = Object.entries(offerCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    // 4. Retention Rate (Based on real sales data)
    // We count how many sales each contact has in total (all time)
    const totalSalesByContact: Record<string, number> = {}
    sales.forEach(s => {
        if (s.contact_id) {
            totalSalesByContact[s.contact_id] = (totalSalesByContact[s.contact_id] || 0) + (s.quantity || 1)
        }
    })

    // We only consider contacts who have at least one sale in the selected period
    const activeContactIds = new Set(filteredSales.map(s => s.contact_id).filter(Boolean))

    let singleOfferClients = 0
    let multiOfferClients = 0

    activeContactIds.forEach(contactId => {
        if (contactId && totalSalesByContact[contactId] > 1) {
            multiOfferClients++
        } else {
            singleOfferClients++
        }
    })

    const totalClients = singleOfferClients + multiOfferClients
    const retentionRate = totalClients > 0 ? Math.round((multiOfferClients / totalClients) * 100) : 0
    const retentionData = [
        { name: t('marketing.singleOffer'), value: singleOfferClients },
        { name: t('marketing.returningClients'), value: multiOfferClients }
    ]

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('marketing.title')}</h2>
                <PeriodSelector value={period} onValueChange={setPeriod} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('marketing.avgConversion')}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgConversionTime} {t('marketing.days')}</div>
                        <p className="text-xs text-muted-foreground">{t('marketing.fromContactToClient')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('marketing.retention')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{retentionRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {t('marketing.returningVsSingle', { returning: multiOfferClients, single: singleOfferClients })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>{t('marketing.acquisitionChannels')}</CardTitle>
                        <CardDescription>{t('marketing.acquisitionNote')}</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={acquisitionData} layout="vertical" margin={{ left: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={150} />
                                    <RechartsTooltip />
                                    <Bar dataKey="value" fill="#8884d8" name="Leads" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>{t('marketing.retentionSplit')}</CardTitle>
                        <CardDescription>{t('marketing.retentionNote')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={retentionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {retentionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-7">
                    <CardHeader>
                        <CardTitle>{t('marketing.topOffers')}</CardTitle>
                        <CardDescription>{t('marketing.offersNote')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={offersData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Bar dataKey="count" fill="#82ca9d" name="Sales Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
