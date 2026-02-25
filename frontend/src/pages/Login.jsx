import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, TrendingUp, DollarSign, PieChart, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.email || !form.password) return toast.error('Veuillez remplir tous les champs')
        setLoading(true)
        try {
            await login(form.email, form.password)
            toast.success('Bienvenue ! 👋')
            navigate('/dashboard')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erreur de connexion')
        } finally {
            setLoading(false)
        }
    }

    const fillDemo = () => setForm({ email: 'demo@budgapp.fr', password: 'Demo1234!' })

    return (
        <div className="auth-page">
            {/* Branding */}
            <div className="auth-branding">
                <div style={{ position: 'relative', zIndex: 1, maxWidth: 460, textAlign: 'center' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'rgba(255,255,255,.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-display)'
                    }}>B</div>

                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 900, marginBottom: 14, color: 'white' }}>
                        BudgApp
                    </h1>
                    <p style={{ fontSize: 18, opacity: .8, marginBottom: 48, color: 'rgba(255,255,255,.9)' }}>
                        Gérez vos finances personnelles avec élégance et précision
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left' }}>
                        {[
                            { icon: TrendingUp, title: 'Suivi complet', desc: 'Revenus et dépenses' },
                            { icon: PieChart, title: 'Visualisations', desc: 'Graphiques interactifs' },
                            { icon: DollarSign, title: 'Budgets', desc: 'Alertes intelligentes' },
                            { icon: Shield, title: 'Sécurisé', desc: 'Données protégées' },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} style={{
                                background: 'rgba(255,255,255,.08)',
                                borderRadius: 16, padding: '16px',
                                border: '1px solid rgba(255,255,255,.1)',
                                backdropFilter: 'blur(8px)'
                            }}>
                                <Icon size={20} style={{ color: 'rgba(255,255,255,.9)', marginBottom: 8 }} />
                                <div style={{ fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 2 }}>{title}</div>
                                <div style={{ fontSize: 12, opacity: .7, color: 'rgba(255,255,255,.8)' }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="auth-right">
                <div className="auth-card">
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Connexion</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                            Accédez à votre espace personnel
                        </p>
                    </div>

                    {/* Demo button */}
                    <button
                        type="button"
                        className="btn btn-outline w-full"
                        style={{ marginBottom: 24, borderStyle: 'dashed' }}
                        onClick={fillDemo}
                    >
                        🎮 Utiliser le compte de démo
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>ou</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div className="input-with-icon">
                                <Mail size={16} className="input-icon" />
                                <input
                                    type="email"
                                    className="form-control"
                                    placeholder="votre@email.com"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Mot de passe
                                <Link to="/forgot-password" style={{ float: 'right', fontSize: 12, color: 'var(--brand-500)' }}>
                                    Mot de passe oublié ?
                                </Link>
                            </label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <Lock size={16} className="input-icon" />
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    className="form-control"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    autoComplete="current-password"
                                    style={{ paddingRight: 42 }}
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-xl w-full" disabled={loading} style={{ marginTop: 8 }}>
                            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : null}
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
                        Pas encore de compte ?{' '}
                        <Link to="/register" style={{ color: 'var(--brand-500)', fontWeight: 600 }}>
                            Créer un compte
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
