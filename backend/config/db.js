import mongoose from 'mongoose';
import { env } from './env.js';

// Disable command buffering so queries fail immediately if MongoDB is not connected
mongoose.set('bufferCommands', false);

// Global connection event listeners for production monitoring and failover resilience
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Info] Connection established with replica set / cluster.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB Runtime Error] Connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Warning] Lost connection to MongoDB Atlas. Awaiting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB Info] Reconnected to MongoDB Atlas cluster.');
});

export async function connectDB(retries = 3, delay = 2000) {
  const uri = env.MONGO_URI || process.env.MONGO_URI;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 25,       // Scaled for Render 512MB RAM container & Atlas tier limits
        minPoolSize: 5,        // Keeps warm pool ready for instantaneous live requests
        maxIdleTimeMS: 30000,  // Reclaim idle sockets after 30s
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return true;
    } catch (error) {
      console.error(`MongoDB Connection Attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying MongoDB connection in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error(`MongoDB Connection Error: All ${retries} attempts failed: ${error.message}`);
        process.exit(1);
      }
    }
  }
}
