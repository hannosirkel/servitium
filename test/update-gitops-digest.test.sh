#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
helper="$repo_root/scripts/update-gitops-digest.sh"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

old_digest="sha256:$(printf '0%.0s' {1..64})"
new_digest="sha256:$(printf 'a%.0s' {1..64})"

inode_of() {
  node -e 'process.stdout.write(String(require("node:fs").statSync(process.argv[1]).ino))' "$1"
}

metadata_of() {
  node -e 'const stat = require("node:fs").statSync(process.argv[1]); process.stdout.write(`${stat.mode & 0o7777}:${stat.uid}:${stat.gid}`)' "$1"
}

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
  write_kustomization "$repository/servitium/overlays/live"
  write_kustomization "$repository/servitium/overlays/test" "$test_digest_lines"
  git -C "$repository" init --quiet --initial-branch=main
  git -C "$repository" config user.name test
  git -C "$repository" config user.email test@example.invalid
  git -C "$repository" add servitium
  git -C "$repository" commit --quiet -m fixture
}

valid="$test_root/valid"
write_fixture "$valid"
chmod 640 "$valid/servitium/overlays/test/kustomization.yaml"
valid_metadata="$(metadata_of "$valid/servitium/overlays/test/kustomization.yaml")"
"$helper" "$new_digest" "$valid/servitium/overlays/test"
[[ "$(git -C "$valid" diff --name-only)" == 'servitium/overlays/test/kustomization.yaml' ]]
[[ "$(git -C "$valid" diff --numstat)" == $'1\t1\tservitium/overlays/test/kustomization.yaml' ]]
[[ "$(grep -c "digest: $new_digest" "$valid/servitium/overlays/test/kustomization.yaml")" -eq 1 ]]
[[ "$(grep -c "digest: $old_digest" "$valid/servitium/overlays/live/kustomization.yaml")" -eq 1 ]]
[[ "$(git -C "$valid" diff --unified=0 | grep -c "^-    digest: $old_digest")" -eq 1 ]]
[[ "$(git -C "$valid" diff --unified=0 | grep -c "^+    digest: $new_digest")" -eq 1 ]]
[[ "$(metadata_of "$valid/servitium/overlays/test/kustomization.yaml")" == "$valid_metadata" ]]

race="$test_root/race"
write_fixture "$race"
race_bin="$test_root/race-bin"
mkdir "$race_bin"
real_node="$(command -v node)"
printf '%s\n' \
  '#!/bin/sh' \
  'if [ "${1:-}" = "-" ]; then' \
  '  "$GITOPS_REAL_NODE" -e "const fs = require(\"node:fs\"); const file = process.argv[1]; fs.writeFileSync(file, fs.readFileSync(file, \"utf8\").replace(\"deployment.yaml\", \"deployment-race.yaml\"))" "$GITOPS_TEST_TARGET"' \
  'fi' \
  'exec "$GITOPS_REAL_NODE" "$@"' >"$race_bin/node"
chmod +x "$race_bin/node"
if PATH="$race_bin:$PATH" GITOPS_REAL_NODE="$real_node" \
  GITOPS_TEST_TARGET="$race/servitium/overlays/test/kustomization.yaml" \
  "$helper" "$new_digest" "$race/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'same-target race unexpectedly accepted' >&2
  exit 1
fi
if ! grep -q 'deployment-race.yaml' "$race/servitium/overlays/test/kustomization.yaml"; then
  echo 'same-target race edit was overwritten' >&2
  exit 1
fi

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
write_kustomization "$unexpected/servitium/overlays/preview"
git -C "$unexpected" add servitium/overlays/preview/kustomization.yaml
git -C "$unexpected" commit --quiet -m preview
if "$helper" "$new_digest" "$unexpected/servitium/overlays/preview" >/dev/null 2>&1; then
  echo 'unexpected overlay unexpectedly accepted' >&2
  exit 1
fi

legacy="$test_root/legacy"
write_fixture "$legacy"
write_kustomization "$legacy/overlays/test"
git -C "$legacy" add overlays/test/kustomization.yaml
git -C "$legacy" commit --quiet -m legacy-overlay
if "$helper" "$new_digest" "$legacy/overlays/test" >/dev/null 2>&1; then
  echo 'legacy root overlay unexpectedly accepted' >&2
  exit 1
fi

unrelated="$test_root/unrelated"
write_fixture "$unrelated"
write_kustomization "$unrelated/otherapp/overlays/test"
git -C "$unrelated" add otherapp/overlays/test/kustomization.yaml
git -C "$unrelated" commit --quiet -m unrelated-overlay
if "$helper" "$new_digest" "$unrelated/otherapp/overlays/test" >/dev/null 2>&1; then
  echo 'unrelated application overlay unexpectedly accepted' >&2
  exit 1
fi

if "$helper" "$new_digest" "$valid/servitium/overlays/test" extra >/dev/null 2>&1; then
  echo 'extra helper argument unexpectedly accepted' >&2
  exit 1
fi

malformed="$test_root/malformed"
write_fixture "$malformed"
if "$helper" 'sha256:not-a-digest' "$malformed/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'malformed digest unexpectedly accepted' >&2
  exit 1
fi

missing="$test_root/missing"
write_fixture "$missing"
if "$helper" "$new_digest" "$missing/servitium/overlays/missing" >/dev/null 2>&1; then
  echo 'missing image digest unexpectedly accepted' >&2
  exit 1
fi

duplicate="$test_root/duplicate"
write_fixture "$duplicate" 2
duplicate_original="$test_root/duplicate-original.yaml"
cp "$duplicate/servitium/overlays/test/kustomization.yaml" "$duplicate_original"
duplicate_inode="$(inode_of "$duplicate/servitium/overlays/test/kustomization.yaml")"
if "$helper" "$new_digest" "$duplicate/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'duplicate image digest unexpectedly accepted' >&2
  exit 1
fi
if ! cmp -s "$duplicate_original" "$duplicate/servitium/overlays/test/kustomization.yaml"; then
  echo 'duplicate digest rejection changed kustomization bytes' >&2
  exit 1
fi
if [[ "$(inode_of "$duplicate/servitium/overlays/test/kustomization.yaml")" != "$duplicate_inode" ]]; then
  echo 'duplicate digest rejection changed kustomization inode' >&2
  exit 1
fi

empty="$test_root/empty"
write_fixture "$empty" 0
empty_original="$test_root/empty-original.yaml"
cp "$empty/servitium/overlays/test/kustomization.yaml" "$empty_original"
empty_inode="$(inode_of "$empty/servitium/overlays/test/kustomization.yaml")"
if "$helper" "$new_digest" "$empty/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'empty overlay digest unexpectedly accepted' >&2
  exit 1
fi
if ! cmp -s "$empty_original" "$empty/servitium/overlays/test/kustomization.yaml"; then
  echo 'empty overlay rejection changed kustomization' >&2
  exit 1
fi
if [[ "$(inode_of "$empty/servitium/overlays/test/kustomization.yaml")" != "$empty_inode" ]]; then
  echo 'empty overlay rejection changed kustomization inode' >&2
  exit 1
fi

symlink="$test_root/symlink"
write_fixture "$symlink"
mv "$symlink/servitium/overlays/test/kustomization.yaml" "$symlink/servitium/overlays/test/kustomization-target.yaml"
ln -s kustomization-target.yaml "$symlink/servitium/overlays/test/kustomization.yaml"
git -C "$symlink" add --all servitium/overlays/test
git -C "$symlink" commit --quiet -m symlinked-kustomization
if "$helper" "$new_digest" "$symlink/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'symlinked kustomization unexpectedly accepted' >&2
  exit 1
fi

hardlinked="$test_root/hardlinked"
write_fixture "$hardlinked"
hardlink_target="$test_root/hardlink-target.yaml"
ln "$hardlinked/servitium/overlays/test/kustomization.yaml" "$hardlink_target"
if "$helper" "$new_digest" "$hardlinked/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'hard-linked kustomization unexpectedly accepted' >&2
  exit 1
fi
if ! grep -q "digest: $old_digest" "$hardlink_target"; then
  echo 'hard-linked external file changed' >&2
  exit 1
fi

dirty="$test_root/dirty"
write_fixture "$dirty"
printf '%s\n' 'unrelated change' >"$dirty/second-file.txt"
if "$helper" "$new_digest" "$dirty/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'dirty checkout unexpectedly accepted' >&2
  exit 1
fi

rollback="$test_root/rollback"
write_fixture "$rollback"
printf '%s\n' 'unchanged' >"$rollback/sentinel.txt"
git -C "$rollback" add sentinel.txt
git -C "$rollback" commit --quiet -m sentinel
rollback_original="$test_root/rollback-original.yaml"
cp "$rollback/servitium/overlays/test/kustomization.yaml" "$rollback_original"
test_bin="$test_root/test-bin"
mkdir "$test_bin"
printf '%s\n' \
  '#!/bin/sh' \
  'if [ "${1:-}" = "-C" ] && [ "${3:-}" = "diff" ] && [ "${4:-}" = "--name-only" ]; then' \
  '  printf "%s\\n" "concurrent mutation" > "$GITOPS_TEST_MUTATION_FILE"' \
  'fi' \
  'exec "$GITOPS_REAL_GIT" "$@"' >"$test_bin/git"
chmod +x "$test_bin/git"
if PATH="$test_bin:$PATH" GITOPS_REAL_GIT="$(command -v git)" \
  GITOPS_TEST_MUTATION_FILE="$rollback/sentinel.txt" \
  "$helper" "$new_digest" "$rollback/servitium/overlays/test" >/dev/null 2>&1; then
  echo 'post-write concurrent mutation unexpectedly accepted' >&2
  exit 1
fi
if ! cmp -s "$rollback_original" "$rollback/servitium/overlays/test/kustomization.yaml"; then
  echo 'failed update changed kustomization' >&2
  exit 1
fi
if [[ "$(cat "$rollback/sentinel.txt")" != 'concurrent mutation' ]]; then
  echo 'failed update overwrote concurrent change' >&2
  exit 1
fi

directory_replacement="$test_root/directory-replacement"
write_fixture "$directory_replacement"
directory_test_bin="$test_root/directory-test-bin"
mkdir "$directory_test_bin"
printf '%s\n' \
  '#!/bin/sh' \
  'if [ "${1:-}" = "-C" ] && [ "${3:-}" = "diff" ] && [ "${4:-}" = "--name-only" ]; then' \
  '  rm -f "$GITOPS_TEST_TARGET"' \
  '  mkdir "$GITOPS_TEST_TARGET"' \
  'fi' \
  'exec "$GITOPS_REAL_GIT" "$@"' >"$directory_test_bin/git"
chmod +x "$directory_test_bin/git"
directory_output="$test_root/directory-replacement-output.txt"
if PATH="$directory_test_bin:$PATH" GITOPS_REAL_GIT="$(command -v git)" \
  GITOPS_TEST_TARGET="$directory_replacement/servitium/overlays/test/kustomization.yaml" \
  "$helper" "$new_digest" "$directory_replacement/servitium/overlays/test" \
  >"$directory_output" 2>&1; then
  echo 'target-directory replacement unexpectedly accepted' >&2
  exit 1
fi
if [[ ! -d "$directory_replacement/servitium/overlays/test/kustomization.yaml" ]]; then
  echo 'target-directory replacement was overwritten' >&2
  exit 1
fi
shopt -s nullglob
recovery_snapshots=("$directory_replacement/servitium/overlays/test"/.update-gitops-digest.*)
shopt -u nullglob
if [[ "${#recovery_snapshots[@]}" -eq 0 ]]; then
  echo 'target-directory failure did not preserve a recovery snapshot' >&2
  exit 1
fi
if ! grep -l "digest: $old_digest" "${recovery_snapshots[@]}" >/dev/null; then
  echo 'recovery snapshot does not contain the original digest' >&2
  exit 1
fi
if ! grep -q 'recovery snapshot preserved:' "$directory_output"; then
  echo 'target-directory failure did not report recovery snapshot' >&2
  exit 1
fi

echo 'digest update guard tests passed'
