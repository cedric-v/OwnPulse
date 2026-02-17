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

export function SalesList({ sales, currency }: SalesListProps) {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Offre</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead className="text-right">Montant HT</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Aucune offre trouvée. Créez une nouvelle offre pour commencer.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">{sale.offer_name}</TableCell>
                                <TableCell>
                                    {sale.contacts ? `${sale.contacts.first_name || ""} ${sale.contacts.last_name || ""}` : "-"}
                                </TableCell>
                                <TableCell>{sale.quantity}</TableCell>
                                <TableCell className="text-right">
                                    {sale.price_ht.toLocaleString('fr-CH', { style: 'currency', currency: currency })}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
