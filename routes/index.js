var express = require('express');
var router = express.Router();

var users = require("./users.js");
var localStrategy = require("passport-local");
const { route, post } = require('../app');
const passport = require('passport');
const mongoose = require("mongoose");
const postModel = require("./post.js");
const storyModel = require("./story.js");
const commentModel = require("./comment.js");

passport.use(new localStrategy(users.authenticate()));

mongoose.connect("mongodb://0.0.0.0/instaClone-data").then(function(result){
  console.log("connected to database")
}).catch(function(err){
  console.log(err)
})

try {
  
/* GET home page. */
router.get('/', isLoggedIn ,async function(req, res, next) {
  var allUsers = await users.find()
  // res.render('index', { allUsers : allUsers });
  res.send(allUsers)
});

router.get('/register', function(req, res, next) {
  res.render('register');
});

router.post("/register", function(req, res, next){
  var newUserData = {
    username: req.body.username,
    profilePic: req.body.profilePic,
    fullName: req.body.fullName,
    bio: req.body.bio
  };

  users.register(newUserData, req.body.password)
  .then(function(){
    passport.authenticate("local")(req,res, function(){
      res.redirect("/profile");
    })
  })
})


router.get('/login', function(req, res, next) {
  res.render('login');
});

router.post("/login", passport.authenticate("local",{
  successRedirect: "/feed",
  failureRedirect: "/login"
}), function(req, res){})


router.get("/logout", function(req, res){
  req.logOut(function(err){
    if(err) {return next(err)}
    else {
      res.redirect("/");
    }
  })
})

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next()
  }
  else {
    res.redirect("/login");
  }
}


router.get("/feed",isLoggedIn ,async (req, res, next) => {
  
  var allPosts = await postModel.find().populate('user').populate('comments').populate({path: 'comments', populate:('user')})

  var allStories = await storyModel.find().populate('user');

  var currentUser = await users.findOne({
    username: req.session.passport.user
  })

  // console.log(allPosts)

  res.render("feed", {allPosts,currentUser ,user: req.user, allStories});
})


router.get("/createPost", function(req, res, next){
  res.render("createPost")
})


router.post("/createPost", isLoggedIn, async (req, res, next) =>{

  const allUsers = await users.find()

  const allPosts = await postModel.find().populate('user')

  var newPost = new postModel({
    media: req.body.media,
    caption: req.body.caption,
    mediaType: 'image',
    user: req.user._id
  })

  await newPost.save()

  res.redirect("/feed");
})


router.get("/like/:postId",isLoggedIn , async function(req, res, next){
  var currentPost = await postModel.findById(req.params.postId);

  var isAlreadyLiked = currentPost.likes.includes(req.user._id);

  if(isAlreadyLiked){
    currentPost.likes.pull(req.user._id);
  }
  else{
    currentPost.likes.push(req.user._id)
  }

  await currentPost.save();

  res.redirect("back");
})


router.get("/follow/:userId", isLoggedIn,async function(req, res, next){
  var currentUser = await users.findById(req.user._id);

  var oppositeUser = await users.findById(req.params.userId);

  var isAlreadyFollowed = await oppositeUser.follower.includes(currentUser._id);

  if(isAlreadyFollowed){
    oppositeUser.follower.pull(currentUser._id);
    currentUser.following.pull(oppositeUser._id);
    // res.json({status: "unfollowed"})
  }
  else{
    oppositeUser.follower.push(currentUser._id);
    currentUser.following.push(oppositeUser._id);
    // res.json({status: "followed"})
  }

  await currentUser.save();
  await oppositeUser.save();

  res.redirect("/profile");
})


router.post("/createStory",isLoggedIn ,async function(req, res, next){
  var newStory = new storyModel({
    media: req.body.media,
    caption: req.body.caption,
    user: req.user._id
  })

  await newStory.save();

  res.redirect("back")
})


router.get("/profile", isLoggedIn ,async function(req, res, next){

  var currentUser = await users.findOne({
    username: req.session.passport.user
  })

  var allPosts = await postModel.find().populate('user');

  // console.log(currentUser);
  // console.log(allPosts)

  res.render("profile", {user: currentUser, posts: allPosts});
})

router.get("/profile/:id", isLoggedIn,async function(req, res, next){
  var userDetails = await users.findOne({
    _id: req.params.id
  })

  var allPosts = await postModel.find().populate('user');

  res.render("profile", {user: userDetails, posts:allPosts})
})

router.get("/upload", function(req, res, next){
  res.render("upload");
})

router.post("/addComment/:postId",isLoggedIn ,async function(req, res, next){
  var currentPost = await postModel.findOne({
    _id:req.params.postId
  })

  var loggedInUser = await users.findOne({
    username: req.session.passport.user
  })

  var newComment = await commentModel.create({
    text : req.body.comment,
    user: loggedInUser._id,
    post: currentPost._id
  })

  currentPost.comments.push(newComment._id);

  await currentPost.save();

  res.redirect("back");
})


router.get("/delete/:commentId",async function(req, res, next){

  var loggedInUser = await users.findOne({
    username: req.session.passport.user
  })


  var currentComment = await commentModel.findOne({
    _id: req.params.commentId
  }).populate('user');

  var currentPost = await postModel.findOne({
    _id: currentComment.post
  }).populate('user')

  if(currentComment.user.username == loggedInUser.username || currentPost.user.username == loggedInUser.username){
    await commentModel.findOneAndDelete({
      _id: currentComment._id
    })
  }
  else{
    res.json({
      data: "you cant delete this comment as this is not your post"
    })
    return
  }

  await currentPost.comments.pull(currentComment._id);

  currentPost.save();

  res.redirect("back");
})

router.get("/likeStory/:storyId",isLoggedIn,async function(req, res, next){
  var CurrentStory = await storyModel.findOne({
    _id: req.params.storyId
  })

  var StoryAlreadyLiked = await CurrentStory.likes.includes(req.user._id);

  if(StoryAlreadyLiked){
    CurrentStory.likes.pull(req.user._id);
    res.json({
      status: "liked"
    })
  }
  else{
    CurrentStory.likes.push(req.user._id);
    res.json({
      status: "disliked"
    })
  }

  await CurrentStory.save();

  // res.redirect("back");

  // res.json({
  //   status: "liked"
  // })
})


router.get("/deleteStory/:storyId",isLoggedIn,async function(req,res,next){
  var CurrentStory = await storyModel.findOne({_id: req.params.storyId}).populate('user')

  var loggedInUser = await users.findOne({username: req.session.passport.user});

  if(CurrentStory.user.username == loggedInUser.username){
    await storyModel.findOneAndDelete({
      _id: req.params.storyId
    })
  }
  else{
    // res.send("this story is not uploaded by you")
    res.redirect("/storydelete")
    return
  }

  res.redirect("/feed");
})


router.get("/storydelete", isLoggedIn, function(req, res, next){
  res.render("storydelete");
})

router.get("/Search", isLoggedIn,async function(req, res, next){
  var AllUsers = await users.find();

  var Allposts = await postModel.find().populate('user');

  var currentUser = await users.findOne({
    username: req.session.passport.user
  })
  
  res.render("Search", {users: AllUsers, posts: Allposts, currentUser});
})


router.post("/searchUser", isLoggedIn,async function(req, res, next){
  // console.log(req.body.data);
  var searchedUser = await users.find({
    username: {$regex: req.body.data}
  })
  res.json({searchedUser});
})


router.get("/savepost/:saveId", isLoggedIn,async function(req, res, next){

  var loggedInUser = await users.findOne({
    username: req.session.passport.user
  })

  console.log(loggedInUser);

  var currentPost = await postModel.findOne({
    _id: req.params.saveId
  }).populate('user')
  
  // console.log(loggedInUser.user.savedPosts)

  await loggedInUser.savedPosts.push(currentPost._id);

  await loggedInUser.save();

  // console.log(loggedInUser);

  await currentPost.save();

  res.redirect("/savedPosts");

})

router.get("/savedPosts", isLoggedIn,async function(req, res, next){
  
  var currentLoggedUser = await users.findOne({
    username: req.session.passport.user
  })

  var allPosts = await postModel.find()

  res.render("savedPosts", {user : currentLoggedUser, posts: allPosts, })
})


router.get("/editProfile/:userId", isLoggedIn,async function(req, res, next){
  var EditUserDEtails = await users.findOne({
    _id: req.params.userId
  })

  res.render("editProfile", {user: EditUserDEtails});
})


router.post("/updateProfileDetails/:id", isLoggedIn,async function(req, res, next){
  var UpdateDetails = await users.findOneAndUpdate({
    _id: req.params.id,
    username:req.body.username,
    fullName: req.body.fullName,
    profilePic: req.body.profilePic,
    bio: req.body.bio
  })

  await UpdateDetails.save();

  res.redirect("/profile")
})

// Try & Catch Function Ends here
} catch (error) {
  console.log(error)
}






module.exports = router;
