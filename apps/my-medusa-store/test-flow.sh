#!/bin/bash

set -e

BASE_URL="http://localhost:9000"

EMAIL_A="vendorA_$(date +%s)@example.com"
EMAIL_B="vendorB_$(date +%s)@example.com"
PASSWORD="supersecret"

echo "🚀 Starting FULL Marketplace Test Flow"
echo "======================================"

########################################
# 🔐 LOGIN OR REGISTER
########################################
get_token() {
  local EMAIL=$1

  echo "➡️ Getting token for $EMAIL" >&2

  RESPONSE=$(curl -s -X POST "$BASE_URL/auth/vendor/emailpass" \
    -H "Content-Type: application/json" \
    --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

  TOKEN=$(echo "$RESPONSE" | jq -r '.token // .auth_token // .access_token')

  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "👉 Registering $EMAIL..." >&2

    curl -s -X POST "$BASE_URL/auth/vendor/emailpass/register" \
      -H "Content-Type: application/json" \
      --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
      > /dev/null

    RESPONSE=$(curl -s -X POST "$BASE_URL/auth/vendor/emailpass" \
      -H "Content-Type: application/json" \
      --data-raw "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

    TOKEN=$(echo "$RESPONSE" | jq -r '.token // .auth_token // .access_token')
  fi

  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed token for $EMAIL" >&2
    echo "$RESPONSE" | jq >&2
    exit 1
  fi

  # ✅ ONLY THIS goes to stdout
  printf "%s" "$TOKEN"
}
########################################
# 🏪 CREATE VENDOR
########################################
create_vendor() {
  local TOKEN=$1
  local EMAIL=$2

  PAYLOAD=$(echo "$TOKEN" | cut -d '.' -f2 | base64 -d 2>/dev/null)
  ACTOR_ID=$(echo "$PAYLOAD" | jq -r '.actor_id')

  if [ -z "$ACTOR_ID" ] || [ "$ACTOR_ID" = "null" ]; then
    echo "🏪 Creating vendor for $EMAIL..." >&2

    curl -s -X POST "$BASE_URL/vendors" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --data-raw "{\"name\":\"Acme\",\"handle\":\"acme-$(date +%s)\",\"admin\":{\"email\":\"$EMAIL\"}}" \
      > /dev/null
  fi
}

########################################
# 🛒 CREATE PRODUCT
########################################
create_product() {
  local TOKEN=$1

  RESPONSE=$(curl -s -X POST "$BASE_URL/vendors/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    --data-raw "{
      \"title\": \"Test Product $(date +%s)\",
      \"handle\": \"test-product-$(date +%s)\",
      \"status\": \"published\",
      \"options\": [{\"title\": \"Default\",\"values\": [\"Default\"]}],
      \"variants\": [{
        \"title\": \"Default\",
        \"options\": {\"Default\": \"Default\"},
        \"prices\": [{\"currency_code\": \"usd\",\"amount\": 1200}]
      }]
    }")

 PRODUCT_ID=$(echo "$RESPONSE" | jq -r '.product.id')

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo "❌ Product creation failed"
  echo "$RESPONSE" | jq
  exit 1
fi

echo "$PRODUCT_ID"
}

########################################
# 🧪 TEST FLOW
########################################

echo "🔐 Vendor A..."
TOKEN_A=$(get_token "$EMAIL_A")
echo "DEBUG TOKEN_A: ${TOKEN_A:0:20}..."
create_vendor "$TOKEN_A" "$EMAIL_A"
TOKEN_A=$(get_token "$EMAIL_A")
echo "DEBUG TOKEN_A: ${TOKEN_A:0:20}..."
echo "TOKEN_A length: ${#TOKEN_A}"

echo "🔐 Vendor B..."
TOKEN_B=$(get_token "$EMAIL_B")
create_vendor "$TOKEN_B" "$EMAIL_B"
TOKEN_B=$(get_token "$EMAIL_B")

echo "🛒 Creating products..."
PRODUCT_A=$(create_product "$TOKEN_A")
PRODUCT_B=$(create_product "$TOKEN_B")

echo "✅ PRODUCT_A=$PRODUCT_A"
echo "✅ PRODUCT_B=$PRODUCT_B"

########################################
# 📦 GET (minimal output)
########################################

echo "📦 Vendor A product list (clean):"

curl -s "$BASE_URL/vendors/products" \
  -H "Authorization: Bearer $TOKEN_A" \
  | jq '{products: [.products[] | {id, title, handle}]}'

########################################
# 🔐 ISOLATION TEST
########################################

LIST_A=$(curl -s "$BASE_URL/vendors/products" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$LIST_A" | jq -e --arg id "$PRODUCT_B" '.products[] | select(.id==$id)' > /dev/null; then
  echo "❌ FAIL: A can see B"
else
  echo "✅ PASS: Isolation OK"
fi

########################################
# ✏️ UPDATE
########################################

UPDATE_RES=$(curl -s -X PATCH "$BASE_URL/vendors/products/$PRODUCT_A" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated"}')

echo "$UPDATE_RES" | jq '.product | {id, title}'

########################################
# 🗑️ DELETE
########################################

DELETE_RES=$(curl -s -X DELETE "$BASE_URL/vendors/products/$PRODUCT_A" \
  -H "Authorization: Bearer $TOKEN_A")

echo "$DELETE_RES"

########################################
# 💣 CROSS ATTACK
########################################

ATTACK_RES=$(curl -s -X DELETE "$BASE_URL/vendors/products/$PRODUCT_B" \
  -H "Authorization: Bearer $TOKEN_A")

if echo "$ATTACK_RES" | grep -q "deleted"; then
  echo "❌ SECURITY BREACH"
else
  echo "✅ Cross-access blocked"
fi

echo "======================================"
echo "🎯 TEST FLOW COMPLETE"