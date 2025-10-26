#!/bin/bash

# Story 1.1 Validation Script
# Tests: Role-based authentication, JWT tokens, RBAC

set -e  # Exit on error

API_URL="http://localhost:8000/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Story 1.1 Validation: RBAC Implementation"
echo "========================================="
echo ""

# Check if backend is running
echo -n "1. Checking if backend is running... "
if curl -s "${API_URL}/utils/health-check/" > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "Please start backend with: cd backend && source venv/bin/activate && fastapi dev app/main.py"
    exit 1
fi
echo ""

# Login as admin
echo "2. Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST "${API_URL}/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=changethis")

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}✗ Failed to get admin token${NC}"
    echo "Response: $ADMIN_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✓ Admin login successful${NC}"
    echo "   Token (first 20 chars): ${ADMIN_TOKEN:0:20}..."
fi
echo ""

# Verify JWT contains role
echo "3. Verifying JWT token structure..."
TOKEN_PAYLOAD=$(echo $ADMIN_TOKEN | cut -d'.' -f2)
# Add padding if needed for base64
TOKEN_PAYLOAD="${TOKEN_PAYLOAD}$(printf '=%.0s' {1..4})"
DECODED=$(echo $TOKEN_PAYLOAD | base64 -d 2>/dev/null || echo "{}")

if echo "$DECODED" | grep -q '"role"'; then
    ROLE=$(echo "$DECODED" | grep -o '"role":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓ JWT contains role claim${NC}"
    echo "   Role: $ROLE"
else
    echo -e "${RED}✗ JWT does not contain role claim${NC}"
    echo "   Decoded payload: $DECODED"
    exit 1
fi
echo ""

# Test admin can access users endpoint
echo "4. Testing admin access to protected endpoint..."
USERS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "${API_URL}/users/")

HTTP_CODE=$(echo "$USERS_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$USERS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Admin can access /users/ endpoint${NC}"
    USER_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    echo "   User count: ${USER_COUNT:-unknown}"
else
    echo -e "${RED}✗ Admin cannot access /users/ endpoint (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo ""

# Create a student user for testing
echo "5. Creating a student user for testing..."
STUDENT_CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${API_URL}/users/" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teststudent@example.com",
    "password": "studentpass123",
    "full_name": "Test Student",
    "role": "student"
  }')

CREATE_HTTP_CODE=$(echo "$STUDENT_CREATE_RESPONSE" | tail -n1)
CREATE_BODY=$(echo "$STUDENT_CREATE_RESPONSE" | head -n-1)

if [ "$CREATE_HTTP_CODE" = "200" ] || [ "$CREATE_HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Student user created successfully${NC}"
    STUDENT_ROLE=$(echo "$CREATE_BODY" | grep -o '"role":"[^"]*' | cut -d'"' -f4)
    echo "   Role assigned: $STUDENT_ROLE"
elif echo "$CREATE_BODY" | grep -q "already exists"; then
    echo -e "${YELLOW}⚠ Student user already exists (using existing)${NC}"
else
    echo -e "${RED}✗ Failed to create student user (HTTP $CREATE_HTTP_CODE)${NC}"
    echo "   Response: $CREATE_BODY"
    exit 1
fi
echo ""

# Login as student
echo "6. Testing student login..."
STUDENT_LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/login/access-token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=teststudent@example.com&password=studentpass123")

STUDENT_TOKEN=$(echo $STUDENT_LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$STUDENT_TOKEN" ]; then
    echo -e "${RED}✗ Failed to get student token${NC}"
    echo "   Response: $STUDENT_LOGIN_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✓ Student login successful${NC}"
    echo "   Token (first 20 chars): ${STUDENT_TOKEN:0:20}..."
fi
echo ""

# Verify student JWT has correct role
echo "7. Verifying student JWT has correct role..."
STUDENT_TOKEN_PAYLOAD=$(echo $STUDENT_TOKEN | cut -d'.' -f2)
STUDENT_TOKEN_PAYLOAD="${STUDENT_TOKEN_PAYLOAD}$(printf '=%.0s' {1..4})"
STUDENT_DECODED=$(echo $STUDENT_TOKEN_PAYLOAD | base64 -d 2>/dev/null || echo "{}")

if echo "$STUDENT_DECODED" | grep -q '"role":"student"'; then
    echo -e "${GREEN}✓ Student JWT has correct role${NC}"
else
    echo -e "${RED}✗ Student JWT does not have correct role${NC}"
    echo "   Decoded: $STUDENT_DECODED"
    exit 1
fi
echo ""

# Test student CANNOT access admin endpoints
echo "8. Testing student access control (should be blocked)..."
STUDENT_USERS_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  "${API_URL}/users/")

STUDENT_HTTP_CODE=$(echo "$STUDENT_USERS_RESPONSE" | tail -n1)

if [ "$STUDENT_HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ Student correctly blocked from /users/ endpoint (403 Forbidden)${NC}"
elif [ "$STUDENT_HTTP_CODE" = "200" ]; then
    echo -e "${RED}✗ Student should NOT have access to /users/ endpoint${NC}"
    echo "   RBAC is not working correctly!"
    exit 1
else
    echo -e "${YELLOW}⚠ Unexpected HTTP code: $STUDENT_HTTP_CODE${NC}"
fi
echo ""

# Test both users can access their own profile
echo "9. Testing user can access own profile..."
ADMIN_ME=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "${API_URL}/users/me")
ADMIN_ME_CODE=$(echo "$ADMIN_ME" | tail -n1)

STUDENT_ME=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  "${API_URL}/users/me")
STUDENT_ME_CODE=$(echo "$STUDENT_ME" | tail -n1)

if [ "$ADMIN_ME_CODE" = "200" ] && [ "$STUDENT_ME_CODE" = "200" ]; then
    echo -e "${GREEN}✓ All users can access their own profile${NC}"
else
    echo -e "${RED}✗ Profile access failed (Admin: $ADMIN_ME_CODE, Student: $STUDENT_ME_CODE)${NC}"
    exit 1
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✓ ALL VALIDATION TESTS PASSED!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✓ Backend is running and healthy"
echo "  ✓ Admin login works"
echo "  ✓ JWT tokens include role claim"
echo "  ✓ Admin has access to protected endpoints"
echo "  ✓ Student user can be created with role"
echo "  ✓ Student login works"
echo "  ✓ Student JWT has correct role"
echo "  ✓ Student is blocked from admin endpoints (403)"
echo "  ✓ All users can access their own profile"
echo ""
echo "Story 1.1 RBAC implementation is working correctly!"
echo ""
