import os
import sys
import time
import uuid
import json
import psutil
import socket
from datetime import datetime
from dotenv import load_dotenv

# Ensure the src directory is in the Python path so we can import core module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load env before importing firebase config
load_dotenv()

from core.firebase_config import initialize_firebase, get_rtdb

class HermesAgent:
    CONFIG_FILE = "agent_config.json"

    def __init__(self):
        self.device_id = self._get_or_create_device_id()
        self.hostname = socket.gethostname()
        self.platform = os.uname().sysname.lower() if hasattr(os, 'uname') else "unknown"
        
        # Initialize Firebase
        print(f"[Agent] Booting up HermesLink Worker...")
        print(f"[Agent] Device ID: {self.device_id}")
        initialize_firebase()
        self.rtdb = get_rtdb()
        self.presence_ref = self.rtdb.child(f'presence/{self.device_id}')

    def _get_or_create_device_id(self) -> str:
        """Loads an existing device ID from config or generates a new one."""
        if os.path.exists(self.CONFIG_FILE):
            try:
                with open(self.CONFIG_FILE, 'r') as f:
                    config = json.load(f)
                    if 'device_id' in config:
                        return config['device_id']
            except Exception as e:
                print(f"[Agent] Warning: Could not read {self.CONFIG_FILE}: {e}")

        # Generate new ID
        new_id = f"device_{uuid.uuid4().hex[:12]}"
        try:
            with open(self.CONFIG_FILE, 'w') as f:
                json.dump({'device_id': new_id}, f)
        except Exception as e:
            print(f"[Agent] Warning: Could not save new device ID to {self.CONFIG_FILE}: {e}")
        
        return new_id

    def connect(self):
        """Registers the device presence in RTDB."""
        print(f"[Agent] Connecting to Firebase RTDB Presence...")
        
        # 1. Set current status to online
        print("[Agent] Setting status to online...")
        self.presence_ref.set({
            "name": self.hostname,
            "platform": self.platform,
            "status": "online",
            "started_at": int(time.time() * 1000),
            "last_seen": int(time.time() * 1000)
        })
        
        print(f"[Agent] Device {self.hostname} ({self.device_id}) is now ONLINE.")

    def run_forever(self):
        """Main idle loop for the daemon. Pings RTDB presence."""
        self.connect()
        print("[Agent] Entering idle loop. Sending heartbeats every 30s. Press Ctrl+C to shutdown.")
        try:
            while True:
                # The python admin SDK does not support on_disconnect()
                # So we update our 'last_seen' heartbeat constantly.
                # A cloud function or frontend will consider us offline if
                # last_seen is older than 60+ seconds.
                self.presence_ref.update({
                    "last_seen": int(time.time() * 1000)
                })
                time.sleep(30) 
        except KeyboardInterrupt:
            self._shutdown()

    def _shutdown(self):
        """Graceful shutdown hook."""
        print("\n[Agent] Shutting down gracefully...")
        # Manually set offline status
        try:
            self.presence_ref.update({
                "status": "offline",
                "last_seen": int(time.time() * 1000)
            })
            print("[Agent] Marked as offline.")
        except Exception as e:
            print(f"[Agent] Error during shutdown status update: {e}")

if __name__ == "__main__":
    agent = HermesAgent()
    agent.run_forever()
