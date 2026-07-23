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

test('deploy-test is an exact-SHA trusted label promotion', () => {
  const source = workflow('deploy-test.yml');
  assert.match(source, /pull_request_target:/);
  assert.match(source, /pull_request_target:\n    branches:\n      - main/);
  assert.match(source, /types: \[labeled\]/);
  assert.match(source, /github\.event\.label\.name == 'deploy-test'/);
  assert.match(source, /github\.event\.pull_request\.head\.sha/);
  assert.match(source, /github\.event\.pull_request\.head\.repo\.full_name/);
  assert.match(source, /Validate/);
  assert.match(source, /conclusion.*success/);
  assert.match(source, /overlays\/test/);
  assert.match(source, /cancel-in-progress: false/);
  assert.doesNotMatch(source.split(/^  gate:/m)[1].split(/^  build:/m)[0],
    /actions\/checkout|docker build|npm (ci|test)/);
});

test('test promotion receives the digest guard from the trusted gate', () => {
  const source = workflow('deploy-test.yml');
  const gate = source.split(/^  gate:/m)[1].split(/^  build:/m)[0];
  const build = source.split(/^  build:/m)[1].split(/^  recheck:/m)[0];
  const promote = source.split(/^  promote:/m)[1];
  assert.match(gate, /github\.event\.pull_request\.base\.sha/);
  assert.match(gate, /contents\/scripts\/update-gitops-digest\.sh/);
  assert.match(promote, /needs\.gate\.outputs\.guard/);
  assert.doesNotMatch(build, /guard/);
  assert.doesNotMatch(promote, /needs\.build\.outputs\.guard/);
});

test('test build and GitOps credentials are separated', () => {
  const source = workflow('deploy-test.yml');
  const build = source.split(/^  build:/m)[1].split(/^  recheck:/m)[0];
  const promote = source.split(/^  promote:/m)[1];
  assert.match(build, /packages: write/);
  assert.match(build, /persist-credentials: false/);
  assert.doesNotMatch(build, /SERVITIUM_DEPLOYER_PRIVATE_KEY/);
  assert.match(promote, /SERVITIUM_DEPLOYER_PRIVATE_KEY/);
  assert.match(promote, /repository: hannosirkel\/servitium-main/);
  assert.doesNotMatch(promote, /docker build|npm (ci|test)/);
});

test('live release updates only the live overlay', () => {
  const source = workflow('release.yml');
  assert.match(source, /push:\n    branches:\n      - main/);
  assert.match(source, /overlays\/live/);
  assert.doesNotMatch(source, /overlays\/test/);
});
