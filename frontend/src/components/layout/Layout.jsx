import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

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

    return (
        <div className="app-shell">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99, backdropFilter: 'blur(2px)' }}
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
        </div>
    )
}
