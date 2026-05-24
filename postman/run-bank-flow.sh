#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
SUFFIX="$(date +%s | tail -c 9)"
SENDER_EMAIL="omer${SUFFIX}@gmail.com"
RECIPIENT_EMAIL="friend${SUFFIX}@gmail.com"
PASSWORD="0000"
OTP="123456"
AMOUNT="25.75"
COOKIE_JAR="$(mktemp)"

cleanup() {
    rm -f "$COOKIE_JAR"
}

trap cleanup EXIT

request() {
    local method="$1"
    local path="$2"
    local body="${3:-}"

    if [ -n "$body" ]; then
        curl -sS -X "$method" "$BASE_URL$path" \
            -b "$COOKIE_JAR" \
            -c "$COOKIE_JAR" \
            -H "Content-Type: application/json" \
            -d "$body"
    else
        curl -sS -X "$method" "$BASE_URL$path" \
            -b "$COOKIE_JAR" \
            -c "$COOKIE_JAR"
    fi
}

json_value() {
    node -e "const data = JSON.parse(process.argv[1]); console.log(data$1);" "$2"
}

echo "1. Signup sender"
SIGNUP_SENDER_RESPONSE="$(request POST /auth/signup "{\"email\":\"$SENDER_EMAIL\",\"password\":\"$PASSWORD\"}")"
echo "$SIGNUP_SENDER_RESPONSE"
SENDER_USER_ID="$(json_value ".userId" "$SIGNUP_SENDER_RESPONSE")"

echo
echo "2. Verify sender OTP"
VERIFY_RESPONSE="$(request POST /auth/verify-otp "{\"userId\":\"$SENDER_USER_ID\",\"otp\":\"$OTP\"}")"
echo "$VERIFY_RESPONSE"

echo
echo "3. Login sender"
LOGIN_RESPONSE="$(request POST /auth/login "{\"email\":\"$SENDER_EMAIL\",\"password\":\"$PASSWORD\"}")"
echo "$LOGIN_RESPONSE"

echo
echo "4. Signup recipient"
SIGNUP_RECIPIENT_RESPONSE="$(request POST /auth/signup "{\"email\":\"$RECIPIENT_EMAIL\",\"password\":\"$PASSWORD\"}")"
echo "$SIGNUP_RECIPIENT_RESPONSE"

echo
echo "5. Send transaction"
SEND_RESPONSE="$(request POST /transaction/send "{\"recipientEmail\":\"$RECIPIENT_EMAIL\",\"amount\":$AMOUNT}")"
echo "$SEND_RESPONSE"

echo
echo "6. Get transaction history"
HISTORY_RESPONSE="$(request GET "/transaction/history?page=1&limit=10")"
echo "$HISTORY_RESPONSE"
