const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_room', ({ roomId, userName }) => {
    console.log(`Join room: ${roomId} by ${userName || 'Anonymous'} (${socket.id})`);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        users: [],
        ghostMode: false,
        ghostTimer: null
      };
    }
    
    if (rooms[roomId].users.length >= 2 && !rooms[roomId].users.some(u => u.id === socket.id)) {
      socket.emit('room_full');
      return;
    }
    
    socket.join(roomId);
    
    const existingIndex = rooms[roomId].users.findIndex(u => u.id === socket.id);
    if (existingIndex === -1) {
      rooms[roomId].users.push({ id: socket.id, name: userName || 'User' });
    }
    
    io.to(roomId).emit('user_joined', {
      userCount: rooms[roomId].users.length,
      users: rooms[roomId].users,
      ghostMode: rooms[roomId].ghostMode
    });
  });
  
  socket.on('send_message', (payload) => {
    const { roomId } = payload;
    socket.to(roomId).emit('receive_message', payload);
  });

  socket.on('mark_read', ({ roomId, messageId }) => {
    socket.to(roomId).emit('message_read', { messageId });
  });

  socket.on('react_message', ({ roomId, messageId, emoji, userName }) => {
    io.to(roomId).emit('message_reacted', { messageId, emoji, userName });
  });

  // Interactive Poll Voting
  socket.on('vote_poll', ({ roomId, messageId, optionIndex, userName }) => {
    io.to(roomId).emit('poll_voted', { messageId, optionIndex, userName });
  });

  // Collaborative Drawing Canvas
  socket.on('draw_stroke', ({ roomId, strokeData }) => {
    socket.to(roomId).emit('canvas_drawn', { strokeData });
  });

  socket.on('clear_canvas', ({ roomId }) => {
    socket.to(roomId).emit('canvas_cleared');
  });

  // WebRTC P2P Video/Audio Call Signaling
  socket.on('call_user', ({ roomId, callType, callerName, sdpOffer }) => {
    console.log(`WebRTC Call initiated by ${callerName} (${callType}) in room ${roomId}`);
    socket.to(roomId).emit('incoming_call', { callType, callerName, sdpOffer });
  });

  socket.on('accept_call', ({ roomId, sdpAnswer }) => {
    console.log(`WebRTC Call accepted in room ${roomId}`);
    socket.to(roomId).emit('call_accepted', { sdpAnswer });
  });

  socket.on('reject_call', ({ roomId }) => {
    console.log(`WebRTC Call rejected in room ${roomId}`);
    socket.to(roomId).emit('call_rejected');
  });

  socket.on('webrtc_ice_candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('webrtc_ice_candidate', { candidate });
  });

  socket.on('end_call', ({ roomId }) => {
    console.log(`WebRTC Call ended in room ${roomId}`);
    io.to(roomId).emit('call_ended');
  });
  
  socket.on('toggle_ghost_mode', ({ roomId, enabled, timer }) => {
    const room = rooms[roomId];
    if (room) {
      room.ghostMode = enabled;
      room.ghostTimer = timer;
      io.to(roomId).emit('ghost_mode_updated', { enabled, timer });
    }
  });
  
  socket.on('clear_chat', ({ roomId }) => {
    io.to(roomId).emit('clear_chat');
  });
  
  socket.on('typing', ({ roomId, userName }) => {
    socket.to(roomId).emit('typing', { userName });
  });
  
  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('stop_typing');
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex(u => u.id === socket.id);
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        socket.to(roomId).emit('user_left', { userCount: room.users.length });
        
        if (room.users.length === 0) {
          delete rooms[roomId];
          console.log('Room deleted:', roomId);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`GhostChat Server running on port ${PORT}`);
});
