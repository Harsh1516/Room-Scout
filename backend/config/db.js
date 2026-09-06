import mongoose from 'mongoose';

// Disable command buffering so queries fail immediately if MongoDB is not connected
mongoose.set('bufferCommands', false);

export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mal_practice', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Since we require DB now, we should exit if it fails
  }
}
