// modules/user/schema.js
const mongoose = require('mongoose');
const { required } = require('yargs');
let schema = mongoose.Schema;
const user = new mongoose.Schema({
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:{type: String, required:true},
    profileId:{type:schema.Types.ObjectId,required:true}
    //   -----extra fields
},
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  });
const UserSchema = mongoose.model('User', user);

module.exports = { 
    UserSchema
}

