/**
 * Shared field validation helpers for contact data.
 *
 * Phone (best practices, E.164-oriented):
 * - International format: `+41 79 123 45 67` or `0041 79 123 45 67`
 *   (8 to 15 digits after the international prefix, per ITU-T E.164).
 * - Swiss local format: `079 123 45 67`, `021 234 56 78`, ...
 *   (leading 0 followed by 9 digits, i.e. 0XX XXX XX XX).
 * - Separators (spaces, dots, dashes, parentheses) are allowed while typing
 *   and ignored for validation.
 * - Empty values are valid: phone/email are optional on a contact.
 *
 * Email: pragmatic validation (single @, no whitespace, domain with a TLD
 * of at least 2 characters). Full RFC 5322 compliance is deliberately not
 * attempted; this covers real-world addresses without rejecting valid ones.
 */

const PHONE_SEPARATORS = /[\s.\-()]/g

export function isValidPhone(value: string | null | undefined): boolean {
    if (!value) return true
    const cleaned = value.trim().replace(PHONE_SEPARATORS, "")
    if (!cleaned) return true

    // International with +: +41 79 123 45 67
    if (cleaned.startsWith("+")) {
        return /^\+\d{8,15}$/.test(cleaned)
    }
    // International with 00 prefix: 0041 79 123 45 67
    if (cleaned.startsWith("00")) {
        return /^00\d{8,15}$/.test(cleaned)
    }
    // Swiss local: 0 followed by 9 digits (07x mobiles, 0xx fixed lines)
    return /^0\d{9}$/.test(cleaned)
}

export function isValidEmail(value: string | null | undefined): boolean {
    if (!value) return true
    const email = value.trim()
    if (!email) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}
