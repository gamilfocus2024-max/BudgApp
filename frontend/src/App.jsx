import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budget from './pages/Budget'
import Goals from './pages/Goals'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chargement...</p>
            </div>
        </div>
    )
    if (!user) return <Navigate to="/login" replace />
    return children
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return null
    if (user) return <Navigate to="/dashboard" replace />
    return children
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="transactions" element={<Transactions type="all" />} />
                <Route path="income" element={<Transactions type="income" />} />
                <Route path="expenses" element={<Transactions type="expense" />} />
                <Route path="budget" element={<Budget />} />
                <Route path="goals" element={<Goals />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}
