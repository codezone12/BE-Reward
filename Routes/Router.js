const express = require("express")
const userController = require("./../Controllers/userController")
const cardController = require("../Controllers/cardController");
const messageController = require('../Controllers/messageController');
const router = express.Router()
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const moment = require('moment');
const path = require('path');

const generatePublicId = (req, file) => {
    // Get the original file extension
    let ext = path.extname(file.originalname);
  
    // Generate a unique identifier using the current timestamp and original file name
    let id = moment().format('YYYYMMDDHHmmss') + '-' + file.originalname.replace(ext, '');
  
    // Return the id with the file extension
    return id + ext;
  };
  
  cloudinary.config({
    cloud_name: 'dxa2sfens',
    api_key: '295943939133844',
    api_secret: 'LUSVVlTSqStuyg4P9--54-UAQRk'
  });
  
  // Configure cloudinary storage for multer-storage-cloudinary
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'p2p',
      public_id: generatePublicId,
    },
  });
  
  const parser = multer({ storage: storage });

router.post('/user/google-login', userController.googleLogin);
router.post('/user/facebook-login', userController.facebookLogin);
router.post('/user/instagram-login', userController.instagramLogin);

router.post('/users/register', parser.single('image'), userController.registerUser);
router.post('/user/verify', userController.verifyUser);
router.get("/users", userController.getAllUsers)
router.post("/user/login", userController.userLogin)
router.get("/user/:id", userController.getUserById);
router.post("/user/updateProfile",parser.single('image'), userController.updateProfile)

// Cards

router.post("/cards",parser.single('image'), cardController.createCard);
router.get("/cards/:id", cardController.getCardById);
router.post("/cards/editCard",parser.single('image'), cardController.editCard)
router.put("/cards/:id", cardController.updateCard);
router.get("/cards", cardController.getCards);
router.delete("/cards/:id", cardController.deleteCard);

// Message-related Routes

router.post("/messages/send", messageController.sendMessage); // Send a new message
router.get("/messages/conversation/:userId1/:userId2", messageController.getAllMessages); // Get conversation between two users
router.get("/messages/:userId", messageController.getMessage); // Get all messages for a user
router.patch("/messages/:messageId/seen", messageController.markMessageAsSeen); // Mark a message as seen
router.delete("/messages/:messageId", messageController.deleteMessage); // Delete a specific message

module.exports = router;