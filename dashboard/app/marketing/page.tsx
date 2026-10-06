"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Loader2, Users, Clock, ShoppingCart, CreditCard, UserPlus, Receipt, UserCheck, Award } from "lucide-react"
import { PeriodSelector, Period } from "@/components/dashboard/period-selector"
import { ClientListDialog, ClientRankingList, ClientListItem } from "@/components/marketing/client-list"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Contact, Sale } from "@/types"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

type ClientListKind = 'clients' | 'avgPurchase' | 'frequency' | 'conversion' | 'retention' | 'basket' | 'newClients'

function MetricCard({
    title,
    icon,
    value,
    note,
    onClick,
}: {
    title: string
    icon: ReactNode
    value: ReactNode
    note: ReactNode
    onClick?: () => void
}) {
    const interactive = Boolean(onClick)
    return (
        <Card
            className={interactive ? "cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40" : undefined}
            onClick={onClick}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={
                interactive
                    ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onClick?.()
                          }
                      }
                    : undefined
            }
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{note}</p>
            </CardContent>
        </Card>
    )
}

function OffersTooltip({
    active,
    payload,
    currency,
    t,
}: {
    active?: boolean
    payload?: Array<{ payload: { name: string; revenue: number; count: number } }>
    currency: string
    t: (path: string, variables?: Record<string, string | number>) => string
}) {
    if (!active || !payload || payload.length === 0) return null
    const data = payload[0].payload
    return (
        <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
            <div className="font-medium">{data.name}</div>
            <div>{data.revenue.toLocaleString('fr-CH', { style: 'currency', currency: currency, maximumFractionDigits: 0 })}</div>
            <div className="text-xs text-muted-foreground">
                {data.count} {data.count > 1 ? t('marketing.salesPlural') : t('marketing.salesSingular')}
            </div>
        </div>
    )
}

export default function MarketingPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [contacts, setContacts] = useState<Contact[]>([])
    const [sales, setSales] = useState<Sale[]>([])
    const [currency, setCurrency] = useState("CHF")
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<Period>("12m")
    const [clientList, setClientList] = useState<ClientListKind | null>(null)
    const [includeExceptional, setIncludeExceptional] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const [contactsRes, salesRes, currencyRes] = await Promise.all([
                supabase.from('contacts').select('*'),
                supabase.from('sales').select('*'),
                supabase.from('settings').select('value').eq('key', 'currency').single()
            ])

            if (contactsRes.data) setContacts(contactsRes.data as Contact[])
            if (salesRes.data) setSales(salesRes.data as Sale[])
            if (currencyRes.data) setCurrency(currencyRes.data.value)
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

    // Exceptional sales (explicit user flag) are excluded from the marketing
    // statistics by default. The toggle lets the user re-include them for
    // comparison. Accounting (CFO) always includes every sale.
    const isStatsSale = (sale: Sale) => includeExceptional || !sale.exclude_from_stats
    const statsSales = filteredSales.filter(isStatsSale)
    const allStatsSales = sales.filter(isStatsSale)
    const exceptionalSalesCount = filteredSales.filter(s => s.exclude_from_stats).length

    // 1. Acquisition Channels (Driven by Transactions and Customer List)
    const channelCounts: Record<string, number> = {}
    const wonStatuses = ['client', 'customer', 'closed', 'deal won']
    const contactIdsWithRecentSales = new Set(statsSales.map(s => s.contact_id).filter(Boolean))

    const convertedWonContactIds = new Set(
        filteredContacts
            .filter(c => {
                const isWon = wonStatuses.some(status => (c.status || "").toLowerCase().includes(status)) || 
                              (c.list || "").toLowerCase().includes('customer') ||
                              (c.list || "").toLowerCase().includes('client')
                return isWon
            })
            .map(c => c.id)
    )

    const allWonContactIds = new Set([...Array.from(contactIdsWithRecentSales), ...Array.from(convertedWonContactIds)])

    allWonContactIds.forEach(id => {
        const c = contacts.find(contact => contact.id === id)
        if (c) {
            const channel = c.acquisition_channel || 'Unknown'
            channelCounts[channel] = (channelCounts[channel] || 0) + 1
        }
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

    // 3. Top 5 Offers by Revenue (price_ht × quantity over the period)
    const offerRevenue: Record<string, { revenue: number; count: number }> = {}
    statsSales.forEach(s => {
        const name = s.offer_name || 'Unknown Offer'
        const revenue = (s.price_ht || 0) * (s.quantity || 1)
        const count = s.quantity || 1
        if (!offerRevenue[name]) offerRevenue[name] = { revenue: 0, count: 0 }
        offerRevenue[name].revenue += revenue
        offerRevenue[name].count += count
    })
    const offersData = Object.entries(offerRevenue)
        .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), count: v.count }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

    // 4. Retention Rate (Based on real sales data)
    // We count how many sales each contact has in total (all time)
    const totalSalesByContact: Record<string, number> = {}
    allStatsSales.forEach(s => {
        if (s.contact_id) {
            totalSalesByContact[s.contact_id] = (totalSalesByContact[s.contact_id] || 0) + (s.quantity || 1)
        }
    })

    // We only consider contacts who have at least one sale in the selected period
    const activeContactIds = new Set(statsSales.map(s => s.contact_id).filter(Boolean))

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

    // 5. Jay Abraham key metrics (based on the selected period)
    //    Revenue = Number of clients × Average purchase value × Purchase frequency
    let periodRevenue = 0
    statsSales.forEach(s => {
        periodRevenue += (s.price_ht || 0) * (s.quantity || 1)
    })
    const activeClientsCount = activeContactIds.size
    const purchaseCount = statsSales.length
    const avgBasketPerClient = activeClientsCount > 0 ? periodRevenue / activeClientsCount : 0
    const avgPurchaseValue = purchaseCount > 0 ? periodRevenue / purchaseCount : 0
    const purchaseFrequency = activeClientsCount > 0 ? purchaseCount / activeClientsCount : 0

    // Median purchase value: a robust signal shown alongside the mean so a
    // single outlier is visible (mean >> median) without distorting the mean
    // used by the growth-lever identity.
    const median = (values: number[]) => {
        if (values.length === 0) return 0
        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    }
    const medianPurchaseValue = median(statsSales.map(s => (s.price_ht || 0) * (s.quantity || 1)))

    // 6. New clients converted during the selected period
    const newClientsContacts = contacts
        .filter(c => c.customer_conversion_date && isWithinPeriod(c.customer_conversion_date))
        .sort((a, b) => new Date(b.customer_conversion_date as string).getTime() - new Date(a.customer_conversion_date as string).getTime())
    const newClientsCount = newClientsContacts.length
    const retentionData = [
        { name: t('marketing.singleOffer'), value: singleOfferClients },
        { name: t('marketing.returningClients'), value: multiOfferClients }
    ]

    // 7. Client lists behind each metric (cards are clickable)
    const formatCurrency = (value: number) =>
        Math.round(value).toLocaleString('fr-CH', { style: 'currency', currency, maximumFractionDigits: 0 })

    const getContactName = (contact: Contact) =>
        [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
        contact.company ||
        contact.email ||
        t('marketing.unknownClient')

    const toClientItem = (contact: Contact, value?: string, secondary?: string): ClientListItem => ({
        id: contact.id,
        name: getContactName(contact),
        company: contact.company,
        avatar_url: contact.avatar_url,
        value,
        secondary,
    })

    const purchaseLabel = (count: number) =>
        `${count} ${count > 1 ? t('marketing.purchases') : t('marketing.purchase')}`

    // Revenue and number of purchases per client over the selected period
    const periodClientStats: Record<string, { revenue: number; purchases: number }> = {}
    statsSales.forEach(s => {
        if (!s.contact_id) return
        if (!periodClientStats[s.contact_id]) periodClientStats[s.contact_id] = { revenue: 0, purchases: 0 }
        periodClientStats[s.contact_id].revenue += (s.price_ht || 0) * (s.quantity || 1)
        periodClientStats[s.contact_id].purchases += 1
    })

    const activeClients = Object.entries(periodClientStats)
        .map(([id, stats]) => ({ contact: contacts.find(c => c.id === id), ...stats }))
        .filter((entry): entry is { contact: Contact; revenue: number; purchases: number } => Boolean(entry.contact))
        .sort((a, b) => b.revenue - a.revenue)

    const activeClientsList: ClientListItem[] = activeClients.map(entry =>
        toClientItem(entry.contact, formatCurrency(entry.revenue), purchaseLabel(entry.purchases))
    )

    const topClientsList: ClientListItem[] = activeClients.slice(0, 10).map(entry =>
        toClientItem(entry.contact, formatCurrency(entry.revenue), purchaseLabel(entry.purchases))
    )

    const avgPurchaseList: ClientListItem[] = activeClients
        .map(entry => ({ ...entry, avg: entry.purchases > 0 ? entry.revenue / entry.purchases : 0 }))
        .sort((a, b) => b.avg - a.avg)
        .map(entry =>
            toClientItem(
                entry.contact,
                t('marketing.avgPerPurchase', { value: formatCurrency(entry.avg) }),
                purchaseLabel(entry.purchases)
            )
        )

    const frequencyList: ClientListItem[] = [...activeClients]
        .sort((a, b) => b.purchases - a.purchases)
        .map(entry =>
            toClientItem(entry.contact, `${entry.purchases.toFixed(1)}×`, purchaseLabel(entry.purchases))
        )

    const retentionList: ClientListItem[] = activeClients
        .filter(entry => (totalSalesByContact[entry.contact.id] || 0) > 1)
        .map(entry =>
            toClientItem(entry.contact, formatCurrency(entry.revenue), purchaseLabel(entry.purchases))
        )

    const conversionList: ClientListItem[] = filteredContacts
        .filter(c => c.first_contact_date && c.customer_conversion_date)
        .map(c => ({
            contact: c,
            days: Math.round(
                (new Date(c.customer_conversion_date as string).getTime() -
                    new Date(c.first_contact_date as string).getTime()) /
                    (1000 * 3600 * 24)
            ),
        }))
        .filter(entry => entry.days >= 0)
        .sort((a, b) => b.days - a.days)
        .map(entry =>
            toClientItem(
                entry.contact,
                t('marketing.conversionDuration', { days: entry.days })
            )
        )

    const newClientsList: ClientListItem[] = newClientsContacts.map(c => {
        const revenue = activeClients.find(entry => entry.contact.id === c.id)?.revenue
        return toClientItem(
            c,
            revenue ? formatCurrency(revenue) : undefined,
            t('marketing.convertedOn', {
                date: new Date(c.customer_conversion_date as string).toLocaleDateString(),
            })
        )
    })

    const clientListItems: Record<ClientListKind, ClientListItem[]> = {
        clients: activeClientsList,
        avgPurchase: avgPurchaseList,
        frequency: frequencyList,
        conversion: conversionList,
        retention: retentionList,
        basket: activeClientsList,
        newClients: newClientsList,
    }

    const clientListMeta: Record<ClientListKind, { title: string; description: string }> = {
        clients: { title: t('marketing.clients'), description: t('marketing.clientsNote') },
        avgPurchase: { title: t('marketing.avgPurchaseValue'), description: t('marketing.avgPurchaseValueNote') },
        frequency: { title: t('marketing.purchaseFrequency'), description: t('marketing.purchaseFrequencyNote') },
        conversion: { title: t('marketing.avgConversion'), description: t('marketing.fromContactToClient') },
        retention: { title: t('marketing.retention'), description: t('marketing.retentionNote') },
        basket: { title: t('marketing.avgBasket'), description: t('marketing.avgBasketNote') },
        newClients: { title: t('marketing.newClients'), description: t('marketing.newClientsNote') },
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl font-bold tracking-tight">{t('marketing.title')}</h2>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="include-exceptional-sales"
                            checked={includeExceptional}
                            onCheckedChange={(checked) => setIncludeExceptional(checked === true)}
                        />
                        <label
                            htmlFor="include-exceptional-sales"
                            className="cursor-pointer select-none text-sm text-muted-foreground"
                        >
                            {t('marketing.includeExceptional')}
                            {exceptionalSalesCount > 0 ? ` (${exceptionalSalesCount})` : ""}
                        </label>
                    </div>
                    <PeriodSelector value={period} onValueChange={setPeriod} />
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold tracking-tight">{t('marketing.leversTitle')}</h3>
                    <p className="text-sm text-muted-foreground">{t('marketing.leversNote')}</p>
                    {exceptionalSalesCount > 0 && !includeExceptional && (
                        <p className="text-xs text-muted-foreground">{t('marketing.exceptionalExcludedNote')}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{t('marketing.clickHint')}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                        title={t('marketing.clients')}
                        icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
                        value={activeClientsCount}
                        note={t('marketing.clientsNote')}
                        onClick={() => setClientList('clients')}
                    />
                    <MetricCard
                        title={t('marketing.avgPurchaseValue')}
                        icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
                        value={formatCurrency(avgPurchaseValue)}
                        note={
                            <span className="flex flex-col gap-0.5">
                                <span>{t('marketing.avgPurchaseValueNote')}</span>
                                <span title={t('marketing.medianNote')}>
                                    {t('marketing.medianPerPurchase', { value: formatCurrency(medianPurchaseValue) })}
                                </span>
                            </span>
                        }
                        onClick={() => setClientList('avgPurchase')}
                    />
                    <MetricCard
                        title={t('marketing.purchaseFrequency')}
                        icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                        value={purchaseFrequency.toFixed(1)}
                        note={t('marketing.purchaseFrequencyNote')}
                        onClick={() => setClientList('frequency')}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title={t('marketing.avgConversion')}
                    icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                    value={`${avgConversionTime} ${t('marketing.days')}`}
                    note={t('marketing.fromContactToClient')}
                    onClick={() => setClientList('conversion')}
                />
                <MetricCard
                    title={t('marketing.retention')}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    value={`${retentionRate}%`}
                    note={t('marketing.returningVsSingle', { returning: multiOfferClients, single: singleOfferClients })}
                    onClick={() => setClientList('retention')}
                />
                <MetricCard
                    title={t('marketing.avgBasket')}
                    icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
                    value={formatCurrency(avgBasketPerClient)}
                    note={t('marketing.avgBasketNote')}
                    onClick={() => setClientList('basket')}
                />
                <MetricCard
                    title={t('marketing.newClients')}
                    icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
                    value={newClientsCount}
                    note={t('marketing.newClientsNote')}
                    onClick={() => setClientList('newClients')}
                />
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
                <Card className="col-span-4">
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
                                    <YAxis tickFormatter={(v) => v.toLocaleString('fr-CH')} />
                                    <RechartsTooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={<OffersTooltip currency={currency} t={t} />}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#82ca9d"
                                        name="Revenue"
                                        className="cursor-pointer"
                                        onClick={(data) => {
                                            if (data && data.name) {
                                                router.push(`/?list=Customers&offer=${encodeURIComponent(data.name)}`)
                                            }
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle>{t('marketing.topClients')}</CardTitle>
                            <Award className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardDescription>{t('marketing.topClientsNote')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ClientRankingList
                            items={topClientsList}
                            emptyLabel={t('marketing.noClientsInPeriod')}
                            maxHeight="h-[300px]"
                        />
                    </CardContent>
                </Card>
            </div>

            {clientList ? (
                <ClientListDialog
                    open={Boolean(clientList)}
                    onOpenChange={(open) => {
                        if (!open) setClientList(null)
                    }}
                    title={clientListMeta[clientList].title}
                    description={clientListMeta[clientList].description}
                    items={clientListItems[clientList]}
                    emptyLabel={t('marketing.noClientsInPeriod')}
                />
            ) : null}
        </div>
    )
}
