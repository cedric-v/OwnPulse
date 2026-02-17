"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Contact, Sale } from "@/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Loader2, TrendingUp, Users, Clock, ShoppingBag } from "lucide-react"
import { PeriodSelector, Period } from "@/components/dashboard/period-selector"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57']

export default function MarketingPage() {
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
    }, [])

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    const isWithinPeriod = (dateString: string | null | undefined) => {
        if (!dateString) return false
        if (period === "all") return true

        const date = new Date(dateString)
        const now = new Date()
        const start = new Date()

        if (period === "30d") start.setDate(now.getDate() - 30)
        else if (period === "90d") start.setDate(now.getDate() - 90)
        else if (period === "6m") start.setMonth(now.getMonth() - 6)
        else if (period === "12m") start.setMonth(now.getMonth() - 12)
        else if (period === "ytd") {
            start.setFullYear(now.getFullYear(), 0, 1)
            start.setHours(0, 0, 0, 0)
        }

        return date >= start
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

    // 4. Retention Rate (Based on period filtered contacts)
    let singleOfferClients = 0
    let multiOfferClients = 0
    filteredContacts.forEach(c => {
        if (c.offers_purchased && Array.isArray(c.offers_purchased) && c.offers_purchased.length > 0) {
            if (c.offers_purchased.length === 1 && c.offers_purchased[0].count === 1) {
                singleOfferClients++
            } else {
                multiOfferClients++
            }
        }
    })
    const totalClients = singleOfferClients + multiOfferClients
    const retentionRate = totalClients > 0 ? Math.round((multiOfferClients / totalClients) * 100) : 0
    const retentionData = [
        { name: 'Single Offer', value: singleOfferClients },
        { name: 'Returning Clients', value: multiOfferClients }
    ]

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Marketing Dashboard</h2>
                <PeriodSelector value={period} onValueChange={setPeriod} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Conversion Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgConversionTime} days</div>
                        <p className="text-xs text-muted-foreground">From first contact to client</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Client Retention</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{retentionRate}%</div>
                        <p className="text-xs text-muted-foreground">{multiOfferClients} returning clients (vs {singleOfferClients} single-buy)</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Acquisition Channels</CardTitle>
                        <CardDescription>Where are your customers coming from?</CardDescription>
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
                        <CardTitle>Retention Split</CardTitle>
                        <CardDescription>Single vs Multiple purchases</CardDescription>
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
                        <CardTitle>Top Selling Offers</CardTitle>
                        <CardDescription>Most popular products/services</CardDescription>
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
