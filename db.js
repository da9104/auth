const dotenv = require('dotenv')
dotenv.config()
let { MongoClient, ServerApiVersion, ObjectId } = require("mongodb")
let db

const client = new MongoClient(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })
async function start() {
   await client.connect()
   module.exports = client
   const app = require('./app')
   db = client.db()
   app.listen(process.env.PORT || 3000)
   console.log("server started on port", process.env.PORT)
}

start()