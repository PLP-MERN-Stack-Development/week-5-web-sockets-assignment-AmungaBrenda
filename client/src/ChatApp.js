import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { FiSend, FiPaperclip, FiSmile, FiUsers, FiSettings } from 'react-icons/fi';
import { format } from 'date-fns';

const SOCKET_URL = 'http://localhost:5000';

// 🎨 FIXED EMOJI PICKER - Better spacing and visibility
const EmojiPicker = ({ onEmojiClick, show }) => {
  const emojis = [
    { emoji: '😀', name: 'smile' },
    { emoji: '😂', name: 'laugh' },
    { emoji: '😍', name: 'heart_eyes' },
    { emoji: '😢', name: 'sad' },
    { emoji: '😡', name: 'angry' },
    { emoji: '👍', name: 'thumbs_up' },
    { emoji: '👎', name: 'thumbs_down' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '🔥', name: 'fire' },
    { emoji: '💯', name: 'hundred' },
    { emoji: '🎉', name: 'party' },
    { emoji: '😎', name: 'cool' },
    { emoji: '🤔', name: 'thinking' },
    { emoji: '😴', name: 'sleeping' },
    { emoji: '🥳', name: 'celebrating' }
  ];

  if (!show) return null;

  return (
    <div className="absolute bottom-12 right-0 bg-white border-2 border-gray-300 rounded-xl shadow-xl p-4 z-50 max-w-xs">
      {/* Header for the emoji picker */}
      <div className="text-sm font-medium text-gray-700 mb-3 text-center">
        Choose an emoji
      </div>
      
      {/* Emoji grid with better spacing */}
      <div className="grid grid-cols-5 gap-2">
        {emojis.map((emoji) => (
          <button
            key={emoji.name}
            onClick={() => onEmojiClick(emoji.emoji)}
            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-blue-100 rounded-lg transition-colors duration-200 hover:scale-110 transform"
            title={emoji.name}
          >
            {emoji.emoji}
          </button>
        ))}
      </div>
      
      {/* Close button */}
      <div className="text-center mt-3">
        <button
          onClick={() => onEmojiClick('')}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// 🎨 IMPROVED MESSAGE REACTIONS - Better display
const MessageReactions = ({ reactions, onReact, messageId }) => {
  if (!reactions || Object.keys(reactions).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {Object.entries(reactions).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-sm border border-gray-300 transition-colors"
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-xs font-medium">{users.length}</span>
        </button>
      ))}
    </div>
  );
};

// 🎨 IMPROVED MESSAGE COMPONENT - Better emoji reaction display
const Message = ({ message, currentUser, onReact, onFileDownload }) => {
  const [showReactions, setShowReactions] = useState(false);
  const isOwn = message.sender.id === currentUser?.id;

  const handleReact = (emoji) => {
    onReact(message.id, emoji);
    setShowReactions(false);
  };

  const renderContent = () => {
    switch (message.type) {
      case 'file':
        return (
          <div className="flex items-center gap-2">
            <FiPaperclip className="text-blue-500" />
            <button
              onClick={() => onFileDownload(message.fileUrl, message.content)}
              className="text-blue-500 hover:underline"
            >
              {message.content}
            </button>
          </div>
        );
      case 'image':
        return (
          <div>
            <img 
              src={`http://localhost:5000${message.fileUrl}`} 
              alt={message.content}
              className="max-w-xs max-h-48 rounded-lg"
            />
            {message.content && <p className="mt-1">{message.content}</p>}
          </div>
        );
      default:
        return <p className="break-words">{message.content}</p>;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isOwn 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-200 text-gray-800'
      }`}>
        {!isOwn && (
          <p className="text-xs font-semibold mb-1 text-blue-600">
            {message.sender.username}
          </p>
        )}
        {renderContent()}
        
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {format(new Date(message.timestamp), 'HH:mm')}
          </p>
          
          {/* Reaction button with better positioning */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`ml-2 p-1 rounded-full ${isOwn ? 'text-blue-100 hover:bg-blue-400' : 'text-gray-500 hover:bg-gray-300'} transition-colors`}
            >
              <FiSmile size={16} />
            </button>
            
            {/* Quick reaction picker */}
            {showReactions && (
              <div className="absolute bottom-8 right-0 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-2 z-50">
                <div className="grid grid-cols-5 gap-1">
                  {['😀', '😂', '😍', '😢', '😡', '👍', '👎', '❤️', '🔥', '💯'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Display reactions */}
        <MessageReactions 
          reactions={message.reactions} 
          onReact={onReact} 
          messageId={message.id}
        />
      </div>
    </div>
  );
};

// 🎨 IMPROVED TYPING INDICATOR - Better visual design
const TypingIndicator = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 text-gray-500 text-sm bg-gray-50 rounded-lg mx-4 mb-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="font-medium">
        {typingUsers.length === 1 
          ? `${typingUsers[0]} is typing...`
          : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
        }
      </span>
    </div>
  );
};

// 🎨 MAIN CHAT APP COMPONENT
const ChatApp = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [currentRoom, setCurrentRoom] = useState('general');
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState({});
  const [privateMessages, setPrivateMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPrivateChat, setShowPrivateChat] = useState(false);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    console.log('Connecting to server...');
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      setUser(data.user);
      localStorage.setItem('chatToken', data.token);
    });

    newSocket.on('rooms_list', (roomsList) => {
      console.log('Rooms list:', roomsList);
      setRooms(roomsList);
    });

    newSocket.on('online_users', (users) => {
      console.log('Online users:', users);
      setOnlineUsers(users);
    });

    newSocket.on('room_messages', (data) => {
      console.log('Room messages:', data);
      setMessages(prev => ({
        ...prev,
        [data.room]: data.messages
      }));
    });

    newSocket.on('new_message', (data) => {
      console.log('New message:', data);
      setMessages(prev => ({
        ...prev,
        [data.room]: [...(prev[data.room] || []), data.message]
      }));

      // Play notification sound
      if (soundEnabled && data.message.sender.id !== user?.id) {
        playNotificationSound();
      }
    });

    newSocket.on('private_message', (data) => {
      const otherUserId = data.from || data.to;
      setPrivateMessages(prev => ({
        ...prev,
        [otherUserId]: [...(prev[otherUserId] || []), data.message]
      }));
    });

    newSocket.on('private_messages', (data) => {
      setPrivateMessages(prev => ({
        ...prev,
        [data.userId]: data.messages
      }));
    });

    newSocket.on('user_typing', (data) => {
      if (data.roomId === currentRoom) {
        setTypingUsers(prev => [...prev.filter(u => u !== data.username), data.username]);
      }
    });

    newSocket.on('user_stopped_typing', (data) => {
      if (data.roomId === currentRoom) {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    });

    newSocket.on('user_joined', (data) => {
      console.log('User joined:', data);
    });

    newSocket.on('user_left', (data) => {
      console.log('User left:', data);
    });

    newSocket.on('message_reaction', (data) => {
      setMessages(prev => ({
        ...prev,
        [currentRoom]: prev[currentRoom]?.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ) || []
      }));
    });

    return () => {
      console.log('Cleaning up socket');
      newSocket.close();
    };
  }, [currentRoom, soundEnabled, user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentRoom]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaAz2a3+vKeSsFJHfH8N2QQAoU');
      audio.play();
    } catch (e) {
      console.log('Could not play notification sound');
    }
  };

  const handleLogin = () => {
    console.log('Attempting login with username:', username);
    if (username.trim() && socket) {
      const token = localStorage.getItem('chatToken');
      socket.emit('authenticate', { username: username.trim(), token });
    }
  };

  const handleSendMessage = () => {
    console.log('Sending message:', newMessage);
    if (newMessage.trim() && socket) {
      if (showPrivateChat && selectedPrivateUser) {
        socket.emit('send_private_message', {
          recipientId: selectedPrivateUser.id,
          content: newMessage.trim()
        });
      } else {
        socket.emit('send_message', {
          roomId: currentRoom,
          content: newMessage.trim()
        });
      }
      setNewMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && currentRoom) {
      socket.emit('typing_start', { roomId: currentRoom });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { roomId: currentRoom });
      }, 1000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('Uploading file:', file.name);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('File uploaded:', data);
        const isImage = file.type.startsWith('image/');
        
        if (socket) {
          socket.emit('send_message', {
            roomId: currentRoom,
            content: data.originalName,
            type: isImage ? 'image' : 'file',
            fileUrl: data.url
          });
        }
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
    
    e.target.value = '';
  };

  const handleEmojiClick = (emoji) => {
    if (emoji === '') {
      setShowEmojiPicker(false);
      return;
    }
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleReact = (messageId, emoji) => {
    if (socket) {
      socket.emit('react_to_message', {
        messageId,
        roomId: currentRoom,
        reaction: emoji
      });
    }
  };

  const handleRoomChange = (roomId) => {
    setCurrentRoom(roomId);
    setShowPrivateChat(false);
    if (socket) {
      socket.emit('join_room', roomId);
    }
  };

  const handlePrivateChat = (targetUser) => {
    setSelectedPrivateUser(targetUser);
    setShowPrivateChat(true);
    if (socket) {
      socket.emit('get_private_messages', { userId: targetUser.id });
    }
  };

  const handleFileDownload = (fileUrl, filename) => {
    const link = document.createElement('a');
    link.href = `http://localhost:5000${fileUrl}`;
    link.download = filename;
    link.click();
  };

  const getCurrentMessages = () => {
    if (showPrivateChat && selectedPrivateUser) {
      return privateMessages[selectedPrivateUser.id] || [];
    }
    return messages[currentRoom] || [];
  };

  const getCurrentTitle = () => {
    if (showPrivateChat && selectedPrivateUser) {
      return `Private chat with ${selectedPrivateUser.username}`;
    }
    const room = rooms.find(r => r.id === currentRoom);
    return room ? room.name : 'General';
  };

  // Loading screen
  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Connecting...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4">Welcome to Chat App</h2>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-md">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Chat App</h1>
          <p className="text-sm text-gray-600">Welcome, {user.username}!</p>
        </div>

        {/* Rooms */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">Rooms</h3>
          <div className="space-y-1">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleRoomChange(room.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentRoom === room.id 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span># {room.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {room.users?.length || 0} members
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
            <FiUsers className="mr-2" />
            Online Users ({onlineUsers.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {onlineUsers.map((onlineUser) => (
              <div
                key={onlineUser.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  onlineUser.id === user.id ? 'bg-blue-50' : 'hover:bg-gray-100'
                }`}
                onClick={() => onlineUser.id !== user.id && handlePrivateChat(onlineUser)}
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm">{onlineUser.username}</span>
                  {onlineUser.id === user.id && (
                    <span className="text-xs text-gray-500 ml-2">(you)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{getCurrentTitle()}</h2>
            {!showPrivateChat && (
              <p className="text-sm text-gray-600">
                {rooms.find(r => r.id === currentRoom)?.users?.length || 0} members
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              🔊
            </button>
            <button className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors">
              <FiSettings />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          {getCurrentMessages().map((message) => (
            <Message
              key={message.id}
              message={message}
              currentUser={user}
              onReact={handleReact}
              onFileDownload={handleFileDownload}
            />
          ))}
          <TypingIndicator typingUsers={typingUsers} />
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-white p-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FiPaperclip />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <FiSmile />
                </button>
                <EmojiPicker 
                  show={showEmojiPicker} 
                  onEmojiClick={handleEmojiClick}
                />
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FiSend />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;