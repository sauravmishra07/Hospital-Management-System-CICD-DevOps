import mongoose from "mongoose";
import validator from "validator";

const appointmentSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        minLength: [3, 'First name must be at least 3 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        minLength: [3, 'Last name must be at least 3 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is requried'],
        trim: true,
        lowerCase: true,
        validate: [validator.isEmail, "Please enter a valid email address"]
    },
    phone: {
        type: Number,
        required: [true, "Phone number is required"],
        minLength: [10, 'Phone number must be at least 10 characters'],
        maxLength: [10, 'Phone number not more than 10 characters']
    },
    nic: {
        type: String,
        required: [true, "NIC is required"],
        minLength: [10, "NIC must contain 10 digits"],
        maxLength: [10, "NIC must not exceed 12 digits"],
    },
    dob: {
        type: Date,
        required: [true, 'Date of birth is required'],
        validate: [validator.isDate, 'Please enter a valid date']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['male', 'female', 'others']
    },appointment_date: {
        type: Date,
        required: [true, 'Appointment date is required'],
        validate: [validator.isDate, 'Please enter a valid date']
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
    },
    doctor: {
        firstName: {
            type: String,
            required: [true, 'Doctor first name is required'],
        },
        lastName: {
            type: String, 
            required: [true, 'Last name is reuired']
        }
    },
    hasVisted: {
        type: Boolean,
        default: false,
    },
    address: {
        type: String,
        required: [true, 'Address is required']
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Doctor Id is required'] 
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Patient Id is required']
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['Pending', 'Confirmed', 'Cancelled'],
    }
})

export const Appointment = mongoose.model("Appointment", appointmentSchema);