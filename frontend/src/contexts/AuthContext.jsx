import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchUserProfile = async (uid) => {
        try {
            const docRef = doc(db, 'users', uid)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                return docSnap.data()
            }
            return null
        } catch (error) {
            console.error('Error fetching profile:', error)
            return null
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const profile = await fetchUserProfile(firebaseUser.uid)
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    ...profile
                })
            } else {
                setUser(null)
            }
            setLoading(false)
        })

        return unsubscribe
    }, [])

    const login = useCallback(async (email, password) => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const profile = await fetchUserProfile(userCredential.user.uid)
        const userData = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            ...profile
        }
        setUser(userData)
        return userData
    }, [])

    const register = useCallback(async (name, email, password, currency = 'EUR') => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(userCredential.user, { displayName: name })

        const profile = {
            name,
            currency,
            theme: 'light',
            hasSeenTour: false,
            createdAt: new Date().toISOString(),
            role: 'user'
        }

        await setDoc(doc(db, 'users', userCredential.user.uid), profile)

        const userData = {
            uid: userCredential.user.uid,
            email,
            displayName: name,
            ...profile
        }
        setUser(userData)
        return userData
    }, [])

    const logout = useCallback(async () => {
        await signOut(auth)
        setUser(null)
        toast.success('Déconnexion réussie')
    }, [])

    const updateUser = useCallback(async (updates) => {
        if (!user) return
        try {
            const userRef = doc(db, 'users', user.uid)
            await updateDoc(userRef, updates)
            setUser(prev => ({ ...prev, ...updates }))
        } catch (error) {
            toast.error('Erreur lors de la mise à jour du profil')
        }
    }, [user])

    const changePassword = useCallback(async (currentPassword, newPassword) => {
        if (!auth.currentUser) return
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
            await reauthenticateWithCredential(auth.currentUser, credential)
            await updatePassword(auth.currentUser, newPassword)
            toast.success('Mot de passe mis à jour !')
        } catch (err) {
            console.error('Password error:', err)
            throw err
        }
    }, [])

    const refreshUser = useCallback(async () => {
        if (!user) return
        const profile = await fetchUserProfile(user.uid)
        setUser(prev => ({ ...prev, ...profile }))
    }, [user])

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, changePassword, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
