"use client"

import { Expense } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useLanguage } from "@/components/i18n/language-context"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExpensesListProps {
    expenses: Expense[]
    currency: string
    onEdit: (expense: Expense) => void
}

export function ExpensesList({ expenses, currency, onEdit }: ExpensesListProps) {
    const { t } = useLanguage()

    const getImportanceColor = (importance: string) => {
        switch (importance?.toLowerCase()) {
            case 'mandatory':
            case 'indispensable':
                return 'bg-emerald-500'
            case 'important':
                return 'bg-amber-500'
            case 'optional':
            case 'facultatif':
                return 'bg-rose-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getImportanceLabel = (importance: string) => {
        switch (importance?.toLowerCase()) {
            case 'mandatory':
            case 'indispensable':
                return t('cfo.mandatory')
            case 'important':
                return t('cfo.important')
            case 'optional':
            case 'facultatif':
                return t('cfo.optional')
            default:
                return importance
        }
    }

    const getFrequencyLabel = (frequency: string | null) => {
        if (!frequency) return "-"
        switch (frequency?.toLowerCase()) {
            case 'unique':
                return t('cfo.unique')
            case 'monthly':
            case 'mensuel':
                return t('cfo.monthly')
            case 'annual':
            case 'annuel':
                return t('cfo.annual')
            default:
                return frequency
        }
    }

    const getLocalizedCategory = (category: string) => {
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
        const transKey = catMap[category]
        return transKey ? t(`cfo.${transKey}`) : category
    }

    return (
        <div className="rounded-md border bg-card mt-4">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">{t('cfo.expenses')}</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('cfo.expenseDate')}</TableHead>
                        <TableHead>{t('cfo.description')}</TableHead>
                        <TableHead>{t('cfo.category')}</TableHead>
                        <TableHead>{t('cfo.importance')}</TableHead>
                        <TableHead>{t('cfo.frequency')}</TableHead>
                        <TableHead className="text-right">{t('cfo.priceHt')}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                {t('common.all')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        expenses.map((expense) => (
                            <TableRow key={expense.id} className="group">
                                <TableCell>{new Date(expense.date || expense.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">{expense.description}</TableCell>
                                <TableCell>{getLocalizedCategory(expense.category)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${getImportanceColor(expense.importance)}`} />
                                        <span>{getImportanceLabel(expense.importance)}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{getFrequencyLabel(expense.payment_frequency)}</TableCell>
                                <TableCell className="text-right">
                                    {expense.price_ht?.toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => onEdit(expense)}
                                    >
                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
