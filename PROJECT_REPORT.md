# DBMS PROJECT REPORT: Vicinio (Geolocate)

## 1. Introduction
**Vicinio** (codenamed **Geolocate**) is a real-time proximity-based service discovery and emergency response system. This report details the underlying **Database Management System (DBMS)** architecture, focusing on logical design, physical indexing, and query optimization for high-concurrency geospatial workloads.

## 2. Database Selection & Justification
The project utilizes **MongoDB Atlas**, a cloud-native Document-oriented NoSQL database. This selection was driven by:
- **Native Geospatial Support**: Efficient indexing (`2dsphere`) and querying of `Point` objects for real-time proximity detection.
- **Flexible Schema**: Ability to handle evolving professional profile data without downtime-inducing migrations.
- **High Availability**: Built-in replication and partitioning for scaling distributed service requests.

## 3. Logical Database Design (ER to BSON)

### 3.1 Entity Relationship Representation
The system maps traditional relational entities to a document-oriented structure:
- **User (M:N) Provider**: Facilitated through the `service_requests` collection.
- **Provider (1:M) Reviews**: Handled via referencing `provider_id` in the `service_reviews` collection.
- **Request (1:1) Chat History**: Linked via a unique `request_id`.

### 3.2 Collection Schemas & Data Modeling

#### 3.2.1 Users Collection (`users`)
Stores core authentication and profile data.
```json
{
  "_id": "ObjectId",
  "name": "String",
  "email": "String (Unique)",
  "password": "String (Hashed)",
  "role": "Enum ['receiver', 'provider', 'admin']",
  "bio": "String (Optional)"
}
```

#### 3.2.2 Provider Locations (`provider_locations`)
Optimized for read-heavy geospatial searches. **De-normalization** is used here to embed critical statistics (rating, experience) for performance.
```json
{
  "_id": "ObjectId",
  "provider_id": "String (Ref to users)",
  "name": "String",
  "category": "String",
  "location": {
    "type": "Point",
    "coordinates": ["lng", "lat"]
  },
  "is_online": "Boolean",
  "experience": "Int",
  "charge": "Float",
  "rating": "Float (Aggregated Avg)"
}
```

#### 3.2.3 Service Requests (`service_requests`)
Transactional data tracking the lifecycle of a service.
```json
{
  "_id": "ObjectId",
  "receiver_id": "String",
  "receiver_name": "String",
  "provider_id": "String",
  "service_name": "String",
  "status": "Enum ['pending', 'accepted', 'declined', 'completed']",
  "price": "Float",
  "created_at": "ISODate",
  "completed_at": "ISODate (Optional)"
}
```

## 4. Physical Design & Indexing strategies

### 4.1 Geospatial Indexing (`2dsphere`)
To enable millisecond response times for proximity searches, a `2dsphere` index is applied to the `location` field in the `provider_locations` collection.
- **Implementation**: `locations_collection.create_index([("location", pymongo.GEOSPHERE)])`
- **Result**: Enables spherical geometry calculations (distance, containment).

### 4.2 Data Integrity Indexes
- **Unique Personal Identifiers**: A unique index on `email` in the `users` collection prevents duplicate account creation at the database engine level.
- **Request Tracking**: Indexing on `receiver_id` and `provider_id` for efficient filtering of active bookings.

## 5. DML & DQL Implementation (Query Optimization)

### 5.1 Proximity Discovery Query
The core search functionality utilizes the `$nearSphere` operator for efficient radius-based filtering:
```python
query = {
    "is_online": True,
    "location": {
        "$nearSphere": {
            "$geometry": {"type": "Point", "coordinates": [lng, lat]},
            "$maxDistance": radius_km * 1000
        }
    }
}
```

### 5.2 Ratings Aggregation Pipeline
To maintain data consistency, the provider's average rating is recalculated in real-time upon every new review submission:
```python
# 1. Pipeline execution to find average of all related reviews
all_reviews = list(reviews_collection.find({"provider_id": provider_id}))
avg_rating = sum([r["rating"] for r in all_reviews]) / len(all_reviews)

# 2. Atomic update to the profile record
locations_collection.update_one(
    {"provider_id": provider_id},
    {"$set": {"rating": round(avg_rating, 1)}}
)
```

## 6. Data Consistency & Transactions
- **Atomicity**: MongoDB guarantees atomic operations at the documentation level. Status transitions (e.g., `pending` -> `accepted`) are handled as single-document `update_one` operations to prevent race conditions.
- **Persistence**: While real-time alerts are handled via WebSockets, the core "Source of Truth" remains the persistent collections, ensuring no data loss during network interruptions.

## 7. Future Database Roadmap
- **Sharding**: Implementing horizontal partitioning by geographical region (e.g., City codes) to handle global scale.
- **Time-to-Live (TTL) Indexes**: Automating chat history cleanup by expiring documents after 30 days of service completion.

---
*DBMS Report generated on April 7, 2026.*
