import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Globe } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const CURRENCIES = [
    { code: 'EUR', name: 'Euro (€)' }, { code: 'USD', name: 'Dollar US ($)' },
    { code: 'GBP', name: 'Livre sterling (£)' }, { code: 'CHF', name: 'Franc suisse (CHF)' },
    { code: 'MAD', name: 'Dirham marocain (MAD)' }, { code: 'CAD', name: 'Dollar canadien (CAD)' },
]

export default function Register() {
    const { register } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', currency: 'EUR' })
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const set = (key, val) => {
        setForm(f => ({ ...f, [key]: val }))
        if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
    }

    const validate = () => {
        const errs = {}
        if (!form.name.trim() || form.name.length < 2) errs.name = 'Nom trop court (2 caractères min.)'
        if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email invalide'
        if (form.password.length < 8) errs.password = '8 caractères minimum'
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) errs.password = 'Doit contenir majuscule, minuscule et chiffre'
        if (form.password !== form.confirm) errs.confirm = 'Les mots de passe ne correspondent pas'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)
        try {
            await register(form.name, form.email, form.password, form.currency)
            toast.success('Compte créé avec succès ! Bienvenue 🎉')
            navigate('/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erreur lors de la création du compte')
        } finally {
            setLoading(false)
        }
    }

    const pwdStrength = () => {
        const p = form.password
        if (!p) return null
        let score = 0
        if (p.length >= 8) score++
        if (/[A-Z]/.test(p)) score++
        if (/[a-z]/.test(p)) score++
        if (/\d/.test(p)) score++
        if (/[^a-zA-Z\d]/.test(p)) score++
        const levels = [
            { label: 'Très faible', color: '#ef4444', width: '20%' },
            { label: 'Faible', color: '#f97316', width: '40%' },
            { label: 'Moyen', color: '#f59e0b', width: '60%' },
            { label: 'Fort', color: '#10b981', width: '80%' },
            { label: 'Très fort', color: '#059669', width: '100%' },
        ]
        return levels[Math.max(0, score - 1)]
    }
    const strength = pwdStrength()

    return (
        <div className="auth-page">
            <div className="auth-branding">
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 80, marginBottom: 24 }}>📊</div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: 'white', marginBottom: 12 }}>
                        Commencez gratuitement
                    </h1>
                    <p style={{ fontSize: 16, opacity: .8, color: 'rgba(255,255,255,.9)', maxWidth: 400 }}>
                        Rejoignez des milliers d'utilisateurs qui gèrent leurs finances avec BudgApp
                    </p>
                    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 48 }}>
                        {['✅ Gratuit', '🔒 Sécurisé', '📱 Mobile'].map(f => (
                            <div key={f} style={{ color: 'rgba(255,255,255,.9)', fontSize: 14, fontWeight: 600 }}>{f}</div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-card">
                    {/* Mobile Logo Only */}
                    <div className="hidden-desktop" style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 16,
                            background: 'var(--brand-500)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px', fontSize: 24, fontWeight: 900
                        }}>B</div>
                        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--brand-500)' }}>BudgApp</h1>
                    </div>

                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Créer un compte</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Démarrez votre suivi financier dès maintenant</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Nom complet <span className="required">*</span></label>
                            <div className="input-with-icon">
                                <User size={16} className="input-icon" />
                                <input type="text" className={`form-control${errors.name ? ' error' : ''}`}
                                    placeholder="Marie Dupont" value={form.name}
                                    onChange={e => set('name', e.target.value)} autoFocus />
                            </div>
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email <span className="required">*</span></label>
                            <div className="input-with-icon">
                                <Mail size={16} className="input-icon" />
                                <input type="email" className={`form-control${errors.email ? ' error' : ''}`}
                                    placeholder="votre@email.com" value={form.email}
                                    onChange={e => set('email', e.target.value)} />
                            </div>
                            {errors.email && <span className="form-error">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Devise principale</label>
                            <div className="input-with-icon">
                                <Globe size={16} className="input-icon" />
                                <select className="form-control" value={form.currency} onChange={e => set('currency', e.target.value)}>
                                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mot de passe <span className="required">*</span></label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <Lock size={16} className="input-icon" />
                                <input type={showPwd ? 'text' : 'password'}
                                    className={`form-control${errors.password ? ' error' : ''}`}
                                    placeholder="••••••••" value={form.password}
                                    onChange={e => set('password', e.target.value)} style={{ paddingRight: 42 }} />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {form.password && strength && (
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ height: 4, borderRadius: 99, background: 'var(--border-color)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 99, transition: 'all .3s' }} />
                                    </div>
                                    <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                                </div>
                            )}
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirmer le mot de passe <span className="required">*</span></label>
                            <div className="input-with-icon">
                                <Lock size={16} className="input-icon" />
                                <input type="password" className={`form-control${errors.confirm ? ' error' : ''}`}
                                    placeholder="••••••••" value={form.confirm}
                                    onChange={e => set('confirm', e.target.value)} />
                            </div>
                            {errors.confirm && <span className="form-error">{errors.confirm}</span>}
                        </div>

                        <button type="submit" className="btn btn-primary btn-xl w-full" disabled={loading} style={{ marginTop: 8 }}>
                            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : '🚀'}
                            {loading ? 'Création du compte...' : 'Créer mon compte'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
                        Déjà un compte ?{' '}
                        <Link to="/login" style={{ color: 'var(--brand-500)', fontWeight: 600 }}>Se connecter</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
