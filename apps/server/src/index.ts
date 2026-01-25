import { createServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MODBUS_PORT = process.env.MODBUS_PORT ? parseInt(process.env.MODBUS_PORT, 10) : 502;

async function main() {
  console.log('Starting WAGO 750 Simulator Server...');
  console.log(`HTTP/WS Port: ${PORT}`);
  console.log(`Modbus TCP Port: ${MODBUS_PORT}`);

  try {
    const server = await createServer({ port: PORT, modbusPort: MODBUS_PORT });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down...');
      await server.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log('Server started successfully');
    console.log(`API: http://localhost:${PORT}/api`);
    console.log(`WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`Modbus TCP: localhost:${MODBUS_PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
