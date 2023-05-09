//jshint esversion:6
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const app = express()
const dotenv = require('dotenv')
dotenv.config()

const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
async function start() {
   await client.connect()
   module.exports = client
//   const app = require('./app')
   app.listen(process.env.PORT)
   console.log("server started on port 3001.")
}
start()

app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
    extended: true
}))

app.get('/', function(req, res) {
    res.render('home')
})

app.get('/login', function(req, res) {
    res.render('login')
})

app.get('/register', function(req, res) {
    res.render('register')
})

// app.listen(3000, function() {
//     console.log("server started on port 3000.")
// })