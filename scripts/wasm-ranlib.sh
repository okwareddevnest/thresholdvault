#!/usr/bin/env bash
set -euo pipefail
exec /usr/bin/llvm-ranlib-20 "$@"
