const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'awaitingconfirmation', 'disapproved' , 'resolved'],
        default: 'pending'
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resolvedBy: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' 
    },
    imageURL: { type: String, }
}, { timestamps: true });

const Card = mongoose.model('Card', cardSchema);
module.exports = Card;
