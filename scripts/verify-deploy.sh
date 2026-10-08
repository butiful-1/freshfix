#!/bin/zsh
# Post-deploy checks for build 7 (docs/ios-build7-deployment.md §3).
# Usage: scripts/verify-deploy.sh [origin]   (default https://old2new.app)
# Read-only: every request is a GET or an unauthenticated POST that the API
# rejects; nothing is written anywhere.
O=${1:-https://old2new.app}; fail=0
chk() { local name=$1 want=$2 got=$3; if [[ "$got" == *"$want"* ]]; then echo "OK   $name"; else echo "FAIL $name (got: ${got:0:120})"; fail=1; fi }

chk "References route serves the app"    "200"                   "$(curl -s -o /dev/null -w '%{http_code}' "$O/references")"
chk "Bundle contains the References screen" "Sources & References" "$(curl -s "$O/" | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1 | xargs -I{} curl -s "$O/{}" | grep -o -m1 'Sources & References')"
chk "apple/verify route live (401)"      "Not signed in"         "$(curl -s -X POST "$O/api/apple/verify" -H 'Content-Type: application/json' -d '{"jws":"a.b.c"}')"
chk "apple/notifications route live"     "signedPayload"         "$(curl -s -X POST "$O/api/apple/notifications" -H 'Content-Type: application/json' -d '{}')"
chk "apple/notifications rejects forged" "could not be verified" "$(curl -s -X POST "$O/api/apple/notifications" -H 'Content-Type: application/json' -d '{"signedPayload":"eyJhbGciOiJFUzI1NiJ9.eyJub3RpZmljYXRpb25UeXBlIjoiVEVTVCIsImRhdGEiOnsiZW52aXJvbm1lbnQiOiJTYW5kYm94IiwiYnVuZGxlSWQiOiJhcHAub2xkMm5ldy5pb3MifX0.c2ln"}')"
chk "Terms updated for Apple billing"    "October 8, 2026"       "$(curl -s "$O/terms.html" | grep -o -m1 'October 8, 2026')"
chk "Privacy updated for Apple billing"  "October 8, 2026"       "$(curl -s "$O/privacy.html" | grep -o -m1 'October 8, 2026')"
chk "Stripe checkout still answers"      "Invalid plan"          "$(curl -s -X POST "$O/api/create-checkout" -H 'Content-Type: application/json' -d '{"plan":"x"}')"
chk "Health endpoint"                    "ok"                    "$(curl -s "$O/api/health")"
echo; [[ $fail == 0 ]] && echo "All post-deploy checks passed" || { echo "Some checks FAILED"; exit 1; }
