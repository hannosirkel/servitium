#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo 'usage: update-gitops-digest.sh sha256:DIGEST OVERLAY_DIRECTORY' >&2
  exit 2
fi

digest="$1"
overlay_input="$2"

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

if ! overlay="$(CDPATH= cd "$overlay_input" && pwd -P)"; then
  echo 'digest update rejected: overlay is unavailable' >&2
  exit 1
fi
if ! repository="$(git -C "$overlay" rev-parse --show-toplevel 2>/dev/null)"; then
  echo 'digest update rejected: overlay is not in a Git worktree' >&2
  exit 1
fi
repository="$(CDPATH= cd "$repository" && pwd -P)"
case "$overlay" in
  "$repository"/*) relative_overlay="${overlay#"$repository"/}" ;;
  *)
    echo 'digest update rejected: overlay is outside its Git worktree' >&2
    exit 1
    ;;
esac
case "$relative_overlay" in
  overlays/live|overlays/test) ;;
  *)
    echo 'digest update rejected: overlay is not permitted' >&2
    exit 1
    ;;
esac

kustomization="$overlay/kustomization.yaml"
if [ ! -f "$kustomization" ] || [ -L "$kustomization" ]; then
  echo 'digest update rejected: kustomization is unavailable' >&2
  exit 1
fi
if ! link_count="$(node -e 'process.stdout.write(String(require("node:fs").statSync(process.argv[1]).nlink))' "$kustomization")"; then
  echo 'digest update rejected: kustomization link count is unavailable' >&2
  exit 1
fi
if [ "$link_count" -ne 1 ]; then
  echo 'digest update rejected: kustomization must not be hard-linked' >&2
  exit 1
fi
if [ -n "$(git -C "$repository" status --porcelain)" ]; then
  echo 'digest update rejected: checkout is not clean' >&2
  exit 1
fi

original="$(mktemp "$overlay/.update-gitops-digest.XXXXXX")"
if ! cp -p "$kustomization" "$original"; then
  rm -f "$original"
  echo 'digest update rejected: could not snapshot kustomization' >&2
  exit 1
fi
restore_needed=1
cleanup() {
  status="$?"
  if [ "$restore_needed" -eq 1 ]; then
    if ! mv -f "$original" "$kustomization"; then
      status=1
    fi
  fi
  rm -f "$original" || true
  trap - EXIT HUP INT TERM
  exit "$status"
}
trap cleanup EXIT HUP INT TERM

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

changed="$(git -C "$repository" diff --name-only)"
if [ "$changed" != "$relative_overlay/kustomization.yaml" ]; then
  echo 'digest update rejected: unexpected changed file' >&2
  exit 1
fi

git -C "$repository" diff --check

expected_numstat="$(printf '1\t1\t%s/kustomization.yaml' "$relative_overlay")"
if [ "$(git -C "$repository" diff --numstat)" != "$expected_numstat" ]; then
  echo 'digest update rejected: unexpected diff size' >&2
  exit 1
fi

changed_lines="$(
  git -C "$repository" diff --unified=0 -- "$relative_overlay/kustomization.yaml" \
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

restore_needed=0
rm -f "$original" || true
trap - EXIT HUP INT TERM
