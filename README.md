# WAGO 750 I/O System Simulator

A high-fidelity simulator for WAGO 750 series I/O systems, designed for testing embedded controllers without physical hardware.

## Features

- **Visual Rack Builder**: Drag-and-drop interface to build I/O rack configurations
- **Real-time I/O Visualization**: LED indicators and value displays for all channels
- **Modbus TCP Server**: Full protocol support on port 502 (configurable)
- **Manual Override**: Interactive controls for simulating input values
- **WebSocket Updates**: Real-time UI updates for I/O state changes

## Supported Modules (MVP)

| Module | Type | Channels | Description |
|--------|------|----------|-------------|
| 750-362 | Coupler | - | Modbus TCP Fieldbus Coupler |
| 750-1405 | DI | 16 | 16-Channel Digital Input, 24V DC |
| 750-1504 | DO | 16 | 16-Channel Digital Output, 24V DC |
| 750-461 | RTD | 2 | 2-Channel RTD Input (Pt100) |
| 750-455 | AI | 4 | 4-Channel Analog Input (4-20mA) |

## Prerequisites

- Node.js 18+
- pnpm 8+

## Quick Start

```bash
# Install dependencies
pnpm install

# Build shared package
pnpm --filter @wago/shared build

# Start development servers (frontend + backend)
pnpm dev
```

The application will be available at:
- **Web UI**: http://localhost:5173
- **API**: http://localhost:3000/api
- **Modbus TCP**: localhost:502

## Project Structure

```
wago-simulator/
├── apps/
│   ├── web/          # React frontend (Vite + Tailwind)
│   └── server/       # Node.js backend (Express + Modbus)
├── packages/
│   └── shared/       # Shared types and constants
├── tests/
│   ├── e2e/          # Playwright tests
│   └── modbus/       # Modbus protocol tests
└── docs/             # Documentation
```

## Development

### Frontend (apps/web)

```bash
pnpm --filter @wago/web dev      # Start dev server
pnpm --filter @wago/web build    # Production build
pnpm --filter @wago/web test:e2e # Run Playwright tests
```

### Backend (apps/server)

```bash
pnpm --filter @wago/server dev   # Start with hot reload
pnpm --filter @wago/server build # Production build
pnpm --filter @wago/server test  # Run unit tests
```

## API Endpoints

### Rack Management
- `GET /api/rack` - Get current rack configuration
- `POST /api/rack` - Create new rack
- `DELETE /api/rack` - Clear rack

### Module Management
- `GET /api/modules/catalog` - Get available module types
- `GET /api/modules` - List modules in rack
- `POST /api/modules` - Add module to rack
- `DELETE /api/modules/:id` - Remove module

### I/O State
- `GET /api/io` - Get all I/O states
- `GET /api/io/:moduleId` - Get module I/O state
- `PUT /api/io/:moduleId/:channel` - Set channel value

### Simulation Control
- `GET /api/simulation/status` - Get simulation status
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/pause` - Pause simulation
- `POST /api/simulation/stop` - Stop simulation
- `POST /api/simulation/reset` - Reset all I/O

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Rack |
| `Ctrl+E` | Toggle Explorer Panel |
| `Ctrl+P` | Toggle Properties Panel |
| `Ctrl++` | Zoom In |
| `Ctrl+-` | Zoom Out |
| `Ctrl+0` | Reset Zoom |
| `F5` | Start Simulation |
| `F6` | Pause Simulation |
| `Shift+F5` | Stop Simulation |
| `Escape` | Clear Selection |

## Testing with Modbus Clients

Connect any Modbus TCP client to `localhost:502` to interact with the simulated I/O:

```python
# Example using pymodbus
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient('localhost', port=502)
client.connect()

# Read digital inputs (16 bits from module 750-1405)
result = client.read_discrete_inputs(0, 16)
print(result.bits)

# Read analog inputs (4 registers from module 750-455)
result = client.read_input_registers(32, 4)
print(result.registers)

client.close()
```

## License

MIT
