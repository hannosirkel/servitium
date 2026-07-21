'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repository = path.join(__dirname, '..');

function workflow(name) {
  return fs.readFileSync(
    path.join(repository, '.github', 'workflows', name),
    'utf8',
  );
}

test('validation is read-only and all actions use full SHAs', () => {
  const source = workflow('validate.yml');
  assert.match(source, /permissions:\n  contents: read/);
  assert.doesNotMatch(source, /pull_request_target/);
  assert.doesNotMatch(source, /packages: write/);
  for (const reference of source.matchAll(/uses: [^@\n]+@([^\s]+)/g)) {
    assert.match(reference[1], /^[0-9a-f]{40}$/);
  }
});

test('release splits publication from scoped GitOps promotion', () => {
  const source = workflow('release.yml');
  const promote = source.split(/^  promote:/m)[1];
  assert.ok(promote, 'promote job is missing');
  assert.match(source, /packages: write/);
  assert.match(promote, /permissions: \{\}/);
  assert.match(promote, /SERVITIUM_DEPLOYER_CLIENT_ID/);
  assert.match(promote, /SERVITIUM_DEPLOYER_PRIVATE_KEY/);
  assert.match(promote, /repository: hannosirkel\/servitium-main/);
  assert.doesNotMatch(promote, /repository: hannosirkel\/servitium\s/);
  assert.match(promote, /update-gitops-digest\.sh/);
  for (const reference of source.matchAll(/uses: [^@\n]+@([^\s]+)/g)) {
    assert.match(reference[1], /^[0-9a-f]{40}$/);
  }
});
