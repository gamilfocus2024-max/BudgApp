# BudgApp — Gestion Budgétaire Personnelle v1.0

BudgApp est une application web moderne et élégante pour la gestion des finances personnelles. Conçue pour être intuitive, performante et mobile-friendly, elle permet de suivre ses revenus, dépenses, budgets et objectifs financiers en toute simplicité.

## 🚀 Fonctionnalités Clés

- **Tableau de Bord Holistique** : Vue d'ensemble de la santé financière, tendances mensuelles et indicateurs clés (solde, épargne, alertes).
- **Gestion des Transactions** : Ajout rapide de revenus/dépenses, catégorisation intelligente, notes, et pièces jointes (reçus).
- **Planification Budgétaire** : Définition de budgets par catégorie avec alertes en cas de dépassement (80%, 100%).
- **Objectifs Financiers** : Suivi de projets d'épargne avec barres de progression animées.
- **Rapports Avancés** : Visualisation de données annuelle, répartition par catégorie et export PDF/Excel.
- **Support Multi-Devises** : Choix de la devise préférée (EUR, USD, MAD, etc.).
- **Mode Sombre/Clair** : Interface premium adaptable à vos préférences.
- **Sécurité** : Authentification JWT, hachage des mots de passe (bcrypt) et protection des routes.

## 🛠️ Stack Technique

- **Frontend** : React 18, Vite, Recharts, Lucide React, Axios.
- **Backend** : Node.js, Express, SQLite (better-sqlite3).
- **Design** : CSS natif avec un système de design personnalisé (variables, glassmorphisme).
- **Base de données** : SQLite (base de données fichier, pas besoin de serveur externe).

## 📦 Installation

### Prérequis
- Node.js (v18 ou supérieur)
- npm (v9 ou supérieur)

### Étapes d'installation

1. **Cloner le projet** :
   ```bash
   git clone <url-du-repo>
   cd budg
   ```

2. **Installer les dépendances** :
   À la racine du projet, exécutez :
   ```bash
   npm run install:all
   ```

3. **Configurer les variables d'environnement** :
   Le fichier `backend/.env` est déjà préconfiguré par défaut, mais vous pouvez le modifier si besoin (port, secret JWT, etc.).

4. **Initialiser les données (Seeding)** :
   Pour avoir un compte de démonstration avec des données :
   ```bash
   npm run seed
   ```
   *Identifiants démo* : `demo@budgapp.fr` / `Demo1234!`

5. **Lancer l'application** :
   Ouvrez deux terminaux à la racine :
   - Terminal 1 (Backend) : `npm run dev:backend`
   - Terminal 2 (Frontend) : `npm run dev:frontend`

L'application sera accessible sur `http://localhost:5173`.

## 📁 Structure du Projet

```text
budg/
├── backend/            # API Express
│   ├── src/
│   │   ├── config/     # Base de données
│   │   ├── controllers/# Logique métier
│   │   ├── middleware/ # Auth, Upload, Erreurs
│   │   ├── routes/     # Définition des endpoints
│   │   └── utils/      # Helpers et Seeding
│   └── uploads/        # Stockage des reçus
├── frontend/           # Application React
│   ├── src/
│   │   ├── components/ # Composants UI réutilisables
│   │   ├── contexts/   # Auth et Thème
│   │   ├── pages/      # Vues principales (Dashboard, etc.)
│   │   ├── services/   # Client API
│   │   └── utils/      # Formatters
└── README.md
```

## 📝 Licence
Ce projet est destiné à un usage personnel et éducatif.
