const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// 🔥 fix reconnect + CORS cho Render
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// 🔥 lưu room + user
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, name }) => {
    console.log("Join room:", roomId, socket.id);

    socket.join(roomId);

    // 🔥 tạo room nếu chưa có
    if (!rooms[roomId]) rooms[roomId] = [];

    // 🔥 XÓA USER CŨ nếu bị reconnect
    rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);

    // 🔥 thêm user mới
    const user = { id: socket.id, name };
    rooms[roomId].push(user);

    // 🔥 gửi danh sách user (CHỈ gửi ID, tránh lỗi client)
    socket.emit("all-users", rooms[roomId]);

    // 🔥 báo cho người khác
    socket.to(roomId).emit("user-connected", user);

    // 🔁 SIGNAL
    socket.on("signal", (data) => {
      io.to(data.to).emit("signal", {
        from: socket.id,
        data: data.data,
      });
    });

    // ❌ DISCONNECT
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);

        // 🔥 nếu room rỗng thì xoá luôn
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }
      }

      socket.to(roomId).emit("user-disconnected", socket.id);
    });
  });
});

// 🔥 QUAN TRỌNG CHO RENDER
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server chạy ở port", PORT);
});
