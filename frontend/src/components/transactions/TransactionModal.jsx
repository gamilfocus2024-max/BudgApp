import { useState, useEffect, useRef } from 'react'
import { X, Save, Calendar, Tag, CreditCard, AlignLeft, RefreshCw, DollarSign, Paperclip, FileText } from 'lucide-react'
import { getCategories, createTransaction, updateTransaction } from '../../services/db'
import { storage } from '../../services/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { PAYMENT_METHODS, RECURRING_INTERVALS } from '../../utils/formatters'

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHODS).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` }))

export default function TransactionModal({ transaction, defaultType, onClose, onSaved }) {
    const { user } = useAuth()
    const fileInputRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState([])
    const [receiptFile, setReceiptFile] = useState(null)
    const [form, setForm] = useState({
        type: transaction?.type || defaultType || 'expense',
        amount: transaction?.amount || '',
        description: transaction?.description || '',
        notes: transaction?.notes || '',
        date: transaction?.date || new Date().toISOString().split('T')[0],
        category_id: transaction?.category_id || '',
        payment_method: transaction?.payment_method || 'card',
        is_recurring: transaction?.is_recurring || false,
        recurring_interval: transaction?.recurring_interval || 'monthly',
        currency: transaction?.currency || user?.currency || 'EUR',
    })
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (!user) return
        getCategories(user.uid).then(setCategories).catch(() => { })
    }, [user])

    const filteredCategories = categories.filter(c => c.type === form.type)

    const set = (key, value) => {
        setForm(f => ({ ...f, [key]: value }))
        if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
    }

    const validate = () => {
        const errs = {}
        if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Montant invalide'
        if (!form.description.trim()) errs.description = 'Description requise'
        if (!form.date) errs.date = 'Date requise'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const uploadReceipt = async (file) => {
        const fileRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${file.name}`)
        const snapshot = await uploadBytes(fileRef, file)
        return await getDownloadURL(snapshot.ref)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        try {
            const data = { ...form, amount: parseFloat(form.amount) }

            if (receiptFile) {
                data.receipt_url = await uploadReceipt(receiptFile)
            }

            if (transaction?.id) {
                await updateTransaction(transaction.id, data)
                toast.success('Transaction mise à jour !')
            } else {
                await createTransaction(user.uid, data)
                toast.success(form.type === 'income' ? '💰 Revenu ajouté !' : '💸 Dépense ajoutée !')
            }
            onSaved?.()
        } catch (err) {
            console.error('Error saving transaction:', err)
            toast.error('Erreur lors de la sauvegarde')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <h2 className="modal-title">
                        {transaction ? 'Modifier la transaction' : 'Nouvelle transaction'}
                    </h2>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Type toggle */}
                        <div className="form-group">
                            <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
                                {['income', 'expense'].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: 'var(--radius-md)', border: 'none',
                                            fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                            transition: 'all var(--transition-base)',
                                            background: form.type === t ? (t === 'income' ? 'var(--success-500)' : 'var(--danger-500)') : 'transparent',
                                            color: form.type === t ? 'white' : 'var(--text-secondary)',
                                            boxShadow: form.type === t ? 'var(--shadow-sm)' : 'none',
                                        }}
                                        onClick={() => { set('type', t); set('category_id', '') }}
                                    >
                                        {t === 'income' ? '⬆️ Revenu' : '⬇️ Dépense'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid-2">
                            {/* Montant */}
                            <div className="form-group">
                                <label className="form-label">Montant <span className="required">*</span></label>
                                <div className="input-with-icon">
                                    <DollarSign size={16} className="input-icon" />
                                    <input
                                        type="number"
                                        className={`form-control${errors.amount ? ' error' : ''}`}
                                        placeholder="0.00"
                                        value={form.amount}
                                        onChange={e => set('amount', e.target.value)}
                                        step="0.01" min="0" required
                                    />
                                </div>
                                {errors.amount && <span className="form-error">{errors.amount}</span>}
                            </div>

                            {/* Date */}
                            <div className="form-group">
                                <label className="form-label">Date <span className="required">*</span></label>
                                <div className="input-with-icon">
                                    <Calendar size={16} className="input-icon" />
                                    <input
                                        type="date"
                                        className={`form-control${errors.date ? ' error' : ''}`}
                                        value={form.date}
                                        onChange={e => set('date', e.target.value)}
                                        required
                                    />
                                </div>
                                {errors.date && <span className="form-error">{errors.date}</span>}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label className="form-label">Description <span className="required">*</span></label>
                            <div className="input-with-icon">
                                <AlignLeft size={16} className="input-icon" />
                                <input
                                    type="text"
                                    className={`form-control${errors.description ? ' error' : ''}`}
                                    placeholder="Ex: Courses Carrefour"
                                    value={form.description}
                                    onChange={e => set('description', e.target.value)}
                                    maxLength={255}
                                    required
                                />
                            </div>
                            {errors.description && <span className="form-error">{errors.description}</span>}
                        </div>

                        <div className="grid-2">
                            {/* Catégorie */}
                            <div className="form-group">
                                <label className="form-label">Catégorie</label>
                                <div className="input-with-icon">
                                    <Tag size={16} className="input-icon" />
                                    <select className="form-control" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                                        <option value="">Sans catégorie</option>
                                        {filteredCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Moyen de paiement */}
                            <div className="form-group">
                                <label className="form-label">Moyen de paiement</label>
                                <div className="input-with-icon">
                                    <CreditCard size={16} className="input-icon" />
                                    <select className="form-control" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                                        {PAYMENT_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Reçu / Justificatif */}
                        <div className="form-group">
                            <label className="form-label">Reçu / Justificatif</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: '1.5px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                                    padding: '12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                    background: receiptFile ? 'var(--brand-50)' : 'transparent',
                                    transition: 'all var(--transition-fast)'
                                }}
                            >
                                <input
                                    type="file" ref={fileInputRef} hidden
                                    onChange={e => setReceiptFile(e.target.files[0])}
                                    accept="image/*,.pdf"
                                />
                                {receiptFile ? (
                                    <>
                                        <FileText size={18} className="text-brand" />
                                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--brand-600)', flex: 1 }} className="truncate">
                                            {receiptFile.name}
                                        </span>
                                        <X size={14} className="text-muted" onClick={(e) => { e.stopPropagation(); setReceiptFile(null) }} />
                                    </>
                                ) : transaction?.receiptUrl ? (
                                    <>
                                        <FileText size={18} className="text-success" />
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>Reçu déjà enregistré</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-500)' }}>Changer</span>
                                    </>
                                ) : (
                                    <>
                                        <Paperclip size={18} className="text-muted" />
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Joindre un fichier (Max 5Mo)</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-control"
                                placeholder="Notes optionnelles..."
                                value={form.notes}
                                onChange={e => set('notes', e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Récurrent */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: 4 }}>
                            <RefreshCw size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', flex: 1 }} htmlFor="is-recurring">
                                Transaction récurrente
                            </label>
                            <input
                                id="is-recurring"
                                type="checkbox"
                                checked={form.is_recurring}
                                onChange={e => set('is_recurring', e.target.checked)}
                                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-500)' }}
                            />
                        </div>

                        {form.is_recurring && (
                            <div className="form-group" style={{ marginTop: 10 }}>
                                <label className="form-label">Fréquence</label>
                                <select className="form-control" value={form.recurring_interval} onChange={e => set('recurring_interval', e.target.value)}>
                                    {Object.entries(RECURRING_INTERVALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
                            {transaction ? 'Mettre à jour' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
