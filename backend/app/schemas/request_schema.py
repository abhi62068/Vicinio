from pydantic import BaseModel

class ServiceRequest(BaseModel):
    receiver_id: int
    receiver_name: str
    provider_id: int
    service_name: str
    status: str = "pending" # pending, accepted, declined