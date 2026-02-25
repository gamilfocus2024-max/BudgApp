import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowUpDown, PiggyBank, Target, BarChart3 } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const MOBILE_NAV = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
    { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
    { to: '/budget', icon: PiggyBank, label: 'Budgets' },
    { to: '/goals', icon: Target, label: 'Objectifs' },
    { to: '/reports', icon: BarChart3, label: 'Rapports' },
]

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 900) {
                setSidebarCollapsed(false)
                setMobileOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileOpen])

    return (
        <div className="app-shell">
            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <Sidebar
                collapsed={sidebarCollapsed}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
            />

            <div className={`main-content${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
                <Topbar
                    onToggleSidebar={() => {
                        if (window.innerWidth <= 900) setMobileOpen(o => !o)
                        else setSidebarCollapsed(c => !c)
                    }}
                />
                <div className="page-wrapper">
                    <Outlet />
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav">
                {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
                    >
                        <Icon size={22} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}
