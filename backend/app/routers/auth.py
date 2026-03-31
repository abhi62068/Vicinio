from fastapi import APIRouter, HTTPException, status
from database.connection import users_collection
from schemas.user_schema import UserCreate, UserResponse, UserLogin
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register_user(user_data: UserCreate):
    # 1. Check if email already exists in MongoDB
    existing_user = users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create the user dictionary
    new_user = {
        "name": user_data.name,
        "email": user_data.email,
        "password": user_data.password, # Note: In a real prod app, hash this!
        "role": user_data.role,
        "service_category": user_data.service_category,
        "experience_years": user_data.experience_years,
        "base_charge": user_data.base_charge,
        "rating": 5.0,
        "bio": user_data.bio
    }
    
    # 3. Insert into MongoDB Atlas
    result = users_collection.insert_one(new_user)
    
    # 4. Return data matching the UserResponse schema
    return {
        "id": str(result.inserted_id), # Convert MongoDB ObjectId to string
        "name": new_user["name"],
        "email": new_user["email"],
        "role": new_user["role"],
        "service_category": new_user["service_category"],
        "experience_years": new_user["experience_years"],
        "base_charge": new_user["base_charge"],
        "rating": new_user["rating"],
        "bio": new_user["bio"]
    }

@router.post("/login")
def login_user(user_data: UserLogin):
    # 1. Find user in MongoDB
    user = users_collection.find_one({"email": user_data.email})
    
    # 2. Verify existence and password
    if not user or user["password"] != user_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    return {
        "message": "Login successful",
        "user": {
            "id": str(user["_id"]), # Convert MongoDB ObjectId to string
            "name": user["name"], 
            "role": user["role"],
            "email": user["email"]
        }
    }

# --- GOD MODE: MONGO USER MANAGEMENT ---
@router.get("/users")
def get_all_users():
    """Fetches all users from MongoDB Atlas for the Admin Panel."""
    try:
        users = users_collection.find()
        return [{
            "id": str(u["_id"]), 
            "name": u["name"], 
            "email": u["email"], 
            "role": u["role"]
        } for u in users]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/user/{user_id}")
def delete_user_account(user_id: str): # CHANGED: user_id is now a string
    """Permanently removes a user from MongoDB Atlas."""
    try:
        # Convert string to ObjectId for MongoDB deletion
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": f"User {user_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Invalid ID format or server error")