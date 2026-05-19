#!/bin/bash

EMAIL=${1:-"vendor_$(date +%s)@example.com"}
PASSWORD=${2:-"supersecret"}

echo "📧 Using EMAIL=$EMAIL"
echo "🔑 Using PASSWORD=$PASSWORD"

echo "🔐 Login or Register..."

TOKEN=$(curl -s -X POST 'http://localhost:9000/auth/vendor/emailpass' \
-H 'Content-Type: application/json' \
--data-raw "{
  \"email\": \"$EMAIL\",
  \"password\": \"$PASSWORD\"
}" | jq -r '.token // .auth_token // .access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "👉 Registering..."

  TOKEN=$(curl -s -X POST 'http://localhost:9000/auth/vendor/emailpass/register' \
  -H 'Content-Type: application/json' \
  --data-raw "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" | jq -r '.token // .auth_token // .access_token')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ TOKEN acquired"

PAYLOAD=$(echo "$TOKEN" | cut -d '.' -f2 | base64 -d 2>/dev/null)
ACTOR_ID=$(echo "$PAYLOAD" | jq -r '.actor_id')

echo "🧠 actor_id=$ACTOR_ID"

if [ -z "$ACTOR_ID" ] || [ "$ACTOR_ID" = "null" ] || [ "$ACTOR_ID" = "" ]; then
  echo "🚀 Creating vendor..."

  curl -s -X POST 'http://localhost:9000/vendors' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data-raw "{
    \"name\": \"Acme\",
    \"handle\": \"acme-$(date +%s)\",
    \"admin\": {
      \"email\": \"$EMAIL\",
      \"first_name\": \"Admin\",
      \"last_name\": \"Acme\"
    }
  }" | jq

  echo "🔐 Re-login..."

  TOKEN=$(curl -s -X POST 'http://localhost:9000/auth/vendor/emailpass' \
  -H 'Content-Type: application/json' \
  --data-raw "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" | jq -r '.token // .auth_token // .access_token')

  echo "✅ Vendor token ready"
fi

echo "🎯 FINAL TOKEN=$TOKEN"
echo "📧 EMAIL=$EMAIL"
