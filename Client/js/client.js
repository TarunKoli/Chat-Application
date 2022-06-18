(() => {
  const socket = io("http://localhost:8000");

  const send = document.querySelector(".plane");
  const msgInp = document.querySelector("#msgInp");
  const chatContainer = document.querySelector(".chats");
  const stat = document.querySelector(".status span");
  let Users = new Map();
  let currentRoom = {
    roomId: "",
    sender: {},
    reciever: {},
    messages: [],
  };

  // API's

  function renderConversations() {
    fetch("http://localhost:8080/users")
      .then((data) => {
        return data.json();
      })
      .then((parsedData) => {
        parsedData.data.forEach((user) => {
          Users.set(user.email, user);
          createConversations(user);
        });
      });
  }

  function login() {
    const username = prompt("Enter Your Name to Join");
    const email = prompt("Enter Your Email");
    const password = prompt("Enter Your Password");

    fetch("http://localhost:8080/login", {
      method: "POST", // or 'PUT'
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        email: email,
        pass: password,
      }),
    })
      .then((res) => {
        if (res.status === 200) {
          renderConversations();
          return res.json();
        }
      })
      .then((parsedData) => {
        socket.emit("new-user-joined", parsedData.user);
        window.localStorage.setItem("user", parsedData.user.id);
      });
  }

  login();

  // Sockets
  socket.on("user-joined", (user) => {
    if (!Users.has(user.email)) createConversations(user);
  });

  socket.on("recieve", (msg) => {
    createMsg("rec", msg.text);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });

  socket.on("left", (user) => {
    Users.delete(user.email);
    Users.set(user.email, user);
  });

  socket.on("mod-status", ({ id, status }) => {
    console.log(id, status);
    stat.style.display = status ? "block" : "none";
  });

  // utility functions

  send.addEventListener("click", () => {
    sendMessage(msgInp.value);
  });

  const createMsg = (type, msg) => {
    const divi = document.createElement("div");
    const person = document.createElement("div");
    const image = document.createElement("img");
    const msgWrap = document.createElement("div");
    const para = document.createElement("p");

    image.src = "./assets/user.jpg";
    person.classList.add("person");
    let plotMsg = msg.split(" ");

    plotMsg.forEach((message) => {
      let wordBlock = document.createElement("span");
      if (message.length > 40) wordBlock.style.wordBreak = "break-all";
      wordBlock.textContent = message + " ";
      para.appendChild(wordBlock);
    });

    type === "rec"
      ? msgWrap.classList.add("rec_msg")
      : msgWrap.classList.add("sent_msg");

    person.appendChild(image);
    msgWrap.appendChild(para);

    if (type === "rec") {
      divi.appendChild(person);
      divi.appendChild(msgWrap);
      divi.classList.add("rec_wrapper");
    } else {
      divi.appendChild(msgWrap);
      divi.appendChild(person);
      divi.classList.add("sent_wrapper");
    }

    chatContainer.appendChild(divi);
  };

  const createConversations = (user) => {
    const Members = document.querySelector(".members");

    const divi = document.createElement("div");
    const wrapper = document.createElement("div");
    const dots = document.createElement("div");
    const singleDot = document.createElement("div");
    const pic = document.createElement("div");
    const name = document.createElement("div");
    const time = document.createElement("div");
    const p = document.createElement("p");
    const span = document.createElement("span");
    const image = document.createElement("img");
    const h3 = document.createElement("h3");

    divi.classList.add("people");
    // divi.setAttribute("active", "true");
    wrapper.classList.add("wrap");
    dots.classList.add("dots");
    pic.classList.add("pic");
    name.classList.add("name");
    time.classList.add("time");
    singleDot.classList.add("single");

    divi.append(wrapper, dots);
    wrapper.append(pic, name);

    image.src = "./assets/user.jpg";
    h3.textContent = user.name;
    pic.appendChild(image);
    name.appendChild(h3);
    name.appendChild(time);

    p.textContent = "I am ready";
    span.textContent = "6:30 pm";

    time.append(p, span);

    dots.appendChild(singleDot);

    Members.appendChild(divi);

    divi.addEventListener("click", () => {
      fetch(`http://localhost:8080/room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reciever: user.id,
          sender: window.localStorage.getItem("user"),
        }),
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
        })
        .then((data) => {
          socket.emit("join-room", {
            roomId: data.room.roomId,
            oldRoom: currentRoom,
          });
          updateChatBox(data.room);
        });
    });
  };

  const updateChatBox = (room) => {
    if (!currentRoom || currentRoom.roomId !== room.roomId) {
      const logedInUser = window.localStorage.getItem("user");
      chatContainer.innerHTML = "";
      currentRoom = room;

      document.querySelector(".status h3").textContent =
        room.reciever.id === logedInUser
          ? room.sender.name
          : room.reciever.name;

      if (room.reciever.id === logedInUser) {
        stat.style.display = room.sender.status ? "block" : "none";
      } else {
        stat.style.display = room.reciever.status ? "block" : "none";
      }

      room.messages.forEach((msg) => {
        if (msg.id === logedInUser) {
          createMsg("sent", msg.text);
        } else {
          createMsg("rec", msg.text);
        }
      });
    }
  };

  const sendMessage = (msg) => {
    const data = {
      roomId: currentRoom.roomId,
      userId: window.localStorage.getItem("user"),
      msg: msg,
    };
    fetch("http://localhost:8080/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        socket.emit("send-msg", { roomId: currentRoom.roomId, msg: data.msg });
        createMsg("sent", data.msg.text);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        msgInp.value = "";
      });
  };
})();
