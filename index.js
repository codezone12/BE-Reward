const express = require("express");
const cors = require("cors");
const http = require('http');
const socketIo = require('socket.io');
const PORT = 5000;
require("dotenv").config();
require('./Database/config');
const Routes = require('./Routes/Router');
const Message = require('./Models/messageSchema');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
    }
});

app.use(cors());

app.use(express.json());
app.use(Routes);

// Simple route for basic server test
app.get('/', (req, res) => {
    res.status(200).json("Server is running")
});

// Map to store userID and their corresponding socketID
const userSocketMap = new Map();

io.on('connection', (socket) => {
    console.log('A user connected');

    // Register user's socket on connection
    socket.on('register', userId => {
        userSocketMap.set(userId, socket.id);
        console.log(`User ${userId} registered with socket ${socket.id}`);
        console.log('Current userSocketMap:', userSocketMap);
    });

    // Handle sending a message
    socket.on('sendMessage', ({ sender, recipient, message }) => {
        const recipientSocketId = userSocketMap.get(recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receiveMessage', { sender, recipient, message });
            console.log(`Message from ${sender} to ${recipient} delivered in real time: ${message}`);
        } else {
            console.log(`Recipient ${recipient} not connected.`);
        }
    });

    // Handle marking a message as seen
    socket.on('markAsSeen', (messageId) => {
        Message.findById(messageId) // Get the message from your database
            .then(message => {
                if (!message) {
                    console.error('Message not found:', messageId);
                    return;
                }
                const senderSocketId = userSocketMap.get(message.sender);
                if (senderSocketId) {
                    io.to(senderSocketId).emit('messageSeen', messageId); // Emit the messageSeen event to the sender
                }
            })
            .catch(error => {
                console.error('Error fetching message:', error);
            });
    });

    // Cleanup when user disconnects
    socket.on('disconnect', () => {
        userSocketMap.forEach((value, key) => {
            if (value === socket.id) {
                userSocketMap.delete(key);
                console.log(`User ${key} disconnected and removed.`);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
