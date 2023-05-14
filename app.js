const express = require("express")
const session = require('express-session')
const MongoStore = require('connect-mongo')
const bodyParser = require("body-parser")
const app = express()
const dotenv = require('dotenv')
const passport = require('passport')
// const LocalStrategy = require('passport-local')
const md5 = require('md5')
const bcrypt = require('bcrypt')
const validator = require('validator')
dotenv.config()

// let items = JSON.stringify(items);

app.use(express.static("public"))
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

const usersCollection = require('./db').db().collection('users')
let User = function(data) {
    this.data = data
    this.errors = []
}

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

module.exports = User



app.get('/', function(req, res) {
    res.render('home')
})

app.get('/login', function(req, res) {
    res.render('login')
})

app.get('/register', function(req, res) {
    //  const items = await db.collection("users").find().toArray()
      res.render('register')
  })

app.post('/login', function(req, res) {

})

app.post('/register', function(req, res) {
    let user = new User(req.body)
    user.register().then(() => {
     req.session.user = {username: user.data.username, _id: user.data._id}
     req.session.save(function() {
      return res.render('secrets')
      })
    }).catch((err) => {
      console.log(err)
      return res.status(400).json(JSON.stringify(err));
    })
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