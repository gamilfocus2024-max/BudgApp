import { useState, useCallback, useEffect } from 'react'
import { User, Lock, Globe, Palette, Bell, Database, Plus, Trash2, Save, ShieldAlert } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getCategories, createCategory, deleteCategory } from '../services/db'
import { seedDefaultCategories } from '../utils/seedFirebase'
import toast from 'react-hot-toast'

const CURRENCIES = [
    { code: 'EUR', name: 'Euro (€)', symbol: '€' },
    { code: 'USD', name: 'Dollar US ($)', symbol: '$' },
    { code: 'GBP', name: 'Livre sterling (£)', symbol: '£' },
    { code: 'CHF', name: 'Franc suisse (CHF)', symbol: 'CHF' },
    { code: 'MAD', name: 'Dirham marocain', symbol: 'MAD' },
    { code: 'CAD', name: 'Dollar canadien', symbol: 'CA$' },
    { code: 'JPY', name: 'Yen japonais (¥)', symbol: '¥' },
    { code: 'DZD', name: 'Dinar algérien', symbol: 'DZD' },
    { code: 'TND', name: 'Dinar tunisien', symbol: 'TND' },
]

function SettingSection({ title, icon: Icon, children }) {
    return (
        <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} style={{ color: 'var(--brand-500)' }} />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
                </div>
            </div>
            <div className="card-body">{children}</div>
        </div>
    )
}

export default function Settings() {
    const { user, updateUser, logout, changePassword } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [profileForm, setProfileForm] = useState({ name: user?.name || '', currency: user?.currency || 'EUR' })
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingPwd, setSavingPwd] = useState(false)
    const [activeTab, setActiveTab] = useState('profile')
    const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#6366f1', icon: 'tag' })
    const [categories, setCategories] = useState([])
    const [loadingCats, setLoadingCats] = useState(false)

    const loadCategories = useCallback(async () => {
        if (!user) return
        setLoadingCats(true)
        try {
            const data = await getCategories(user.uid)
            setCategories(data.filter(c => !c.is_default))
        } catch (err) {
            console.error('Error loading cats:', err)
        } finally { setLoadingCats(false) }
    }, [user])

    useEffect(() => {
        if (activeTab === 'categories') loadCategories()
    }, [activeTab, loadCategories])

    const handleProfileSave = async (e) => {
        e.preventDefault()
        setSavingProfile(true)
        try {
            await updateUser({ ...profileForm, theme })
            toast.success('Profil mis à jour !')
        } catch (err) {
            toast.error('Erreur lors de la mise à jour')
        } finally { setSavingProfile(false) }
    }

    const handlePasswordSave = async (e) => {
        e.preventDefault()
        if (pwdForm.newPassword !== pwdForm.confirm) return toast.error('Les mots de passe ne correspondent pas')
        if (pwdForm.newPassword.length < 8) return toast.error('8 caractères minimum')
        setSavingPwd(true)
        try {
            await changePassword(pwdForm.currentPassword, pwdForm.newPassword)
            setPwdForm({ currentPassword: '', newPassword: '', confirm: '' })
        } catch (err) {
            toast.error('Mot de passe actuel incorrect ou erreur serveur')
        } finally { setSavingPwd(false) }
    }

    const handleAddCategory = async (e) => {
        e.preventDefault()
        if (!catForm.name) return toast.error('Nom requis')
        try {
            await createCategory(user.uid, catForm)
            toast.success('Catégorie créée !')
            loadCategories()
            setCatForm({ name: '', type: 'expense', color: '#6366f1', icon: 'tag' })
        } catch (err) { toast.error('Erreur lors de la création') }
    }

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Supprimer cette catégorie ?')) return
        try {
            await deleteCategory(id)
            toast.success('Catégorie supprimée')
            setCategories(cats => cats.filter(c => c.id !== id))
        } catch (err) { toast.error('Erreur lors de la suppression') }
    }

    const handleSeedCategories = async () => {
        if (!window.confirm('Amorcer les catégories par défaut ?')) return
        try {
            await seedDefaultCategories()
            toast.success('Catégories amorcées !')
            if (activeTab === 'categories') loadCategories()
        } catch (err) { toast.error('Erreur d\'amorçage') }
    }

    const TABS = [
        { key: 'profile', label: '👤 Profil', action: null },
        { key: 'password', label: '🔒 Sécurité', action: null },
        { key: 'appearance', label: '🎨 Apparence', action: null },
        { key: 'categories', label: '🏷️ Catégories', action: loadCategories },
        { key: 'data', label: '💾 Données', action: null },
    ]
    if (user?.role === 'admin') {
        TABS.push({ key: 'admin', label: '👑 Admin', action: null })
    }

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">⚙️ Paramètres</h1>
                    <p className="page-subtitle">Gérez votre compte et vos préférences</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button key={t.key} className={`tab-item${activeTab === t.key ? ' active' : ''}`}
                        onClick={() => { setActiveTab(t.key); t.action?.() }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Profile */}
            {activeTab === 'profile' && (
                <div>
                    <div className="card card-body" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div className="avatar-placeholder" style={{ width: 72, height: 72, fontSize: 28, borderRadius: 20 }}>
                            {(user?.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{user?.email}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                Compte {user?.role === 'admin' ? 'Administrateur 👑' : 'Standard'}
                            </div>
                        </div>
                    </div>

                    <SettingSection title="Informations personnelles" icon={User}>
                        <form onSubmit={handleProfileSave}>
                            <div className="form-group">
                                <label className="form-label">Nom complet</label>
                                <input className="form-control" value={profileForm.name}
                                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input className="form-control" value={user?.email} disabled style={{ opacity: .6 }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Devise principale</label>
                                <select className="form-control" value={profileForm.currency}
                                    onChange={e => setProfileForm(f => ({ ...f, currency: e.target.value }))}>
                                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                                {savingProfile ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
                                Enregistrer
                            </button>
                        </form>
                    </SettingSection>
                </div>
            )}

            {/* Password */}
            {activeTab === 'password' && (
                <SettingSection title="Changer le mot de passe" icon={Lock}>
                    <form onSubmit={handlePasswordSave}>
                        <div className="form-group">
                            <label className="form-label">Mot de passe actuel</label>
                            <input type="password" className="form-control" value={pwdForm.currentPassword}
                                onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••••" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nouveau mot de passe</label>
                            <input type="password" className="form-control" value={pwdForm.newPassword}
                                onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="••••••••" required minLength={8} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirmer le nouveau mot de passe</label>
                            <input type="password" className="form-control" value={pwdForm.confirm}
                                onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" required />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={savingPwd}>
                            {savingPwd ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Lock size={16} />}
                            Changer le mot de passe
                        </button>
                    </form>
                </SettingSection>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
                <SettingSection title="Apparence" icon={Palette}>
                    <div style={{ marginBottom: 20 }}>
                        <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>Thème</label>
                        <div style={{ display: 'flex', gap: 16 }}>
                            {['light', 'dark'].map(t => (
                                <div key={t}
                                    onClick={() => { if (theme !== t) toggleTheme() }}
                                    style={{
                                        flex: 1, padding: 16, borderRadius: 12, cursor: 'pointer',
                                        border: `2px solid ${theme === t ? 'var(--brand-500)' : 'var(--border-color)'}`,
                                        background: theme === t ? 'var(--brand-50)' : 'var(--bg-input)',
                                    }}>
                                    <div style={{ fontWeight: 700 }}>{t === 'light' ? '☀️ Clair' : '🌙 Sombre'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SettingSection>
            )}

            {/* Categories */}
            {activeTab === 'categories' && (
                <SettingSection title="Mes catégories" icon={Globe}>
                    <form onSubmit={handleAddCategory} style={{ marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px auto', gap: 12 }}>
                            <input className="form-control" placeholder="Nom" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
                            <select className="form-control" value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value }))}>
                                <option value="expense">Dépense</option>
                                <option value="income">Revenu</option>
                            </select>
                            <input type="color" className="form-control" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} />
                            <button type="submit" className="btn btn-primary"><Plus size={16} /></button>
                        </div>
                    </form>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {categories.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--bg-card)', borderRadius: 8 }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color }} />
                                <span style={{ flex: 1 }}>{c.name}</span>
                                <button className="btn btn-ghost btn-icon" onClick={() => handleDeleteCategory(c.id)}><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </SettingSection>
            )}

            {/* Data */}
            {activeTab === 'data' && (
                <SettingSection title="Gestion des données" icon={Database}>
                    <button className="btn btn-danger" onClick={logout}>Se déconnecter</button>
                </SettingSection>
            )}

            {/* Admin */}
            {activeTab === 'admin' && (
                <SettingSection title="Administration" icon={ShieldAlert}>
                    <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: 8 }}>Initialisation de la base de données</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                            Cette action créera les catégories par défaut dans Firestore si elles n'existent pas déjà.
                        </p>
                        <button className="btn btn-primary" onClick={handleSeedCategories}>
                            🚀 Amorcer les catégories par défaut
                        </button>
                    </div>
                </SettingSection>
            )}
        </div>
    )
}
