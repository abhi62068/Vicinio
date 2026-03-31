from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import db, locations_collection, users_collection
import pymongo

# Import the routers
from routers import auth, location, admin, websocket 

app = FastAPI(title="Geolocate API - Cloud Edition")
# Define the frontend URLs that are allowed to connect.
# Your browser origin is `http://localhost:5175`, so it must be included.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

# 2. Add the CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Allows only your Vite frontend
    allow_credentials=True,
    allow_methods=["*"],   # Allows all HTTP methods (POST, GET, OPTIONS, etc.)
    allow_headers=["*"],   # Allows all headers
)

@app.on_event("startup")
async def setup_atlas_indexes():
    """Ensures MongoDB Atlas is optimized for Geo-searching and Unique Users on startup."""
    try:
        # 1. Create 2dsphere index for the 'nearby' search logic
        locations_collection.create_index([("location", pymongo.GEOSPHERE)])
        
        # 2. Ensure unique emails for registration
        users_collection.create_index("email", unique=True)
        
        print("✅ MongoDB Atlas Indexes Verified.")
    except Exception as e:
        print(f"⚠️ Index Setup Warning: {e}")

# (Duplicate CORS middleware removed; we keep a single source of truth for allowed origins.)

# Include the routers
app.include_router(auth.router)
app.include_router(location.router)
app.include_router(admin.router) 
app.include_router(websocket.router) 

@app.get("/")
def health_check():
    return {
        "status": "Running",
        "database": "MongoDB Atlas",
        "project": "Geolocate"
    }