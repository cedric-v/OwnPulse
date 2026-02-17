"use client"

import { useState } from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { Contact } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, Linkedin, Globe, Instagram } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusCell } from "./status-cell"
import { NotesSheet } from "./notes-sheet"
import { DeleteLeadAlert } from "./delete-lead-alert"
import { useLanguage } from "@/components/i18n/language-context"
import { ArrowUpDown } from "lucide-react"
import { Column } from "@tanstack/react-table"

const TotalSalesHeader = () => {
    const { t } = useLanguage()
    return (
        <span className="font-semibold">
            {t('contacts.totalSales')}
        </span>
    )
}

export const columns: ColumnDef<Contact>[] = [
    {
        accessorKey: "avatar_url",
        header: "",
        cell: ({ row }) => {
            const avatarUrl = row.getValue("avatar_url") as string
            const first = row.original.first_name?.[0] || "?"
            const last = row.original.last_name?.[0] || "?"
            return (
                <Avatar>
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback>{first}{last}</AvatarFallback>
                </Avatar>
            )
        },
    },
    {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        cell: ({ row }) => {
            const first = row.original.first_name || ""
            const last = row.original.last_name || ""
            return (
                <Link href={`/contacts/${row.original.id}`} className="font-medium hover:underline text-blue-600 dark:text-blue-400">
                    {first} {last}
                </Link>
            )
        }
    },
    {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => {
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.company || "-"}</span>
                    <span className="text-xs text-muted-foreground">{row.original.company_role}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            return <StatusCell contact={row.original} />
        }
    },
    {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => {
            return <NotesSheet contact={row.original} />
        }
    },
    {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => {
            return <NotesSheet contact={row.original} />
        }
    },
    {
        accessorKey: "total_sales",
        header: () => <TotalSalesHeader />,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("total_sales") || "0")
            const formatted = new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
            }).format(amount)
            return <div className="font-medium">{amount > 0 ? formatted : "-"}</div>
        }
    },
    {
        id: "actions",
        cell: ({ row, table }) => {
            const contact = row.original
            const [showDeleteDialog, setShowDeleteDialog] = useState(false)

            return (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(contact.email || "")}
                            >
                                Copy Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/contacts/${contact.id}`} className="cursor-pointer">
                                    Edit details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!contact.linkedin_url}
                                onClick={() => {
                                    let url = contact.linkedin_url || ""
                                    if (url && !url.startsWith("http")) {
                                        url = `https://www.linkedin.com/in/${url}`
                                    }
                                    if (url) window.open(url, "_blank")
                                }}
                            >
                                <Linkedin className="mr-2 h-4 w-4" /> Open LinkedIn
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!contact.threads_url}
                                onClick={() => {
                                    let url = contact.threads_url || ""
                                    if (url && !url.startsWith("http")) {
                                        url = `https://www.threads.net/${url}`
                                    }
                                    if (url) window.open(url, "_blank")
                                }}
                            >
                                <Globe className="mr-2 h-4 w-4" /> Open Threads
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={!contact.instagram_url}
                                onClick={() => {
                                    let url = contact.instagram_url || ""
                                    if (url && !url.startsWith("http")) {
                                        url = `https://www.instagram.com/${url}`
                                    }
                                    if (url) window.open(url, "_blank")
                                }}
                            >
                                <Instagram className="mr-2 h-4 w-4" /> Open Instagram
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                Delete lead
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DeleteLeadAlert
                        contactId={contact.id}
                        contactName={`${contact.first_name} ${contact.last_name}`}
                        open={showDeleteDialog}
                        onOpenChange={setShowDeleteDialog}
                        onSuccess={() => {
                            const meta = table.options.meta as any
                            if (meta?.refreshData) {
                                meta.refreshData()
                            }
                        }}
                    />
                </>
            )
        },
    },
]
