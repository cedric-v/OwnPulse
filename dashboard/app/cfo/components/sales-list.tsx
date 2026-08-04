"use client"

import { Sale } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface SalesListProps {
    sales: Sale[]
    currency: string
}

import { useLanguage } from "@/components/i18n/language-context"

export function SalesList({ sales, currency }: SalesListProps) {
    const { t } = useLanguage()
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('common.period')}</TableHead>
                        <TableHead>{t('cfo.offer')}</TableHead>
                        <TableHead>{t('cfo.client')}</TableHead>
                        <TableHead>{t('cfo.quantity')}</TableHead>
                        <TableHead className="text-right">{t('cfo.priceHt')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {t('common.all')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">{sale.offer_name}</TableCell>
                                <TableCell>
                                    {sale.companies?.name
                                        ? <span>{sale.companies.name}{sale.contacts ? ` · ${sale.contacts.first_name || ""} ${sale.contacts.last_name || ""}` : ""}</span>
                                        : sale.contacts
                                            ? `${sale.contacts.first_name || ""} ${sale.contacts.last_name || ""}`
                                            : "-"}
                                </TableCell>
                                <TableCell>{sale.quantity}</TableCell>
                                <TableCell className="text-right">
                                    {((sale.price_ht || 0) * (sale.quantity || 1)).toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
