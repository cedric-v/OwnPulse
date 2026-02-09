
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Download, Settings, ChevronRight } from "lucide-react"

export default function ExtensionPage() {
    return (
        <div className="container max-w-2xl mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Install Vibe CRM Extension</h1>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Step 1: Developer Mode
                        </CardTitle>
                        <CardDescription>
                            Open Chrome and go to the extensions management page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Type <code className="bg-muted px-1 rounded">chrome://extensions/</code> in your address bar and press Enter.
                        </p>
                        <Alert>
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Important</AlertTitle>
                            <AlertDescription>
                                Enable <strong>Developer mode</strong> using the toggle in the top right corner.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Step 2: Load Extension
                        </CardTitle>
                        <CardDescription>
                            Load the project folder into Chrome.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</div>
                            <p className="text-sm">Click the <strong>Load unpacked</strong> button.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</div>
                            <p className="text-sm">
                                Navigate to your project directory and select the <code className="bg-muted px-1 rounded">extension</code> folder:
                                <br />
                                <span className="text-xs text-muted-foreground italic">cedric-crm/extension</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ChevronRight className="w-5 h-5" />
                            Step 3: Pin & Use
                        </CardTitle>
                        <CardDescription>
                            Make the CRM always accessible.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Click the "Puzzle" icon in Chrome and <strong>pin</strong> Vibe CRM.
                            Then, navigate to any LinkedIn profile to see the "Add to Vibe" button.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
