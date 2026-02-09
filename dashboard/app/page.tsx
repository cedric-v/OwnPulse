
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Contact } from "@/types"
import { columns } from "@/components/contacts/columns"
import { DataTable } from "@/components/contacts/data-table"
import { createClient } from "@/lib/supabase/client"

import { Suspense } from "react"

function HomeContent() {
  const [data, setData] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const listFilter = searchParams.get('list')
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (listFilter) {
        query = query.eq('list', listFilter)
      }

      const { data: contacts, error } = await query

      if (error) {
        console.error('Error fetching contacts:', error)
        setError(error.message)
      } else {
        setData(contacts || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [listFilter])

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {listFilter ? `${listFilter}` : "Cedric's CRM"}
        </h1>
        <Link href="/extension" className="text-sm text-blue-500 hover:underline">Download Extension</Link>
      </div>

      {loading ? (
        <div>Loading contacts...</div>
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : (
        <DataTable columns={columns} data={data} />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading CRM...</div>}>
      <HomeContent />
    </Suspense>
  )
}
