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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Trash2 } from "lucide-react"
import { DeleteSaleAlert } from "@/components/sales/delete-sale-alert"

interface SalesListProps {
    sales: Sale[]
    currency: string
    onRefresh?: () => void
}

import { useLanguage } from "@/components/i18n/language-context"

export function SalesList({ sales, currency, onRefresh }: SalesListProps) {
    const { t } = useLanguage()
    const { toast } = useToast()
    const supabase = createClient()
    const [deletingSale, setDeletingSale] = useState<Sale | null>(null)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const toggleStatsExclusion = async (sale: Sale) => {
        setUpdatingId(sale.id)
        const nextExcluded = !sale.exclude_from_stats
        const { error } = await supabase
            .from('sales')
            .update({ exclude_from_stats: nextExcluded })
            .eq('id', sale.id)

        if (error) {
            toast({ title: t('common.error'), description: t('sales.updateError'), variant: "destructive" })
        } else {
            toast({
                title: t('common.success'),
                description: nextExcluded ? t('sales.statsExcluded') : t('sales.statsIncluded'),
            })
            onRefresh?.()
        }
        setUpdatingId(null)
    }

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
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <span>{sale.offer_name}</span>
                                        {sale.exclude_from_stats && (
                                            <Badge
                                                variant="secondary"
                                                title={t('cfo.exceptionalBadgeTitle')}
                                                className="text-[10px]"
                                            >
                                                {t('cfo.exceptionalBadge')}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
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
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground"
                                            onClick={() => toggleStatsExclusion(sale)}
                                            disabled={updatingId === sale.id}
                                            title={sale.exclude_from_stats ? t('sales.includeInStats') : t('sales.excludeFromStats')}
                                            aria-label={sale.exclude_from_stats ? t('sales.includeInStats') : t('sales.excludeFromStats')}
                                            aria-pressed={Boolean(sale.exclude_from_stats)}
                                        >
                                            {sale.exclude_from_stats ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                            onClick={() => setDeletingSale(sale)}
                                            title={t('sales.deleteSale')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
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
