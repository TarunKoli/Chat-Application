const express = require("express");
const app = express();
const uuid = require("uuid");
const cors = require("cors");
const fs = require("fs");
const io = require("socket.io")(8000, {
  cors: { origin: "http://127.0.0.1:5500" },
});
let users = [];
let rooms = [];

app.use(cors({ origin: "http://127.0.0.1:5500" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post("/login", (req, res) => {
  let user = users.find((person) => {
    return person.email === req.body.email;
  });

  if (user) {
    if (user.password === req.body.pass) return res.status(200).json({ user });
    else return res.status(404).json({ msg: "Wrong Password" });
  }

  user = {};
  user.id = uuid.v1();
  user.name = req.body.username;
  user.email = req.body.email;
  user.password = req.body.pass;
  user.status = true;
  user.friends = [];
  user.rooms = [];
  users.push(user);
  return res.status(200).json({
    user,
  });
});

app.get("/users", (req, res) => {
  res.status(200).json({
    data: users,
  });
});

app.post("/room", (req, res) => {
  const recieverId = req.body.reciever;
  const senderId = req.body.sender;

  const sender = users.find((user) => user.id === senderId);
  const reciever = users.find((user) => user.id === recieverId);

  let room = rooms.filter((rm) => {
    return (
      (rm.sender.id === senderId && rm.reciever.id === recieverId) ||
      (rm.sender.id === recieverId && rm.reciever.id === senderId)
    );
  });

  if (room.length > 0) {
    if (room[0].sender.id === senderId && room[0].reciever.id === recieverId) {
      room[0].sender.status = sender.status;
      room[0].reciever.status = reciever.status;
    } else {
      room[0].sender.status = reciever.status;
      room[0].reciever.status = sender.status;
    }
    return res.status(200).json({ room: room[0] });
  }

  room = {
    roomId: "room_" + uuid.v1(),
    sender: { id: sender.id, name: sender.name, status: sender.status },
    reciever: { id: reciever.id, name: reciever.name, status: reciever.status },
    messages: [],
  };

  rooms.push(room);

  sender.rooms.push(room.id);
  reciever.rooms.push(room.id);

  return res.status(200).json({ room });
});

app.post("/message", (req, res) => {
  const roomId = req.body.roomId;
  const userId = req.body.userId;

  const room = rooms.find((rm) => {
    return rm.roomId === roomId;
  });

  const msg = { id: userId, text: req.body.msg };
  room.messages.push(msg);
  return res.status(200).json({ msg });
});

io.on("connection", (socket) => {
  socket.on("new-user-joined", (user) => {
    const index = users.findIndex((person) => person.id === user.id);
    users[index].socketId = socket.id;
    users[index].status = true;
    user = users[index];
    socket.broadcast.emit("user-joined", user);
  });
  socket.on("join-room", ({ roomId, oldRoom }) => {
    if (oldRoom.roomId) socket.leave(oldRoom.roomId);
    socket.join(roomId);
  });
  socket.on("send-msg", ({ roomId, msg }) => {
    socket.to(roomId).emit("recieve", msg);
  });
  socket.on("disconnect", () => {
    const index = users.findIndex((person) => person.socketId === socket.id);
    if (index > -1) {
      users[index].status = false;
      socket.broadcast.emit("left", users[index]);
    }
  });
});

const createUser = (user) => {
  fs.readFile("db.json", (err, data) => {
    let updatedData = [];
    if (!err) {
      updatedData = JSON.parse(data);
    }

    updatedData.push(user);

    fs.writeFile("db.json", JSON.stringify(updatedData), (err) => {
      if (err) console.log(err);
    });
  });
};

app.listen(8080, () => {
  console.log("Server Listening on port : 8080");
});
