import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[Abhyasa Backend] MONGO_URI not configured. Operating in local mode.");
    return;
  }

  try {
    mongoose.set("bufferCommands", false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Abhyasa Backend] MongoDB connection warning: ${error.message}`);
  }
};

export default connectDB;