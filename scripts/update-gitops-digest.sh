#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo 'usage: update-gitops-digest.sh sha256:DIGEST CHECKOUT' >&2
  exit 2
fi

digest="$1"
checkout="$2"
kustomization="$checkout/kustomization.yaml"

case "$digest" in
  sha256:????????????????????????????????????????????????????????????????) ;;
  *)
    echo 'digest update rejected: malformed digest' >&2
    exit 1
    ;;
esac
if ! printf '%s' "$digest" | grep -Eq '^sha256:[0-9a-f]{64}$'; then
  echo 'digest update rejected: malformed digest' >&2
  exit 1
fi
if [ ! -f "$kustomization" ] || [ -L "$kustomization" ]; then
  echo 'digest update rejected: kustomization is unavailable' >&2
  exit 1
fi
if [ -n "$(git -C "$checkout" status --porcelain)" ]; then
  echo 'digest update rejected: checkout is not clean' >&2
  exit 1
fi

node - "$kustomization" "$digest" <<'NODE'
'use strict';

const fs = require('node:fs');
const [file, digest] = process.argv.slice(2);
const input = fs.readFileSync(file, 'utf8');
const imageNames = input.match(
  /^  - name: ghcr\.io\/hannosirkel\/servitium$/gm,
) || [];
const digestLines = input.match(/^    digest: sha256:[0-9a-f]{64}$/gm) || [];
const imageBlock = /^  - name: ghcr\.io\/hannosirkel\/servitium\n    newName: ghcr\.io\/hannosirkel\/servitium\n    digest: sha256:[0-9a-f]{64}$/gm;
const matches = [...input.matchAll(imageBlock)];
if (imageNames.length !== 1 || digestLines.length !== 1 || matches.length !== 1) {
  process.stderr.write('digest update rejected: expected one image entry\n');
  process.exit(1);
}
const replacement = matches[0][0].replace(
  /digest: sha256:[0-9a-f]{64}$/,
  `digest: ${digest}`,
);
fs.writeFileSync(file, input.replace(imageBlock, replacement));
NODE

git -C "$checkout" diff --check

if [ "$(git -C "$checkout" diff --name-only)" != 'kustomization.yaml' ]; then
  echo 'digest update rejected: unexpected changed file' >&2
  exit 1
fi
if [ "$(git -C "$checkout" diff --numstat)" != "1	1	kustomization.yaml" ]; then
  echo 'digest update rejected: unexpected diff size' >&2
  exit 1
fi

changed_lines="$(
  git -C "$checkout" diff --unified=0 -- kustomization.yaml \
    | grep -E '^[+-]' | grep -Ev '^(---|\+\+\+)' || true
)"
if [ "$(printf '%s\n' "$changed_lines" | grep -c .)" -ne 2 ]; then
  echo 'digest update rejected: unexpected changed lines' >&2
  exit 1
fi
if [ "$(printf '%s\n' "$changed_lines" | grep -Ec '^[-+]    digest: sha256:[0-9a-f]{64}$')" -ne 2 ]; then
  echo 'digest update rejected: non-digest line changed' >&2
  exit 1
fi
if [ "$(grep -c "^    digest: $digest$" "$kustomization")" -ne 1 ]; then
  echo 'digest update rejected: replacement was not exact' >&2
  exit 1
fi
