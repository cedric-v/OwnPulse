
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Contact } from "@/types"
import { columns } from "@/components/contacts/columns"
import { DataTable } from "@/components/contacts/data-table"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"

import { Suspense } from "react"

function HomeContent() {
  const [data, setData] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const searchParams = useSearchParams()
  const listFilter = searchParams.get('list')
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching contacts:', error)
        setError(error.message)
      } else {
        setData(contacts || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredData = data.filter(contact => {
    if (listFilter) {
      const target = listFilter.toLowerCase().trim().replace(/s$/, '')
      const status = (contact.status || "").toLowerCase().trim()
      const lists = (contact.list || "").toLowerCase().split(',').map(l => l.trim().replace(/s$/, ''))

      const isCustomerStatus = (status === "customer" || status === "deal won")

      // Match if: 
      // 1. We are looking for customers and they have customer status
      // 2. OR their explicit lists include the target
      const match = (target === "customer" && isCustomerStatus) || lists.includes(target)

      if (!match) return false
    }

    // 2. Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (contact.first_name || "").toLowerCase().includes(query) ||
        (contact.last_name || "").toLowerCase().includes(query) ||
        (contact.company || "").toLowerCase().includes(query) ||
        (contact.notes || "").toLowerCase().includes(query) ||
        (contact.status || "").toLowerCase().includes(query)
      )
    }

    return true
  })

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {listFilter ? `${listFilter}` : "Cedric's CRM"}
        </h1>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Rechercher un contact, société ou note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80"
          />
          <Link href="/extension" className="text-sm text-blue-500 hover:underline">Download Extension</Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : (
        <DataTable columns={columns} data={filteredData} />
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
