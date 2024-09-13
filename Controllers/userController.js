const User = require("./../Models/userSchema")
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');

const { OAuth2Client } = require('google-auth-library');

// Email configuration using nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail', // You can use other services like SendGrid, Mailgun, etc.
    auth: {
        user: process.env.EMAIL, // your email address
        pass: process.env.PASSWORD, // your email password or app password
    },
});

// Generate a random verification code
const generateVerificationCode = () => {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-digit random code
};

const client = new OAuth2Client('42600711913-rbmnj72jqgnuhemqjba1ths5q83cvaq1.apps.googleusercontent.com');

exports.googleLogin = async (req, res) => {
    const { idToken } = req.body;
    try {
      // Verify the ID token with Google
      const ticket = await client.verifyIdToken({
        idToken,
        audience: '42600711913-rbmnj72jqgnuhemqjba1ths5q83cvaq1.apps.googleusercontent.com',
      });
      const payload = ticket.getPayload();
      
      // Extract user information from the payload
      const { sub: googleId, email, name, picture } = payload; // `picture` is the profile picture URL
  
      // Find or create the user in the database
      let user = await User.findOne({ googleId });
      if (!user) {
        // Create a new user if not found
        user = new User({
            _id: googleId,
            email: email,
            name: name,
            image: picture, // Store the profile picture URL
        });
        await user.save();
      } else {
        // Update user profile picture if needed
        user.profilePicture = picture;
        await user.save();
      }
  
      // Generate JWT token
      const userToken = jwt.sign(
        { userId: user._id },
        process.env.SECRECT_KEY, // Ensure this is set in your environment variables
        { expiresIn: '1h' } // Token expiry time
      );
  
      // Respond with user information and token
      res.status(200).json({ userToken, user: { userId: user._id, profilePicture: user.profilePicture } });
    } catch (error) {
      res.status(400).json({ error: 'Invalid Google login.' });
    }
  };

  exports.facebookLogin = async (req, res) => {
    const { accessToken, userID } = req.body;
    try {
        // Verify the access token with Facebook
        const fbResponse = await axios.get(`https://graph.facebook.com/me?access_token=${accessToken}`);
        
        // Check if the userID matches
        if (fbResponse.data.id !== userID) {
            throw new Error('Invalid user ID');
        }

        const { email, name, picture } = fbResponse.data;

        // Find or create the user in the database
        let user = await User.findOne({ facebookId: userID });
        if (!user) {
            user = new User({
                facebookId: userID,
                email,
                name,
                image: picture.data.url // Store the profile picture URL
            });
            await user.save();
        } else {
            // Update user profile picture if needed
            user.profilePicture = picture.data.url;
            await user.save();
        }

        // Generate JWT token
        const userToken = jwt.sign(
            { userId: user._id },
            process.env.SECRECT_KEY,
            { expiresIn: '1h' }
        );

        // Respond with user information and token
        res.status(200).json({ userToken, user: { userId: user._id, profilePicture: user.profilePicture } });
    } catch (error) {
        res.status(400).json({ error: 'Invalid Facebook login.' });
    }
};

exports.instagramLogin = async (req, res) => {
    const { accessToken } = req.body;
    try {
        // Verify the access token with Instagram
        const igResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`);
        
        const { id: instagramId, username, account_type } = igResponse.data;

        // Find or create the user in the database
        let user = await User.findOne({ instagramId });
        if (!user) {
            user = new User({
                instagramId,
                username,
                accountType: account_type
                // Add more fields as needed, e.g., profilePicture
            });
            await user.save();
        } else {
            // Update user info if needed
            user.username = username;
            user.accountType = account_type;
            await user.save();
        }

        // Generate JWT token
        const userToken = jwt.sign(
            { userId: user._id },
            process.env.SECRECT_KEY, // Ensure this is set in your environment variables
            { expiresIn: '1h' }
        );

        // Respond with user information and token
        res.status(200).json({ userToken, user: { userId: user._id, username: user.username, accountType: user.accountType } });
    } catch (error) {
        res.status(400).json({ error: 'Invalid Instagram login.' });
    }
};

// Add user function
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email" });
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();

        // Create a new user with a verification code
        const newUser = new User({
            name,
            email,
            password,
            verificationCode,
            isVerified: false,
        });

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            const imageURL = result.secure_url;
            newUser.imageURL = imageURL;
        }

        // Save the user to the database
        await newUser.save();

        // Send verification email
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Email Verification',
            text: `Your verification code is: ${verificationCode}`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Error sending email:", err);
                return res.status(500).json({ error: 'Error sending verification email' });
            } else {
                console.log('Verification email sent:', info.response);
                return res.status(200).json({
                    message: 'User registered successfully. Verification email sent.',
                    userId: newUser._id,
                });
            }
        });
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Verify user function
exports.verifyUser = async (req, res) => {
    const { userId, code } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.verificationCode === code) {
            user.verified = true;
            user.verificationCode = undefined; // Clear the verification code after successful verification
            await user.save();
            return res.status(200).json({ message: 'User verified successfully' });
        } else {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error("Error verifying user:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching users', error: error.message });
    }
};

exports.userLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find the user by email
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      // Check the password
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      // Create a JWT token
      const token = jwt.sign({ id: user._id }, process.env.SECRECT_KEY, { expiresIn: '1h' });
  
      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          userId: user._id,
          name: user.name,
          email: user.email,
          imageURL: user.imageURL // Include imageURL if needed
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };

exports.getUserById = async (req, res, next) => {
    try {
        const userId = req.params.id; // Extract the user ID from the request parameters
        const user = await User.findById(userId); // Find the user by ID using Mongoose

        if (!user) {
            return res.status(404).send({
                message: "User not found. Please ensure you are using the right credentials"
            });
        }

        // If the user is found, send the user data as JSON
        res.status(200).json({
            message: "User found successfully",
            data: user
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

exports.updateProfile = async (req, res) => {
    console.log("Request body:", req.body);
    console.log("Files:", req.file);
    // Parse the form data
    const { name, email, role, password, userId } = req.body;

    try {
        // Find the user by ID
        console.log("Searching for user with ID:", userId);
        const preuser = await User.findOne({ _id: userId });

        // Check if user exists
        if (!preuser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if the new email already exists for a different user
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ error: "Email address already in use" });
        }

        // If a new file is uploaded, update the image URL
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            const imageURL = result.secure_url;
            preuser.imageURL = imageURL;
        }

        if (password) {
            // Hash the password before saving
            preuser.password = await bcrypt.hash(password, 10);
        }

        // Update user information
        preuser.email = email;
        preuser.name = name;
        preuser.role = role;

        console.log(preuser);

        // Save the updated user
        await preuser.save();

        // Respond with updated user data
        res.status(200).json({ message: "User profile updated successfully", user: preuser });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern.email === 1) {
            // Duplicate email error
            return res.status(400).json({ error: "Email address already in use" });
        } else {
            console.error("Error updating user profile:", error);
            res.status(500).json({ error: "Failed to update user profile" });
        }
    }
};

exports.userLogout = async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });

        await req.user.save();
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error("Error logging out:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};