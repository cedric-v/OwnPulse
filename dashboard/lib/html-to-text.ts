/**
 * Convert legacy rich-text notes to readable plain text.
 *
 * Some contacts were imported with HTML in the notes field. Keep this helper
 * shared so notes render consistently in the prospecting queue, contact detail
 * page, and notes editor.
 */
export function htmlToText(value: string | null | undefined) {
    if (!value) return ""

    const withLineBreaks = value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
        .replace(/<\/?p[^>]*>/gi, "\n")
        .replace(/<[^>]*>/g, "")

    // Decode entities such as &gt; in the browser without rendering HTML.
    if (typeof document !== "undefined") {
        const decoder = document.createElement("textarea")
        decoder.innerHTML = withLineBreaks
        return decoder.value.replace(/\n{3,}/g, "\n\n").trim()
    }

    return withLineBreaks
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&gt;/gi, ">")
        .replace(/&lt;/gi, "<")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}
