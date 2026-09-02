// Helpers partagés pour la prospection (objectifs, jours de prospection).
//
// Les jours de prospection sont stockés dans la table `settings` sous la clé
// `prospecting_work_days`, comme liste de numéros ISO séparés par des virgules
// (1 = lundi … 7 = dimanche). Ex. "1,2,3,4,5" = lundi au vendredi.

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]

export function parseWorkDays(value: string | null | undefined): number[] {
    const days = (value || "")
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    const unique = [...new Set(days)].sort((a, b) => a - b)
    return unique.length > 0 ? unique : DEFAULT_WORK_DAYS
}

// Numéro ISO du jour de la semaine (1 = lundi … 7 = dimanche),
// alors que Date.getDay() renvoie 0 = dimanche.
export function isoDayOfWeek(date: Date): number {
    return date.getDay() === 0 ? 7 : date.getDay()
}

export function isWorkDay(date: Date, workDays: number[]): boolean {
    return workDays.includes(isoDayOfWeek(date))
}

// Nombre de jours de prospection entre deux dates incluses
// (les deux bornes sont des dates sans heure, debut <= fin).
export function countWorkDays(start: Date, end: Date, workDays: number[]): number {
    let count = 0
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    while (cursor <= last) {
        if (isWorkDay(cursor, workDays)) count++
        cursor.setDate(cursor.getDate() + 1)
    }
    return count
}
