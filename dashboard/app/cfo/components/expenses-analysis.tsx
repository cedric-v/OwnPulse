"use client"

import { Expense } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface ExpensesAnalysisProps {
    expenses: Expense[]
    currency: string
}

import { useLanguage } from "@/components/i18n/language-context"

export function ExpensesAnalysis({ expenses, currency }: ExpensesAnalysisProps) {
    const { t } = useLanguage()

    // Group by category
    const categoryTotals: Record<string, number> = {}
    expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.price_ht || 0)
    })

    // Group by importance
    const importanceTotals: Record<string, number> = {
        'Mandatory': 0,
        'Important': 0,
        'Optional': 0
    }
    expenses.forEach(e => {
        if (importanceTotals[e.importance] !== undefined) {
            importanceTotals[e.importance] += (e.price_ht || 0)
        }
    })

    const getCategoryLabel = (key: string) => {
        const catMap: Record<string, string> = {
            "Logiciels": "software",
            "Matériel": "hardware",
            "Marketing": "marketing",
            "Prestations": "services",
            "Formation": "training",
            "Déplacements": "travel",
            "Taxes": "taxes",
            "Rémunération": "remuneration",
            "Divers": "others"
        }
        const transKey = catMap[key] || key.toLowerCase()
        const translated = t(`cfo.${transKey}`)
        return translated === `cfo.${transKey}` ? key : translated
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>{t('cfo.importance')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-2 h-8 bg-green-300 mr-2 rounded"></div>
                                <span className="font-medium">{t('cfo.mandatory')}</span>
                            </div>
                            <span>{importanceTotals['Mandatory'].toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-2 h-8 bg-yellow-300 mr-2 rounded"></div>
                                <span className="font-medium">{t('cfo.important')}</span>
                            </div>
                            <span>{importanceTotals['Important'].toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-2 h-8 bg-red-300 mr-2 rounded"></div>
                                <span className="font-medium">{t('cfo.optional')}</span>
                            </div>
                            <span>{importanceTotals['Optional'].toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('cfo.category')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('cfo.category')}</TableHead>
                                <TableHead className="text-right">{t('common.all')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(categoryTotals).map(([cat, total]) => (
                                <TableRow key={cat}>
                                    <TableCell className="font-medium">{getCategoryLabel(cat)}</TableCell>
                                    <TableCell className="text-right">{total.toLocaleString('fr-CH', { style: 'currency', currency: currency })}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
