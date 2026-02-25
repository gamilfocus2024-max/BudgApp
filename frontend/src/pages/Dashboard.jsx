import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowRight, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getDashboardStats } from '../services/db'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate, healthLabel, shortMonthName, CHART_COLORS } from '../utils/formatters'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function StatCard({ title, value, icon: Icon, color, change, subtitle, currency }) {
    return (
        <div className={`stat-card ${subtitle || ''}`} style={{ borderTop: `3px solid ${color}` }}>
            <div className="stat-icon" style={{ background: `${color}18` }}>
                <Icon size={22} style={{ color }} />
            </div>
            <div className="stat-value">{formatCurrency(value, currency)}</div>
            <div className="stat-label">{title}</div>
            {change !== undefined && (
                <div className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                    <span style={{ fontWeight: 400, opacity: .8 }}> vs mois dernier</span>
                </div>
            )}
        </div>
    )
}

function HealthScoreRing({ score }) {
    const { label, color } = healthLabel(score)
    const radius = 52
    const circ = 2 * Math.PI * radius
    const offset = circ * (1 - score / 100)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 130, height: 130 }}>
                <svg width="130" height="130" className="health-ring">
                    <circle cx="65" cy="65" r={radius} stroke="var(--border-color)" strokeWidth="10" />
                    <circle cx="65" cy="65" r={radius} stroke={color} strokeWidth="10"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1s ease', strokeLinecap: 'round' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-display)', color }}>{score}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>/ 100</span>
                </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color, marginTop: 8 }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Santé financière</span>
        </div>
    )
}

const CustomTooltip = ({ active, payload, label, currency = 'EUR' }) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ color: 'var(--text-muted)' }}>{p.name}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.value, currency)}</span>
                </div>
            ))}
        </div>
    )
}

export default function Dashboard() {
    const { user } = useAuth()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const currency = user?.currency || 'EUR'

    const fetchStats = useCallback(async () => {
        if (!user) return
        try {
            const data = await getDashboardStats(user.uid)
            setStats(data)
        } catch (err) {
            console.error('Error fetching dashboard stats:', err)
        }
        finally { setLoading(false) }
    }, [user])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    useEffect(() => {
        const handler = () => fetchStats()
        window.addEventListener('transaction-saved', handler)
        return () => window.removeEventListener('transaction-saved', handler)
    }, [fetchStats])

    if (loading || !stats) return (
        <div className="loading-overlay" style={{ minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 12px' }} />
                <p className="text-muted">Chargement du tableau de bord...</p>
            </div>
        </div>
    )

    const trend = stats?.monthlyTrend || []
    const trendData = trend.map(t => ({
        name: MONTHS_FR[(t.month - 1)],
        Revenus: t.income, Dépenses: t.expenses, Épargne: Math.max(0, t.balance)
    }))

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Bonjour, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="page-subtitle">
                        Voici un aperçu de vos finances pour ce mois
                    </p>
                </div>
                <button className="btn btn-outline" onClick={fetchStats} style={{ gap: 8 }}>
                    <RefreshCw size={16} /> Actualiser
                </button>
            </div>

            {/* Stats cards */}
            <div className="stats-grid-4" style={{ marginBottom: 28 }}>
                <StatCard title="Solde Total" icon={Wallet} color="var(--brand-500)" value={stats?.total?.balance || 0} currency={currency} subtitle="balance" />
                <StatCard title="Revenus du mois" icon={TrendingUp} color="var(--success-500)" value={stats?.monthly?.income || 0} currency={currency} subtitle="income" />
                <StatCard title="Dépenses du mois" icon={TrendingDown} color="var(--danger-500)" value={stats?.monthly?.expenses || 0} currency={currency} subtitle="expense" />
                <StatCard title="Épargne du mois" icon={PiggyBank} color="var(--warning-500)" value={Math.max(0, (stats?.monthly?.income || 0) - (stats?.monthly?.expenses || 0))} currency={currency} subtitle="savings" />
            </div>

            {/* Main content grid */}
            <div className="dashboard-main-grid">
                {/* Trend Chart */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Évolution des 6 derniers mois</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Revenus, dépenses et épargne</p>
                        </div>
                    </div>
                    <div className="card-body" style={{ paddingTop: 8 }}>
                        <div className="chart-container" style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="gRevenu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gDepense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                                    <Tooltip content={<CustomTooltip currency={currency} />} />
                                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                                    <Area type="monotone" dataKey="Revenus" stroke="#10b981" fill="url(#gRevenu)" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                    <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" fill="url(#gDepense)" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Health score + savings rate */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card card-body" style={{ textAlign: 'center' }}>
                        <HealthScoreRing score={stats?.healthScore || 0} />
                        <div className="divider" style={{ margin: '16px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Taux d'épargne</div>
                                <div style={{ fontWeight: 800, fontSize: 18, color: stats?.monthly?.savingsRate >= 0 ? 'var(--success-500)' : 'var(--danger-500)' }}>
                                    {stats?.monthly?.savingsRate || 0}%
                                </div>
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Balance nette</div>
                                <div style={{ fontWeight: 800, fontSize: 18, color: (stats?.monthly?.balance || 0) >= 0 ? 'var(--success-500)' : 'var(--danger-500)' }}>
                                    {formatCurrency(stats?.monthly?.balance || 0, currency)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom grid */}
            <div className="grid-2 dashboard-bottom-grid">
                {/* Recent Transactions */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Transactions récentes</h3>
                        <Link to="/transactions" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-500)', fontSize: 13 }}>
                            Voir tout <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div>
                        {!stats?.recentTransactions?.length ? (
                            <div className="empty-state" style={{ padding: '30px 20px' }}>
                                <p>Aucune transaction pour le moment</p>
                            </div>
                        ) : (
                            stats.recentTransactions.slice(0, 6).map(t => (
                                <div key={t.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                                    borderBottom: '1px solid var(--border-subtle)', transition: 'background .15s'
                                }}>
                                    <div className={`type-icon ${t.type}`}>
                                        {t.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{t.description}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {t.category && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: t.category.color, display: 'inline-block', flexShrink: 0 }} /><span>{t.category.name}</span></>}
                                            <span>•</span><span>{formatDate(t.date, 'd MMM')}</span>
                                        </div>
                                    </div>
                                    <div className={t.type === 'income' ? 'amount-income' : 'amount-expense'} style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Budget Alerts + Goals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Budget Alerts */}
                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header">
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>⚠️ Alertes Budget</h3>
                            <Link to="/budget" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-500)', fontSize: 13 }}>
                                Gérer <ArrowRight size={14} />
                            </Link>
                        </div>
                        <div className="card-body" style={{ paddingTop: 12 }}>
                            {!stats?.budgetAlerts?.length ? (
                                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                                    ✅ Tous vos budgets sont respectés !
                                </div>
                            ) : (
                                stats.budgetAlerts.slice(0, 4).map(b => (
                                    <div key={b.id} style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.category_color, display: 'inline-block' }} />
                                                <span style={{ fontWeight: 600 }}>{b.category_name}</span>
                                            </div>
                                            <span style={{ fontWeight: 700, color: b.isExceeded ? 'var(--danger-500)' : 'var(--warning-500)' }}>
                                                {b.percentage}%
                                            </span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-bar-fill" style={{
                                                width: `${Math.min(100, b.percentage)}%`,
                                                background: b.isExceeded ? 'var(--danger-500)' : 'var(--warning-500)'
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                            <span>{formatCurrency(b.spent, currency)} dépensé</span>
                                            <span>/ {formatCurrency(b.amount, currency)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Goals preview */}
                    {stats?.goals?.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 style={{ fontSize: 15, fontWeight: 700 }}>🎯 Objectifs</h3>
                                <Link to="/goals" className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-500)', fontSize: 13 }}>
                                    Tous <ArrowRight size={14} />
                                </Link>
                            </div>
                            <div className="card-body" style={{ paddingTop: 8 }}>
                                {stats.goals.slice(0, 2).map(g => (
                                    <div key={g.id} style={{ marginBottom: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                            <span style={{ fontWeight: 600 }}>{g.name}</span>
                                            <span style={{ fontWeight: 700, color: 'var(--brand-500)' }}>{g.progress}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-bar-fill" style={{ width: `${g.progress}%`, background: g.color || 'var(--brand-500)' }} />
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            {formatCurrency(g.current_amount, currency)} / {formatCurrency(g.target_amount, currency)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Top categories */}
            {stats?.topCategories?.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>🏆 Top catégories de dépenses ce mois</h3>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                            {stats.topCategories.map((cat, i) => (
                                <div key={cat.name || i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color, display: 'block' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{cat.name || 'Sans catégorie'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.count} transactions</div>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--danger-500)', flexShrink: 0 }}>
                                        {formatCurrency(cat.total, currency)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
