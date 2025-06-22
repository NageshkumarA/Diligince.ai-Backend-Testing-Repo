import express from 'express';
import mongoose from './db.js';
import industryRoutes from './users/industryUser.js';
import professionalRoutes from './users/professionalUser.js';
import vendorRoutes from './users/vendorUser.js';
import loginRoute from './routes/login.js';
import otproute from './routes/otpVerification.js';
import cors from 'cors';

const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Add all needed methods
    allowedHeaders: ["Content-Type", "Authorization", "token"],
}));
app.use(express.json());

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


app.use('/industry', industryRoutes);
app.use('/professional', professionalRoutes);
app.use('/vendor', vendorRoutes);
app.use('/login', loginRoute);
app.use('/otp', otproute);

app.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
});

