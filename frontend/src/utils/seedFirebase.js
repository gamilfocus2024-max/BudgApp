import { db } from '../services/firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';

const defaultCategories = [
    // Revenus
    { id: 'cat_salary', name: 'Salaire', type: 'income', color: '#10b981', icon: 'briefcase', is_default: true },
    { id: 'cat_freelance', name: 'Freelance', type: 'income', color: '#06b6d4', icon: 'laptop', is_default: true },
    { id: 'cat_investment', name: 'Investissements', type: 'income', color: '#8b5cf6', icon: 'trending-up', is_default: true },
    { id: 'cat_rental', name: 'Location', type: 'income', color: '#f59e0b', icon: 'home', is_default: true },
    { id: 'cat_other_income', name: 'Autres revenus', type: 'income', color: '#6366f1', icon: 'plus-circle', is_default: true },
    // Dépenses
    { id: 'cat_housing', name: 'Logement', type: 'expense', color: '#ef4444', icon: 'home', is_default: true },
    { id: 'cat_food', name: 'Alimentation', type: 'expense', color: '#f97316', icon: 'shopping-cart', is_default: true },
    { id: 'cat_transport', name: 'Transport', type: 'expense', color: '#eab308', icon: 'car', is_default: true },
    { id: 'cat_health', name: 'Santé', type: 'expense', color: '#ec4899', icon: 'heart', is_default: true },
    { id: 'cat_entertainment', name: 'Loisirs', type: 'expense', color: '#a855f7', icon: 'music', is_default: true },
    { id: 'cat_education', name: 'Éducation', type: 'expense', color: '#3b82f6', icon: 'book', is_default: true },
    { id: 'cat_clothing', name: 'Vêtements', type: 'expense', color: '#14b8a6', icon: 'shopping-bag', is_default: true },
    { id: 'cat_tech', name: 'Technologie', type: 'expense', color: '#64748b', icon: 'smartphone', is_default: true },
    { id: 'cat_utilities', name: 'Factures', type: 'expense', color: '#84cc16', icon: 'zap', is_default: true },
    { id: 'cat_other_expense', name: 'Autres dépenses', type: 'expense', color: '#6b7280', icon: 'more-horizontal', is_default: true },
];

export const seedDefaultCategories = async () => {
    console.log('🌱 Amorçage des catégories par défaut...');
    const categoriesRef = collection(db, 'categories');

    for (const cat of defaultCategories) {
        await setDoc(doc(categoriesRef, cat.id), cat);
    }

    console.log('✅ Catégories initialisées !');
};
