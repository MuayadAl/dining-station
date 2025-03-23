// backend/index.js
import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use('/api', adminRoutes); // So you can call /api/create-user from frontend

app.listen(PORT, () => {
  console.log(`Backend server is running at http://localhost:${PORT}`);
});
