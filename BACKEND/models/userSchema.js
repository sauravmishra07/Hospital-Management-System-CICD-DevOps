import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minLength: [3, 'First name must be at least 3 characters!']
    },
    lastName: {
        type: String,
        required: true,
        minLength: [3, 'Last name must be at least 3 characters!']
    },
    email: {
        type: String,
        required: true,
        validate: [validator.isEmail, "Please enter a valid email address"]
    },
    phone: {
        type: Number,
        required: true,
        minLength: [10, 'Phone number must be at least 10 characters!'],
        maxLength: [10, 'Phone number not more than 10 characters!']
    },
    nic: {
        type: String,
        required: [true, "NIC is required"],
        minLength: [10, "NIC must contain 10 digits"],
        maxLength: [10, "NIC must not exceed 12 digits"],
    },
    dob: {
        type: Date,
        required: true,
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', 'other']
    },
    password: {
        type: String,
        required: true,
        minLength: [6, 'Password must be at least 6 characters!'],
        select: false,
    },
    role: {
        type: String,
        required: true,
        enum: ['Patient', 'Admin', 'Doctor'],
    },
    doctorDepartment: {
        type: String,
    },
    doctorAvatar: {
        public_id: String,
        url: String,
    }
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateJsonWebToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

export const User = mongoose.model("user", userSchema);