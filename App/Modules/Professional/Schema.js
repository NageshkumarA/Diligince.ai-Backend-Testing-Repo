// modules/user/schema.js
const mongoose = require('mongoose');
const { required } = require('yargs');

const user = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:{type: String, required:true},
    profileId:{type:string,required:true}
    //   -----extra fields
},
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  });
let userSchema = mongoose.model("users", user);
const UserSchema = mongoose.model('User', userSchema);

module.exports = { 
    userSchema,
    UserSchema
}

