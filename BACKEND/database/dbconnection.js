import mongoose from "mongoose";

export const connectDB = () => {
    mongoose.connect(process.env.MONGO_URI, {
        dbName: 'hospital'
    }).then(() => {
        console.log('Database connected');
    }).catch((err) => {
        console.log(`Database connection failed ${err}`);
    })
}