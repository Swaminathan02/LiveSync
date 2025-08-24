import mongoose from "mongoose";
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database Connected Successfully");
  } catch (err) {
    console.error("Database connection error:", err.message);
    process.exit(1);
  }
};
export default connectDB;
