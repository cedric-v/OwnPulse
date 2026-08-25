"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Contact, ContactActivity } from "@/types"
import { useLanguage } from "@/components/i18n/language-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ExternalLink,
    Flame,
    Globe,
    Loader2,
    Mail,
    MessageCircle,
    Phone,
    Search,
    Smartphone,
    Target,
    UserRound,
    X,
} from "lucide-react"
import { cn, normalizeSearchText } from "@/lib/utils"
import { DateInput } from "@/components/ui/date-input"
import { htmlToText } from "@/lib/html-to-text"

type Filter = "all" | "priority" | "follow-up" | "never"
type Channel = ContactActivity["channel"]
type Outcome = ContactActivity["outcome"]

type FollowUp = {
    contact_id: string
    due_date: string
}

const PRIORITY_STATUSES = ["Warm", "Interested", "Engaged"]
const CLOSED_STATUSES = ["Client", "Customer", "Deal Won", "Closed", "Lost"]
const CHANNELS: { value: Channel; label: string }[] = [
    { value: "LinkedIn", label: "MP LinkedIn" },
    { value: "Email", label: "E-mail" },
    { value: "Phone", label: "Appel" },
    { value: "WhatsApp", label: "WhatsApp" },
    { value: "SMS", label: "SMS" },
    { value: "Instagram", label: "MP Instagram" },
    { value: "Threads", label: "Threads" },
    { value: "Other", label: "Autre" },
]
const OUTCOMES: { value: Outcome; label: string }[] = [
    { value: "Message sent", label: "Message envoyé" },
    { value: "Conversation started", label: "Échange obtenu" },
    { value: "No response", label: "Pas de réponse" },
    { value: "Follow-up needed", label: "À relancer" },
    { value: "Meeting booked", label: "Rendez-vous obtenu" },
    { value: "Not interested", label: "Pas intéressé" },
    { value: "Wrong contact", label: "Mauvais contact" },
    { value: "Other", label: "Autre" },
]

function localDateKey(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

function dateRange(dateKey: string) {
    const [year, month, day] = dateKey.split("-").map(Number)
    const start = new Date(year, month - 1, day)
    const end = new Date(year, month - 1, day + 1)
    return { start: start.toISOString(), end: end.toISOString() }
}

function shiftDate(dateKey: string, amount: number) {
    const [year, month, day] = dateKey.split("-").map(Number)
    return localDateKey(new Date(year, month - 1, day + amount))
}

function displayName(contact: Contact) {
    return `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Lead sans nom"
}

function statusRank(status: string | null) {
    const index = PRIORITY_STATUSES.findIndex((item) => item.toLowerCase() === (status || "").toLowerCase())
    if (index >= 0) return PRIORITY_STATUSES.length - index
    if ((status || "").toLowerCase() === "prospect") return 1
    if ((status || "").toLowerCase() === "cold") return 0
    return -1
}

function statusClass(status: string | null) {
    switch ((status || "").toLowerCase()) {
        case "warm": return "border-orange-200 bg-orange-50 text-orange-700"
        case "interested": return "border-amber-200 bg-amber-50 text-amber-700"
        case "engaged": return "border-blue-200 bg-blue-50 text-blue-700"
        case "prospect": return "border-indigo-200 bg-indigo-50 text-indigo-700"
        default: return "border-slate-200 bg-slate-50 text-slate-600"
    }
}

function channelIcon(channel: Channel) {
    if (channel === "LinkedIn") return <Globe className="h-3.5 w-3.5" />
    if (channel === "Email") return <Mail className="h-3.5 w-3.5" />
    if (channel === "Phone") return <Phone className="h-3.5 w-3.5" />
    if (channel === "WhatsApp") return <MessageCircle className="h-3.5 w-3.5" />
    if (channel === "SMS") return <Smartphone className="h-3.5 w-3.5" />
    return <ExternalLink className="h-3.5 w-3.5" />
}

function formatActivityDate(value: string) {
    return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value))
}

export default function ProspectingPage() {
    const { t } = useLanguage()
    const supabase = useMemo(() => createClient(), [])
    const today = localDateKey(new Date())
    const [selectedDate, setSelectedDate] = useState(today)
    const [contacts, setContacts] = useState<Contact[]>([])
    const [activities, setActivities] = useState<ContactActivity[]>([])
    const [followUps, setFollowUps] = useState<FollowUp[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<Filter>("all")
    const [search, setSearch] = useState("")
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [channel, setChannel] = useState<Channel>("LinkedIn")
    const [outcome, setOutcome] = useState<Outcome>("Message sent")
    const [note, setNote] = useState("")
    const [followUpDate, setFollowUpDate] = useState("")
    const [goal, setGoal] = useState(10)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        const range = dateRange(selectedDate)
        const [contactsRes, activitiesRes, tasksRes, goalRes] = await Promise.all([
            supabase.from("contacts").select("*").order("created_at", { ascending: false }),
            supabase.from("contact_activities").select("*").order("created_at", { ascending: false }),
            supabase.from("tasks").select("contact_id, due_date").eq("completed", false).not("due_date", "is", null).lte("due_date", range.end),
            supabase.from("settings").select("value").eq("key", "prospecting_daily_goal").maybeSingle(),
        ])

        if (contactsRes.error) setError(contactsRes.error.message)
        else setContacts((contactsRes.data || []) as Contact[])
        if (activitiesRes.error) setError(activitiesRes.error.message)
        else setActivities((activitiesRes.data || []) as ContactActivity[])
        if (!tasksRes.error) setFollowUps((tasksRes.data || []) as FollowUp[])
        if (!goalRes.error && goalRes.data) {
            const configuredGoal = Number.parseInt(goalRes.data.value, 10)
            if (Number.isInteger(configuredGoal) && configuredGoal > 0) setGoal(configuredGoal)
        }
        setLoading(false)
    }, [selectedDate, supabase])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchData()
    }, [fetchData])

    const activitiesForDate = useMemo(() => {
        const range = dateRange(selectedDate)
        const start = new Date(range.start).getTime()
        const end = new Date(range.end).getTime()
        return activities.filter((activity) => {
            const timestamp = new Date(activity.created_at).getTime()
            return timestamp >= start && timestamp < end
        })
    }, [activities, selectedDate])

    const contactedIds = useMemo(() => new Set(activitiesForDate.map((activity) => activity.contact_id)), [activitiesForDate])
    const lastActivityByContact = useMemo(() => {
        const result = new Map<string, ContactActivity>()
        activities.forEach((activity) => {
            if (!result.has(activity.contact_id)) result.set(activity.contact_id, activity)
        })
        return result
    }, [activities])
    const followUpIds = useMemo(() => new Set(followUps.map((task) => task.contact_id)), [followUps])

    const queue = useMemo(() => {
        const query = normalizeSearchText(search)
        return contacts
            .filter((contact) => {
                const status = contact.status || ""
                if (CLOSED_STATUSES.some((closed) => closed.toLowerCase() === status.toLowerCase())) return false
                if (contactedIds.has(contact.id)) return false
                if (filter === "priority" && !PRIORITY_STATUSES.some((item) => item.toLowerCase() === status.toLowerCase())) return false
                if (filter === "follow-up" && !followUpIds.has(contact.id)) return false
                if (filter === "never" && lastActivityByContact.has(contact.id)) return false
                if (!query) return true
                return normalizeSearchText(
                    [displayName(contact), contact.company || "", contact.company_role || "", contact.notes || "", status].join(" ")
                ).includes(query)
            })
            .sort((a, b) => {
                const priority = statusRank(b.status) - statusRank(a.status)
                if (priority !== 0) return priority
                const aFollowUp = followUpIds.has(a.id) ? 1 : 0
                const bFollowUp = followUpIds.has(b.id) ? 1 : 0
                if (aFollowUp !== bFollowUp) return bFollowUp - aFollowUp
                const aLast = lastActivityByContact.get(a.id)?.created_at || a.created_at
                const bLast = lastActivityByContact.get(b.id)?.created_at || b.created_at
                return new Date(aLast).getTime() - new Date(bLast).getTime()
            })
    }, [contacts, contactedIds, filter, followUpIds, lastActivityByContact, search])

    const openLogSheet = (contact: Contact) => {
        setSelectedContact(contact)
        setChannel(contact.linkedin_url ? "LinkedIn" : contact.email ? "Email" : contact.phone ? "Phone" : "Other")
        setOutcome("Message sent")
        setNote("")
        setFollowUpDate("")
    }

    const saveActivity = async () => {
        if (!selectedContact || !note.trim() && !channel) return
        setSaving(true)
        const { data, error: activityError } = await supabase
            .from("contact_activities")
            .insert({
                contact_id: selectedContact.id,
                channel,
                outcome,
                note: note.trim() || null,
            })
            .select()
            .single()

        if (activityError) {
            setError(activityError.message)
            setSaving(false)
            return
        }

        // The first contact date is only set when an outreach is actually
        // logged. A newly imported/created lead must not inherit today's date.
        if (!selectedContact.first_contact_date) {
            const firstContactDate = localDateKey(new Date())
            const { error: firstContactDateError } = await supabase
                .from("contacts")
                .update({ first_contact_date: firstContactDate })
                .eq("id", selectedContact.id)

            if (!firstContactDateError) {
                setContacts((current) => current.map((contact) => (
                    contact.id === selectedContact.id
                        ? { ...contact, first_contact_date: firstContactDate }
                        : contact
                )))
            } else {
                setError(firstContactDateError.message)
            }
        }

        if (followUpDate) {
            await supabase.from("tasks").insert({
                contact_id: selectedContact.id,
                description: `Relancer ${displayName(selectedContact)}`,
                category: "Follow-up",
                priority: statusRank(selectedContact.status) >= 2 ? "High" : "Medium",
                due_date: new Date(`${followUpDate}T09:00:00`).toISOString(),
                completed: false,
            })
        }

        if (data) setActivities((current) => [data as ContactActivity, ...current])
        setSelectedContact(null)
        setSaving(false)
    }

    const contactedCount = contactedIds.size
    const progress = Math.min(100, Math.round((contactedCount / goal) * 100))
    const isToday = selectedDate === today
    const selectedDateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        .format(new Date(`${selectedDate}T12:00:00`))

    return (
        <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        {t("sidebar.prospecting")}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Ta prospection</h1>
                    <p className="mt-1 text-muted-foreground">Les leads les plus pertinents à contacter en priorité.</p>
                </div>
                <div className="flex items-center gap-2 self-start rounded-lg border bg-background p-1">
                    <Button variant="ghost" size="icon-sm" aria-label="Jour précédent" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="w-[145px] border-0 shadow-none" />
                    <Button variant="ghost" size="icon-sm" aria-label="Jour suivant" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardContent className="p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Objectif du jour</p>
                                <p className="mt-1 text-2xl font-bold">{contactedCount} <span className="text-base font-normal text-muted-foreground">/ {goal} personnes contactées</span></p>
                            </div>
                            <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", contactedCount >= goal ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>
                                {contactedCount >= goal ? <Check className="h-6 w-6" /> : <Flame className="h-6 w-6" />}
                            </div>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full rounded-full transition-all", contactedCount >= goal ? "bg-emerald-500" : "bg-orange-500")} style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {contactedCount >= goal ? "Objectif atteint — bravo." : `${goal - contactedCount} personne${goal - contactedCount > 1 ? "s" : ""} restante${goal - contactedCount > 1 ? "s" : ""} pour atteindre ton objectif.`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex h-full items-center gap-3 p-5">
                        <div className="rounded-lg bg-orange-100 p-2.5 text-orange-700"><Flame className="h-5 w-5" /></div>
                        <div><p className="text-2xl font-bold">{contacts.filter((contact) => PRIORITY_STATUSES.includes(contact.status || "")).length}</p><p className="text-sm text-muted-foreground">Leads tièdes à chauds</p></div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">À contacter maintenant</h2>
                    <p className="text-sm text-muted-foreground">{selectedDateLabel}{isToday ? " · aujourd’hui" : ""}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Rechercher un lead..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9 sm:w-64" /></div>
                    <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
                        <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les leads</SelectItem>
                            <SelectItem value="priority">Tièdes à chauds</SelectItem>
                            <SelectItem value="follow-up">Relances dues</SelectItem>
                            <SelectItem value="never">Jamais contactés</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">Impossible de charger la prospection : {error}. Vérifie que la migration des activités a été exécutée.</div>}
            {loading ? <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : queue.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center gap-2 p-12 text-center"><Check className="h-10 w-10 rounded-full bg-emerald-100 p-2 text-emerald-700" /><p className="font-medium">Aucun lead dans cette file</p><p className="text-sm text-muted-foreground">Tous les leads pertinents ont peut-être déjà été contactés pour cette journée.</p></CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {queue.map((contact) => {
                        const lastActivity = lastActivityByContact.get(contact.id)
                        const isFollowUp = followUpIds.has(contact.id)
                        return <Card key={contact.id} className="transition-shadow hover:shadow-md">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <Avatar className="mt-0.5 h-10 w-10"><AvatarImage src={contact.avatar_url || undefined} /><AvatarFallback>{(contact.first_name?.[0] || "?")}{contact.last_name?.[0] || ""}</AvatarFallback></Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2"><Link href={`/contacts/${contact.id}`} className="font-semibold hover:underline">{displayName(contact)}</Link><Badge variant="outline" className={statusClass(contact.status)}>{contact.status || "N/A"}</Badge>{isFollowUp && <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700"><Clock3 className="h-3 w-3" /> Relance due</Badge>}</div>
                                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{contact.company || "Entreprise inconnue"}{contact.company_role ? ` · ${contact.company_role}` : ""}</p>
                                            <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{htmlToText(lastActivity?.note || contact.notes) || "Aucune note disponible pour ce lead."}</p>
                                            <p className="mt-2 text-xs text-muted-foreground">{lastActivity ? `Dernière action : ${formatActivityDate(lastActivity.created_at)}` : "Jamais contacté dans l’historique"}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 lg:min-w-[360px] lg:items-end">
                                        <div className="w-full space-y-1.5">
                                            <p className="text-sm font-medium">Étape 1 — Contacter la personne</p>
                                            <p className="text-xs text-muted-foreground">Ouvre le canal de ton choix et contacte cette personne.</p>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {contact.linkedin_url && <Button variant="outline" size="sm" asChild><a href={contact.linkedin_url.startsWith("http") ? contact.linkedin_url : `https://www.linkedin.com/in/${contact.linkedin_url}`} target="_blank" rel="noreferrer"><Globe className="h-3.5 w-3.5" /> Ouvrir LinkedIn</a></Button>}
                                                {contact.email && <Button variant="outline" size="sm" asChild><a href={`mailto:${contact.email}`}><Mail className="h-3.5 w-3.5" /> Écrire un e-mail</a></Button>}
                                                {contact.phone && <Button variant="outline" size="sm" asChild><a href={`tel:${contact.phone}`}><Phone className="h-3.5 w-3.5" /> Appeler</a></Button>}
                                                {contact.phone && <Button variant="outline" size="sm" asChild><a href={`https://wa.me/${contact.phone.replace(/[^\d+]/g, "").replace(/^\+/, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a></Button>}
                                                {contact.phone && <Button variant="outline" size="sm" asChild><a href={`sms:${contact.phone}`}><Smartphone className="h-3.5 w-3.5" /> SMS</a></Button>}
                                            </div>
                                        </div>
                                        <div className="w-full border-t pt-3">
                                            <p className="mb-2 text-xs text-muted-foreground">Étape 2 — Après le contact, enregistre ton action.</p>
                                            <Button className="w-full sm:w-auto" size="sm" onClick={() => openLogSheet(contact)}><Check className="h-3.5 w-3.5" /> J’ai contacté cette personne</Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    })}
                </div>
            )}

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Activité enregistrée {isToday ? "aujourd’hui" : `le ${selectedDateLabel}`}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {activitiesForDate.length === 0 ? <p className="text-sm text-muted-foreground">Aucune action enregistrée pour cette journée.</p> : activitiesForDate.slice(0, 8).map((activity) => {
                        const contact = contacts.find((item) => item.id === activity.contact_id)
                        return <div key={activity.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"><div className="rounded-full bg-muted p-2">{channelIcon(activity.channel)}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{contact ? displayName(contact) : "Lead supprimé"}<span className="ml-2 font-normal text-muted-foreground">· {CHANNELS.find((item) => item.value === activity.channel)?.label || activity.channel}</span></p><p className="text-sm text-muted-foreground">{activity.note || OUTCOMES.find((item) => item.value === activity.outcome)?.label || activity.outcome}</p></div><span className="whitespace-nowrap text-xs text-muted-foreground">{formatActivityDate(activity.created_at)}</span></div>
                    })}
                </CardContent>
            </Card>

            <Sheet open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>J’ai contacté cette personne</SheetTitle>
                        <SheetDescription>{selectedContact && `${displayName(selectedContact)}${selectedContact.company ? ` · ${selectedContact.company}` : ""}`}</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-5 px-4">
                        <div className="rounded-lg bg-muted/50 p-3 text-sm"><div className="flex items-center gap-2 font-medium"><UserRound className="h-4 w-4" /> Étape 2 — confirmer le contact</div><p className="mt-1 text-xs text-muted-foreground">Choisis le moyen réellement utilisé. Cette personne sera comptée dans ton objectif du jour.</p></div>
                        <div className="space-y-2"><Label>Moyen réellement utilisé</Label><Select value={channel} onValueChange={(value) => setChannel(value as Channel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHANNELS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label>Résultat</Label><Select value={outcome} onValueChange={(value) => setOutcome(value as Outcome)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OUTCOMES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="activity-note">Petite note <span className="font-normal text-muted-foreground">({t('contacts.detail.optional')})</span></Label><Textarea id="activity-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex. Message envoyé avec deux exemples de missions..." className="min-h-28" /></div>
                        <div className="space-y-2">
                            <Label htmlFor="follow-up-date">Prochaine relance <span className="font-normal text-muted-foreground">({t('contacts.detail.optional')})</span></Label>
                            <div className="flex gap-2">
                                <DateInput
                                    id="follow-up-date"
                                    min={today}
                                    value={followUpDate}
                                    onChange={(event) => setFollowUpDate(event.target.value)}
                                    containerClassName="min-w-0 flex-1"
                                    emptyLabel="Aucune date"
                                    aria-describedby="follow-up-date-help"
                                />
                                {followUpDate && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => setFollowUpDate("")}
                                        aria-label="Effacer la date de prochaine relance"
                                        title="Effacer la date"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <p id="follow-up-date-help" className="text-xs text-muted-foreground">
                                {followUpDate
                                    ? "Une tâche de relance sera créée automatiquement."
                                    : "Aucune date sélectionnée — aucune tâche ne sera créée."}
                            </p>
                        </div>
                    </div>
                    <SheetFooter><Button variant="outline" onClick={() => setSelectedContact(null)}>Annuler</Button><Button onClick={() => void saveActivity()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer et compter</Button></SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
