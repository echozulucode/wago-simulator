import asyncio
import sys
from pymodbus.client import AsyncModbusTcpClient

async def run_client():
    # Connect to the WAGO Simulator (running on localhost:502)
    client = AsyncModbusTcpClient('127.0.0.1', port=502)
    
    print("Connecting to Modbus server...")
    if not await client.connect():
        print("Failed to connect!")
        return
    print("Connected!")

    try:
        # Loop to toggle outputs
        print("Starting loop (Ctrl+C to stop)...")
        state = True
        val = 0
        
        while True:
            # --- Toggle Digital Output 0 ---
            print(f"Writing Coil 0 to {'ON' if state else 'OFF'}")
            # Try positional for the primary value, skip slave/unit keywords for now
            wr = await client.write_coil(0, state)
            if wr.isError():
                print(f"Write Coil Error: {wr}")

            # --- Read back Digital Inputs ---
            # Try passing count as keyword, as some versions restrict positional args
            rr = await client.read_discrete_inputs(0, count=16)
            if not rr.isError():
                # Some versions return .bits, others .data
                bits = rr.bits if hasattr(rr, 'bits') else []
                print(f"DI State: {bits[:16]!r}")
            else:
                print(f"DI Read Error: {rr}")
            
            # --- Read Analog Inputs ---
            ari = await client.read_input_registers(0, count=4)
            if not ari.isError():
                registers = ari.registers if hasattr(ari, 'registers') else []
                print(f"AI State: {registers[:4]!r}")
            else:
                print(f"AI Read Error: {ari}")

            # --- Write Holding Register ---
            print(f"Writing Holding Register 0 to {val}")
            wh = await client.write_register(0, val)
            if wh.isError():
                print(f"Write Reg Error: {wh}")

            # --- Watchdog (0x1000 = 4096) ---
            await client.write_register(4096, 5000)

            state = not state
            val = (val + 100) % 32000
            
            await asyncio.sleep(1.0)

    except asyncio.CancelledError:
        print("Stopped by user")
    except Exception as e:
        print(f"Exception: {e}")
        # Print more info about the error
        import traceback
        traceback.print_exc()
    finally:
        print("\nClosing connection...")
        client.close()

if __name__ == "__main__":
    try:
        asyncio.run(run_client())
    except KeyboardInterrupt:
        pass