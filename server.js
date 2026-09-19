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
    const cleanName = (userName && userName.trim()) ? userName.trim() : 'User';
    console.log(`Join room: ${roomId} by ${cleanName} (${socket.id})`);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        users: [],
        messages: [],
        ghostMode: false,
        ghostTimer: null
      };
    }

    if (!rooms[roomId].messages) {
      rooms[roomId].messages = [];
    }

    // Clean up stale disconnected sockets
    rooms[roomId].users = rooms[roomId].users.filter(u => {
      const s = io.sockets.sockets.get(u.id);
      return s && s.connected;
    });

    // Check if user with same socket ID or same name exists
    const existingIndex = rooms[roomId].users.findIndex(u => u.id === socket.id || u.name.toLowerCase() === cleanName.toLowerCase());
    
    if (existingIndex !== -1) {
      rooms[roomId].users[existingIndex] = { id: socket.id, name: cleanName, isOnline: true };
    } else {
      if (rooms[roomId].users.length >= 10) {
        socket.emit('room_full', { message: 'Room is full (max 10 users)' });
        return;
      }
      rooms[roomId].users.push({ id: socket.id, name: cleanName, isOnline: true });
    }

    socket.join(roomId);

    const roomData = {
      roomId,
      userCount: rooms[roomId].users.length,
      users: rooms[roomId].users,
      ghostMode: rooms[roomId].ghostMode
    };

    io.to(roomId).emit('user_joined', roomData);
    io.to(roomId).emit('room_users_updated', roomData);

    // Send room message history to the newly connected/reconnected user
    socket.emit('room_history', rooms[roomId].messages);
  });
  
  socket.on('send_message', (payload) => {
    const { roomId } = payload;
    if (rooms[roomId]) {
      if (!rooms[roomId].messages) rooms[roomId].messages = [];
      rooms[roomId].messages.push(payload);
    }
    socket.to(roomId).emit('receive_message', payload);
  });

  socket.on('mark_read', ({ roomId, messageId }) => {
    if (rooms[roomId] && rooms[roomId].messages) {
      const msg = rooms[roomId].messages.find(m => m.id === messageId);
      if (msg) msg.isRead = true;
    }
    socket.to(roomId).emit('message_read', { messageId });
  });

  socket.on('react_message', ({ roomId, messageId, emoji, userName }) => {
    if (rooms[roomId] && rooms[roomId].messages) {
      const msg = rooms[roomId].messages.find(m => m.id === messageId);
      if (msg) {
        msg.reactions = msg.reactions || {};
        const existing = msg.reactions[emoji] || [];
        msg.reactions[emoji] = existing.includes(userName)
          ? existing.filter(r => r !== userName)
          : [...existing, userName];
      }
    }
    io.to(roomId).emit('message_reacted', { messageId, emoji, userName });
  });

  // Interactive Poll Voting
  socket.on('vote_poll', ({ roomId, messageId, optionIndex, userName }) => {
    if (rooms[roomId] && rooms[roomId].messages) {
      const msg = rooms[roomId].messages.find(m => m.id === messageId);
      if (msg && msg.poll && msg.poll.options[optionIndex]) {
        msg.poll.options.forEach((opt, idx) => {
          opt.votes = opt.votes || [];
          if (idx === optionIndex) {
            if (!opt.votes.includes(userName)) opt.votes.push(userName);
          } else {
            opt.votes = opt.votes.filter(v => v !== userName);
          }
        });
      }
    }
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

  socket.on('call_subtitle', (payload) => {
    const { roomId } = payload;
    if (roomId) {
      socket.to(roomId).emit('call_subtitle', payload);
    }
  });

  socket.on('end_call', ({ roomId }) => {
    console.log(`WebRTC Call ended in room ${roomId}`);
    io.to(roomId).emit('call_ended');
  });

  socket.on('pin_message', ({ roomId, messageId, isPinned }) => {
    if (rooms[roomId] && rooms[roomId].messages) {
      const msg = rooms[roomId].messages.find(m => m.id === messageId);
      if (msg) {
        msg.isPinned = isPinned;
      }
    }
    io.to(roomId).emit('message_pinned', { messageId, isPinned });
  });

  socket.on('screenshot_taken', ({ roomId, userName }) => {
    console.log(`Screenshot alert by ${userName} in room ${roomId}`);
    socket.to(roomId).emit('screenshot_alert', { userName, timestamp: Date.now() });
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
    if (rooms[roomId]) {
      rooms[roomId].messages = [];
    }
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
        const disconnectedUser = room.users[userIndex];
        room.users.splice(userIndex, 1);
        socket.to(roomId).emit('user_left', { 
          userCount: room.users.length,
          leftUser: disconnectedUser,
          users: room.users
        });
        socket.to(roomId).emit('room_users_updated', {
          userCount: room.users.length,
          users: room.users
        });
        
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
