
"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    Users,
    Kanban,
    CheckSquare,
    Briefcase,
    Mic,
    Globe,
    Handshake,
    Settings,
    LogOut,
    Building,
    BarChart3,
    Wallet
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/components/i18n/language-context"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

import { Suspense } from "react"

function SidebarContent({ className }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentList = searchParams.get('list')
    const supabase = createClient()
    const { t } = useLanguage()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const navigateToList = (list: string) => {
        router.push(`/?list=${list}`)
    }

    return (
        <div className={cn("pb-12 w-64 border-r min-h-screen bg-gray-50/40 dark:bg-zinc-900/10", className)}>
            <div className="space-y-4 py-4">
                <div className="px-4 py-2">
                    <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                        OwnPulse
                    </h2>
                    <div className="space-y-1">
                        <Button variant={pathname === "/" && !currentList ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                            <Link href="/">
                                <Users className="mr-2 h-4 w-4" />
                                {t('sidebar.allLeads')}
                            </Link>
                        </Button>
                        <Button variant={pathname === "/tasks" ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                            <Link href="/tasks">
                                <CheckSquare className="mr-2 h-4 w-4" />
                                {t('sidebar.tasks')}
                            </Link>
                        </Button>
                        <Button variant={pathname === "/pipeline" ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                            <Link href="/pipeline">
                                <Kanban className="mr-2 h-4 w-4" />
                                {t('sidebar.pipeline')}
                            </Link>
                        </Button>
                        <Button variant={pathname === "/companies" ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                            <Link href="/companies">
                                <Building className="mr-2 h-4 w-4" />
                                {t('sidebar.companies')}
                            </Link>
                        </Button>
                    </div>
                </div>
                <Separator className="mx-4" />
                <div className="px-4 py-2">
                    <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                        {t('sidebar.lists')}
                    </h2>
                    <div className="space-y-1">
                        <Button
                            variant={currentList === "Customers" ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => navigateToList("Customers")}
                        >
                            <Handshake className="mr-2 h-4 w-4" />
                            {t('sidebar.customers')}
                        </Button>
                        <Button
                            variant={currentList === "Prospects" ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => navigateToList("Prospects")}
                        >
                            <Briefcase className="mr-2 h-4 w-4" />
                            {t('sidebar.prospects')}
                        </Button>
                        <Button
                            variant={currentList === "Partnerships" ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => navigateToList("Partnerships")}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            {t('sidebar.partnerships')}
                        </Button>
                        <Button
                            variant={currentList === "Network/Peers" ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => navigateToList("Network/Peers")}
                        >
                            <Globe className="mr-2 h-4 w-4" />
                            {t('sidebar.network')}
                        </Button>
                        <Button
                            variant={currentList === "Podcast" ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => navigateToList("Podcast")}
                        >
                            <Mic className="mr-2 h-4 w-4" />
                            {t('sidebar.podcast')}
                        </Button>
                    </div>
                </div>
                <Separator className="mx-4" />
                <div className="px-4 py-2">
                    <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                        {t('sidebar.dashboards')}
                    </h2>
                    <div className="space-y-1">
                        <Button variant={pathname === "/marketing" ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                            <Link href="/marketing">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                {t('sidebar.marketing')}
                            </Link>
                        </Button>
                        <Button variant={pathname === "/cfo" ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                            <Link href="/cfo">
                                <Wallet className="mr-2 h-4 w-4" />
                                {t('sidebar.cfo')}
                            </Link>
                        </Button>
                        <Button variant={pathname === "/offers" ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                            <Link href="/offers">
                                <Users className="mr-2 h-4 w-4" />
                                {t('sidebar.offers')}
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="mt-auto p-4 space-y-2">
                    <Button variant={pathname === "/settings" ? "secondary" : "ghost"} className="w-full justify-start" asChild>
                        <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            {t('sidebar.settings')}
                        </Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('common.logout')}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function Sidebar(props: SidebarProps) {
    return (
        <Suspense fallback={<div className="w-64 border-r min-h-screen bg-gray-50/40" />}>
            <SidebarContent {...props} />
        </Suspense>
    )
}
