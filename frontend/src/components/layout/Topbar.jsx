import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Bell, Sun, Moon, Search, Plus } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/formatters'
import TransactionModal from '../transactions/TransactionModal'

const PAGE_TITLES = {
    '/dashboard': 'Tableau de bord',
    '/transactions': 'Transactions',
    '/income': 'Revenus',
    '/expenses': 'Dépenses',
    '/budget': 'Budgets',
    '/goals': 'Objectifs',
    '/reports': 'Rapports & Analyses',
    '/settings': 'Paramètres',
}

const NOTIF_ICONS = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' }

export default function Topbar({ onToggleSidebar }) {
    const { theme, toggleTheme } = useTheme()
    const { user } = useAuth()
    const location = useLocation()
    const [showNotifs, setShowNotifs] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showAddModal, setShowAddModal] = useState(false)
    const notifRef = useRef(null)

    const pageTitle = PAGE_TITLES[location.pathname] || 'BudgApp'

    useEffect(() => {
        // fetchNotifications() // Disabled for now as we migrated to Firebase
    }, [])

    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const fetchNotifications = async () => {
        // Placeholder for future Firestore-based notifications
        setNotifications([])
        setUnreadCount(0)
    }

    const markAllRead = async () => {
        setUnreadCount(0)
        setNotifications(n => n.map(x => ({ ...x, is_read: 1 })))
    }

    return (
        <>
            <header className="topbar">
                <button className="btn btn-ghost btn-icon" onClick={onToggleSidebar} aria-label="Menu">
                    <Menu size={20} />
                </button>

                <h1 className="topbar-title">{pageTitle}</h1>
                <div className="topbar-spacer" />

                <div className="topbar-actions">
                    {/* Bouton ajout rapide */}
                    <button
                        id="add-transaction-btn"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowAddModal(true)}
                        style={{ gap: 6 }}
                    >
                        <Plus size={16} />
                        <span className="hidden-mobile">Ajouter</span>
                    </button>

                    {/* Theme toggle */}
                    <button id="theme-toggle-btn" className="btn btn-ghost btn-icon" onClick={toggleTheme} title="Changer de thème" aria-label="Thème">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Notifications */}
                    <div className="dropdown" ref={notifRef}>
                        <button
                            className="btn btn-ghost btn-icon"
                            style={{ position: 'relative' }}
                            onClick={() => { setShowNotifs(v => !v); if (!showNotifs) fetchNotifications() }}
                            aria-label="Notifications"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: 2, right: 2,
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: 'var(--danger-500)', color: 'white',
                                    fontSize: 9, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifs && (
                            <div className="notif-dropdown">
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                                    {unreadCount > 0 && (
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={markAllRead}>
                                            Tout marquer lu
                                        </button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '30px 20px' }}>
                                        <Bell size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                                        <p style={{ fontSize: 13 }}>Aucune notification</p>
                                    </div>
                                ) : (
                                    notifications.slice(0, 8).map(n => (
                                        <div key={n.id} className={`notif-item${!n.is_read ? ' unread' : ''}`}>
                                            <span style={{ fontSize: 18, flexShrink: 0 }}>{NOTIF_ICONS[n.type] || 'ℹ️'}</span>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)' }}>{n.title}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{n.message}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {formatDate(new Date().toISOString(), 'd MMM à HH:mm')}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {showAddModal && (
                <TransactionModal
                    onClose={() => setShowAddModal(false)}
                    onSaved={() => { setShowAddModal(false); window.dispatchEvent(new CustomEvent('transaction-saved')) }}
                />
            )}

            <style>{`.hidden-mobile { @media (max-width: 480px) { display: none; } }`}</style>
        </>
    )
}
