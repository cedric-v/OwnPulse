
"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Contact, Task } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, Phone, Mail, MapPin, Globe, Linkedin, Check, Building } from "lucide-react"
import Link from "next/link"
import { StatusCell } from "@/components/contacts/status-cell"
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

import { Checkbox } from "@/components/ui/checkbox"
import { Calendar as CalendarIcon, Plus, Tag, AlertCircle } from "lucide-react"

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [contact, setContact] = useState<Contact | null>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
    const [error, setError] = useState<string | null>(null)

    // Task form state
    const [newTaskDesc, setNewTaskDesc] = useState("")
    const [newTaskPriority, setNewTaskPriority] = useState<"Low" | "Medium" | "High">("Medium")
    const [newTaskCategory, setNewTaskCategory] = useState("Follow-up")
    const [newTaskDueDate, setNewTaskDueDate] = useState("")

    // Task edit state
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [editForm, setEditForm] = useState({ description: "", priority: "", category: "", due_date: "" })

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            const [contactRes, tasksRes] = await Promise.all([
                supabase.from('contacts').select('*').eq('id', id).single(),
                supabase.from('tasks').select('*').eq('contact_id', id)
            ])

            if (contactRes.error) {
                setError(contactRes.error.message)
            } else {
                setContact(contactRes.data)

                // Client side sort for multi-level logic
                const sorted = (tasksRes.data || []).sort((a, b) => {
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

        fetchData()
    }, [id, supabase])

    // Debounced Auto-Save
    useEffect(() => {
        if (!contact || loading) return

        const timer = setTimeout(async () => {
            setSaveStatus("saving")
            const { error } = await supabase
                .from('contacts')
                .update({
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    email: contact.email,
                    phone: contact.phone,
                    location: contact.location,
                    website: contact.website,
                    company: contact.company,
                    company_role: contact.company_role,
                    notes: contact.notes,
                    list: contact.list,
                    value: contact.value,
                    linkedin_url: contact.linkedin_url,
                })
                .eq('id', id)

            if (error) {
                setSaveStatus("error")
                console.error("Auto-save error:", error)
            } else {
                setSaveStatus("saved")
                setTimeout(() => setSaveStatus("idle"), 2000)
            }
        }, 1000) // 1 second debounce

        return () => clearTimeout(timer)
    }, [contact, id, supabase, loading])

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTaskDesc.trim()) return

        const { data, error } = await supabase
            .from('tasks')
            .insert({
                contact_id: id,
                description: newTaskDesc,
                priority: newTaskPriority,
                category: newTaskCategory,
                due_date: newTaskDueDate || null,
                completed: false
            })
            .select()
            .single()

        if (error) {
            alert(error.message)
        } else {
            // Re-sort locally or just refresh
            window.location.reload()
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

    const handleEditTask = (task: Task) => {
        setEditingTask(task)
        setEditForm({
            description: task.description || "",
            priority: task.priority || "Medium",
            category: task.category || "Follow-up",
            due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ""
        })
    }

    const handleUpdateTask = async () => {
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
            // Local update or refresh
            setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...editForm, due_date: editForm.due_date || null } as Task : t))
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>
    if (error || !contact) return <div className="p-12 text-red-500 text-center">Contact not found: {error}</div>

    const PRIORITY_COLORS = {
        High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200",
        Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
        Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200"
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {contact.first_name} {contact.last_name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="uppercase text-[10px] h-4">
                            {contact.list || 'Prospects'}
                        </Badge>
                        <div className="text-[10px] font-medium text-muted-foreground flex items-center">
                            {saveStatus === "saving" && (
                                <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Saving...
                                </span>
                            )}
                            {saveStatus === "saved" && (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <Check className="h-3 w-3" />
                                    Saved
                                </span>
                            )}
                            {saveStatus === "error" && (
                                <span className="flex items-center gap-1 text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    Error saving
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Essential Info */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={contact.first_name || ""}
                                        onChange={e => setContact({ ...contact, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={contact.last_name || ""}
                                        onChange={e => setContact({ ...contact, last_name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-3 w-3" /> Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={contact.email || ""}
                                        onChange={e => setContact({ ...contact, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-3 w-3" /> Phone</Label>
                                    <Input
                                        id="phone"
                                        value={contact.phone || ""}
                                        onChange={e => setContact({ ...contact, phone: e.target.value })}
                                        placeholder="+41 7x xxx xx xx"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company" className="flex items-center gap-2">Company</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="company"
                                            value={contact.company || ""}
                                            onChange={e => setContact({ ...contact, company: e.target.value })}
                                            className="flex-1"
                                        />
                                        {contact.company_id && (
                                            <Button variant="outline" size="icon" asChild>
                                                <Link href={`/companies/${contact.company_id}`}>
                                                    <Building className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                    {contact.company_id && (
                                        <p className="text-[10px] text-blue-500 italic">Linked to Company profile</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Lists</Label>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                                        {["Prospects", "Customers", "Partnerships", "Network/Peers", "Podcast"].map(option => {
                                            const currentLists = (contact.list || "").split(',').map(l => l.trim().toLowerCase())
                                            const isChecked = currentLists.includes(option.toLowerCase()) ||
                                                (option === "Prospects" && currentLists.includes("prospect")) ||
                                                (option === "Customers" && currentLists.includes("customer"))

                                            return (
                                                <div key={option} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`list-${option}`}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            let lists = (contact.list || "").split(',').map(l => l.trim()).filter(l => l !== "")
                                                            if (checked) {
                                                                if (!lists.some(l => l.toLowerCase() === option.toLowerCase())) {
                                                                    lists.push(option)
                                                                }
                                                            } else {
                                                                lists = lists.filter(l => l.toLowerCase() !== option.toLowerCase())
                                                                // Handle singular/plural cleanup
                                                                if (option === "Prospects") lists = lists.filter(l => l.toLowerCase() !== "prospect")
                                                                if (option === "Customers") lists = lists.filter(l => l.toLowerCase() !== "customer")
                                                            }
                                                            setContact({ ...contact, list: lists.join(', ') })
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`list-${option}`}
                                                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {option}
                                                    </label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Input
                                    id="role"
                                    value={contact.company_role || ""}
                                    onChange={e => setContact({ ...contact, company_role: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="value">Value (CHF)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    step="0.01"
                                    value={contact.value || 0}
                                    onChange={e => setContact({ ...contact, value: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Location</Label>
                                    <Input
                                        id="location"
                                        value={contact.location || ""}
                                        onChange={e => setContact({ ...contact, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website" className="flex items-center gap-2"><Globe className="h-3 w-3" /> Website</Label>
                                    <Input
                                        id="website"
                                        value={contact.website || ""}
                                        onChange={e => setContact({ ...contact, website: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="linkedin_url" className="flex items-center gap-2"><Linkedin className="h-3 w-3" /> LinkedIn Profile</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="linkedin_url"
                                        value={contact.linkedin_url || ""}
                                        onChange={e => setContact({ ...contact, linkedin_url: e.target.value })}
                                    />
                                    {contact.linkedin_url && (
                                        <Button variant="outline" size="icon" asChild>
                                            <a href={contact.linkedin_url} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" /></a>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    rows={6}
                                    value={contact.notes || ""}
                                    onChange={e => setContact({ ...contact, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Status & Tasks */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Status</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <StatusCell contact={contact} />
                            <p className="text-xs text-muted-foreground">Lead ID: {contact.id}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Tasks</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={addTask} className="space-y-2">
                                <Input
                                    placeholder="Add a new task..."
                                    value={newTaskDesc}
                                    onChange={e => setNewTaskDesc(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Input
                                        type="date"
                                        className="h-8 text-xs flex-1"
                                        value={newTaskDueDate}
                                        onChange={e => setNewTaskDueDate(e.target.value)}
                                    />
                                    <select
                                        className="text-xs border rounded p-1 h-8"
                                        value={newTaskPriority}
                                        onChange={e => setNewTaskPriority(e.target.value as any)}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                    <Button type="submit" size="sm" variant="secondary" className="h-8">
                                        <Plus className="h-4 w-4 mr-1" /> Add
                                    </Button>
                                </div>
                            </form>

                            <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
                                {tasks.map(task => (
                                    <div key={task.id} className={`flex items-start gap-2 p-2 rounded border text-sm ${task.completed ? "opacity-50 bg-muted/30" : ""}`}>
                                        <Checkbox
                                            checked={task.completed}
                                            onCheckedChange={() => toggleTask(task.id, task.completed)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={task.completed ? "line-through text-muted-foreground" : ""}>{task.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
                                                    {task.priority}
                                                </Badge>
                                                <button
                                                    onClick={() => handleEditTask(task)}
                                                    className="flex items-center gap-1 hover:bg-muted px-1 py-0.5 rounded transition-colors group"
                                                >
                                                    <CalendarIcon className="h-2.5 w-2.5 text-muted-foreground group-hover:text-blue-500" />
                                                    <span className="text-[10px] text-muted-foreground group-hover:text-blue-600 group-hover:underline italic">
                                                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No date"}
                                                    </span>
                                                </button>
                                                <span className="text-[10px] text-muted-foreground italic">{task.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            {contact.email && (
                                <Button variant="outline" className="justify-start" asChild>
                                    <a href={`mailto:${contact.email}`}><Mail className="mr-2 h-4 w-4" /> Send Email</a>
                                </Button>
                            )}
                            {contact.phone && (
                                <Button variant="outline" className="justify-start" asChild>
                                    <a href={`tel:${contact.phone}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Task Dialog */}
            <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
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
                                <Label>Priority</Label>
                                <Select
                                    value={editForm.priority}
                                    onValueChange={v => setEditForm({ ...editForm, priority: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input
                                    type="date"
                                    value={editForm.due_date}
                                    onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat">Category</Label>
                            <Input
                                id="cat"
                                value={editForm.category}
                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
                        <Button onClick={handleUpdateTask}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
