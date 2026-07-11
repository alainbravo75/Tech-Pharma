import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import utilisateursRoutes from './routes/utilisateurs.js';
import produitsRoutes from './routes/produits.js';
import mouvementsRoutes from './routes/mouvements.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

// Vérification de santé - utilisée par le frontend pour détecter la connexion réelle
app.get('/api/health', (req, res) => {
  res.json({ statut: 'ok', horodatage: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/utilisateurs', utilisateursRoutes);
app.use('/api/produits', produitsRoutes);
app.use('/api/mouvements', mouvementsRoutes);

// Gestion des routes inconnues
app.use((req, res) => {
  res.status(404).json({ erreur: 'Route introuvable.' });
});

// Gestion centralisée des erreurs non capturées
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erreur: 'Erreur serveur inattendue.' });
});

export default app;
