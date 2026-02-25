import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <App />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3500,
                            style: {
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '14px',
                                borderRadius: '12px',
                                fontWeight: '500',
                            },
                            success: {
                                iconTheme: { primary: '#10b981', secondary: '#fff' }
                            },
                            error: {
                                iconTheme: { primary: '#ef4444', secondary: '#fff' }
                            }
                        }}
                    />
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>
)
