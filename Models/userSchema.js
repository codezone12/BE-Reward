const mongoose = require('mongoose');
const validate = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY; // Store your secret key securely

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate(value) {
      if (!validate.isEmail(value)) {
        throw new Error('Invalid Email');
      }
    }
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    required: false
  },
  token: [
    {
      token: {
        type: String,
        required: true
      }
    }
  ],
  imageURL: {
    type: String
  }
});

// Hash password before saving the user
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Generate JWT token for authentication
userSchema.methods.generateAuthToken = async function () {
  try {
    const newToken = jwt.sign({ _id: this._id }, SECRET_KEY, { expiresIn: '1d' });
    this.token = this.token.concat({ token: newToken });
    await this.save();
    return newToken;
  } catch (error) {
    throw new Error(error);
  }
};

// User model
const User = mongoose.model('User', userSchema);
module.exports = User;
