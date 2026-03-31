import random
from fastapi import APIRouter, HTTPException
from database.connection import locations_collection, request_collection # CHANGED: Updated imports
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/admin", tags=["Admin"])

# --- RECENT GLOBAL ACTIVITY FOR ADMIN TABLE ---
@router.get("/recent-activity")
def get_recent_global_activity():
    """Fetches the latest service requests across the entire platform."""
    try:
        # Get the 50 most recent requests, regardless of status
        cursor = request_collection.find({}).sort("_id", -1).limit(50)
        activities = []
        for doc in cursor:
            activities.append({
                "id": str(doc["_id"])[-6:], # Use last 6 chars of Mongo ID as a mock Job ID
                "customer": doc.get("receiver_name", "Unknown"),
                "provider_id": doc.get("provider_id"),
                "service": doc.get("service_name", "General"),
                "status": doc.get("status", "pending"),
                "amount": doc.get("price", 0),
                "date": doc.get("completed_at") or doc.get("accepted_at") or doc.get("created_at", "Just now")
            })
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/seed-providers/{count}")
def seed_fake_providers(count: int):
    """Manually inject fake providers into MongoDB for testing."""
    categories = ["Plumber", "Electrician", "Mechanic", "General Handyman"]
    fake_providers = []
    
    # Base coordinates for Meerut area (Updated from New Delhi to match your project focus)
    base_lat, base_lng = 28.7993, 77.5410

    try:
        for i in range(count):
            lat_offset = random.uniform(-0.06, 0.06)
            lng_offset = random.uniform(-0.06, 0.06)
            
            provider = {
                "provider_id": f"fake_{9000 + i}",  # CHANGED: Must be a string now!
                "name": f"Expert_{random.choice(['John', 'Abhi', 'Sam', 'Raj'])}_{i}",
                "category": random.choice(categories),
                "location": {
                    "type": "Point",
                    "coordinates": [base_lng + lng_offset, base_lat + lat_offset]
                },
                "is_online": True,
                "experience": random.randint(2, 20),
                "charge": float(random.randint(150, 1500)),
                "rating": round(random.uniform(3.8, 5.0), 1),
                "bio": "System-generated professional for platform stress testing."
            }
            fake_providers.append(provider)

        if fake_providers:
            locations_collection.insert_many(fake_providers)
            
        return {"message": f"Successfully injected {count} providers into the map."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear-map")
def clear_all_providers():
    """Wipe all provider data from MongoDB instantly."""
    try:
        locations_collection.delete_many({})
        return {"message": "All map data has been cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
def get_system_stats():
    """Get count of active users and jobs."""
    online_count = locations_collection.count_documents({"is_online": True})
    total_jobs = request_collection.count_documents({})
    return {
        "online_providers": online_count,
        "total_requests": total_jobs
    }

@router.get("/providers", response_model=List[dict])
def get_all_providers_for_admin():
    """Returns every provider currently in MongoDB for the Admin Table."""
    try:
        cursor = locations_collection.find({})
        providers = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            providers.append({
                "mongo_id": doc["_id"],
                "id": doc.get("provider_id"),
                "name": doc.get("name"),
                "category": doc.get("category"),
                "is_online": doc.get("is_online"),
                "experience": doc.get("experience", 0),
                "charge": doc.get("charge", 0.0),
                "rating": doc.get("rating", 5.0)
            })
        return providers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/provider/{provider_id}")
def delete_specific_provider(provider_id: str): # CHANGED: int -> str
    """Manually remove a specific provider (real or fake) from the map."""
    try:
        result = locations_collection.delete_one({"provider_id": provider_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Provider not found on map")
        return {"message": f"Provider {provider_id} removed from map"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

# --- REVENUE ANALYTICS AGGREGATION ---
@router.get("/revenue-analytics")
def get_revenue_analytics():
    """Aggregates completed jobs to calculate total revenue per category."""
    try:
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {
                "_id": "$service_name",
                "total_revenue": {"$sum": "$price"},
                "job_count": {"$sum": 1}
            }},
            {"$sort": {"total_revenue": -1}}
        ]
        
        results = list(request_collection.aggregate(pipeline))
        formatted_data = [
            {"category": doc["_id"], "revenue": doc["total_revenue"], "jobs": doc["job_count"]} 
            for doc in results if doc["_id"]
        ]
        return formatted_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- DAILY REPORT AGGREGATION FOR CSV EXPORT ---
@router.get("/daily-report")
def get_daily_performance_report():
    """Aggregates completed jobs by date for the Admin Dashboard trends and CSV downloads."""
    try:
        pipeline = [
            {"$match": {"status": "completed", "completed_at": {"$exists": True}}},
            {"$addFields": {
                "date": {"$substr": ["$completed_at", 0, 10]}
            }},
            {"$group": {
                "_id": "$date",
                "daily_revenue": {"$sum": "$price"},
                "jobs_completed": {"$sum": 1}
            }},
            {"$sort": {"_id": -1}} 
        ]
        
        results = list(request_collection.aggregate(pipeline))
        formatted_data = [
            {"date": doc["_id"], "revenue": doc["daily_revenue"], "jobs": doc["jobs_completed"]} 
            for doc in results if doc["_id"]
        ]
        return formatted_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))