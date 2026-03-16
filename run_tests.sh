#!/usr/bin/env bash
# run_tests.sh — Full automated test suite for BLE Dashboard
# Usage: ./run_tests.sh [--e2e] [--js-only] [--py-only]

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

E2E=false
JS_ONLY=false
PY_ONLY=false

for arg in "$@"; do
  case $arg in
    --e2e)     E2E=true ;;
    --js-only) JS_ONLY=true ;;
    --py-only) PY_ONLY=true ;;
  esac
done

PASS=0; FAIL=0

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        BLE Dashboard — Automated Test Suite          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Python tests (unit + integration) ────────────────────────────────────────
if [ "$JS_ONLY" = false ]; then
  echo "▶  Python: unit + integration tests"
  echo "─────────────────────────────────────"
  cd "$ROOT/backend"
  if python3 -m pytest ../tests/test_logger.py ../tests/test_ble_manager.py ../tests/test_api.py \
    -v --tb=short \
    --cov=. \
    --cov-report=term-missing \
    --cov-report=html:"$ROOT/coverage_html/python"; then
    echo "✅ Python tests PASSED"
    ((PASS++)) || true
  else
    echo "❌ Python tests FAILED"
    ((FAIL++)) || true
  fi
  cd "$ROOT"
  echo ""
fi

# ── E2E tests ─────────────────────────────────────────────────────────────────
if [ "$E2E" = true ] && [ "$JS_ONLY" = false ]; then
  echo "▶  E2E: Playwright tests"
  echo "─────────────────────────────────────"
  cd "$ROOT/backend"
  if python3 -m pytest ../tests/test_e2e.py -v --tb=short -m e2e 2>&1 || \
     python3 -m pytest ../tests/test_e2e.py -v --tb=short; then
    echo "✅ E2E tests PASSED"
    ((PASS++)) || true
  else
    echo "❌ E2E tests FAILED"
    ((FAIL++)) || true
  fi
  cd "$ROOT"
  echo ""
fi

# ── JS tests (vitest) ─────────────────────────────────────────────────────────
if [ "$PY_ONLY" = false ]; then
  echo "▶  JavaScript: vitest"
  echo "─────────────────────────────────────"
  if npx vitest run tests/test_frontend.js --reporter=verbose; then
    echo "✅ JS tests PASSED"
    ((PASS++)) || true
  else
    echo "❌ JS tests FAILED"
    ((FAIL++)) || true
  fi
  echo ""
fi

# ── summary ───────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════╗"
printf  "║  Results:  ✅ %d passed  ❌ %d failed%*s║\n" $PASS $FAIL $((33-${#PASS}-${#FAIL})) ""
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "📊 Coverage reports:"
echo "   Python  → coverage_html/python/index.html"
echo "   JS      → coverage_html/js/index.html  (run with --coverage flag)"
echo ""

[ "$FAIL" -eq 0 ]
