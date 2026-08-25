"use client"

import { useState, type ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type DateInputProps = Omit<ComponentProps<"input">, "type"> & {
    emptyLabel?: string
    containerClassName?: string
}

/**
 * A date input with an explicit empty state.
 *
 * Some browsers render today's date as the visual placeholder of an empty
 * native date input. That is misleading for optional CRM dates, so we hide
 * that browser-provided visual and render our own empty label instead.
 */
export function DateInput({
    className,
    style,
    value,
    emptyLabel = "Date inconnue",
    containerClassName,
    onFocus,
    onBlur,
    ...props
}: DateInputProps) {
    const [focused, setFocused] = useState(false)
    const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value)
    const showEmptyState = !hasValue && !focused

    return (
        <div className={cn("relative", containerClassName)}>
            <Input
                {...props}
                type="date"
                value={value}
                onFocus={(event) => {
                    setFocused(true)
                    onFocus?.(event)
                }}
                onBlur={(event) => {
                    setFocused(false)
                    onBlur?.(event)
                }}
                className={cn("min-w-0", className)}
                style={
                    showEmptyState
                        ? { ...style, color: "transparent", WebkitTextFillColor: "transparent", caretColor: "transparent" }
                        : style
                }
            />
            {showEmptyState && (
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                    {emptyLabel}
                </span>
            )}
        </div>
    )
}
