import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("⚠️ MONGO_URI is missing from the .env file!")

try:
    # Connect to MongoDB Atlas
    client = MongoClient(MONGO_URI)
    
    # Define the primary database
    db = client["geolocate_db"]
    
    # Define the Unified Collections
    users_collection = db["users"]
    locations_collection = db["provider_locations"]
    request_collection = db["service_requests"]
    
    # Send a ping to confirm a successful connection
    client.admin.command('ping')
    print("🚀 SUCCESS: Connected to MongoDB Atlas (geolocate_db)")

except Exception as e:
    print(f"❌ CRITICAL ERROR: MongoDB Atlas Connection Failed: {e}")