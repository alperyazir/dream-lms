#!/usr/bin/env python
"""Export OpenAPI spec to JSON file."""
import json
from app.main import app

if __name__ == "__main__":
    openapi_schema = app.openapi()
    with open("../frontend/openapi.json", "w") as f:
        json.dump(openapi_schema, f, indent=2)
    print("OpenAPI spec exported successfully to ../frontend/openapi.json")
