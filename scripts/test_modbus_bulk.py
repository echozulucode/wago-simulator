import asyncio
import sys
from pymodbus.client import AsyncModbusTcpClient

async def run_client():
    client = AsyncModbusTcpClient('127.0.0.1', port=502)
    
    print("Connecting to Modbus server...")
    if not await client.connect():
        print("Failed to connect!")
        return
    print("Connected!")

    try:
        print("Starting bulk IO loop (Ctrl+C to stop)...")
        val = 0
        
        while True:
            # --- Bulk Write Outputs (Holding Registers) ---
            # Writing 4 registers starting at 0
            # This demonstrates writing Analog Outputs (if any) or variables
            values_to_write = [val, val+1, val+2, val+3]
            print(f"Writing Registers 0-3: {values_to_write}")
            wr = await client.write_registers(0, values_to_write)
            if wr.isError():
                print(f"Write Reg Error: {wr}")

            # --- Bulk Read Inputs (FC4) ---
            # Reading 4 registers starting at 0 (Analog Inputs)
            ri = await client.read_input_registers(0, count=4)
            if not ri.isError():
                # Check for .registers (v3) or .data (older)
                regs = ri.registers if hasattr(ri, 'registers') else []
                print(f"Read Input Regs 0-3: {regs[:4]}")
            else:
                print(f"Read Input Error: {ri}")

            # --- Bulk Read Outputs (FC3) ---
            # Reading back the registers we wrote to verify storage
            rh = await client.read_holding_registers(0, count=4)
            if not rh.isError():
                regs = rh.registers if hasattr(rh, 'registers') else []
                print(f"Read Holding Regs 0-3: {regs[:4]}")
            else:
                print(f"Read Holding Error: {rh}")

            val = (val + 10) % 1000
            print("-" * 20)
            await asyncio.sleep(1.0)

    except asyncio.CancelledError:
        print("Stopped by user")
    except Exception as e:
        print(f"Exception: {e}")
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
