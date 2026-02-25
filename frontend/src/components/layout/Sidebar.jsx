import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, ArrowUpDown, TrendingUp, TrendingDown,
    PiggyBank, Target, BarChart3, Settings, LogOut, X,
    ChevronLeft, ChevronRight, Wallet
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getInitials } from '../../utils/formatters'

const NAV_ITEMS = [
    { section: 'Principal' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
    { section: 'Finances' },
    { to: '/income', icon: TrendingUp, label: 'Revenus' },
    { to: '/expenses', icon: TrendingDown, label: 'Dépenses' },
    { to: '/budget', icon: PiggyBank, label: 'Budgets' },
    { to: '/goals', icon: Target, label: 'Objectifs' },
    { section: 'Analyse' },
    { to: '/reports', icon: BarChart3, label: 'Rapports' },
    { section: 'Compte' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
]

export default function Sidebar({ collapsed, mobileOpen, onClose }) {
    const { user, logout } = useAuth()

    return (
        <aside id="sidebar-nav" className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">B</div>
                {!collapsed && (
                    <span className="sidebar-logo-text">
                        Budg<span>App</span>
                    </span>
                )}
                {/* X close button only visible on mobile */}
                <button
                    className="btn btn-ghost btn-icon btn-sm sidebar-close-btn"
                    style={{ marginLeft: 'auto', flexShrink: 0 }}
                    onClick={onClose}
                    aria-label="Fermer"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map((item, i) => {
                    if (item.section) {
                        return (
                            <div key={i} className="sidebar-section">
                                {!collapsed && <div className="sidebar-section-label">{item.section}</div>}
                                {collapsed && i > 0 && <div style={{ margin: '6px 0', borderTop: '1px solid var(--border-color)' }} />}
                            </div>
                        )
                    }
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                            title={collapsed ? item.label : undefined}
                            onClick={() => onClose?.()}
                        >
                            <span className="nav-icon"><Icon size={18} /></span>
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    )
                })}
            </nav>

            {/* User Footer */}
            <div className="sidebar-footer">
                <div className="nav-item" style={{ marginBottom: 4, cursor: 'default', pointerEvents: 'none' }}>
                    <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                        {getInitials(user?.name)}
                    </div>
                    {!collapsed && (
                        <div style={{ minWidth: 0 }}>
                            <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {user?.name}
                            </div>
                            <div className="truncate" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {user?.email}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    className="nav-item btn-ghost"
                    style={{ color: 'var(--danger-500)', width: '100%', border: 'none', background: 'transparent', fontFamily: 'var(--font-sans)' }}
                    onClick={logout}
                    title={collapsed ? 'Déconnexion' : undefined}
                >
                    <span className="nav-icon"><LogOut size={18} /></span>
                    {!collapsed && <span>Déconnexion</span>}
                </button>
            </div>
        </aside>
    )
}
