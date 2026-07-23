#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
helper="$repo_root/scripts/update-gitops-digest.sh"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

old_digest="sha256:$(printf '0%.0s' {1..64})"
new_digest="sha256:$(printf 'a%.0s' {1..64})"

write_kustomization() {
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
}

write_fixture() {
  local repository="$1"
  local test_digest_lines="${2:-1}"
  write_kustomization "$repository/overlays/live"
  write_kustomization "$repository/overlays/test" "$test_digest_lines"
  git -C "$repository" init --quiet --initial-branch=main
  git -C "$repository" config user.name test
  git -C "$repository" config user.email test@example.invalid
  git -C "$repository" add overlays
  git -C "$repository" commit --quiet -m fixture
}

valid="$test_root/valid"
write_fixture "$valid"
"$helper" "$new_digest" "$valid/overlays/test"
[[ "$(git -C "$valid" diff --name-only)" == 'overlays/test/kustomization.yaml' ]]
[[ "$(git -C "$valid" diff --numstat)" == $'1\t1\toverlays/test/kustomization.yaml' ]]
[[ "$(grep -c "digest: $new_digest" "$valid/overlays/test/kustomization.yaml")" -eq 1 ]]
[[ "$(grep -c "digest: $old_digest" "$valid/overlays/live/kustomization.yaml")" -eq 1 ]]
[[ "$(git -C "$valid" diff --unified=0 | grep -c "^-    digest: $old_digest")" -eq 1 ]]
[[ "$(git -C "$valid" diff --unified=0 | grep -c "^+    digest: $new_digest")" -eq 1 ]]

root="$test_root/root"
write_fixture "$root"
write_kustomization "$root"
git -C "$root" add kustomization.yaml
git -C "$root" commit --quiet -m root-kustomization
if "$helper" "$new_digest" "$root" >/dev/null 2>&1; then
  echo 'repository root unexpectedly accepted as an overlay' >&2
  exit 1
fi

unexpected="$test_root/unexpected"
write_fixture "$unexpected"
write_kustomization "$unexpected/overlays/preview"
git -C "$unexpected" add overlays/preview/kustomization.yaml
git -C "$unexpected" commit --quiet -m preview
if "$helper" "$new_digest" "$unexpected/overlays/preview" >/dev/null 2>&1; then
  echo 'unexpected overlay unexpectedly accepted' >&2
  exit 1
fi

if "$helper" "$new_digest" "$valid/overlays/test" extra >/dev/null 2>&1; then
  echo 'extra helper argument unexpectedly accepted' >&2
  exit 1
fi

malformed="$test_root/malformed"
write_fixture "$malformed"
if "$helper" 'sha256:not-a-digest' "$malformed/overlays/test" >/dev/null 2>&1; then
  echo 'malformed digest unexpectedly accepted' >&2
  exit 1
fi

missing="$test_root/missing"
write_fixture "$missing"
if "$helper" "$new_digest" "$missing/overlays/missing" >/dev/null 2>&1; then
  echo 'missing image digest unexpectedly accepted' >&2
  exit 1
fi

duplicate="$test_root/duplicate"
write_fixture "$duplicate" 2
if "$helper" "$new_digest" "$duplicate/overlays/test" >/dev/null 2>&1; then
  echo 'duplicate image digest unexpectedly accepted' >&2
  exit 1
fi

symlink="$test_root/symlink"
write_fixture "$symlink"
mv "$symlink/overlays/test/kustomization.yaml" "$symlink/overlays/test/kustomization-target.yaml"
ln -s kustomization-target.yaml "$symlink/overlays/test/kustomization.yaml"
git -C "$symlink" add --all overlays/test
git -C "$symlink" commit --quiet -m symlinked-kustomization
if "$helper" "$new_digest" "$symlink/overlays/test" >/dev/null 2>&1; then
  echo 'symlinked kustomization unexpectedly accepted' >&2
  exit 1
fi

dirty="$test_root/dirty"
write_fixture "$dirty"
printf '%s\n' 'unrelated change' >"$dirty/second-file.txt"
if "$helper" "$new_digest" "$dirty/overlays/test" >/dev/null 2>&1; then
  echo 'dirty checkout unexpectedly accepted' >&2
  exit 1
fi

echo 'digest update guard tests passed'
