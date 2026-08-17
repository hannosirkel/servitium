#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
dockerfile="$repo_root/Dockerfile"
expected_from='FROM node:26.7.0-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341'

[[ "$(head -n 1 "$dockerfile")" == "$expected_from" ]]
grep -qx 'USER 10001:10001' "$dockerfile"
grep -qx 'EXPOSE 8099' "$dockerfile"
grep -q 'CMD \["node", "src/server.js"\]' "$dockerfile"
grep -Fqx 'RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx' "$dockerfile"

echo "container contract tests passed"
