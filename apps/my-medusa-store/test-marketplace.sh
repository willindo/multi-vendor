#!/bin/bash

# --- CONFIGURATION ---
API_URL="http://localhost:9000"
API_KEY="pk_6ca3b2c0e56d8431bfba029f3d949bd4443c2357fed0843d1af76bc17715a468"
VARIANT_ID="variant_01KQFQ6686753ZTJVNCQSBB2X0"
REGION_ID="reg_default"
TEST_EMAIL="customer@example.com"

echo "🛒 Step 1: Creating Cart with Email (Storefront)..."
# We inject the email right away so Medusa workflow validations pass later
CART_ID=$(curl -s -X POST "$API_URL/store/carts" \
  -H "x-publishable-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"region_id\": \"$REGION_ID\", \"email\": \"$TEST_EMAIL\"}" | jq -r '.cart.id')
echo "Cart ID: $CART_ID"

echo "📦 Step 2: Adding Item (Custom Route handles Vendor Metadata)..."
curl -s -X POST "$API_URL/store/carts/$CART_ID/line-items" \
  -H "x-publishable-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"variant_id\": \"$VARIANT_ID\", \"quantity\": 1}" > /dev/null

echo "🚚 Step 3: Adding Shipping Method..."
curl -s -X POST "$API_URL/store/carts/$CART_ID/shipping-methods" \
  -H "x-publishable-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"option_id\": \"so_01KRD663G6P5WRP55V33M9KES4\"}" > /dev/null

echo "💳 Step 3.5: Initializing Payment Collection Session..."
# We send an empty object to let Medusa initialize the collection for the cart's total
PAY_COL_ID=$(curl -s -X POST "$API_URL/store/payment-collections" \
  -H "x-publishable-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"cart_id\": \"$CART_ID\"}" | jq -r '.payment_collection.id')

echo "Payment Collection ID: $PAY_COL_ID"

# In some versions, you must also 'select' the provider (usually 'manual' for testing)
echo "💳 Step 3.6: Creating Payment Session..."
curl -s -X POST "$API_URL/store/payment-collections/$PAY_COL_ID/payment-sessions" \
  -H "x-publishable-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"provider_id\": \"pp_system_default\"}" > /dev/null

echo "🏁 Step 4: Completing Cart (The Subscriber Trigger)..."
RESULT=$(curl -s -X POST "$API_URL/store/carts/$CART_ID/complete" \
  -H "x-publishable-api-key: $API_KEY" \
  -H "Idempotency-Key: $(date +%s)" \
  -H "Content-Type: application/json")

ORDER_ID=$(echo $RESULT | jq -r '.order.id')

if [ "$ORDER_ID" == "null" ] || [ -z "$ORDER_ID" ]; then
  echo "❌ Automation failed. Detailed response below:"
  echo "$RESULT" | jq .
  exit 1
fi

echo "✅ Order Successfully Created: $ORDER_ID"
echo "--------------------------------------------------"
echo "Check your backend node terminal logs for: ✅ Linked Order $ORDER_ID"