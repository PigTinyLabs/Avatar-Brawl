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
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let waitingPlayers = [];
let rooms = {};
let roomCounter = 0;

const PHASE1_DURATION = 45000;
const PHASE3_DURATION = 30000;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_queue', (playerData) => {
    if (waitingPlayers.find(p => p.id === socket.id)) return;
    
    // Add faceImage handling since we need it for Phase 2 expressions
    const player = { id: socket.id, socket: socket, data: playerData };
    waitingPlayers.push(player);

    if (waitingPlayers.length >= 2) {
      const p1 = waitingPlayers.shift();
      const p2 = waitingPlayers.shift();

      const roomId = `room_${roomCounter++}`;
      
      rooms[roomId] = {
        id: roomId,
        phase: 'wait', // wait, phase1, phase2, phase3, end
        timer: null,
        players: {
          [p1.id]: { ...p1.data, id: p1.id, x: 200, y: 400, isLeft: true, hp: 100, isBurned: false, hasTreasure: false },
          [p2.id]: { ...p2.data, id: p2.id, x: 600, y: 400, isLeft: false, hp: 100, isBurned: false, hasTreasure: false }
        },
        traps: [] // { id, x, y, type, ownerId }
      };

      p1.socket.join(roomId);
      p2.socket.join(roomId);
      p1.socket.roomId = roomId;
      p2.socket.roomId = roomId;

      io.to(roomId).emit('match_found', {
        roomId: roomId,
        players: rooms[roomId].players
      });

      startPhase1(roomId);
    } else {
      socket.emit('waiting_for_opponent');
    }
  });

  let privateRooms = {};

  socket.on('create_private', (playerData) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    privateRooms[code] = {
       id: code,
       host: { id: socket.id, socket: socket, data: playerData }
    };
    socket.emit('private_created', { code });
  });

  socket.on('join_private', (data) => {
    const code = data.code.toUpperCase();
    if (privateRooms[code]) {
       const host = privateRooms[code].host;
       const guest = { id: socket.id, socket: socket, data: data.playerData };
       
       const roomId = `room_${roomCounter++}`;
       rooms[roomId] = {
         id: roomId, phase: 'wait', timer: null,
         players: {
           [host.id]: { ...host.data, id: host.id, x: 200, y: 400, isLeft: true, hp: 100, isBurned: false, hasTreasure: false },
           [guest.id]: { ...guest.data, id: guest.id, x: 600, y: 400, isLeft: false, hp: 100, isBurned: false, hasTreasure: false }
         },
         traps: []
       };

       host.socket.join(roomId);
       guest.socket.join(roomId);
       host.socket.roomId = roomId;
       guest.socket.roomId = roomId;

       io.to(roomId).emit('match_found', { roomId: roomId, players: rooms[roomId].players });
       delete privateRooms[code];
       startPhase1(roomId);
    } else {
       socket.emit('join_error', { message: 'Room not found' });
    }
  });

  // Client syncs their physics state
  socket.on('sync_state', (data) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      // data: { x, y, parts: [...], flipX, animation }
      socket.to(roomId).emit('opponent_sync', { id: socket.id, ...data });
    }
  });

  // Client places a trap
  socket.on('place_trap', (trapData) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId] && rooms[roomId].phase === 'phase1') {
      const trap = { ...trapData, ownerId: socket.id, id: Math.random().toString(36).substr(2, 9) };
      rooms[roomId].traps.push(trap);
      io.to(roomId).emit('trap_placed', trap);
    }
  });

  // Client throws banana in phase 3
  socket.on('throw_banana', (data) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId] && rooms[roomId].phase === 'phase3') {
       io.to(roomId).emit('banana_thrown', { ...data, ownerId: socket.id });
    }
  });

  // Client throws a stone
  socket.on('throw_stone', (data) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
       io.to(roomId).emit('stone_thrown', { ...data, ownerId: socket.id });
    }
  });

  socket.on('stone_hit', (data) => {
     const roomId = socket.roomId;
     if (roomId && rooms[roomId] && rooms[roomId].phase === 'phase2') {
        const victimId = data.targetId;
        if (rooms[roomId].radarOwner === victimId) {
            rooms[roomId].radarOwner = null;
            io.to(roomId).emit('radar_dropped', { x: data.x, y: data.y });
        }
     }
  });

  // Client triggers a trap
  socket.on('trigger_trap', (trapId) => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const trapIndex = rooms[roomId].traps.findIndex(t => t.id === trapId);
      if (trapIndex !== -1) {
        const trap = rooms[roomId].traps[trapIndex];
        rooms[roomId].traps.splice(trapIndex, 1);
        io.to(roomId).emit('trap_triggered', { trapId, victimId: socket.id, trapType: trap.type });
        
        let damage = 0;
        if (trap.type === 'banana') damage = 15;
        if (trap.type === 'fake_treasure') damage = 30;

        if (damage > 0) {
           rooms[roomId].players[socket.id].hp -= damage;
           io.to(roomId).emit('hp_changed', { playerId: socket.id, hp: rooms[roomId].players[socket.id].hp });
           
           if (rooms[roomId].players[socket.id].hp <= 0) {
               // Victim died
               const winner = Object.keys(rooms[roomId].players).find(id => id !== socket.id);
               io.to(roomId).emit('game_over', { winner });
               if (rooms[roomId].timer) clearTimeout(rooms[roomId].timer);
               delete rooms[roomId];
               return; // End early
           }
        }

        if (trap.type === 'fake_treasure') {
           rooms[roomId].players[socket.id].isBurned = true;
           io.to(roomId).emit('player_burned', socket.id);
        } else if (trap.type === 'real_treasure' && rooms[roomId].phase === 'phase2') {
           // Finder got the key
           rooms[roomId].players[socket.id].hasTreasure = true;
           io.to(roomId).emit('key_found', socket.id);
        }
      }
    }
  });

  // Attack logic (Phase 2 & Phase 3)
  socket.on('attack_hit', (data) => {
     const roomId = socket.roomId;
     if (roomId && rooms[roomId] && (rooms[roomId].phase === 'phase3' || rooms[roomId].phase === 'phase2')) {
        const victimId = data.targetId;
        if (rooms[roomId].players[victimId].hasTreasure) {
           // Drop treasure/key!
           rooms[roomId].players[victimId].hasTreasure = false;
           // Give to attacker
           rooms[roomId].players[socket.id].hasTreasure = true;
           io.to(roomId).emit('treasure_stolen', { newOwnerId: socket.id, victimId });
        }

        // Steal Radar (Phase 2)
        if (rooms[roomId].phase === 'phase2' && rooms[roomId].radarOwner === victimId) {
            rooms[roomId].radarOwner = socket.id;
            io.to(roomId).emit('radar_owner_changed', socket.id);
        }
     }
  });

  socket.on('pickup_radar', () => {
     const roomId = socket.roomId;
     if (roomId && rooms[roomId] && rooms[roomId].phase === 'phase2') {
         if (!rooms[roomId].radarOwner) {
             rooms[roomId].radarOwner = socket.id;
             io.to(roomId).emit('radar_owner_changed', socket.id);
         }
     }
  });

  // Client opens the door with the key
  socket.on('open_door', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId] && rooms[roomId].phase === 'phase2') {
        if (rooms[roomId].players[socket.id].hasTreasure) {
            startPhase3(roomId, socket.id);
        }
    }
  });

  socket.on('disconnect', () => {
    waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      if (rooms[roomId].timer) clearTimeout(rooms[roomId].timer);
      socket.to(roomId).emit('opponent_disconnected');
      delete rooms[roomId];
    }
  });
});

function startPhase1(roomId) {
  const room = rooms[roomId];
  if(!room) return;
  room.phase = 'phase1';
  io.to(roomId).emit('phase_changed', { phase: 'phase1', timeLimit: PHASE1_DURATION });
  
  room.timer = setTimeout(() => {
    startPhase2(roomId);
  }, PHASE1_DURATION);
}

function startPhase2(roomId) {
  const room = rooms[roomId];
  if(!room) return;
  room.phase = 'phase2';
  room.radarOwner = null;
  io.to(roomId).emit('phase_changed', { phase: 'phase2' });
  
  // Spawn radar item in the center after 1 second
  setTimeout(() => {
     if (rooms[roomId] && rooms[roomId].phase === 'phase2') {
         io.to(roomId).emit('spawn_radar', { x: 400, y: 300 });
     }
  }, 1000);
}

function startPhase3(roomId, finderId) {
  const room = rooms[roomId];
  if(!room) return;
  
  if (room.timer) clearTimeout(room.timer);
  room.phase = 'phase3';
  room.players[finderId].hasTreasure = true;
  
  io.to(roomId).emit('phase_changed', { phase: 'phase3', timeLimit: PHASE3_DURATION, finderId });
  
  room.timer = setTimeout(() => {
    endGame(roomId);
  }, PHASE3_DURATION);
}

function endGame(roomId) {
  const room = rooms[roomId];
  if(!room) return;
  
  let winner = null;
  Object.values(room.players).forEach(p => {
     if (p.hasTreasure) winner = p.id;
  });
  
  // If no one has it somehow, it's a draw, but someone should have it.
  io.to(roomId).emit('game_over', { winner });
  if (room.timer) clearTimeout(room.timer);
  delete rooms[roomId];
}

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Game Server running on port ${PORT}`);
});
