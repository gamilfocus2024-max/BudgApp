import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, CheckCircle2, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const TOUR_STEPS = [
    {
        target: 'body',
        title: 'Bienvenue sur BudgApp ! 👋',
        content: 'Prêt à prendre le contrôle de vos finances ? Suivez ce petit guide pour découvrir les fonctionnalités clés.',
        position: 'center'
    },
    {
        target: '#add-transaction-btn',
        title: 'Ajout Rapide',
        content: 'Cliquez ici pour enregistrer instantanément une nouvelle transaction (revenu ou dépense).',
        position: 'bottom'
    },
    {
        target: '#sidebar-nav',
        title: 'Navigation principale',
        content: 'Accédez facilement à vos budgets, objectifs et rapports détaillés depuis ce menu.',
        position: 'right'
    },
    {
        target: '#stats-overview',
        title: 'Vue d\'ensemble',
        content: 'Consultez votre solde total et l\'évolution de votre mois en un clin d\'œil.',
        position: 'bottom'
    },
    {
        target: '#theme-toggle-btn',
        title: 'Mode Visuel',
        content: 'Personnalisez votre expérience en basculant entre le mode clair et le mode sombre.',
        position: 'bottom'
    }
]

export default function OnboardingTour() {
    const { user, updateUser } = useAuth()
    const [currentStep, setCurrentStep] = useState(-1)
    const [isVisible, setIsVisible] = useState(false)
    const [showFinalModal, setShowFinalModal] = useState(false)

    useEffect(() => {
        // Only start tour if user exists and hasn't seen it yet
        if (user && user.hasSeenTour === false) {
            const timer = setTimeout(() => {
                setIsVisible(true)
                setCurrentStep(0)
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [user])

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleComplete()
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleComplete = async () => {
        setIsVisible(false)
        setShowFinalModal(true)
        await updateUser({ hasSeenTour: true })
    }

    const handleClose = async () => {
        setIsVisible(false)
        setShowFinalModal(false)
        if (user && user.hasSeenTour === false) {
            await updateUser({ hasSeenTour: true })
        }
    }

    if (!isVisible && !showFinalModal) return null

    const step = TOUR_STEPS[currentStep]
    const targetEl = step?.target !== 'body' ? document.querySelector(step?.target) : null
    const targetRect = targetEl?.getBoundingClientRect()

    const isMobile = window.innerWidth <= 768

    const getTooltipStyle = () => {
        if (isMobile && step?.position !== 'center') {
            // CSS handles fixed bottom positioning for mobile via className
            return { position: 'fixed', zIndex: 1001 }
        }

        if (step?.position === 'center' || !targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                position: 'fixed',
                zIndex: 1001
            }
        }

        const padding = 12
        let style = { position: 'fixed', zIndex: 1001 }

        if (step.position === 'bottom') {
            style.top = `${targetRect.bottom + padding}px`
            style.left = `${targetRect.left + (targetRect.width / 2)}px`
            style.transform = 'translateX(-50%)'
        } else if (step.position === 'right') {
            style.top = `${targetRect.top + (targetRect.height / 2)}px`
            style.left = `${targetRect.right + padding}px`
            style.transform = 'translateY(-50%)'
        } else if (step.position === 'top') {
            style.bottom = `${window.innerHeight - targetRect.top + padding}px`
            style.left = `${targetRect.left + (targetRect.width / 2)}px`
            style.transform = 'translateX(-50%)'
        }

        return style
    }

    return (
        <>
            {/* Tour Overlay */}
            {isVisible && (
                <div className="tour-overlay">
                    {targetRect && (
                        <div
                            className="tour-highlight pulse"
                            style={{
                                top: targetRect.top - 8,
                                left: targetRect.left - 8,
                                width: targetRect.width + 16,
                                height: targetRect.height + 16
                            }}
                        />
                    )}

                    <div className={`tour-tooltip ${isMobile ? 'mobile-tour' : ''}`} style={getTooltipStyle()}>
                        <div className="tour-tooltip-header">
                            <h3>{step.title}</h3>
                            <button className="btn-close" onClick={handleClose} style={{ padding: 4 }}><X size={18} /></button>
                        </div>
                        <div className="tour-tooltip-body">
                            <p>{step.content}</p>
                        </div>
                        <div className="tour-tooltip-footer">
                            <div className="tour-progress">
                                {currentStep + 1} <span style={{ opacity: .5 }}>/ {TOUR_STEPS.length}</span>
                            </div>
                            <div className="tour-btns">
                                {currentStep > 0 && (
                                    <button className="btn btn-ghost btn-sm" onClick={handlePrev} style={{ padding: '8px 12px' }}>
                                        <ChevronLeft size={18} />
                                        <span className="hidden-mobile">Précédent</span>
                                    </button>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={handleNext} style={{ padding: '8px 16px', fontWeight: 700 }}>
                                    {currentStep === TOUR_STEPS.length - 1 ? (
                                        <>Terminer <CheckCircle2 size={16} style={{ marginLeft: 6 }} /></>
                                    ) : (
                                        <>Suivant <ChevronRight size={18} style={{ marginLeft: 4 }} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Welcome Modal */}
            {showFinalModal && (
                <div className="modal-overlay">
                    <div className="modal-box tour-final-modal">
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

                            <button className="btn btn-primary btn-xl w-full" onClick={() => setShowFinalModal(false)} style={{ marginTop: 12 }}>
                                Commencer l'aventure
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
