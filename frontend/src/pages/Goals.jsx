import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, PlusCircle, CheckCircle, Pause, XCircle } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate, GOAL_STATUS } from '../utils/formatters'
import toast from 'react-hot-toast'

const GOAL_ICONS = ['🎯', '🏖️', '🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🛡️', '💰', '🎸', '🌍', '⚽', '🎨']
const GOAL_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16', '#f97316', '#14b8a6']

export default function Goals() {
    const { user } = useAuth()
    const currency = user?.currency || 'EUR'
    const [goals, setGoals] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showDepositModal, setShowDepositModal] = useState(null)
    const [editTarget, setEditTarget] = useState(null)
    const [depositAmount, setDepositAmount] = useState('')
    const [form, setForm] = useState({ name: '', description: '', target_amount: '', current_amount: '', target_date: '', color: '#6366f1', icon: '🎯' })

    useEffect(() => { fetchGoals() }, [])

    const fetchGoals = async () => {
        setLoading(true)
        try { const res = await api.get('/goals'); setGoals(res.data.goals) } catch { }
        finally { setLoading(false) }
    }

    const openCreate = () => {
        setEditTarget(null)
        setForm({ name: '', description: '', target_amount: '', current_amount: '0', target_date: '', color: '#6366f1', icon: '🎯' })
        setShowModal(true)
    }

    const openEdit = (g) => {
        setEditTarget(g)
        setForm({ name: g.name, description: g.description || '', target_amount: g.targetAmount.toString(), current_amount: g.currentAmount.toString(), target_date: g.targetDate || '', color: g.color, icon: g.icon })
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.name || !form.target_amount) return toast.error('Nom et montant cible requis')
        try {
            if (editTarget) {
                await api.put(`/goals/${editTarget.id}`, form)
                toast.success('Objectif mis à jour !')
            } else {
                await api.post('/goals', form)
                toast.success('Objectif créé ! 🎯')
            }
            setShowModal(false)
            fetchGoals()
        } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cet objectif ?')) return
        try { await api.delete(`/goals/${id}`); toast.success('Objectif supprimé'); fetchGoals() } catch { }
    }

    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) return toast.error('Montant invalide')
        try {
            const res = await api.patch(`/goals/${showDepositModal.id}/deposit`, { amount: parseFloat(depositAmount) })
            toast.success(`Dépôt de ${formatCurrency(depositAmount, currency)} effectué !`)
            if (res.data.status === 'completed') toast.success('🎉 Objectif atteint ! Félicitations !')
            setShowDepositModal(null)
            setDepositAmount('')
            fetchGoals()
        } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
    }

    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
    const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0)
    const completed = goals.filter(g => g.status === 'completed').length
    const active = goals.filter(g => g.status === 'active').length

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🎯 Objectifs Financiers</h1>
                    <p className="page-subtitle">{active} objectif{active > 1 ? 's' : ''} en cours, {completed} atteint{completed > 1 ? 's' : ''}</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nouvel objectif</button>
            </div>

            {/* Stats */}
            <div className="grid-4" style={{ marginBottom: 28 }}>
                {[
                    { label: 'Total objectifs', value: goals.length.toString(), icon: '🎯' },
                    { label: 'En cours', value: active.toString(), icon: '⚡' },
                    { label: 'Atteints', value: completed.toString(), icon: '✅' },
                    { label: 'Total épargné', value: formatCurrency(totalSaved, currency), icon: '💰' },
                ].map(s => (
                    <div key={s.label} className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 28 }}>{s.icon}</span>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Goals grid */}
            {loading ? (
                <div className="loading-overlay" style={{ minHeight: 200 }}>
                    <div className="spinner" style={{ width: 32, height: 32 }} />
                </div>
            ) : goals.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🎯</div>
                        <h3>Aucun objectif défini</h3>
                        <p>Définissez des objectifs financiers pour vous motiver à épargner</p>
                        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Créer un objectif</button>
                    </div>
                </div>
            ) : (
                <div className="grid-3">
                    {goals.map(g => {
                        const statusInfo = GOAL_STATUS[g.status] || GOAL_STATUS.active
                        return (
                            <div key={g.id} className="goal-card" style={{ '--goal-color': g.color }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: g.color, borderRadius: '4px 0 0 4px' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${g.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                                            {g.icon}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{g.name}</div>
                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: statusInfo.bg, color: statusInfo.color }}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(g)}><Edit2 size={13} /></button>
                                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger-500)' }} onClick={() => handleDelete(g.id)}><Trash2 size={13} /></button>
                                    </div>
                                </div>

                                {g.description && (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{g.description}</p>
                                )}

                                {/* Progress circle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                                    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                                        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border-color)" strokeWidth="7" />
                                            <circle cx="36" cy="36" r="30" fill="none" stroke={g.color} strokeWidth="7"
                                                strokeDasharray={`${2 * Math.PI * 30}`}
                                                strokeDashoffset={`${2 * Math.PI * 30 * (1 - g.progress / 100)}`}
                                                strokeLinecap="round"
                                                style={{ transition: 'stroke-dashoffset .8s ease' }}
                                            />
                                        </svg>
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                            <span style={{ fontSize: 14, fontWeight: 900, color: g.color, lineHeight: 1 }}>{g.progress}%</span>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Épargné</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {formatCurrency(g.currentAmount, currency)}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            sur {formatCurrency(g.targetAmount, currency)}
                                        </div>
                                    </div>
                                </div>

                                {g.targetDate && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                                        📅 Objectif : {formatDate(g.targetDate)}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 8 }}>
                                    {g.remaining > 0 && g.status === 'active' && (
                                        <button className="btn btn-primary btn-sm" style={{ flex: 1, background: g.color, borderColor: g.color }}
                                            onClick={() => { setShowDepositModal(g); setDepositAmount('') }}>
                                            <PlusCircle size={14} /> Déposer
                                        </button>
                                    )}
                                    {g.status === 'completed' && (
                                        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--success-500)', padding: '6px 0' }}>
                                            🎉 Objectif atteint !
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Goal Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h2 className="modal-title">{editTarget ? 'Modifier l\'objectif' : 'Nouvel objectif'}</h2>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                {/* Icon picker */}
                                <div className="form-group">
                                    <label className="form-label">Emoji</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {GOAL_ICONS.map(ic => (
                                            <button key={ic} type="button"
                                                style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${form.icon === ic ? 'var(--brand-500)' : 'var(--border-color)'}`, background: form.icon === ic ? 'var(--brand-50)' : 'var(--bg-input)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
                                                onClick={() => setForm(f => ({ ...f, icon: ic }))}>
                                                {ic}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color picker */}
                                <div className="form-group">
                                    <label className="form-label">Couleur</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {GOAL_COLORS.map(c => (
                                            <button key={c} type="button"
                                                style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'var(--text-primary)' : 'transparent'}`, cursor: 'pointer', transition: 'all .15s', boxShadow: form.color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : 'none' }}
                                                onClick={() => setForm(f => ({ ...f, color: c }))} />
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Nom <span className="required">*</span></label>
                                    <input className="form-control" placeholder="Ex: Épargne vacances" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-control" placeholder="Détails de votre objectif..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                                </div>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Montant cible ({currency}) <span className="required">*</span></label>
                                        <input type="number" className="form-control" placeholder="3000" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} min="0" step="0.01" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Épargne actuelle ({currency})</label>
                                        <input type="number" className="form-control" placeholder="0" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} min="0" step="0.01" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date cible</label>
                                    <input type="date" className="form-control" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                                <button type="submit" className="btn btn-primary" style={{ background: form.color, borderColor: form.color }}>
                                    {editTarget ? 'Mettre à jour' : 'Créer l\'objectif'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deposit Modal */}
            {showDepositModal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDepositModal(null)}>
                    <div className="modal-box modal-sm">
                        <div className="modal-header">
                            <h2 className="modal-title">💰 Ajouter un dépôt</h2>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowDepositModal(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 16, fontSize: 14 }}>
                                Objectif: <strong>{showDepositModal.name}</strong><br />
                                Restant: <strong style={{ color: 'var(--brand-500)' }}>{formatCurrency(showDepositModal.remaining, currency)}</strong>
                            </p>
                            <div className="form-group">
                                <label className="form-label">Montant à déposer ({currency})</label>
                                <input type="number" className="form-control" placeholder="Ex: 500" value={depositAmount}
                                    onChange={e => setDepositAmount(e.target.value)} min="0.01" step="0.01" autoFocus
                                    max={showDepositModal.remaining} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowDepositModal(null)}>Annuler</button>
                            <button className="btn btn-primary" onClick={handleDeposit} style={{ background: showDepositModal.color, borderColor: showDepositModal.color }}>
                                <PlusCircle size={16} /> Déposer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
