"use client"

import Link from "next/link"
import { Contact } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusCell } from "./status-cell"
import { NotesSheet } from "./notes-sheet"
import { useLanguage } from "@/components/i18n/language-context"
import { ActionsCell } from "./columns"

export function MobileContactCard({
    contact,
    onRefresh,
    selected,
    onSelectChange,
}: {
    contact: Contact
    onRefresh?: () => void
    selected?: boolean
    onSelectChange?: (checked: boolean) => void
}) {
    const { t } = useLanguage()
    const initials = `${contact.first_name?.[0] || "?"}${contact.last_name?.[0] || "?"}`
    const totalSales = contact.total_sales || 0
    const formattedSales = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
    }).format(totalSales)

    return (
        <article className="rounded-xl border bg-background p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    {onSelectChange && (
                        <Checkbox
                            checked={!!selected}
                            onCheckedChange={(value) => onSelectChange(value === true)}
                            className="mt-1"
                            aria-label="Sélectionner"
                        />
                    )}
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.avatar_url || undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                        <Link
                            href={`/contacts/${contact.id}`}
                            className="block truncate font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                            {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Lead"}
                        </Link>
                        <div className="truncate text-sm text-muted-foreground">
                            {contact.company || "Entreprise non renseignée"}
                        </div>
                        {contact.company_role ? (
                            <div className="truncate text-xs text-muted-foreground">
                                {contact.company_role}
                            </div>
                        ) : null}
                    </div>
                </div>
                <ActionsCell contact={contact} onRefresh={onRefresh} />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Statut
                    </div>
                    <StatusCell contact={contact} />
                </div>
                <div className="text-right">
                    <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        CA
                    </div>
                    <div className="font-medium">{totalSales > 0 ? formattedSales : "-"}</div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <NotesSheet contact={contact} />
                {contact.email ? (
                    <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${contact.email}`}>{t('contacts.detail.email')}</a>
                    </Button>
                ) : null}
                {contact.phone ? (
                    <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${contact.phone}`}>Appeler</a>
                    </Button>
                ) : null}
            </div>
        </article>
    )
}
