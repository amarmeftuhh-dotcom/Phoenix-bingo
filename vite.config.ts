import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

/**
 * Universal In-Memory Live Room Synchronization Engine for Connected Phones
 */
function liveRoomSyncPlugin(): Plugin {
  let currentRoundId = -1;
  const takenTicketsMap = new Map<
    number,
    { userId: string; userName: string; userPhone?: string; time: number }
  >();

  return {
    name: 'live-room-sync-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);

        if (url.pathname === '/api/room/state') {
          const reqRound = parseInt(url.searchParams.get('roundId') || '-1', 10);
          if (reqRound !== -1 && reqRound !== currentRoundId) {
            currentRoundId = reqRound;
            takenTicketsMap.clear();
          }

          const taken = Array.from(takenTicketsMap.keys());
          const uniqueUsers = new Set(Array.from(takenTicketsMap.values()).map((v) => v.userId));

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(
            JSON.stringify({
              roundId: currentRoundId,
              takenTickets: taken,
              playersCount: uniqueUsers.size,
            })
          );
          return;
        }

        if (url.pathname === '/api/room/select' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { roundId, ticketNum, userId, userName, userPhone } = body;

              if (typeof roundId === 'number' && roundId !== currentRoundId) {
                currentRoundId = roundId;
                takenTicketsMap.clear();
              }

              if (ticketNum && userId) {
                takenTicketsMap.set(ticketNum, {
                  userId,
                  userName: userName || 'ተጫዋች',
                  userPhone: userPhone || '',
                  time: Date.now(),
                });
              }

              const taken = Array.from(takenTicketsMap.keys());
              const uniqueUsers = new Set(Array.from(takenTicketsMap.values()).map((v) => v.userId));

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(
                JSON.stringify({
                  success: true,
                  takenTickets: taken,
                  playersCount: uniqueUsers.size,
                })
              );
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Bad Request' }));
            }
          });
          return;
        }

        if (url.pathname === '/api/room/unselect' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { ticketNum } = body;

              if (ticketNum) {
                takenTicketsMap.delete(ticketNum);
              }

              const taken = Array.from(takenTicketsMap.keys());
              const uniqueUsers = new Set(Array.from(takenTicketsMap.values()).map((v) => v.userId));

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(
                JSON.stringify({
                  success: true,
                  takenTickets: taken,
                  playersCount: uniqueUsers.size,
                })
              );
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Bad Request' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), liveRoomSyncPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
