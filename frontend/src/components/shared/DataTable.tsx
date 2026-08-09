"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData> {
  columns: {
    header: string
    accessorKey?: keyof TData
    cell?: (item: TData) => React.ReactNode
  }[]
  data: TData[]
  onRowClick?: (item: TData) => void
}

export function DataTable<TData>({ columns, data, onRowClick }: DataTableProps<TData>) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow 
                key={i} 
                className={cn(
                  "transition-all duration-200",
                  onRowClick ? "cursor-pointer hover:bg-muted hover:shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.05)] dark:hover:shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.05)]" : "hover:bg-muted/50"
                )}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, j) => (
                  <TableCell key={j}>
                    {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey]) : null)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
