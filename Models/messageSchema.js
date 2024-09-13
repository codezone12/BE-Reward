const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['sent', 'seen'],
        default: 'sent'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

// Export the model
const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
