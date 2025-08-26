// modules/user/schema.js
const mongoose = require('mongoose');
const { required } = require('yargs');
let schema = mongoose.Schema;
const user = new mongoose.Schema({
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  profileId: { type: schema.Types.ObjectId, required: true },
  isProfile: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false }

  //   -----extra fields
},
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  });
const UserSchema = mongoose.model('User', user);

let authtokensSchema = new schema({
  userId: { type: schema.Types.ObjectId, ref: 'Users' },
  adminId: { type: schema.Types.ObjectId, ref: 'Admin' },
  refreshToken: { type: Buffer },
  role: { type: String },
  access_tokens: [{
    token: { type: Buffer },
    tokenExpiryTime: { type: Date },
    deviceId: { type: String },
    ipAddress: { type: String },
  }]
},
  { timestamps: true });

let Authtokens = mongoose.model('authtokens', authtokensSchema);


module.exports = {
  UserSchema,
  Authtokens
}

