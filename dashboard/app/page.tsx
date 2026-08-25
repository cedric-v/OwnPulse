
"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Contact } from "@/types"
import { selectableColumns } from "@/components/contacts/columns"
import { DataTable } from "@/components/contacts/data-table"
import { MobileContactCard } from "@/components/contacts/mobile-contact-card"
import { MergeSelectedDialog } from "@/components/contacts/merge-selected-dialog"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Download, GitMerge, X } from "lucide-react"
import { AddLeadDialog } from "@/components/contacts/add-lead-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { normalizeSearchText } from "@/lib/utils"

function HomeContent() {
  const router = useRouter()
  type ContactWithSales = Contact & { sales?: { price_ht: number | null, quantity: number | null, offer_name: string | null }[] }

  const { t } = useLanguage()
  const [data, setData] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [offers, setOffers] = useState<{ name: string }[]>([])
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [mergeContacts, setMergeContacts] = useState<Contact[]>([])
  const [tableEpoch, setTableEpoch] = useState(0)

  const searchParams = useSearchParams()
  const listFilter = searchParams.get('list')
  const offerFilter = searchParams.get('offer')
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [contactsRes, offersRes] = await Promise.all([
      supabase.from('contacts').select('*, sales(price_ht, quantity, offer_name)').order('created_at', { ascending: false }),
      supabase.from('offers').select('name').order('name')
    ])

    if (contactsRes.error) {
      console.error('Error fetching contacts:', contactsRes.error)
      setError(contactsRes.error.message)
    } else {
      const enrichedContacts = ((contactsRes.data || []) as ContactWithSales[]).map((c) => ({
        ...c,
        total_sales: (c.sales || []).reduce((acc, s) => acc + ((s.price_ht || 0) * (s.quantity || 1)), 0)
      }))
      setData(enrichedContacts)
    }

    if (offersRes.data) {
      setOffers(offersRes.data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData()
  }, [fetchData])

  const filteredData = data.filter(contact => {
    // 1. List / Status Filter
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

    // 2. Offer Filter
    if (offerFilter) {
      const contactSales = (contact as ContactWithSales).sales || []
      const hasMatchingOffer = contactSales.some(s => s.offer_name === offerFilter)
      if (!hasMatchingOffer) return false
    }

    // 3. Search Query
    if (searchQuery) {
      const query = normalizeSearchText(searchQuery)
      return [
        contact.first_name,
        contact.last_name,
        contact.company,
        contact.notes,
        contact.status,
        contact.linkedin_url,
        contact.threads_url,
        contact.instagram_url,
      ].some((value) => normalizeSearchText(value).includes(query))
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

  const handleOfferChange = (offer: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (offer === "all") {
      params.delete('offer')
    } else {
      params.set('offer', offer)
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 lg:p-8 lg:pt-6">
      <div className="mb-6 flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {listFilter ? t(`sidebar.${listFilter.toLowerCase()}`) : t('sidebar.allLeads')}
        </h1>
        <div className="sticky top-16 z-20 -mx-4 border-y bg-slate-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Select value={offerFilter || "all"} onValueChange={handleOfferChange}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t('common.filterByOffer')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allOffers')}</SelectItem>
              {offers.map((o) => (
                <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80"
          />
          <Button variant="outline" size="sm" onClick={exportToCSV} className="w-full gap-2 sm:w-auto">
            <Download className="h-4 w-4" />
            {t('common.exportCsv') || "Export CSV"}
          </Button>
          <AddLeadDialog />
          <Link href="/extension" className="text-sm text-blue-500 hover:underline sm:ml-1">
            {t('common.downloadExtension') || "Download Extension"}
          </Link>
        </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : (
        <>
        <DataTable
          key={tableEpoch}
          columns={selectableColumns}
          data={filteredData}
          showGlobalFilter={false}
          meta={{
            refreshData: fetchData
          }}
          selectionToolbar={(rows, clearSelection) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-800 dark:bg-blue-950/30">
              <span className="text-sm font-medium">
                {t('contacts.merge.selectedCount', { count: rows.length })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={rows.length < 2}
                  onClick={() => {
                    setMergeContacts(rows.map(r => r.original))
                    setShowMergeDialog(true)
                  }}
                >
                  <GitMerge className="mr-2 h-4 w-4" />
                  {t('contacts.merge.confirm')}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="mr-1 h-4 w-4" />
                  {t('contacts.merge.clearSelection')}
                </Button>
              </div>
            </div>
          )}
          mobileRowRenderer={(row, selection) => (
            <MobileContactCard
              contact={row.original}
              onRefresh={fetchData}
              selected={selection?.selected}
              onSelectChange={selection?.setSelected}
            />
          )}
        />
        <MergeSelectedDialog
          contacts={mergeContacts}
          open={showMergeDialog}
          onOpenChange={setShowMergeDialog}
          onSuccess={async () => {
            setShowMergeDialog(false)
            setMergeContacts([])
            setTableEpoch(e => e + 1)
            await fetchData()
          }}
        />
        </>
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
