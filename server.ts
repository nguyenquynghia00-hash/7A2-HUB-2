import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO logic
  const connectedSockets = new Map<string, string>(); // socket.id -> userId

  const getUniqueUsersCount = () => {
    const uniqueUsers = new Set(connectedSockets.values());
    return uniqueUsers.size;
  };

  io.on('connection', (socket) => {
    // We don't count the user until they identify with a valid userId
    
    socket.on('identify', (userId) => {
      if (userId) {
        connectedSockets.set(socket.id, userId);
        io.emit('online-users-count', getUniqueUsersCount());
      }
    });

    // Broadcast cursor movements
    socket.on('cursor-move', (data) => {
      socket.broadcast.emit('cursor-move', { id: socket.id, ...data });
    });

    socket.on('disconnect', () => {
      if (connectedSockets.has(socket.id)) {
        connectedSockets.delete(socket.id);
        io.emit('online-users-count', getUniqueUsersCount());
      }
      socket.broadcast.emit('cursor-remove', socket.id);
    });
  });

  // API Routes
  app.post("/api/notify-order", express.json(), (req, res) => {
    const order = req.body;
    console.log(`[EMAIL NOTIFICATION] New order received!`);
    console.log(`Product: ${order.productName}`);
    console.log(`Customer: ${order.customerName} (${order.customerEmail})`);
    console.log(`Quantity: ${order.quantity}`);
    console.log(`Total: ${order.totalPrice}đ`);
    res.json({ success: true, message: "Order notification logged." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server is active!`);
  });
}

startServer();
