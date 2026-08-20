
"use client"

import * as React from "react"
import {
    flexRender,
    RowData,
    SortingState,
    TableMeta,
} from "@tanstack/react-table"
import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    LegacyColumnDef,
    LegacyFeatures,
    LegacyRow,
    useLegacyTable,
} from "@tanstack/react-table/legacy"

import { ArrowUpDown } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type MobileRowSelection = {
    selected: boolean
    setSelected: (checked: boolean) => void
}

interface DataTableProps<TData extends RowData> {
    columns: LegacyColumnDef<TData, unknown>[]
    data: TData[]
    meta?: TableMeta<LegacyFeatures, TData>
    mobileRowRenderer?: (row: LegacyRow<TData>, selection?: MobileRowSelection) => React.ReactNode
    showGlobalFilter?: boolean
    selectionToolbar?: (selectedRows: LegacyRow<TData>[], clearSelection: () => void) => React.ReactNode
}

export function DataTable<TData extends RowData>({
    columns,
    data,
    meta,
    mobileRowRenderer,
    showGlobalFilter = true,
    selectionToolbar,
}: DataTableProps<TData>) {
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useLegacyTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            globalFilter,
            sorting,
            rowSelection,
        },
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: !!selectionToolbar,
        getRowId: (row) => {
            const id = (row as Record<string, unknown>).id
            return typeof id === "string" ? id : String(row)
        },
        meta,
    })

    return (
        <div>
            {showGlobalFilter ? (
                <div className="flex items-center py-4">
                    <Input
                        placeholder="Filtrer..."
                        value={globalFilter ?? ""}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="max-w-sm"
                    />
                </div>
            ) : null}
            {selectionToolbar && table.getSelectedRowModel().rows.length > 0 ? (
                <div className="mb-3">
                    {selectionToolbar(
                        table.getSelectedRowModel().rows,
                        () => table.resetRowSelection()
                    )}
                </div>
            ) : null}
            {mobileRowRenderer ? (
                <div className="space-y-3 md:hidden">
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <React.Fragment key={row.id}>
                                {mobileRowRenderer(
                                    row,
                                    selectionToolbar
                                        ? {
                                            selected: row.getIsSelected(),
                                            setSelected: (checked) => row.toggleSelected(checked),
                                        }
                                        : undefined
                                )}
                            </React.Fragment>
                        ))
                    ) : (
                        <div className="rounded-md border px-4 py-10 text-center text-sm text-muted-foreground">
                            Aucun résultat.
                        </div>
                    )}
                </div>
            ) : null}
            <div className="hidden rounded-md border md:block">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : header.column.getCanSort() ? (
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                                                        className="hover:bg-transparent p-0 flex items-center gap-1 font-semibold"
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                                    </Button>
                                                ) : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Aucun résultat.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-end sm:space-x-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} sur{" "}
                    {table.getPageCount()}
                </div>
                <div className="text-sm text-muted-foreground md:hidden">
                    {table.getFilteredRowModel().rows.length} résultat{table.getFilteredRowModel().rows.length > 1 ? "s" : ""}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Précédent
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Suivant
                    </Button>
                </div>
            </div>
        </div>
    )
}
