import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('budg-token')
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
            api.get('/auth/me')
                .then(res => setUser(res.data.user))
                .catch(() => {
                    localStorage.removeItem('budg-token')
                    delete api.defaults.headers.common['Authorization']
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const login = useCallback(async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        const { token, user: userData } = res.data
        localStorage.setItem('budg-token', token)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setUser(userData)
        return userData
    }, [])

    const register = useCallback(async (name, email, password, currency) => {
        const res = await api.post('/auth/register', { name, email, password, currency })
        const { token, user: userData } = res.data
        localStorage.setItem('budg-token', token)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        setUser(userData)
        return userData
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('budg-token')
        delete api.defaults.headers.common['Authorization']
        setUser(null)
        toast.success('Déconnexion réussie')
    }, [])

    const updateUser = useCallback((updates) => {
        setUser(prev => ({ ...prev, ...updates }))
    }, [])

    const refreshUser = useCallback(async () => {
        const res = await api.get('/auth/me')
        setUser(res.data.user)
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
