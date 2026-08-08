#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
dockerfile="$repo_root/Dockerfile"
expected_from='FROM node:26.5.1-bookworm-slim@sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73'

[[ "$(head -n 1 "$dockerfile")" == "$expected_from" ]]
grep -qx 'USER 10001:10001' "$dockerfile"
grep -qx 'EXPOSE 8099' "$dockerfile"
grep -q 'CMD \["node", "src/server.js"\]' "$dockerfile"
grep -Fqx 'RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx' "$dockerfile"

echo "container contract tests passed"
