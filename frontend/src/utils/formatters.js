import { format, parseISO, isValid } from 'date-fns'
import { fr } from 'date-fns/locale'

// Format monétaire
export const formatCurrency = (amount, currency = 'EUR', locale = 'fr-FR') => {
    const num = parseFloat(amount) || 0
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num)
}

// Format nombre compact (1,2K, 3,5M)
export const formatCompact = (amount, currency = 'EUR') => {
    const num = parseFloat(amount) || 0
    if (Math.abs(num) >= 1_000_000) return formatCurrency(num / 1_000_000, currency).replace('.00', '') + 'M'
    if (Math.abs(num) >= 1_000) return formatCurrency(num / 1_000, currency).replace('.00', '') + 'k'
    return formatCurrency(num, currency)
}

// Format date
export const formatDate = (dateStr, fmt = 'dd MMM yyyy') => {
    if (!dateStr) return '—'
    try {
        const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
        if (!isValid(d)) return '—'
        return format(d, fmt, { locale: fr })
    } catch { return '—' }
}

export const formatDateShort = (dateStr) => formatDate(dateStr, 'd MMM')
export const formatDateFull = (dateStr) => formatDate(dateStr, 'EEEE d MMMM yyyy')
export const formatDateInput = (dateStr) => {
    if (!dateStr) return ''
    try { return format(parseISO(dateStr), 'yyyy-MM-dd') } catch { return '' }
}

// Nom du mois
export const monthName = (month, year) => {
    const d = new Date(year || new Date().getFullYear(), (month || 1) - 1, 1)
    return format(d, 'MMMM yyyy', { locale: fr })
}

export const shortMonthName = (month) => {
    const d = new Date(new Date().getFullYear(), (month || 1) - 1, 1)
    return format(d, 'MMM', { locale: fr })
}

// Pourcentage
export const formatPercent = (value, decimals = 1) => {
    const num = parseFloat(value) || 0
    return `${num.toFixed(decimals)}%`
}

// Initiales
export const getInitials = (name = '') => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// Méthode de paiement
export const PAYMENT_METHODS = {
    card: { label: 'Carte bancaire', icon: '💳' },
    cash: { label: 'Espèces', icon: '💵' },
    virement: { label: 'Virement', icon: '🏦' },
    prélèvement: { label: 'Prélèvement', icon: '🔄' },
    paypal: { label: 'PayPal', icon: '🅿️' },
    cheque: { label: 'Chèque', icon: '📝' },
    other: { label: 'Autre', icon: '❓' },
}

// Intervalles récurrents
export const RECURRING_INTERVALS = {
    daily: 'Quotidien',
    weekly: 'Hebdomadaire',
    biweekly: 'Bimensuel',
    monthly: 'Mensuel',
    quarterly: 'Trimestriel',
    yearly: 'Annuel',
}

// Score de santé label
export const healthLabel = (score) => {
    if (score >= 80) return { label: 'Excellent', color: '#10b981' }
    if (score >= 60) return { label: 'Très bien', color: '#06b6d4' }
    if (score >= 40) return { label: 'Bien', color: '#f59e0b' }
    if (score >= 20) return { label: 'À améliorer', color: '#f97316' }
    return { label: 'Critique', color: '#ef4444' }
}

// Couleurs Recharts
export const CHART_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#8b5cf6', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
    '#3b82f6', '#a855f7', '#e11d48', '#0ea5e9', '#22c55e',
]

// Statut objectif
export const GOAL_STATUS = {
    active: { label: 'En cours', color: 'var(--brand-500)', bg: 'rgba(99,102,241,.12)' },
    completed: { label: 'Atteint', color: 'var(--success-500)', bg: 'rgba(16,185,129,.12)' },
    paused: { label: 'En pause', color: 'var(--warning-500)', bg: 'rgba(245,158,11,.12)' },
    cancelled: { label: 'Annulé', color: 'var(--danger-500)', bg: 'rgba(239,68,68,.12)' },
}
