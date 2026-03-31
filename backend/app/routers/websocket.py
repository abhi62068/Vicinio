from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json

router = APIRouter(tags=["Websockets"])

# Store active connections using String IDs
active_connections: Dict[str, WebSocket] = {}

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    print(f"\n🟢 [WEBSOCKET] Provider Connected -> ID: '{client_id}'")
    print(f"📊 [WEBSOCKET] Total Connections Active: {list(active_connections.keys())}\n")
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"🔴 [WEBSOCKET] Provider Disconnected -> ID: '{client_id}'")
        if client_id in active_connections:
            del active_connections[client_id]

async def notify_user(user_id: str, message: dict):
    """Utility function to fire live JSON events to specific connected users."""
    print(f"\n🎯 [NOTIFY] Receiver is trying to book Provider ID: '{user_id}'")
    
    if user_id in active_connections:
        websocket = active_connections[user_id]
        try:
            await websocket.send_json(message)
            print(f"✅ [NOTIFY] SUCCESS! Notification delivered to '{user_id}'!\n")
        except Exception as e:
            print(f"⚠️ [NOTIFY] Failed to send to '{user_id}': {e}\n")
    else:
        print(f"❌ [NOTIFY] FAILED: Provider '{user_id}' is NOT in the active connections list!")
        print(f"📋 [NOTIFY] We only have these IDs connected right now: {list(active_connections.keys())}\n")