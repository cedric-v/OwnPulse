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

export function ExpensesAnalysis({ expenses, currency }: ExpensesAnalysisProps) {

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

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Importance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-2 h-8 bg-green-300 mr-2 rounded"></div>
                                <span className="font-medium">Indispensable</span>
                            </div>
                            <span>{importanceTotals['Mandatory'].toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-2 h-8 bg-yellow-300 mr-2 rounded"></div>
                                <span className="font-medium">Important</span>
                            </div>
                            <span>{importanceTotals['Important'].toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-2 h-8 bg-red-300 mr-2 rounded"></div>
                                <span className="font-medium">Facultatif</span>
                            </div>
                            <span>{importanceTotals['Optional'].toLocaleString('fr-CH', { style: 'currency', currency: currency })}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Category Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Catégorie</TableHead>
                                <TableHead className="text-right">Réel TTC</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(categoryTotals).map(([cat, total]) => (
                                <TableRow key={cat}>
                                    <TableCell className="font-medium">{cat}</TableCell>
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
