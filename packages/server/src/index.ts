import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDB } from './db';
import { setupSocketHandlers } from './socket';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from 'shared';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initDB();
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Failed to start server:', e);
  }
}

start();
