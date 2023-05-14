const express = require("express")
const session = require('express-session')
const MongoStore = require('connect-mongo')
const ObjectID = require('mongodb').ObjectId
const bodyParser = require("body-parser")
const app = express()
const dotenv = require('dotenv')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const md5 = require('md5')
const bcrypt = require('bcrypt')
const validator = require('validator')
const flash = require('flash')
dotenv.config()

const usersCollection = require('./db').db().collection('users')
let User = function(data, requestedPostId) {
    this.data = data
    this.errors = []
    this.requestedPostId = requestedPostId
}
module.exports = User

// let items = JSON.stringify(items);

app.use(express.static("public"))
app.use(express.json())
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
    extended: true
}))
let sessionOptions = session({
    secret: "This app has secrets",
    store: MongoStore.create({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true} // session is valid for One day
})

app.use(sessionOptions)
app.use(passport.initialize())
app.use(passport.session())
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3001/auth/google/secrets',
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
}, function(accessToken, refreshToken, profile, cd) {
    return new Promise(async (resolve, reject) => {
     if (!this.errors.length) {
         await User.findAndModify({
             query: { _id: new ObjectID(this.requestedPostId)},
             update: {
               $setOnInsert: { googleId: profile._id }
             },
             new: true,   // return new doc if one is upserted
             upsert: true // insert the document if it does not exist
         })
         resolve("success")
     } else {
         cd(user)
         reject("failure")
      }
    })
    // User.findOrCreate({ googleId: profile.id}, function(err, user) {
    //     return cd(err, user)
    // })
}))
   

app.use(flash())
app.use(function(req, res, next) {
    res.locals.errors = req.flash('errors')
    if (req.session.user) {
        req.session.user = req.session.user._id
    }
     else {
        req.session.user = 0
    }
  // make user session data available from within view templates
  res.locals.user = req.session.user
  next()
})

User.prototype.cleanUp = function() {
    if (typeof(this.data.username) != "string") {this.data.username = ""}
    if (typeof(this.data.password) != "string") {this.data.password = ""}
    // get rid of any bogus properties
    this.data = {
      username: this.data.username.trim().toLowerCase(),
      password: this.data.password
    }
  }

User.prototype.validate = function() {
    return new Promise(async (resolve, reject) => {
      if (this.data.username == "") {this.errors.push("You must provide a username.")}
      if (!validator.isEmail(this.data.username)) {this.errors.push("You must provide a valid email address.")}
      if (this.data.password == "") {this.errors.push("You must provide a password.")}
      if (this.data.password.length > 0 && this.data.password.length < 10) {this.errors.push("Password must be at least 10 characters.")}
      if (this.data.password.length > 50) {this.errors.push("Password cannot exceed 50 characters.")}
      if (this.data.username.length > 0 && this.data.username.length < 3) {this.errors.push("Username must be at least 3 characters.")}
      if (this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters.")}
    
      // Only if username is valid then check to see if it's already taken
      if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
        let usernameExists = await usersCollection.findOne({username: this.data.username})
        if (usernameExists) {this.errors.push("That username is already taken.")}
      }
      // Only if email is valid then check to see if it's already taken
      if (validator.isEmail(this.data.username)) {
        let emailExists = await usersCollection.findOne({username: this.data.username})
        if (emailExists) {this.errors.push("That email is already being used.")}
      }
      resolve()
    })
  }

User.prototype.register = function() {
    return new Promise(async (resolve, reject) => {
    this.cleanUp()
    await this.validate()
    if (!this.errors.length) {
        // hash user password
        let salt = bcrypt.genSaltSync(10)
        this.data.password = bcrypt.hashSync(this.data.password, salt)
        await usersCollection.insertOne(this.data)
        resolve()
      } else {
        reject(this.errors)
      }
    })
}

User.prototype.login = function() {
    return new Promise((resolve, reject) => {
      this.cleanUp()
      usersCollection.findOne({username: this.data.username}).then((attemptedUser) => {
        if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
          this.data = attemptedUser
          resolve("Congrats!")
        } else {
          reject("Invalid username / password.")
        }
      }).catch(function() {
        reject("Please try again later.")
      })
    })
}

app.get('/', function(req, res) {
    if (req.session.user) {
        res.render('secrets')
    } else {
        res.render('home', {errors: req.flash('errors')})
    }
   // res.render('home')
})

app.get('/login', function(req, res) {
    res.render('login', {errors: req.flash('errors')} )
})

app.get('/register', function(req, res) {
    //  const items = await db.collection("users").find().toArray()
      res.render('register', {regiErrors: req.flash('regiErrors')})
  })

app.post('/login', function(req, res) {
  let user = new User(req.body)
  user.login().then(function(result) {
    req.session.user = {username: user.data.username, _id: user.data._id}
    req.session.save(function() {
      res.render('secrets')
    })
  }).catch(function(e) {
    console.log(e)
    req.flash('errors', e)
    req.session.save(function() {
      res.redirect('/login')
    })
  })
})

app.post('/register', function(req, res) {
    let user = new User(req.body)
    user.register().then(() => {
     req.session.user = {username: user.data.username, _id: user.data._id}
     req.session.save(function() {
      return res.render('secrets')
      })
    }).catch((regiErrors) => {
     regiErrors.forEach(function(error) {
     req.flash('regiErrors', error)
     })
        req.session.save(function() {
        console.log(regiErrors)
        return res.redirect('/register')
        })
      // return res.redirect('/')
      // return res.status(400).json(JSON.stringify(err));
    })
 })

 app.get('/logout', function(req, res){
    req.session.destroy(function() {
       return res.redirect('/')
    })
 })

 app.route('/auth/google').get(passport.authenticate('google', 
 {scope: ['profile']}));

 app.route('/auth/google/secrets').get(passport.authenticate('google', 
 {failureRedirect: '/login'}), function(req, res) {
    //then user logged in successfully, 
    return res.render('secrests')
 })

// Login & Register using hashing function
// 
// app.post('/login', async function(req, res) {
//     const username = req.body.username;
//     const password = req.body.password;
//     await db.collection("users").findOne({ email: username }, function(err, foundOne) {
//         if (err) {
//             console.log(err)
//         } else {
//             if (foundOne) {
//                 bcrypt.compare(password, foundOne.password, function(err, result) {
//                      if (result === true) {
//                         res.render("secrets")
//                     }
//                     return res.status(400)
//                 })
//             }
//         }
//     })
// })


//  app.post("/register", async function(req, res) {
//     try {
//         await bcrypt.hash(req.body.password, saltRounds, function(err, hash){
//         const info = db.collection("users").insertOne({ email: req.body.username, password: hash })
//         //  res.json({ _id: info.insertedId, email: req.body.username, password: req.body.password })
//         console.log(info)
//         if (err) {
//             console.log(err)
//             return res.status('400')
//         }
//         return res.render("secrets")
//         })
//     } catch {
//         if (err) {
//             console.log(err)
//         } else {
//             res.render("secrets")
//         }
//     }
// })


module.exports = app