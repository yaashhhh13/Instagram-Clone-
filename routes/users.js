const mongoose = require("mongoose");
const plm = require("passport-local-mongoose")

const userSchema = mongoose.Schema({
  username: {
    type: String,
    require: true,
    unique: true
  },
  profilePic: {
    type: String
  },
  fullName: {
    type: String,
    require: true
  },
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  follower:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  ],
  bio: {
    type: String
  },
  savedPosts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    }
  ]
})


userSchema.plugin(plm);

module.exports = mongoose.model("user", userSchema);