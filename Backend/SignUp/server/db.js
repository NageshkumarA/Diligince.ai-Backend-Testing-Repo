import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

const mongoURL = process.env.MONGO_URL;

mongoose.connect(mongoURL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

export default mongoose;
