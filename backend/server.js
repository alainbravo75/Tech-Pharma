import dotenv from 'dotenv';
import app from './src/app.js';
import './src/db/connection.js'; // initialise la BDD (crée les tables si besoin)

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✔ Serveur pharmacie démarré sur http://localhost:${PORT}`);
  console.log('  Pense à lancer "npm run db:init" au premier démarrage pour créer le compte admin.');
});
