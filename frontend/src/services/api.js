import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
})

// Request interceptor - auto-attach token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('budg-token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// Response interceptor - global error handling
api.interceptors.response.use(
    response => response,
    error => {
        const message = error.response?.data?.error || error.message || 'Une erreur est survenue'

        if (error.response?.status === 401) {
            localStorage.removeItem('budg-token')
            window.location.href = '/login'
        } else if (error.response?.status === 429) {
            toast.error('Trop de requêtes. Veuillez patienter.')
        } else if (error.response?.status >= 500) {
            toast.error('Erreur serveur. Réessayez dans quelques instants.')
        }

        return Promise.reject(error)
    }
)

export default api
