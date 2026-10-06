"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type ClientListItem = {
    id: string
    name: string
    company?: string | null
    avatar_url?: string | null
    /** Main right-aligned metric (e.g. revenue). */
    value?: string
    /** Optional secondary line under the company (e.g. purchase count). */
    secondary?: string
}

function getInitials(name: string) {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    return initials || "?"
}

export function ClientRankingList({
    items,
    emptyLabel,
    className,
    maxHeight,
    onItemClick,
}: {
    items: ClientListItem[]
    emptyLabel: string
    className?: string
    maxHeight?: string
    onItemClick?: () => void
}) {
    if (items.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        )
    }

    return (
        <div className={cn("overflow-y-auto", maxHeight, className)}>
            <ul className="divide-y">
                {items.map((item) => (
                    <li key={item.id}>
                        <Link
                            href={`/contacts/${item.id}`}
                            onClick={onItemClick}
                            className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted"
                        >
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={item.avatar_url || undefined} />
                                <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{item.name}</div>
                                {item.company ? (
                                    <div className="truncate text-xs text-muted-foreground">{item.company}</div>
                                ) : null}
                                {item.secondary ? (
                                    <div className="truncate text-xs text-muted-foreground">{item.secondary}</div>
                                ) : null}
                            </div>
                            {item.value ? (
                                <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                                    {item.value}
                                </div>
                            ) : null}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function ClientListDialog({
    open,
    onOpenChange,
    title,
    description,
    items,
    emptyLabel,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    items: ClientListItem[]
    emptyLabel: string
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
                <ClientRankingList
                    items={items}
                    emptyLabel={emptyLabel}
                    maxHeight="max-h-[60vh] -mx-2 px-2"
                    onItemClick={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
