const Message = require('./../Models/messageSchema');

// Send a new message
exports.sendMessage = async (req, res) => {
    try {
        const { sender, recipient, message } = req.body;
        const newMessage = new Message({
            sender,
            recipient,
            message
        });
        await newMessage.save();
        return res.status(201).json({ message: "Message sent successfully", data: newMessage });
        console.log("message sent successfully");
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

// Get conversation between two users
exports.getAllMessages = async (req, res) => {
    try {
        const { userId1, userId2 } = req.params; // Get both user IDs from the parameters
        const messages = await Message.find({
            $or: [
                { $and: [{ sender: userId1 }, { recipient: userId2 }] },
                { $and: [{ sender: userId2 }, { recipient: userId1 }] }
            ]
        }).populate('sender recipient', 'name email'); // Populate both sender and recipient data

        res.status(200).json(messages);
        console.log("all messages got successfully");
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

// Get a single message
exports.getMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Message.findById(id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

// Mark a message as seen
exports.markMessageAsSeen = async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        message.status = 'seen';
        await message.save();
        res.status(200).json({ message: "Message marked as seen", data: message });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Message.findByIdAndDelete(id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
