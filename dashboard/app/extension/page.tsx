
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Download, Settings, ChevronRight } from "lucide-react"
import { useLanguage } from "@/components/i18n/language-context"

export default function ExtensionPage() {
    const { t } = useLanguage()

    return (
        <div className="container max-w-2xl mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">{t('extension.title')}</h1>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            {t('extension.step1Title')}
                        </CardTitle>
                        <CardDescription>
                            {t('extension.step1Description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('extension.step1Instruction').split('chrome://extensions/')[0]}<code className="bg-muted px-1 rounded">chrome://extensions/</code>{t('extension.step1Instruction').split('chrome://extensions/')[1]}
                        </p>
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>{t('extension.important')}</AlertTitle>
                            <AlertDescription>
                                {t('extension.developerInstruction')}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            {t('extension.step2Title')}
                        </CardTitle>
                        <CardDescription>
                            {t('extension.step2Description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</div>
                            <p className="text-sm">{t('extension.loadUnpacked')}</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</div>
                            <p className="text-sm">
                                {t('extension.selectFolder')}
                                <br />
                                <span className="text-xs text-muted-foreground italic">OwnPulse/extension</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ChevronRight className="w-5 h-5" />
                            {t('extension.step3Title')}
                        </CardTitle>
                        <CardDescription>
                            {t('extension.step3Description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {t('extension.pinInstruction')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
