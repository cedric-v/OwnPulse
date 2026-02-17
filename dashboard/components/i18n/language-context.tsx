"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { Language, translations } from "@/lib/i18n/translations"
import { createClient } from "@/lib/supabase/client"

type TranslationKey = string

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (path: string, variables?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('fr')
    const supabase = createClient()

    useEffect(() => {
        async function loadLanguage() {
            const { data } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'language_code')
                .single()

            if (data?.value === 'en' || data?.value === 'fr') {
                setLanguageState(data.value as Language)
            }
        }
        loadLanguage()
    }, [supabase])

    const setLanguage = async (lang: Language) => {
        setLanguageState(lang)
        await supabase
            .from('settings')
            .upsert({ key: 'language_code', value: lang }, { onConflict: 'key' })
    }

    const t = (path: string, variables?: Record<string, string | number>): string => {
        const keys = path.split('.')
        let result: any = translations[language]

        for (const key of keys) {
            if (result && result[key]) {
                result = result[key]
            } else {
                return path // Fallback to path if not found
            }
        }

        if (typeof result !== 'string') return path

        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                result = result.replace(`{{${key}}}`, String(value))
            })
        }

        return result
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}
