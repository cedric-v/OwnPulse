"use client"

import { useEffect, useState } from "react"
import { Contact } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusCell } from "@/components/contacts/status-cell"
import Link from "next/link"

// Define the pipeline stages
const STAGES = ["N/A", "Cold", "Engaged", "Interested", "Warm", "Ghosted", "Closed"]

// Helper to group contacts by status
const groupContacts = (contacts: Contact[]) => {
    const groups: Record<string, Contact[]> = {}
    STAGES.forEach(stage => groups[stage] = [])

    contacts.forEach(contact => {
        let status = contact.status || "N/A"
        // Normalize status match
        const match = STAGES.find(s => s.toLowerCase() === status.toLowerCase())
        if (match) {
            groups[match].push(contact)
        } else {
            // Fallback or add to 'N/A'
            groups["N/A"].push(contact)
        }
    })
    return groups
}


export default function PipelinePage() {
    const [data, setData] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            const { data: contacts, error } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false }) // TODO: Maybe order by updated_at?

            if (!error) {
                setData(contacts || [])
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    const grouped = groupContacts(data)

    return (
        <div className="h-full flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight mb-6">Pipeline</h1>
            {loading ? <div>Loading...</div> : (
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-4 min-w-[1200px] pb-4">
                        {STAGES.map(stage => {
                            const items = grouped[stage] || []
                            const total = items.length

                            return (
                                <div key={stage} className="w-[300px] flex-shrink-0 flex flex-col">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h3 className="font-semibold text-sm uppercase text-gray-500">{stage}</h3>
                                        <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                            {total}
                                        </span>
                                    </div>

                                    <div className="bg-gray-50/50 dark:bg-zinc-900/50 p-2 rounded-lg min-h-[500px] space-y-2">
                                        {items.map(contact => (
                                            <Card key={contact.id} className="shadow-sm hover:shadow-md transition-shadow">
                                                <CardContent className="p-3">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={contact.avatar_url || undefined} />
                                                            <AvatarFallback>{contact.first_name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="overflow-hidden">
                                                            <Link href={`/contacts/${contact.id}`} className="block hover:underline group">
                                                                <p className="text-sm font-medium truncate text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300">
                                                                    {contact.first_name} {contact.last_name}
                                                                </p>
                                                            </Link>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {contact.company || "No Company"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {/* Status Cell reused here for inline editing! */}
                                                    <div className="flex justify-between items-center mt-2">
                                                        <StatusCell contact={contact} />
                                                        {/* Could add date or value here */}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {items.length === 0 && (
                                            <div className="text-center py-10 text-gray-400 text-xs italic">
                                                No leads
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
