#!/bin/bash

EMAIL=${1:-"vendor_1776923080@example.com"}
PASSWORD=${2:-"supersecret"}

echo "📧 EMAIL=$EMAIL"

# 🔐 LOGIN
echo "🔐 Logging in..."

TOKEN=$(curl -s -X POST 'http://localhost:9000/auth/vendor/emailpass' \
  -H 'Content-Type: application/json' \
  --data-raw "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" | jq -r '.token // .auth_token // .access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed. Run create-vendor.sh first."
  exit 1
fi

echo "✅ TOKEN acquired"

# 🧠 DEBUG ACTOR
PAYLOAD=$(echo "$TOKEN" | cut -d '.' -f2 | base64 -d 2>/dev/null)
ACTOR_ID=$(echo "$PAYLOAD" | jq -r '.actor_id')

echo "🧠 actor_id=$ACTOR_ID"

# 🛒 CREATE PRODUCT
echo "🛒 Creating product..."

TIMESTAMP=$(date +%s)

PRODUCT_RESPONSE=$(curl -s -X POST 'http://localhost:9000/vendors/products' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test Product $(date +%s)\",
    \"handle\": \"test-product-$(date +%s)\",
    \"status\": \"published\",
    \"options\": [
      {
        \"title\": \"Default\",
        \"values\": [\"Default\"]
      }
    ],
    \"variants\": [
      {
        \"title\": \"Default\",
        \"options\": {
          \"Default\": \"Default\"
        },
        \"prices\": [
          {
            \"currency_code\": \"usd\",
            \"amount\": 750
          }
        ]
      }
    ]
  }")

echo "$PRODUCT_RESPONSE" | jq

PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.product.id')

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo "❌ Product creation failed"
  exit 1
fi

echo "✅ Product created: $PRODUCT_ID"

# 🔎 FETCH PRODUCTS (SCOPED)
echo "📦 Fetching vendor products..."

curl -s -X GET 'http://localhost:9000/vendors/products' \
  -H "Authorization: Bearer $TOKEN" \
  | jq