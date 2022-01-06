// imports
const express = require("express");
const { query, Client } = require("faunadb");
const { Server } = require("socket.io");
const { createServer } = require("http");
const cors = require('cors');
const env = require("dotenv").config();

// variables
const app = express();
const port = process.env.PORT || 4000;
const server = createServer(app);
const io = new Server(server);
const { Create, Collection } = query;

//Allows cors requests from our frontend site, but blocks from other sites
const whitelist = ['https://plan-it-poker-clone.netlify.app/', 'https://plan-it-hackathon-backend.herokuapp.com/', 'http://localhost:3000']
const corsOptions = {
  origin: (origin, callback) =>{
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

// Secret
const secret = process.env.FAUNA_ADMIN_KEY;

// Client
const client = new Client({
  secret: secret,
  domain: "db.us.fauna.com",
});

// Middleware
app.use(express.static('public')); // Builds frontend of the app in the public folder.
app.use(cors(corsOptions)); // middleware to disable CORS and allow our external site to communicate

app.get("/user", async (req, res) => {
  try {
    const createP = await client.query(
      Create(Collection("Users"), {
        data: { username: "testValue", password: "otherTestValue" },
      })
    );
    console.log(createP);
  } catch (error) {
    console.log(error);
  }
});

const users = [];

// const formatUserValues = user => ({
//   username: user,
//   vote: null,
// })

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("username", (u) => {
    if (!users.find((user) => user.userId === u.userId) && u.userId) {
      users.push(u);
    }
    io.emit("users", users);
  });

  socket.on("kickUser", (userId) => {
    const userIndex = users.findIndex((user) => user.userId === userId);
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
    }
    io.emit("users", users);
  });

  socket.on("vote", (obj) => {
    const userIndex = users.findIndex((user) => user.userId === obj.userId);
    if (userIndex !== -1) {
      users[userIndex].vote = obj.vote;
    } else {
      users.push(obj);
    }
    console.log("users", users);
    io.emit("vote", users);
  });

  socket.on("cards flipped", (msg) => {
    io.emit("cards flipped", msg);
  });

  socket.on("reset", () => {
    users.forEach((u) => (u.vote = null));
    io.emit("reset", users);
    io.emit("cards flipped", false);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`);
// });

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});
