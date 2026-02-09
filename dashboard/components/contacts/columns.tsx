"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Contact } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusCell } from "./status-cell"
import { NotesSheet } from "./notes-sheet"

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
                    <AvatarImage src={avatarUrl || ""} />
                    <AvatarFallback>{first}{last}</AvatarFallback>
                </Avatar>
            )
        },
    },
    {
        accessorKey: "first_name",
        header: "Name",
        cell: ({ row }) => {
            const first = row.original.first_name || ""
            const last = row.original.last_name || ""
            return <div className="font-medium">{first} {last}</div>
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
        id: "actions",
        cell: ({ row }) => {
            const contact = row.original

            return (
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
                        {contact.linkedin_url && (
                            <DropdownMenuItem onClick={() => {
                                let url = contact.linkedin_url || ""
                                if (url && !url.startsWith("http")) {
                                    url = `https://www.linkedin.com/in/${url}`
                                }
                                window.open(url, "_blank")
                            }}>
                                <Linkedin className="mr-2 h-4 w-4" /> Open LinkedIn
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
