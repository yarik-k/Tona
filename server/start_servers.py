#!/usr/bin/env python3

import subprocess
import time
import sys
import os
from pathlib import Path

def start_server(script_name, port, description):
    try:
        script_dir = Path(__file__).parent
        server_path = script_dir / script_name
        
        print(f"Starting {description} on port {port}...")
        
        process = subprocess.Popen(
            [sys.executable, str(server_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=script_dir
        )
        
        time.sleep(3)
        
        if process.poll() is None:
            print(f"{description} started successfully on port {port}")
            return process
        else:
            stdout, stderr = process.communicate()
            print(f"Failed to start {description}")
            print(f"Error: {stderr.decode()}")
            return None
            
    except Exception as e:
        print(f"Error starting {description}: {e}")
        return None

def main():
    print("Starting Tona Servers")
    print("=" * 40)
    
    main_server = start_server("main.py", 8000, "AI Assistant Server")
    stats_server = start_server("stats_server.py", 8001, "Statistics & Insights Server")
    
    if main_server and stats_server:
        print("\nBoth servers started successfully")
        print("\nServer Information:")
        print("AI Assistant Server: http://localhost:8000")
        print("Statistics & Insights Server: http://localhost:8001")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping servers...")
            main_server.terminate()
            stats_server.terminate()
            print("Servers stopped")
    else:
        print("\nFailed to start one or more servers")
        sys.exit(1)

if __name__ == "__main__":
    main() 