#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
dockerfile="$repo_root/Dockerfile"
expected_from='FROM node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d'

[[ "$(head -n 1 "$dockerfile")" == "$expected_from" ]]
grep -qx 'USER 10001:10001' "$dockerfile"
grep -qx 'EXPOSE 8099' "$dockerfile"
grep -q 'CMD \["node", "src/server.js"\]' "$dockerfile"

echo "container contract tests passed"
