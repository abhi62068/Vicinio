from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import db, locations_collection, users_collection
import pymongo

# Import the routers
from routers import auth, location, admin, websocket 

app = FastAPI(title="Geolocate API - Cloud Edition")
origins = [
    "https://vicinio.netlify.app",
    "http://localhost:5173",
]

# 2. Add the CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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