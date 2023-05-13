const express = require("express")
const bodyParser = require("body-parser")
const app = express()
const dotenv = require('dotenv')
const md5 = require('md5')
const bcrypt = require('bcrypt')
const saltRounds = 10
dotenv.config()

let { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")
let db

const client = new MongoClient(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
async function start() {
   await client.connect()
   module.exports = client
   db = client.db()
   app.listen(process.env.PORT || 3000)
   console.log("server started on port", process.env.PORT)
}

start()

// let items = JSON.stringify(items);

app.use(express.static("public"))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
    extended: true
}))

const secret = process.env.SECRET;

app.get('/', function(req, res) {
    res.render('home')
})

app.get('/login', function(req, res) {
    res.render('login')
})

app.post('/login', async function(req, res) {
    const username = req.body.username;
    const password = md5(req.body.password);
    await db.collection("users").findOne({ email: username }, function(err, foundOne) {
        if (err) {
            console.log(err)
        } else {
            if (foundOne) {
                if (foundOne.password === password) {
                    res.render("secrets")
                }
            }
        }
    })
})

app.get('/register', function(req, res) {
  //  const items = await db.collection("users").find().toArray()
    res.render('register')
})

 app.post("/register", async function(req, res) {
    try {
        await bcrypt.hash(req.body.password, saltRounds, function(err, hash){
        const info = db.collection("users").insertOne({ email: req.body.username, password: hash })
        //  res.json({ _id: info.insertedId, email: req.body.username, password: req.body.password })
        console.log(info)
        if (err) {
            console.log(err)
            return res.status('400')
        }
        return res.render("secrets")
        })
    } catch {
        if (err) {
            console.log(err)
        } else {
            res.render("secrets")
        }
    }
})


module.exports = app