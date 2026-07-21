#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
helper="$repo_root/scripts/update-gitops-digest.sh"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

old_digest="sha256:$(printf '0%.0s' {1..64})"
new_digest="sha256:$(printf 'a%.0s' {1..64})"

write_fixture() {
  local directory="$1"
  local digest_lines="${2:-1}"
  mkdir -p "$directory"
  {
    printf '%s\n' 'resources:' '  - deployment.yaml' 'images:'
    printf '%s\n' '  - name: ghcr.io/hannosirkel/servitium'
    printf '%s\n' '    newName: ghcr.io/hannosirkel/servitium'
    if [[ "$digest_lines" -ge 1 ]]; then
      printf '    digest: %s\n' "$old_digest"
    fi
    if [[ "$digest_lines" -ge 2 ]]; then
      printf '    digest: %s\n' "$old_digest"
    fi
  } >"$directory/kustomization.yaml"
  git -C "$directory" init --quiet --initial-branch=main
  git -C "$directory" config user.name test
  git -C "$directory" config user.email test@example.invalid
  git -C "$directory" add kustomization.yaml
  git -C "$directory" commit --quiet -m fixture
}

valid="$test_root/valid"
write_fixture "$valid"
"$helper" "$new_digest" "$valid"
[[ "$(git -C "$valid" diff --name-only)" == 'kustomization.yaml' ]]
[[ "$(git -C "$valid" diff --numstat)" == $'1\t1\tkustomization.yaml' ]]
[[ "$(grep -c "digest: $new_digest" "$valid/kustomization.yaml")" -eq 1 ]]
[[ "$(git -C "$valid" diff --unified=0 | grep -c "^-    digest: $old_digest")" -eq 1 ]]
[[ "$(git -C "$valid" diff --unified=0 | grep -c "^+    digest: $new_digest")" -eq 1 ]]

malformed="$test_root/malformed"
write_fixture "$malformed"
if "$helper" 'sha256:not-a-digest' "$malformed" >/dev/null 2>&1; then
  echo 'malformed digest unexpectedly accepted' >&2
  exit 1
fi

missing="$test_root/missing"
write_fixture "$missing" 0
if "$helper" "$new_digest" "$missing" >/dev/null 2>&1; then
  echo 'missing image digest unexpectedly accepted' >&2
  exit 1
fi

duplicate="$test_root/duplicate"
write_fixture "$duplicate" 2
if "$helper" "$new_digest" "$duplicate" >/dev/null 2>&1; then
  echo 'duplicate image digest unexpectedly accepted' >&2
  exit 1
fi

dirty="$test_root/dirty"
write_fixture "$dirty"
printf '%s\n' 'unrelated change' >"$dirty/second-file.txt"
if "$helper" "$new_digest" "$dirty" >/dev/null 2>&1; then
  echo 'dirty checkout unexpectedly accepted' >&2
  exit 1
fi

echo 'digest update guard tests passed'
