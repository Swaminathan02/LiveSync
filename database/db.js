import mongoose from "mongoose";
const connectDB = async (req, res) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Database Connected Successfully');
    } catch(err) {
        res.status(500).json({
            success : false,
            message : "DataBase Cant be connected! Some Error!"
        })
        process.exit(1);
    }
}
export default connectDB;