import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        cart: {
            type: Array,
            default: [] // Optional: sync cart with DB in future
        }
    },
    { minimize: false, timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
