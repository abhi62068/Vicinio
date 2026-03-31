from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    service_category: Optional[str] = None
    experience_years: Optional[int] = 0
    base_charge: Optional[float] = 0.0
    bio: Optional[str] = None

class UserResponse(BaseModel):
    id: str  # CHANGED: MongoDB uses string IDs (ObjectIds)
    name: str
    email: EmailStr
    role: str
    service_category: Optional[str] = None
    experience_years: Optional[int] = 0
    base_charge: Optional[float] = 0.0
    rating: Optional[float] = 5.0
    bio: Optional[str] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str