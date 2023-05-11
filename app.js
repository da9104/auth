const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const app = express()
const dotenv = require('dotenv')
dotenv.config()

let { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")
let db

const client = new MongoClient(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
async function start() {
   await client.connect()
   module.exports = client
   db = client.db()
   app.listen(process.env.PORT || 3000)
   console.log("server started on port 3001.")
}

start()

// let items = JSON.stringify(items);

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
  //  const items = await db.collection("users").find().toArray()
    res.render('register')
})


 app.post("/register", async function(req, res) {
    try {
        const info = await db.collection("users").insertOne({ email: req.body.username, password: req.body.password })
        //  res.json({ _id: info.insertedId, email: req.body.username, password: req.body.password })
        res.render("secrets")
    } catch {
        if (error) {
            console.log(error)
        } else {
            res.render("secrets")
        }
    }
})


exports.module = app