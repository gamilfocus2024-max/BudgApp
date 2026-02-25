import { useState } from 'react'
import { User, Lock, Globe, Palette, Bell, Database, Plus, Trash2, Save } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../services/api'
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
    const { user, updateUser, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [profileForm, setProfileForm] = useState({ name: user?.name || '', currency: user?.currency || 'EUR' })
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingPwd, setSavingPwd] = useState(false)
    const [activeTab, setActiveTab] = useState('profile')
    const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#6366f1', icon: 'tag' })
    const [categories, setCategories] = useState([])
    const [catLoaded, setCatLoaded] = useState(false)
    const [backupFile, setBackupFile] = useState(null)

    const loadCategories = async () => {
        if (catLoaded) return
        try {
            const res = await api.get('/categories')
            setCategories(res.data.categories.filter(c => !c.is_default))
            setCatLoaded(true)
        } catch { }
    }

    const handleProfileSave = async (e) => {
        e.preventDefault()
        setSavingProfile(true)
        try {
            const res = await api.put('/auth/profile', profileForm)
            updateUser(res.data.user)
            // Sync theme preference
            await api.put('/auth/profile', { ...profileForm, theme })
            toast.success('Profil mis à jour !')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erreur')
        } finally { setSavingProfile(false) }
    }

    const handlePasswordSave = async (e) => {
        e.preventDefault()
        if (pwdForm.newPassword !== pwdForm.confirm) return toast.error('Les mots de passe ne correspondent pas')
        if (pwdForm.newPassword.length < 8) return toast.error('8 caractères minimum')
        setSavingPwd(true)
        try {
            await api.put('/auth/password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
            toast.success('Mot de passe changé !')
            setPwdForm({ currentPassword: '', newPassword: '', confirm: '' })
        } catch (err) {
            toast.error(err.response?.data?.error || 'Erreur')
        } finally { setSavingPwd(false) }
    }

    const handleAddCategory = async (e) => {
        e.preventDefault()
        if (!catForm.name) return toast.error('Nom requis')
        try {
            await api.post('/categories', catForm)
            toast.success('Catégorie créée !')
            setCatLoaded(false); loadCategories()
            setCatForm({ name: '', type: 'expense', color: '#6366f1', icon: 'tag' })
        } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
    }

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Supprimer cette catégorie ?')) return
        try {
            await api.delete(`/categories/${id}`)
            toast.success('Catégorie supprimée')
            setCategories(cats => cats.filter(c => c.id !== id))
        } catch (err) { toast.error(err.response?.data?.error || 'Erreur') }
    }

    const handleRestore = async () => {
        if (!backupFile) return toast.error('Sélectionnez un fichier de sauvegarde')
        try {
            const text = await backupFile.text()
            const data = JSON.parse(text)
            await api.post('/reports/restore', data)
            toast.success('Données restaurées avec succès !')
            setBackupFile(null)
        } catch { toast.error('Fichier de sauvegarde invalide') }
    }

    const TABS = [
        { key: 'profile', label: '👤 Profil', action: null },
        { key: 'password', label: '🔒 Sécurité', action: null },
        { key: 'appearance', label: '🎨 Apparence', action: null },
        { key: 'categories', label: '🏷️ Catégories', action: loadCategories },
        { key: 'data', label: '💾 Données', action: null },
    ]

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
                    {/* Avatar section */}
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
                                <span className="form-hint">L'email ne peut pas être modifié</span>
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
                            <span className="form-hint">Minimum 8 caractères avec majuscule, minuscule et chiffre</span>
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
                            {[
                                { value: 'light', label: '☀️ Clair', desc: 'Interface lumineuse' },
                                { value: 'dark', label: '🌙 Sombre', desc: 'Interface sombre' },
                            ].map(t => (
                                <div key={t.value}
                                    onClick={() => { if (theme !== t.value) toggleTheme() }}
                                    style={{
                                        flex: 1, padding: 16, borderRadius: 12, cursor: 'pointer',
                                        border: `2px solid ${theme === t.value ? 'var(--brand-500)' : 'var(--border-color)'}`,
                                        background: theme === t.value ? 'var(--brand-50)' : 'var(--bg-input)',
                                        transition: 'all .2s'
                                    }}>
                                    <div style={{ fontSize: 24, marginBottom: 6 }}>{t.value === 'light' ? '☀️' : '🌙'}</div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: theme === t.value ? 'var(--brand-500)' : 'var(--text-primary)' }}>{t.value === 'light' ? 'Clair' : 'Sombre'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </SettingSection>
            )}

            {/* Categories */}
            {activeTab === 'categories' && (
                <SettingSection title="Mes catégories personnalisées" icon={Globe}>
                    <form onSubmit={handleAddCategory} style={{ marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px auto', gap: 12, alignItems: 'end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Nom</label>
                                <input className="form-control" placeholder="Ma catégorie" value={catForm.name}
                                    onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Type</label>
                                <select className="form-control" value={catForm.type} onChange={e => setCatForm(f => ({ ...f, type: e.target.value }))}>
                                    <option value="expense">Dépense</option>
                                    <option value="income">Revenu</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Couleur</label>
                                <input type="color" className="form-control" style={{ padding: 4, height: 42 }}
                                    value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: 42, alignSelf: 'flex-end' }}>
                                <Plus size={16} /> Ajouter
                            </button>
                        </div>
                    </form>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                        {categories.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                                Aucune catégorie personnalisée. Créez-en une ci-dessus.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {categories.map(c => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-input)' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                                        <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                                        <span className={`badge ${c.type === 'income' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                                            {c.type === 'income' ? 'Revenu' : 'Dépense'}
                                        </span>
                                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger-500)' }}
                                            onClick={() => handleDeleteCategory(c.id)}><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SettingSection>
            )}

            {/* Data */}
            {activeTab === 'data' && (
                <div>
                    <SettingSection title="Sauvegarde & Restauration" icon={Database}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>💾 Exporter une sauvegarde</div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                    Téléchargez une copie complète de vos données (transactions, budgets, objectifs)
                                </p>
                                <button className="btn btn-outline" onClick={async () => {
                                    try {
                                        const res = await api.get('/reports/backup')
                                        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a'); a.href = url; a.download = `budgapp-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url)
                                        toast.success('Sauvegarde téléchargée !')
                                    } catch { toast.error('Erreur') }
                                }}>
                                    <Database size={16} /> Télécharger la sauvegarde
                                </button>
                            </div>

                            <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>📂 Restaurer une sauvegarde</div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                    Importez un fichier de sauvegarde JSON pour restaurer vos données
                                </p>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <label style={{ cursor: 'pointer' }}>
                                        <input type="file" accept=".json" style={{ display: 'none' }}
                                            onChange={e => setBackupFile(e.target.files[0])} />
                                        <span className="btn btn-outline">
                                            📁 Choisir un fichier
                                        </span>
                                    </label>
                                    {backupFile && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>📄 {backupFile.name}</span>}
                                    {backupFile && (
                                        <button className="btn btn-success" onClick={handleRestore}>
                                            Restaurer
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--danger-500)', background: 'rgba(239,68,68,.05)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--danger-500)', marginBottom: 4 }}>⚠️ Zone de danger</div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                    La déconnexion supprime votre session locale. Vos données restent sécurisées.
                                </p>
                                <button className="btn btn-danger btn-sm" onClick={logout}>
                                    Se déconnecter
                                </button>
                            </div>
                        </div>
                    </SettingSection>
                </div>
            )}
        </div>
    )
}
