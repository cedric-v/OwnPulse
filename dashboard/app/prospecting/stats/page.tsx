"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ContactActivity } from "@/types"
import { useLanguage } from "@/components/i18n/language-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    ArrowLeft,
    CalendarCheck,
    Check,
    Flame,
    Loader2,
    MessagesSquare,
    Send,
    TrendingDown,
    TrendingUp,
    Trophy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { countWorkDays, isWorkDay, parseWorkDays, DEFAULT_WORK_DAYS } from "@/lib/prospecting"
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts"

type RangeKey = "7d" | "30d" | "90d" | "12m"
type ActivityRow = Pick<ContactActivity, "contact_id" | "outcome" | "created_at">

type Bucket = {
    start: Date // inclus, 00:00 locale
    end: Date // exclusif
    label: string
    tooltip: string
    contacted: number
    goal: number
}

const RANGES: { value: RangeKey; label: string; days: number }[] = [
    { value: "7d", label: "7 jours", days: 7 },
    { value: "30d", label: "30 jours", days: 30 },
    { value: "90d", label: "90 jours", days: 90 },
    { value: "12m", label: "12 mois", days: 365 },
]

// Étiquettes des jours ISO (1 = lundi … 7 = dimanche) pour la note de bas de page.
const ISO_DAY_LABELS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, amount: number) {
    const result = startOfDay(date)
    result.setDate(result.getDate() + amount)
    return result
}

// Lundi de la semaine contenant la date donnée.
function startOfWeek(date: Date) {
    const result = startOfDay(date)
    const shift = (result.getDay() === 0 ? 7 : result.getDay()) - 1
    result.setDate(result.getDate() - shift)
    return result
}

// Les buckets sont contigus du début de période à aujourd'hui :
//  - <= 31 jours : un bucket par jour (lisibilité de l'objectif quotidien) ;
//  - <= 120 jours : un bucket par semaine ;
//  - au-delà : un bucket par mois.
// Le dernier bucket est tronqué à aujourd'hui pour que l'objectif reste
// proportionnel au temps réellement écoulé.
function buildBuckets(
    rangeDays: number,
    periodStart: Date,
    today: Date,
    workDays: number[],
    dailyGoal: number,
    locale: string
): Bucket[] {
    const buckets: Bucket[] = []
    const fmtDay = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" })
    const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" })

    if (rangeDays <= 31) {
        for (let date = periodStart; date <= today; date = addDays(date, 1)) {
            buckets.push({
                start: startOfDay(date),
                end: addDays(date, 1),
                label: fmtDay.format(date),
                tooltip: fmtDay.format(date),
                contacted: 0,
                goal: isWorkDay(date, workDays) ? dailyGoal : 0,
            })
        }
        return buckets
    }

    if (rangeDays <= 120) {
        let start = startOfWeek(periodStart)
        while (start <= today) {
            const end = addDays(start, 7)
            const clippedEnd = end > addDays(today, 1) ? addDays(today, 1) : end
            buckets.push({
                start,
                end: clippedEnd,
                label: fmtDay.format(start),
                tooltip: `Semaine du ${fmtDay.format(start)}`,
                contacted: 0,
                goal: countWorkDays(start, addDays(clippedEnd, -1), workDays) * dailyGoal,
            })
            start = end
        }
        return buckets
    }

    let start = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1)
    while (start <= today) {
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
        const clippedEnd = end > addDays(today, 1) ? addDays(today, 1) : end
        buckets.push({
            start,
            end: clippedEnd,
            label: fmtMonth.format(start),
            tooltip: fmtMonth.format(start),
            contacted: 0,
            goal: countWorkDays(start, addDays(clippedEnd, -1), workDays) * dailyGoal,
        })
        start = end
    }
    return buckets
}

function StatsTooltip({
    active,
    payload,
}: {
    active?: boolean
    payload?: Array<{ payload: { tooltip: string; contacted: number; goal: number } }>
}) {
    if (!active || !payload || payload.length === 0) return null
    const data = payload[0].payload
    return (
        <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
            <div className="font-medium">{data.tooltip}</div>
            <div>
                {data.contacted} personne{data.contacted > 1 ? "s" : ""} contactée
                {data.contacted > 1 ? "s" : ""}
            </div>
            <div className="text-xs text-muted-foreground">Objectif : {data.goal}</div>
        </div>
    )
}

function ProspectingStatsPage() {
    const { language } = useLanguage()
    const locale = language === "en" ? "en-GB" : "fr-CH"
    const supabase = useMemo(() => createClient(), [])
    const [range, setRange] = useState<RangeKey>("30d")
    const [activities, setActivities] = useState<ActivityRow[]>([])
    const [dailyGoal, setDailyGoal] = useState(10)
    const [workDays, setWorkDays] = useState<number[]>(DEFAULT_WORK_DAYS)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        // Colonnes minimales seulement : la vue agrège, elle n'affiche pas le
        // détail des activités (pas de notes ni de canal ici).
        const [activitiesRes, goalRes, workDaysRes] = await Promise.all([
            supabase.from("contact_activities").select("contact_id, outcome, created_at"),
            supabase.from("settings").select("value").eq("key", "prospecting_daily_goal").maybeSingle(),
            supabase.from("settings").select("value").eq("key", "prospecting_work_days").maybeSingle(),
        ])

        if (activitiesRes.error) setError(activitiesRes.error.message)
        else setActivities((activitiesRes.data || []) as ActivityRow[])
        if (!goalRes.error && goalRes.data) {
            const configuredGoal = Number.parseInt(goalRes.data.value, 10)
            if (Number.isInteger(configuredGoal) && configuredGoal > 0) setDailyGoal(configuredGoal)
        }
        if (!workDaysRes.error && workDaysRes.data) setWorkDays(parseWorkDays(workDaysRes.data.value))
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchData()
    }, [fetchData])

    const rangeDays = RANGES.find((item) => item.value === range)?.days ?? 30
    const rangeLabel = RANGES.find((item) => item.value === range)?.label ?? ""

    const today = useMemo(() => startOfDay(new Date()), [])
    const periodStart = useMemo(() => addDays(today, -(rangeDays - 1)), [today, rangeDays])
    const periodEnd = useMemo(() => addDays(today, 1), [today]) // exclusif
    const prevStart = useMemo(() => addDays(periodStart, -rangeDays), [periodStart, rangeDays])

    // Une personne contactée plusieurs fois sur la période ne compte qu'une fois :
    // l'indicateur suivi est « personnes » et non « actions envoyées ».
    const uniqueContactsBetween = useCallback(
        (start: Date, end: Date) => {
            const startTime = start.getTime()
            const endTime = end.getTime()
            return new Set(
                activities
                    .filter((activity) => {
                        const timestamp = new Date(activity.created_at).getTime()
                        return timestamp >= startTime && timestamp < endTime
                    })
                    .map((activity) => activity.contact_id)
            )
        },
        [activities]
    )

    const periodUnique = useMemo(() => uniqueContactsBetween(periodStart, periodEnd), [uniqueContactsBetween, periodStart, periodEnd])
    const prevUnique = useMemo(() => uniqueContactsBetween(prevStart, periodStart), [uniqueContactsBetween, prevStart, periodStart])

    const periodActivities = useMemo(() => {
        const startTime = periodStart.getTime()
        const endTime = periodEnd.getTime()
        return activities.filter((activity) => {
            const timestamp = new Date(activity.created_at).getTime()
            return timestamp >= startTime && timestamp < endTime
        })
    }, [activities, periodStart, periodEnd])

    const conversations = periodActivities.filter((activity) => activity.outcome === "Conversation started").length
    const meetings = periodActivities.filter((activity) => activity.outcome === "Meeting booked").length

    const workDaysInPeriod = countWorkDays(periodStart, today, workDays)
    const periodGoal = workDaysInPeriod * dailyGoal
    const averagePerWorkDay = workDaysInPeriod > 0 ? periodUnique.size / workDaysInPeriod : 0
    const progress = periodGoal > 0 ? Math.min(100, Math.round((periodUnique.size / periodGoal) * 100)) : 0
    const isGoalExceeded = periodGoal > 0 && periodUnique.size > periodGoal
    const isGoalReached = periodGoal > 0 && periodUnique.size >= periodGoal
    const deltaPct = prevUnique.size > 0
        ? Math.round(((periodUnique.size - prevUnique.size) / prevUnique.size) * 100)
        : null

    const bucketStats = useMemo(() => {
        const buckets = buildBuckets(rangeDays, periodStart, today, workDays, dailyGoal, locale)
        const sets = buckets.map(() => new Set<string>())
        activities.forEach((activity) => {
            const timestamp = new Date(activity.created_at).getTime()
            const index = buckets.findIndex((bucket) => timestamp >= bucket.start.getTime() && timestamp < bucket.end.getTime())
            if (index >= 0) sets[index].add(activity.contact_id)
        })
        return buckets.map((bucket, index) => ({ ...bucket, contacted: sets[index].size }))
    }, [activities, dailyGoal, locale, periodStart, rangeDays, today, workDays])

    const chartData = useMemo(
        () => bucketStats.map(({ label, tooltip, contacted, goal }) => ({ label, tooltip, contacted, goal })),
        [bucketStats]
    )
    const bucketUnit = rangeDays <= 31 ? "jour" : rangeDays <= 120 ? "semaine" : "mois"

    const sameYear = periodStart.getFullYear() === today.getFullYear()
    const fmtSpanStart = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
    const fmtSpanEnd = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" })
    const periodSpan = `du ${fmtSpanStart.format(periodStart)} au ${fmtSpanEnd.format(today)}`
    const workDaysLabel = workDays.map((day) => ISO_DAY_LABELS[day - 1]).join(", ")

    return (
        <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                        <Link href="/prospecting" className="flex items-center gap-1 rounded hover:text-foreground">
                            <ArrowLeft className="h-3.5 w-3.5" /> Prospection
                        </Link>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Statistiques de prospection</h1>
                    <p className="mt-1 text-muted-foreground">Combien de personnes tu as contactées, et où tu en es par rapport à ton objectif.</p>
                </div>
                <div className="flex items-center gap-1 self-start rounded-lg border bg-background p-1" role="group" aria-label="Période">
                    {RANGES.map((item) => (
                        <Button
                            key={item.value}
                            variant={range === item.value ? "secondary" : "ghost"}
                            size="sm"
                            aria-pressed={range === item.value}
                            onClick={() => setRange(item.value)}
                        >
                            {item.label}
                        </Button>
                    ))}
                </div>
            </div>

            {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">Impossible de charger les statistiques : {error}.</div>}

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="md:col-span-2">
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-muted-foreground">{rangeLabel} · {periodSpan}</p>
                                        <p className="mt-1 text-3xl font-bold">
                                            {periodUnique.size}{" "}
                                            <span className="text-base font-normal text-muted-foreground">
                                                personne{periodUnique.size > 1 ? "s" : ""} contactée{periodUnique.size > 1 ? "s" : ""}
                                            </span>
                                        </p>
                                        <p className="mt-0.5 text-sm text-muted-foreground">
                                            vs objectif de {periodGoal} ({dailyGoal}/jour × {workDaysInPeriod} jour{workDaysInPeriod > 1 ? "s" : ""} de prospection)
                                        </p>
                                    </div>
                                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", isGoalExceeded ? "bg-violet-100 text-violet-700" : isGoalReached ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700")}>
                                        {isGoalExceeded ? <Trophy className="h-6 w-6" /> : isGoalReached ? <Check className="h-6 w-6" /> : <Flame className="h-6 w-6" />}
                                    </div>
                                </div>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                                    <div className={cn("h-full rounded-full transition-all", isGoalExceeded ? "bg-violet-500" : isGoalReached ? "bg-emerald-500" : "bg-orange-500")} style={{ width: `${progress}%` }} />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-muted-foreground">
                                        {isGoalExceeded
                                            ? "Objectif dépassé — bravo !"
                                            : isGoalReached
                                                ? "Objectif atteint — bravo."
                                                : periodGoal > periodUnique.size
                                                    ? `${periodGoal - periodUnique.size} personne${periodGoal - periodUnique.size > 1 ? "s" : ""} restante${periodGoal - periodUnique.size > 1 ? "s" : ""} pour atteindre l'objectif.`
                                                    : "Définis un objectif journalier dans Réglages pour suivre ta progression."}
                                    </p>
                                    {deltaPct !== null ? (
                                        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", deltaPct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                                            {deltaPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {deltaPct >= 0 ? "+" : ""}{deltaPct}% vs période précédente
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Période précédente : {prevUnique.size}</span>
                                    )}
                                </div>
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Une personne contactée plusieurs fois n’est comptée qu’une seule fois. Objectif de période = objectif journalier × jours de prospection ({workDaysLabel}), modifiable dans Réglages.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="flex h-full flex-col justify-center gap-4 p-5">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Rythme moyen</p>
                                    <p className="mt-1 text-2xl font-bold">
                                        {averagePerWorkDay.toLocaleString(locale, { maximumFractionDigits: 1 })}{" "}
                                        <span className="text-sm font-normal text-muted-foreground">personne{averagePerWorkDay >= 2 ? "s" : ""} / jour de prospection</span>
                                    </p>
                                </div>
                                <div className="border-t pt-3 text-xs text-muted-foreground">
                                    <p>Objectif journalier : {dailyGoal} personnes.</p>
                                    <p className="mt-1">Jours de prospection : {workDaysLabel}.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                            <CardContent className="flex items-center gap-3 p-5">
                                <div className="rounded-lg bg-indigo-100 p-2.5 text-indigo-700"><Send className="h-5 w-5" /></div>
                                <div><p className="text-2xl font-bold">{periodActivities.length}</p><p className="text-sm text-muted-foreground">Actions enregistrées</p></div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-5">
                                <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700"><MessagesSquare className="h-5 w-5" /></div>
                                <div><p className="text-2xl font-bold">{conversations}</p><p className="text-sm text-muted-foreground">Échanges obtenus</p></div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-3 p-5">
                                <div className="rounded-lg bg-violet-100 p-2.5 text-violet-700"><CalendarCheck className="h-5 w-5" /></div>
                                <div><p className="text-2xl font-bold">{meetings}</p><p className="text-sm text-muted-foreground">Rendez-vous obtenus</p></div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardContent className="p-5">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">Personnes contactées par {bucketUnit}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Personnes contactées</span>
                                    <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-orange-500" /> Objectif</span>
                                </div>
                            </div>
                            {periodActivities.length === 0 ? (
                                <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
                                    <Send className="h-8 w-8 rounded-full bg-muted p-2 text-muted-foreground" />
                                    <p className="font-medium">Aucune prospection enregistrée sur cette période</p>
                                    <p className="text-sm text-muted-foreground">Enregistre tes contacts depuis la page Prospection pour voir les statistiques apparaître.</p>
                                </div>
                            ) : (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} tickLine={false} axisLine={false} />
                                            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <RechartsTooltip content={<StatsTooltip />} />
                                            <Bar dataKey="contacted" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                            <Line type="monotone" dataKey="goal" stroke="#f97316" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            <p className="mt-3 text-xs text-muted-foreground">
                                {rangeDays <= 31
                                    ? "Chaque barre compte les personnes distinctes contactées ce jour. Les jours sans prospection prévue (hors jours de prospection) n’ont pas d’objectif."
                                    : "Chaque barre compte les personnes distinctes contactées sur la période. Les semaines ou mois entamés sont tronqués à aujourd'hui pour rester comparables à leur objectif."}
                            </p>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

export default function ProspectingStatsPageRoute() {
    return <ProspectingStatsPage />
}
