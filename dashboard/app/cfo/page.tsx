"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Sale, Expense } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingDown, Target, Wallet } from "lucide-react"
import { NetResult } from "@/app/cfo/components/net-result"
import { NewSaleForm } from "@/app/cfo/components/new-sale-form"
import { NewExpenseForm } from "@/app/cfo/components/new-expense-form"
import { SalesList } from "@/app/cfo/components/sales-list"
import { ExpensesAnalysis } from "@/app/cfo/components/expenses-analysis"
import { ExpensesList } from "@/app/cfo/components/expenses-list"
import { PeriodSelector, Period } from "@/components/dashboard/period-selector"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CFODashboard() {
    const { t } = useLanguage()
    const [sales, setSales] = useState<Sale[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [currency, setCurrency] = useState("CHF")
    const [period, setPeriod] = useState<Period>("12m")
    const [socialRate, setSocialRate] = useState(45)
    const [taxRate, setTaxRate] = useState(5)
    const [targetMonthlySalary, setTargetMonthlySalary] = useState(4000)
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
    const supabase = createClient()

    const fetchFinancials = useCallback(async () => {
        const salesRes = await supabase.from('sales').select('*, contacts(first_name, last_name)').order('created_at', { ascending: false })
        const expensesRes = await supabase.from('expenses').select('*').order('created_at', { ascending: false })

        if (salesRes.data) setSales(salesRes.data as Sale[])
        if (expensesRes.data) setExpenses(expensesRes.data as Expense[])

        const { data: currencyData } = await supabase.from('settings').select('value').eq('key', 'currency').single()
        if (currencyData) setCurrency(currencyData.value)

        const [socialRes, taxRes, salaryRes] = await Promise.all([
            supabase.from('settings').select('value').eq('key', 'social_rate').single(),
            supabase.from('settings').select('value').eq('key', 'tax_rate').single(),
            supabase.from('settings').select('value').eq('key', 'target_net_salary').single()
        ])

        if (socialRes.data) setSocialRate(parseFloat(socialRes.data.value))
        if (taxRes.data) setTaxRate(parseFloat(taxRes.data.value))
        if (salaryRes.data) setTargetMonthlySalary(parseFloat(salaryRes.data.value))
    }, [supabase])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchFinancials()
    }, [fetchFinancials])

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

    const filteredSales = sales.filter(s => isWithinPeriod(s.sale_date))
    const filteredExpenses = expenses.filter(e => isWithinPeriod(e.created_at))

    const periodLabel = t(`periods.${period}`)

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('cfo.title')}</h2>
                <PeriodSelector value={period} onValueChange={setPeriod} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cfo.revenue')} ({periodLabel})</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {filteredSales.reduce((acc, sale) => acc + (sale.price_ht || 0), 0).toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cfo.expenses')} ({periodLabel})</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {filteredExpenses.reduce((acc, exp) => acc + (exp.price_ht || 0), 0).toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cfo.netProfit')}</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(filteredSales.reduce((acc, s) => acc + (s.price_ht || 0), 0) - filteredExpenses.reduce((acc, e) => acc + (e.price_ht || 0), 0))
                                .toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('cfo.runway')}</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">6.2 {t('cfo.months')}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">{t('cfo.overview')}</TabsTrigger>
                    <TabsTrigger value="sales">{t('cfo.sales')}</TabsTrigger>
                    <TabsTrigger value="expenses">{t('cfo.expenses')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <NetResult
                        sales={filteredSales}
                        expenses={filteredExpenses}
                        currency={currency}
                        socialRate={socialRate}
                        taxRate={taxRate}
                        targetMonthlySalary={targetMonthlySalary}
                        period={period}
                    />
                </TabsContent>

                <TabsContent value="sales" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>{t('cfo.revenueGoal')}</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="flex justify-center items-center h-[200px] text-muted-foreground">Gauge Chart Here</div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>{t('cfo.newSale')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <NewSaleForm onSuccess={fetchFinancials} />
                            </CardContent>
                        </Card>
                    </div>
                    <SalesList sales={filteredSales} currency={currency} />
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-7">
                            <CardHeader>
                                <CardTitle>{t('cfo.newExpense')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <NewExpenseForm onSuccess={fetchFinancials} />
                            </CardContent>
                        </Card>
                    </div>
                    <ExpensesAnalysis expenses={filteredExpenses} currency={currency} />
                    <ExpensesList
                        expenses={filteredExpenses}
                        currency={currency}
                        onEdit={(expense) => setEditingExpense(expense)}
                    />
                </TabsContent>
            </Tabs>

            <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{t('common.edit')}</DialogTitle>
                    </DialogHeader>
                    {editingExpense && (
                        <NewExpenseForm
                            initialData={editingExpense}
                            onSuccess={() => {
                                setEditingExpense(null)
                                fetchFinancials()
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
