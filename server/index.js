const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow all for dev
    methods: ["GET", "POST"]
  }
});

let waitingPlayers = [];
let rooms = {};
let roomCounter = 0;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Player joins the matchmaking queue
  socket.on('join_queue', (playerData) => {
    console.log(`Player ${socket.id} joined queue with style ${playerData.martialArt}`);
    
    // Check if player is already in queue
    if (waitingPlayers.find(p => p.id === socket.id)) return;

    const player = {
      id: socket.id,
      socket: socket,
      data: playerData
    };

    waitingPlayers.push(player);

    if (waitingPlayers.length >= 2) {
      // Create a match
      const p1 = waitingPlayers.shift();
      const p2 = waitingPlayers.shift();

      const roomId = `room_${roomCounter++}`;
      
      rooms[roomId] = {
        players: {
          [p1.id]: { ...p1.data, id: p1.id, x: 200, y: 400, hp: 100, isLeft: true },
          [p2.id]: { ...p2.data, id: p2.id, x: 600, y: 400, hp: 100, isLeft: false }
        }
      };

      p1.socket.join(roomId);
      p2.socket.join(roomId);
      
      p1.socket.roomId = roomId;
      p2.socket.roomId = roomId;

      // Notify players
      io.to(roomId).emit('match_found', {
        roomId: roomId,
        players: rooms[roomId].players
      });

      console.log(`Match created: ${p1.id} vs ${p2.id} in ${roomId}`);
    } else {
      // Waiting
      socket.emit('waiting_for_opponent');
    }
  });

  // Game state synchronization
  socket.on('player_move', (data) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      // Update local state if necessary, then broadcast
      if (rooms[roomId].players[socket.id]) {
         rooms[roomId].players[socket.id].x = data.x;
         rooms[roomId].players[socket.id].y = data.y;
         rooms[roomId].players[socket.id].animation = data.animation;
         rooms[roomId].players[socket.id].flipX = data.flipX;
      }
      
      // Broadcast to other player
      socket.to(roomId).emit('opponent_move', data);
    }
  });

  socket.on('player_attack', (data) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      socket.to(roomId).emit('opponent_attack', data);
    }
  });

  socket.on('player_hit', (data) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const targetId = data.targetId;
      const damage = data.damage || 10;
      
      if (rooms[roomId].players[targetId]) {
        rooms[roomId].players[targetId].hp -= damage;
        
        io.to(roomId).emit('update_hp', {
          id: targetId,
          hp: rooms[roomId].players[targetId].hp
        });

        if (rooms[roomId].players[targetId].hp <= 0) {
          io.to(roomId).emit('game_over', {
            winner: socket.id
          });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from queue
    waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);

    // Handle leaving room
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      socket.to(roomId).emit('opponent_disconnected');
      delete rooms[roomId];
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Game Server running on port ${PORT}`);
});
