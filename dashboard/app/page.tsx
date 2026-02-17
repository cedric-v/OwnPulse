
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Contact } from "@/types"
import { columns } from "@/components/contacts/columns"
import { DataTable } from "@/components/contacts/data-table"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Input } from "@/components/ui/input"

import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { AddLeadDialog } from "@/components/contacts/add-lead-dialog"

function HomeContent() {
  const { t } = useLanguage()
  const [data, setData] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const searchParams = useSearchParams()
  const listFilter = searchParams.get('list')
  const supabase = createClient()

  const fetchData = async () => {
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

  useEffect(() => {
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

  const exportToCSV = () => {
    // 1. Prepare headers
    const headers = [
      "ID", "First Name", "Last Name", "Email", "Company",
      "Role", "LinkedIn", "Website", "Phone", "Status",
      "Lists", "Notes", "Created At"
    ]

    // 2. Map data
    const rows = filteredData.map(c => [
      c.id,
      c.first_name || "",
      c.last_name || "",
      c.email || "",
      c.company || "",
      c.company_role || "",
      c.linkedin_url || "",
      c.website || "",
      c.phone || "",
      c.status || "",
      c.list || "",
      (c.notes || "").replace(/\n/g, " "), // Remove newlines for CSV
      c.created_at
    ])

    // 3. Format as CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    // 4. Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `ownpulse-export-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {listFilter ? t(`sidebar.${listFilter.toLowerCase()}`) : t('sidebar.allLeads')}
        </h1>
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80"
          />
          <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            {t('common.exportCsv') || "Export CSV"}
          </Button>
          <AddLeadDialog />
          <Link href="/extension" className="text-sm text-blue-500 hover:underline">{t('common.downloadExtension') || "Download Extension"}</Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          meta={{
            refreshData: fetchData
          }}
        />
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
