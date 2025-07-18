const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// In-memory data storage (in production, use a database)
let users = new Map();
let rooms = new Map();
let messages = new Map();
let privateMessages = new Map();
let typingUsers = new Map();

// JWT secret (in production, use environment variable)
const JWT_SECRET = 'your-secret-key';

// Initialize default room
rooms.set('general', {
  id: 'general',
  name: 'General',
  messages: [],
  users: new Set()
});

// Helper functions
const generateToken = (userId, username) => {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const createMessage = (content, sender, type = 'text', fileUrl = null) => {
  return {
    id: uuidv4(),
    content,
    sender,
    type,
    fileUrl,
    timestamp: new Date().toISOString(),
    reactions: new Map(),
    readBy: new Set()
  };
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Authentication
  socket.on('authenticate', (data) => {
    const { username, token } = data;
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        socket.userId = decoded.userId;
        socket.username = decoded.username;
      } else {
        socket.emit('auth_error', 'Invalid token');
        return;
      }
    } else if (username) {
      socket.userId = uuidv4();
      socket.username = username;
    } else {
      socket.emit('auth_error', 'Username or token required');
      return;
    }

    // Store user
    users.set(socket.userId, {
      id: socket.userId,
      username: socket.username,
      socketId: socket.id,
      online: true,
      lastSeen: new Date().toISOString()
    });

    // Join default room
    socket.join('general');
    const generalRoom = rooms.get('general');
    generalRoom.users.add(socket.userId);

    // Generate and send token
    const authToken = generateToken(socket.userId, socket.username);
    socket.emit('authenticated', {
      token: authToken,
      user: users.get(socket.userId)
    });

    // Send room list and online users
    socket.emit('rooms_list', Array.from(rooms.values()).map(room => ({
      ...room,
      users: Array.from(room.users).map(userId => users.get(userId)).filter(Boolean)
    })));

    socket.emit('online_users', Array.from(users.values()).filter(u => u.online));

    // Notify others of new user
    socket.to('general').emit('user_joined', {
      userId: socket.userId,
      username: socket.username,
      room: 'general'
    });

    // Send recent messages
    const recentMessages = generalRoom.messages.slice(-50);
    socket.emit('room_messages', {
      room: 'general',
      messages: recentMessages
    });
  });

  // Join room
  socket.on('join_room', (roomId) => {
    if (!socket.userId) return;

    // Leave current rooms except general
    Array.from(socket.rooms).forEach(room => {
      if (room !== socket.id && room !== 'general') {
        socket.leave(room);
        const roomData = rooms.get(room);
        if (roomData) {
          roomData.users.delete(socket.userId);
          socket.to(room).emit('user_left', {
            userId: socket.userId,
            username: socket.username,
            room: room
          });
        }
      }
    });

    // Join new room
    socket.join(roomId);
    
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: roomId,
        messages: [],
        users: new Set()
      };
      rooms.set(roomId, room);
    }

    room.users.add(socket.userId);

    // Send room messages
    const recentMessages = room.messages.slice(-50);
    socket.emit('room_messages', {
      room: roomId,
      messages: recentMessages
    });

    // Notify others
    socket.to(roomId).emit('user_joined', {
      userId: socket.userId,
      username: socket.username,
      room: roomId
    });

    // Update rooms list for all users
    io.emit('rooms_list', Array.from(rooms.values()).map(room => ({
      ...room,
      users: Array.from(room.users).map(userId => users.get(userId)).filter(Boolean)
    })));
  });

  // Send message
  socket.on('send_message', (data) => {
    if (!socket.userId) return;

    const { roomId, content, type = 'text' } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    const message = createMessage(content, {
      id: socket.userId,
      username: socket.username
    }, type);

    room.messages.push(message);
    
    // Emit to room
    io.to(roomId).emit('new_message', {
      room: roomId,
      message: message
    });

    // Send notification to offline users (in production, use push notifications)
    room.users.forEach(userId => {
      const user = users.get(userId);
      if (user && !user.online && userId !== socket.userId) {
        // Here you would send push notification
        console.log(`Notification for ${user.username}: New message in ${room.name}`);
      }
    });
  });

  // Private message
  socket.on('send_private_message', (data) => {
    if (!socket.userId) return;

    const { recipientId, content } = data;
    const recipient = users.get(recipientId);
    if (!recipient) return;

    const message = createMessage(content, {
      id: socket.userId,
      username: socket.username
    });

    const conversationId = [socket.userId, recipientId].sort().join('-');
    if (!privateMessages.has(conversationId)) {
      privateMessages.set(conversationId, []);
    }

    privateMessages.get(conversationId).push(message);

    // Send to recipient
    if (recipient.socketId) {
      io.to(recipient.socketId).emit('private_message', {
        from: socket.userId,
        message: message
      });
    }

    // Send back to sender
    socket.emit('private_message', {
      to: recipientId,
      message: message
    });
  });

  // Get private messages
  socket.on('get_private_messages', (data) => {
    if (!socket.userId) return;

    const { userId } = data;
    const conversationId = [socket.userId, userId].sort().join('-');
    const messages = privateMessages.get(conversationId) || [];

    socket.emit('private_messages', {
      userId: userId,
      messages: messages.slice(-50)
    });
  });

  // Typing indicator
  socket.on('typing_start', (data) => {
    if (!socket.userId) return;

    const { roomId } = data;
    const typingKey = `${roomId}-${socket.userId}`;
    
    if (!typingUsers.has(typingKey)) {
      typingUsers.set(typingKey, {
        userId: socket.userId,
        username: socket.username,
        roomId: roomId,
        timestamp: Date.now()
      });

      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username,
        roomId: roomId
      });
    }
  });

  socket.on('typing_stop', (data) => {
    if (!socket.userId) return;

    const { roomId } = data;
    const typingKey = `${roomId}-${socket.userId}`;
    
    if (typingUsers.has(typingKey)) {
      typingUsers.delete(typingKey);

      socket.to(roomId).emit('user_stopped_typing', {
        userId: socket.userId,
        username: socket.username,
        roomId: roomId
      });
    }
  });

  // Message reactions
  socket.on('react_to_message', (data) => {
    if (!socket.userId) return;

    const { messageId, roomId, reaction } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    const message = room.messages.find(m => m.id === messageId);
    if (!message) return;

    if (!message.reactions.has(reaction)) {
      message.reactions.set(reaction, new Set());
    }

    const userReactions = message.reactions.get(reaction);
    if (userReactions.has(socket.userId)) {
      userReactions.delete(socket.userId);
    } else {
      userReactions.add(socket.userId);
    }

    // Convert Map to Object for JSON serialization
    const reactionsObj = {};
    message.reactions.forEach((users, emoji) => {
      if (users.size > 0) {
        reactionsObj[emoji] = Array.from(users);
      }
    });

    io.to(roomId).emit('message_reaction', {
      messageId: messageId,
      reactions: reactionsObj
    });
  });

  // Message read receipt
  socket.on('mark_message_read', (data) => {
    if (!socket.userId) return;

    const { messageId, roomId } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    const message = room.messages.find(m => m.id === messageId);
    if (message) {
      message.readBy.add(socket.userId);
      
      socket.to(roomId).emit('message_read', {
        messageId: messageId,
        readBy: Array.from(message.readBy)
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (socket.userId) {
      const user = users.get(socket.userId);
      if (user) {
        user.online = false;
        user.lastSeen = new Date().toISOString();
        
        // Remove from typing users
        typingUsers.forEach((value, key) => {
          if (value.userId === socket.userId) {
            typingUsers.delete(key);
            socket.to(value.roomId).emit('user_stopped_typing', {
              userId: socket.userId,
              username: socket.username,
              roomId: value.roomId
            });
          }
        });

        // Remove from rooms
        rooms.forEach((room, roomId) => {
          if (room.users.has(socket.userId)) {
            room.users.delete(socket.userId);
            socket.to(roomId).emit('user_left', {
              userId: socket.userId,
              username: socket.username,
              room: roomId
            });
          }
        });

        // Update online users
        io.emit('user_offline', {
          userId: socket.userId,
          username: socket.username
        });
      }
    }
  });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`
  });
});

// Clean up typing users (remove stale entries)
setInterval(() => {
  const now = Date.now();
  const staleTimeout = 5000; // 5 seconds

  typingUsers.forEach((value, key) => {
    if (now - value.timestamp > staleTimeout) {
      typingUsers.delete(key);
      io.to(value.roomId).emit('user_stopped_typing', {
        userId: value.userId,
        username: value.username,
        roomId: value.roomId
      });
    }
  });
}, 2000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});