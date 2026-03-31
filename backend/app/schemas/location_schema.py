from pydantic import BaseModel
from typing import List, Optional

class LocationUpdate(BaseModel):
    provider_id: str  # CHANGED: MongoDB uses string IDs
    name: str
    category: str
    coordinates: List[float] # [longitude, latitude]
    is_online: bool
    
    # Informative fields
    experience: Optional[int] = 0
    charge: Optional[float] = 0.0
    rating: Optional[float] = 5.0
    bio: Optional[str] = ""

    # Status tracking
    status: Optional[str] = "pending"
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None