import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, monthName, CHART_COLORS } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function Budget() {
    const { user } = useAuth()
    const currency = user?.currency || 'EUR'
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [budgets, setBudgets] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [form, setForm] = useState({ name: '', amount: '', category_id: '', alert_threshold: 80 })

    useEffect(() => {
        api.get('/categories?type=expense').then(r => setCategories(r.data.categories)).catch(() => { })
    }, [])

    useEffect(() => { fetchBudgets() }, [year, month])

    const fetchBudgets = async () => {
        setLoading(true)
        try {
            const res = await api.get('/budgets', { params: { year, month } })
            setBudgets(res.data.budgets)
        } catch { }
        finally { setLoading(false) }
    }

    const openCreate = () => {
        setEditTarget(null)
        setForm({ name: '', amount: '', category_id: '', alert_threshold: 80 })
        setShowModal(true)
    }

    const openEdit = (b) => {
        setEditTarget(b)
        setForm({ name: b.name, amount: b.amount.toString(), category_id: b.category?.id || '', alert_threshold: b.alertThreshold })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.name || !form.amount || !form.category_id) return toast.error('Remplissez tous les champs requis')
        try {
            if (editTarget) {
                await api.put(`/budgets/${editTarget.id}`, form)
                toast.success('Budget mis à jour !')
            } else {
                await api.post('/budgets', { ...form, month, year })
                toast.success('Budget créé !')
            }
            setShowModal(false)
            fetchBudgets()
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erreur')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce budget ?')) return
        try {
            await api.delete(`/budgets/${id}`)
            toast.success('Budget supprimé')
            fetchBudgets()
        } catch { }
    }

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
    const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
    const exceeded = budgets.filter(b => b.isExceeded).length
    const warning = budgets.filter(b => b.isWarning && !b.isExceeded).length

    const pieData = budgets.map((b, i) => ({ name: b.category?.name || b.name, value: b.spent, color: b.category?.color || CHART_COLORS[i % CHART_COLORS.length] }))

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏦 Budgets</h1>
                    <p className="page-subtitle">{monthName(month, year)}</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select className="form-control" style={{ width: 120 }} value={month} onChange={e => setMonth(+e.target.value)}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>{monthName(m, year).split(' ')[0]}</option>
                            ))}
                        </select>
                        <select className="form-control" style={{ width: 90 }} value={year} onChange={e => setYear(+e.target.value)}>
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={18} /> Nouveau budget
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                    { label: 'Budget total', value: formatCurrency(totalBudget, currency), icon: '💰', color: 'var(--brand-500)' },
                    { label: 'Total dépensé', value: formatCurrency(totalSpent, currency), icon: '💸', color: 'var(--danger-500)' },
                    { label: 'Dépassements', value: `${exceeded} budget${exceeded > 1 ? 's' : ''}`, icon: '⚠️', color: 'var(--danger-500)' },
                    { label: 'Alertes actives', value: `${warning} budget${warning > 1 ? 's' : ''}`, icon: '🔔', color: 'var(--warning-500)' },
                ].map(s => (
                    <div key={s.label} className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ fontSize: 28 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
                {/* Budget list */}
                <div>
                    {loading ? (
                        <div className="loading-overlay" style={{ minHeight: 200 }}>
                            <div className="spinner" style={{ width: 32, height: 32 }} />
                        </div>
                    ) : budgets.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">🏦</div>
                                <h3>Aucun budget défini</h3>
                                <p>Créez des budgets par catégorie pour mieux gérer vos dépenses</p>
                                <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer un budget</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {budgets.map(b => (
                                <div key={b.id} className={`budget-card ${b.isExceeded ? 'exceeded' : b.isWarning ? 'warning' : 'safe'}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {b.category && (
                                                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${b.category.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: b.category.color, display: 'block' }} />
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 15 }}>{b.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.category?.name || 'Sans catégorie'}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {b.isExceeded && (
                                                <span className="badge badge-danger"><AlertTriangle size={11} /> Dépassé</span>
                                            )}
                                            {b.isWarning && !b.isExceeded && (
                                                <span className="badge badge-warning">⚠️ {b.percentage}%</span>
                                            )}
                                            {!b.isWarning && (
                                                <span className="badge badge-success"><CheckCircle size={11} /> OK</span>
                                            )}
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(b)}><Edit2 size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger-500)' }} onClick={() => handleDelete(b.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                <strong style={{ color: b.isExceeded ? 'var(--danger-500)' : 'var(--text-primary)' }}>
                                                    {formatCurrency(b.spent, currency)}
                                                </strong> dépensé
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>sur {formatCurrency(b.amount, currency)}</span>
                                        </div>
                                        <div className="progress-bar" style={{ height: 10 }}>
                                            <div className="progress-bar-fill" style={{
                                                width: `${Math.min(100, b.percentage)}%`,
                                                background: b.isExceeded ? 'var(--danger-500)' : b.isWarning ? 'var(--warning-500)' : 'var(--success-500)'
                                            }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                                        <span>Restant: <strong style={{ color: b.isExceeded ? 'var(--danger-500)' : 'var(--success-600)' }}>{formatCurrency(b.remaining, currency)}</strong></span>
                                        <span>Alerte à {b.alertThreshold}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pie Chart */}
                {pieData.length > 0 && (
                    <div className="card card-body" style={{ position: 'sticky', top: 84 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Répartition des dépenses</h3>
                        <div style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatCurrency(v, currency)} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-box modal-sm">
                        <div className="modal-header">
                            <h2 className="modal-title">{editTarget ? 'Modifier le budget' : 'Nouveau budget'}</h2>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nom <span className="required">*</span></label>
                                    <input className="form-control" placeholder="Ex: Budget Alimentation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Catégorie <span className="required">*</span></label>
                                    <select className="form-control" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required>
                                        <option value="">Choisir une catégorie</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Montant ({currency}) <span className="required">*</span></label>
                                    <input type="number" className="form-control" placeholder="500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" step="0.01" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Seuil d'alerte: <strong>{form.alert_threshold}%</strong></label>
                                    <input type="range" min="50" max="100" step="5" value={form.alert_threshold}
                                        onChange={e => setForm(f => ({ ...f, alert_threshold: +e.target.value }))}
                                        style={{ width: '100%', accentColor: 'var(--brand-500)', marginTop: 4 }} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                                <button type="submit" className="btn btn-primary">{editTarget ? 'Mettre à jour' : 'Créer'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
