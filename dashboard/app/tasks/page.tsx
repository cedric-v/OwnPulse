
"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Task, Contact } from "@/types"
import { useLanguage } from "@/components/i18n/language-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Calendar, User, AlertCircle, Pencil } from "lucide-react"
import Link from "next/link"
import { cn, normalizeSearchText } from "@/lib/utils"

const PRIORITY_COLORS = {
    High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
    Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
    Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200"
}

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

type TaskWithContact = Task & { contact: Contact }

function TaskList({
    items,
    onToggleTask,
    onEdit,
}: {
    items: TaskWithContact[]
    onToggleTask: (taskId: string, currentStatus: boolean) => void
    onEdit: (task: TaskWithContact) => void
}) {
    return (
        <div className="grid gap-4">
            {items.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">Aucune tâche trouvée.</p>
            ) : (
                items.map(task => (
                    <Card key={task.id} className={cn(
                        "transition-all",
                        task.completed ? "opacity-60 bg-muted/30" : "hover:shadow-md"
                    )}>
                        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                            <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => onToggleTask(task.id, task.completed)}
                            />

                            <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
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

                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        <Link href={`/contacts/${task.contact_id}`} className="hover:underline">
                                            {task.contact?.first_name} {task.contact?.last_name}
                                        </Link>
                                    </div>
                                    {task.due_date ? (
                                        <button
                                            onClick={() => onEdit(task)}
                                            className="flex items-center gap-1 hover:bg-muted px-1.5 py-0.5 rounded transition-colors group"
                                        >
                                            <Calendar className="h-3 w-3 group-hover:text-blue-500" />
                                            <span className="group-hover:text-blue-600 group-hover:underline">
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onEdit(task)}
                                            className="flex items-center gap-1 text-gray-400 hover:bg-muted px-1.5 py-0.5 rounded transition-colors group"
                                        >
                                            <Calendar className="h-3 w-3 group-hover:text-amber-500" />
                                            <span className="group-hover:text-amber-600 group-hover:underline">
                                                Sans date
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 self-end sm:self-auto">
                                {task.priority === 'High' && !task.completed && <AlertCircle className="h-4 w-4 text-red-500" />}
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(task)}>
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    )
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<TaskWithContact[]>([])
    const [loading, setLoading] = useState(true)
    const [editingTask, setEditingTask] = useState<TaskWithContact | null>(null)
    const [editForm, setEditForm] = useState({ description: "", priority: "", category: "", due_date: "" })
    const [searchQuery, setSearchQuery] = useState("")
    const supabase = createClient()
    const { t } = useLanguage()

    const fetchTasks = useCallback(async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, contact:contacts(*)')
            // We'll sort everything here but display them filtered
            .order('completed', { ascending: true })

        if (error) {
            console.error('Error fetching tasks:', error)
        } else {
            // Multi-level sort: Priority -> Due Date
            const sorted = (data || []).sort((a, b) => {
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
    }, [supabase])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchTasks()
    }, [fetchTasks])

    const handleEdit = (task: TaskWithContact) => {
        setEditingTask(task)
        setEditForm({
            description: task.description || "",
            priority: task.priority || "Medium",
            category: task.category || "Follow-up",
            due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ""
        })
    }

    const handleUpdate = async () => {
        if (!editingTask) return

        const { error } = await supabase
            .from('tasks')
            .update({
                description: editForm.description,
                priority: editForm.priority,
                category: editForm.category,
                due_date: editForm.due_date || null
            })
            .eq('id', editingTask.id)

        if (error) {
            alert("Error updating task: " + error.message)
        } else {
            setEditingTask(null)
            void fetchTasks()
        }
    }

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

    const filteredTasks = tasks.filter(task => {
        const query = normalizeSearchText(searchQuery)
        const descriptionMatch = normalizeSearchText(task.description).includes(query)
        const firstNameMatch = normalizeSearchText(task.contact?.first_name).includes(query)
        const lastNameMatch = normalizeSearchText(task.contact?.last_name).includes(query)
        return descriptionMatch || firstNameMatch || lastNameMatch
    })

    const activeTasks = filteredTasks.filter(t => !t.completed)
    const archivedTasks = filteredTasks.filter(t => t.completed)

    return (
        <div className="container mx-auto space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("sidebar.tasks")}</h1>
                <div className="sticky top-16 z-20 -mx-4 border-y bg-slate-50/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <Input
                            placeholder="Rechercher une tâche ou un contact..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-80"
                        />
                        <Badge variant="outline">{activeTasks.length} en cours</Badge>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="sticky top-[8.5rem] z-10 mb-4 grid w-full grid-cols-2 sm:static sm:inline-flex sm:w-fit">
                    <TabsTrigger value="active">Actives ({activeTasks.length})</TabsTrigger>
                    <TabsTrigger value="archive">Archive ({archivedTasks.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <TaskList items={activeTasks} onToggleTask={toggleTask} onEdit={handleEdit} />
                </TabsContent>
                <TabsContent value="archive">
                    <TaskList items={archivedTasks} onToggleTask={toggleTask} onEdit={handleEdit} />
                </TabsContent>
            </Tabs>

            {/* Edit Dialog */}
            <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier la tâche</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="desc">Description</Label>
                            <Input
                                id="desc"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Priorité</Label>
                                <Select
                                    value={editForm.priority}
                                    onValueChange={v => setEditForm({ ...editForm, priority: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Faible</SelectItem>
                                        <SelectItem value="Medium">Moyenne</SelectItem>
                                        <SelectItem value="High">Haute</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Date d&apos;échéance</Label>
                                <Input
                                    type="date"
                                    value={editForm.due_date}
                                    onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat">Catégorie</Label>
                            <Input
                                id="cat"
                                value={editForm.category}
                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTask(null)}>Annuler</Button>
                        <Button onClick={handleUpdate}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
