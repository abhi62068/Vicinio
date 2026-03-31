from sqlalchemy import Column, Integer, String, Float, Text
from database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # 'provider' or 'receiver'
    
    # NEW PROFILE FIELDS
    service_category = Column(String, nullable=True)
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    base_charge = Column(Float, default=0.0)
    rating = Column(Float, default=5.0)