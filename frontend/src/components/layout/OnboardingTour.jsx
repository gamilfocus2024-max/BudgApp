import { useState, useEffect } from 'react'
import { CheckCircle2, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function OnboardingTour() {
    const { user, updateUser } = useAuth()
    const [showFinalModal, setShowFinalModal] = useState(false)

    useEffect(() => {
        // Only show welcome modal if user exists and hasn't seen it yet
        if (user && user.hasSeenTour === false) {
            const timer = setTimeout(() => {
                setShowFinalModal(true)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [user])

    const handleClose = async () => {
        setShowFinalModal(false)
        if (user && user.hasSeenTour === false) {
            await updateUser({ hasSeenTour: true })
        }
    }

    if (!showFinalModal) return null

    return (
        <div className="modal-overlay">
            <div className="modal-box tour-final-modal" style={{ maxWidth: 450 }}>
                <div className="tour-final-header">
                    <div className="tour-final-icon">
                        <CheckCircle2 size={48} color="var(--success-500)" />
                    </div>
                    <h2>Bienvenue sur BudgApp !</h2>
                </div>
                <div className="modal-body" style={{ textAlign: 'center', padding: '0 32px 32px' }}>
                    <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Votre compte est maintenant prêt. Vous pouvez commencer à gérer vos finances dès aujourd'hui.
                    </p>

                    <div className="developer-card">
                        <div className="dev-avatar">
                            <User size={24} />
                        </div>
                        <div className="dev-info">
                            <span className="dev-label">Développé par</span>
                            <span className="dev-name">ELGHIATI Zakaria</span>
                        </div>
                    </div>

                    <button className="btn btn-primary btn-xl w-full" onClick={handleClose} style={{ marginTop: 12 }}>
                        Commencer l'aventure
                    </button>
                </div>
            </div>
        </div>
    )
}
