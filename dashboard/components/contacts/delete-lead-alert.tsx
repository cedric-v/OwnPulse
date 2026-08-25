"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/i18n/language-context"

interface DeleteLeadAlertProps {
    contactId: string
    contactName: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function DeleteLeadAlert({
    contactId,
    contactName,
    open,
    onOpenChange,
    onSuccess
}: DeleteLeadAlertProps) {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleDelete = async () => {
        setLoading(true)
        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('id', contactId)

        setLoading(false)
        if (error) {
            alert(`${t('contacts.actions.deleteError')}: ${error.message}`)
        } else {
            onOpenChange(false)
            if (onSuccess) {
                onSuccess()
            }
            router.refresh()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('contacts.actions.deleteConfirmTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('contacts.actions.deleteConfirmMessage', { name: contactName })}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {t('contacts.actions.deleteButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
