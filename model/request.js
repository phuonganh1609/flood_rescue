const mongoose = require('mongoose');
const { Schema } = mongoose;

const RequestMissionSchema = new Schema({
    userName: {
        type: String,
        required: true,
    },

    type: {
        type: String,
        enum: ['Rescue', 'Relief'],
    },

    latitude: {
        type: mongoose.Decimal128,
        required: true,
    },

    longitude: {
        type: mongoose.Decimal128,
        required: true,
    },

    description: {
        type: String,
    },

    priority: {
        type: String,
        enum: ['Critical', 'High', 'Normal'],
        default: 'Normal',
    },

    status: {
        type: String,
        default: 'Pending',
    },

    requestSupply: {
        type: [String],
    },
    requestMedia: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('RequestMission', RequestMissionSchema);
