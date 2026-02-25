import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Edit2, Trash2, TrendingUp, TrendingDown, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTransactions, deleteTransaction, getCategories } from '../services/db'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, formatDate, PAYMENT_METHODS } from '../utils/formatters'
import TransactionModal from '../components/transactions/TransactionModal'
import toast from 'react-hot-toast'

const SORT_OPTIONS = [
    { value: 'date-DESC', label: 'Date (+ récente)' },
    { value: 'date-ASC', label: 'Date (+ ancienne)' },
    { value: 'amount-DESC', label: 'Montant (+ élevé)' },
    { value: 'amount-ASC', label: 'Montant (+ faible)' },
]

export default function Transactions({ type: defaultType = 'all' }) {
    const { user } = useAuth()
    const [transactions, setTransactions] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [deleteId, setDeleteId] = useState(null)

    const [filters, setFilters] = useState({
        type: defaultType === 'all' ? '' : defaultType,
        category_id: '',
        search: '',
        start_date: '',
        end_date: '',
        payment_method: '',
        sort: 'date',
        order: 'DESC',
        page: 1,
        limit: 50 // Augmenté pour Firebase car on gère mieux côté client si besoin
    })

    const currency = user?.currency || 'EUR'

    useEffect(() => {
        if (!user) return
        getCategories(user.uid).then(setCategories).catch(() => { })
    }, [user])

    const fetchTransactions = useCallback(async () => {
        if (!user) return
        setLoading(true)
        try {
            const res = await getTransactions(user.uid, filters)
            setTransactions(res.transactions)
            setPagination(res.pagination)
        } catch (err) {
            console.error('Error fetching transactions:', err)
            toast.error('Erreur lors du chargement des transactions')
        }
        finally { setLoading(false) }
    }, [user, filters])

    useEffect(() => {
        fetchTransactions()
    }, [fetchTransactions])

    useEffect(() => {
        const handler = () => fetchTransactions()
        window.addEventListener('transaction-saved', handler)
        return () => window.removeEventListener('transaction-saved', handler)
    }, [fetchTransactions])

    const updateFilter = (key, value) => setFilters(f => ({ ...f, [key]: value, page: 1 }))

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette transaction ?')) return
        try {
            await deleteTransaction(id)
            toast.success('Transaction supprimée')
            fetchTransactions()
        } catch (err) {
            toast.error('Erreur lors de la suppression')
        }
    }

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const sortedParts = filters.sort ? `${filters.sort}-${filters.order}` : 'date-DESC'

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {defaultType === 'income' ? '📈 Revenus' : defaultType === 'expense' ? '📉 Dépenses' : '💱 Transactions'}
                    </h1>
                    <p className="page-subtitle">{pagination.total} transaction{pagination.total > 1 ? 's' : ''} trouvée{pagination.total > 1 ? 's' : ''}</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditTarget(null); setShowModal(true) }}>
                    <Plus size={18} /> Nouvelle transaction
                </button>
            </div>

            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total revenus', value: income, color: 'var(--success-500)' },
                    { label: 'Total dépenses', value: expenses, color: 'var(--danger-500)' },
                    { label: 'Solde net', value: income - expenses, color: (income - expenses) >= 0 ? 'var(--success-500)' : 'var(--danger-500)' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 140 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{formatCurrency(s.value, currency)}</span>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="filters-bar" style={{ marginBottom: 20 }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                        className="form-control"
                        style={{ paddingLeft: 34, minWidth: 0, background: 'var(--bg-input)' }}
                        placeholder="Rechercher..."
                        value={filters.search}
                        onChange={e => updateFilter('search', e.target.value)}
                    />
                </div>

                {/* Type */}
                {defaultType === 'all' && (
                    <select className="form-control" style={{ width: 140 }} value={filters.type} onChange={e => updateFilter('type', e.target.value)}>
                        <option value="">Tous types</option>
                        <option value="income">Revenus</option>
                        <option value="expense">Dépenses</option>
                    </select>
                )}

                {/* Category */}
                <select className="form-control" style={{ width: 160 }} value={filters.category_id} onChange={e => updateFilter('category_id', e.target.value)}>
                    <option value="">Toutes catégories</option>
                    {categories.filter(c => !filters.type || c.type === filters.type).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                {/* Date range */}
                <input type="date" className="form-control" style={{ width: 150 }} value={filters.start_date} onChange={e => updateFilter('start_date', e.target.value)} title="Date de début" />
                <input type="date" className="form-control" style={{ width: 150 }} value={filters.end_date} onChange={e => updateFilter('end_date', e.target.value)} title="Date de fin" />

                {/* Sort */}
                <select className="form-control" style={{ width: 170 }}
                    value={sortedParts}
                    onChange={e => {
                        const [sort, order] = e.target.value.split('-')
                        setFilters(f => ({ ...f, sort, order }))
                    }}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <button className="btn btn-outline btn-sm" onClick={() => setFilters(f => ({ ...f, type: defaultType === 'all' ? '' : defaultType, category_id: '', search: '', start_date: '', end_date: '', sort: 'date', order: 'DESC', page: 1 }))}>
                    <RefreshCw size={14} /> Réinitialiser
                </button>
            </div>

            {/* Table */}
            <div className="card">
                {loading ? (
                    <div className="loading-overlay" style={{ minHeight: 200 }}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">💸</div>
                        <h3>Aucune transaction</h3>
                        <p>Ajoutez votre première transaction pour commencer</p>
                        <button className="btn btn-primary" onClick={() => { setEditTarget(null); setShowModal(true) }}>
                            <Plus size={16} /> Ajouter une transaction
                        </button>
                    </div>
                ) : (
                    <div className="table-wrapper" style={{ border: 'none' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Transaction</th>
                                    <th>Catégorie</th>
                                    <th>Date</th>
                                    <th>Paiement</th>
                                    <th style={{ textAlign: 'right' }}>Montant</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className={`type-icon ${t.type}`} style={{ width: 32, height: 32 }}>
                                                    {t.type === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{t.description}</div>
                                                    {t.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }} className="truncate">{t.notes}</div>}
                                                    {t.isRecurring && <span style={{ fontSize: 10, color: 'var(--brand-400)', fontWeight: 600 }}>🔄 Récurrent</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {t.category ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.category.color, display: 'inline-block', flexShrink: 0 }} />
                                                    <span style={{ fontSize: 12, fontWeight: 500 }}>{t.category.name}</span>
                                                </div>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {formatDate(t.date)}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {PAYMENT_METHODS[t.paymentMethod]?.icon} {PAYMENT_METHODS[t.paymentMethod]?.label || t.paymentMethod}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span className={t.type === 'income' ? 'amount-income' : 'amount-expense'} style={{ fontSize: 14 }}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                <button className="btn btn-ghost btn-icon btn-sm" title="Modifier"
                                                    onClick={() => { setEditTarget(t); setShowModal(true) }}>
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="btn btn-ghost btn-icon btn-sm" title="Supprimer"
                                                    style={{ color: 'var(--danger-500)' }}
                                                    onClick={() => handleDelete(t.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Page {pagination.page} sur {pagination.pages} ({pagination.total} résultats)
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-outline btn-sm" disabled={pagination.page <= 1}
                                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
                                <ChevronLeft size={16} />
                            </button>
                            <button className="btn btn-outline btn-sm" disabled={pagination.page >= pagination.pages}
                                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <TransactionModal
                    transaction={editTarget}
                    defaultType={defaultType !== 'all' ? defaultType : undefined}
                    onClose={() => { setShowModal(false); setEditTarget(null) }}
                    onSaved={() => { setShowModal(false); setEditTarget(null); fetchTransactions() }}
                />
            )}
        </div>
    )
}
