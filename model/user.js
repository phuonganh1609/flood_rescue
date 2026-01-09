const mongoose = require('mongoose');
const {Schema} = mongoose;

// const Role = require('./role');

const UserSchema  = new Schema({
    fullName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },  
    role: {
        type: String,
        enum: ["Citizen", "Rescue Team", "Rescue Coordinator", "Admin", "Manager"],
    },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);