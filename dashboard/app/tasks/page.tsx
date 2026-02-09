
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Task, Contact } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Calendar, User, Tag, AlertCircle } from "lucide-react"
import Link from "next/link"

const PRIORITY_COLORS = {
    High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
    Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
    Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200"
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<(Task & { contact: Contact })[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchTasks() {
            const { data, error } = await supabase
                .from('tasks')
                .select('*, contact:contacts(*)')
                .order('completed', { ascending: true })
                .order('priority', { ascending: false }) // Note: Simple alphabetical won't work perfectly for High/Medium/Low, but it's a start

            if (error) {
                console.error('Error fetching tasks:', error)
            } else {
                // Multi-level sort: Priority -> Due Date
                const sorted = (data || []).sort((a, b) => {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1

                    const weights: Record<string, number> = { High: 3, Medium: 2, Low: 1 }
                    const priorityDiff = (weights[b.priority] || 0) - (weights[a.priority] || 0)
                    if (priorityDiff !== 0) return priorityDiff

                    if (!a.due_date && b.due_date) return 1
                    if (a.due_date && !b.due_date) return -1
                    if (!a.due_date && !b.due_date) return 0
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                })
                setTasks(sorted)
            }
            setLoading(false)
        }

        fetchTasks()
    }, [supabase])

    const toggleTask = async (taskId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('tasks')
            .update({ completed: !currentStatus })
            .eq('id', taskId)

        if (!error) {
            setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t))
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Tasks Dashboard</h1>
                <Badge variant="outline">{tasks.filter(t => !t.completed).length} Pending</Badge>
            </div>

            <div className="grid gap-4">
                {tasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No tasks found. Create one from a lead's page!</p>
                ) : (
                    tasks.map(task => (
                        <Card key={task.id} className={task.completed ? "opacity-60 bg-muted/30" : ""}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <Checkbox
                                    checked={task.completed}
                                    onCheckedChange={() => toggleTask(task.id, task.completed)}
                                />

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={task.completed ? "line-through text-muted-foreground" : "font-medium"}>
                                            {task.description}
                                        </span>
                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority] || ""}`}>
                                            {task.priority}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {task.category}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <Link href={`/contacts/${task.contact_id}`} className="hover:underline">
                                                {task.contact?.first_name} {task.contact?.last_name}
                                            </Link>
                                        </div>
                                        {task.due_date && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {task.priority === 'High' && !task.completed && <AlertCircle className="h-4 w-4 text-red-500" />}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
