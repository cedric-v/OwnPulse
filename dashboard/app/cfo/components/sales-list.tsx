"use client"

import { useState } from "react"
import { Sale } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { DeleteSaleAlert } from "@/components/sales/delete-sale-alert"

interface SalesListProps {
    sales: Sale[]
    currency: string
    onRefresh?: () => void
}

import { useLanguage } from "@/components/i18n/language-context"

export function SalesList({ sales, currency, onRefresh }: SalesListProps) {
    const { t } = useLanguage()
    const [deletingSale, setDeletingSale] = useState<Sale | null>(null)

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
                        <TableHead className="w-[50px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                {t('contacts.noSales')}
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
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                        onClick={() => setDeletingSale(sale)}
                                        title={t('sales.deleteSale')}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {deletingSale && (
                <DeleteSaleAlert
                    saleId={deletingSale.id}
                    saleName={deletingSale.offer_name}
                    open={!!deletingSale}
                    onOpenChange={(open) => !open && setDeletingSale(null)}
                    onSuccess={() => {
                        setDeletingSale(null)
                        onRefresh?.()
                    }}
                />
            )}
        </div>
    )
}
