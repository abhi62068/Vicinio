import os
import csv
import sys

# Add the current directory so we can import the database connection
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database.connection import locations_collection

def import_csv_to_mongo():
    csv_path = r"D:\Projects\geolocate\final_enriched_emergency_dataset.csv"
    if not os.path.exists(csv_path):
        print(f"ERROR: CSV not found at {csv_path}")
        return
        
    inserted_count = 0
    updated_count = 0
    
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            amenity = row.get("amenity", "").lower()
            facility_type = row.get("health_facility_type", "").lower()
            
            # Exclude individual doctors
            if 'doctor' in amenity or 'doctor' in facility_type:
                continue
            
            cat_raw = amenity or facility_type or 'Emergency'
            cat_raw = cat_raw.replace('_', ' ').title()
            
            final_cat = "Hospital"
            phone = row.get("Phone", "").strip()
            
            if "police" in cat_raw.lower():
                final_cat = "Police"
                phone = phone if (phone and phone != "Not Available") else "100"
            elif "fire" in cat_raw.lower():
                final_cat = "Fire"
                phone = phone if (phone and phone != "Not Available") else "101"
            elif "ambulance" in cat_raw.lower() or "emergency" in cat_raw.lower() or "health post" in cat_raw.lower():
                final_cat = "Ambulance"
                phone = phone if (phone and phone != "Not Available") else "102"
            else:
                final_cat = "Hospital"
                phone = phone if (phone and phone != "Not Available") else "102"

            try:
                lat_val = float(row.get("latitude"))
                lng_val = float(row.get("longitude"))
            except (ValueError, TypeError):
                continue

            name_val = row.get("name", "").strip()
            if not name_val:
                name_val = f"Unnamed {final_cat}"

            provider_id = row.get("osm_id", "").strip()
            if not provider_id:
                continue

            # Upsert into MongoDB
            update_result = locations_collection.update_one(
                {"provider_id": provider_id},
                {"$set": {
                    "name": name_val,
                    "category": final_cat,
                    "location": {
                        "type": "Point",
                        "coordinates": [lng_val, lat_val]
                    },
                    "phone": phone,
                    "is_online": True,
                    "is_emergency": True,
                    "charge": 0.0,
                    "experience": 0,
                    "rating": 5.0,
                    "bio": f"Emergency Response Facility ({final_cat})"
                }},
                upsert=True
            )
            
            if update_result.upserted_id:
                inserted_count += 1
            elif update_result.modified_count > 0:
                updated_count += 1
                
    print(f"\nMigration Complete!")
    print(f"Inserted: {inserted_count} new entries.")
    print(f"Updated: {updated_count} existing entries.")

if __name__ == "__main__":
    print("Starting migration of CSV to MongoDB Atlas...")
    import_csv_to_mongo()
