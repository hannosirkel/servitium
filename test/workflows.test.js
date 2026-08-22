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
  assert.match(source, /npm ci/);
  assert.match(source, /bash scripts\/validate/);
  for (const reference of source.matchAll(/uses: [^@\n]+@([^\s]+)/g)) {
    assert.match(reference[1], /^[0-9a-f]{40}$/);
  }
});

test('release splits publication from scoped GitOps promotion', () => {
  const source = workflow('release.yml');
  const validate = source.split(/^  validate:/m)[1].split(/^  publish:/m)[0];
  const publish = source.split(/^  publish:/m)[1].split(/^  promote:/m)[0];
  const promote = source.split(/^  promote:/m)[1];
  assert.ok(validate, 'validate job is missing');
  assert.ok(promote, 'promote job is missing');
  assert.match(validate, /npm ci/);
  assert.match(validate, /bash scripts\/validate/);
  assert.doesNotMatch(validate, /packages: write|SERVITIUM_DEPLOYER_/);
  assert.match(publish, /needs: validate/);
  assert.match(publish, /packages: write/);
  assert.match(promote, /permissions: \{\}/);
  assert.match(promote, /SERVITIUM_DEPLOYER_CLIENT_ID/);
  assert.match(promote, /SERVITIUM_DEPLOYER_PRIVATE_KEY/);
  assert.match(promote, /repository: hannosirkel\/deploys/);
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
  assert.match(source, /servitium\/overlays\/test/);
  assert.match(source, /group: servitium-gitops-promotion/);
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
  assert.match(gate, /grep -qx '#!\/bin\/sh'/);
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
  assert.match(promote, /repository: hannosirkel\/deploys/);
  assert.doesNotMatch(promote, /docker build|npm (ci|test)/);
});

test('promotion credentials are scoped to their GitHub Environments', () => {
  const release = workflow('release.yml');
  const releaseValidate = release.split(/^  validate:/m)[1].split(/^  publish:/m)[0];
  const releasePublish = release.split(/^  publish:/m)[1].split(/^  promote:/m)[0];
  const releasePromote = release.split(/^  promote:/m)[1];
  assert.doesNotMatch(releaseValidate, /environment:|SERVITIUM_DEPLOYER_/);
  assert.doesNotMatch(releasePublish, /environment:|SERVITIUM_DEPLOYER_/);
  assert.match(releasePromote, /environment: live/);
  assert.match(releasePromote, /SERVITIUM_DEPLOYER_/);

  const deploy = workflow('deploy-test.yml');
  for (const job of ['gate', 'build', 'recheck']) {
    const body = deploy.split(new RegExp(`^  ${job}:`, 'm'))[1]
      .split(/^  (?:gate|build|recheck|promote):/m)[0];
    assert.doesNotMatch(body, /environment:|SERVITIUM_DEPLOYER_/);
  }
  const testPromote = deploy.split(/^  promote:/m)[1];
  assert.match(testPromote, /environment: test/);
  assert.match(testPromote, /SERVITIUM_DEPLOYER_/);
});

test('the human owner owns all changes including CODEOWNERS', () => {
  const source = fs.readFileSync(
    path.join(repository, 'CODEOWNERS'),
    'utf8',
  );
  assert.match(source, /^\* @hannosirkel$/m);
  assert.match(source, /^\/CODEOWNERS @hannosirkel$/m);
});

test('live release updates only the live overlay', () => {
  const source = workflow('release.yml');
  assert.match(source, /push:\n    branches:\n      - main/);
  assert.match(source, /"\$guard" "\$IMAGE_DIGEST" "\$GITHUB_WORKSPACE\/gitops\/servitium\/overlays\/live"/);
  assert.match(source, /git add servitium\/overlays\/live\/kustomization\.yaml/);
  assert.doesNotMatch(source, /git add servitium\/overlays\/test\/kustomization\.yaml/);
  assert.match(source, /group: servitium-gitops-promotion/);
});

test('GitOps promotions validate both overlays before pushing exact paths', () => {
  for (const name of ['release.yml', 'deploy-test.yml']) {
    const source = workflow(name);
    const commit = source.split(/- name: Commit and push the GitOps update/)[1];
    assert.ok(commit, `${name} promotion step is missing`);
    const tests = commit.indexOf('bash servitium/tests/manifests.sh');
    const live = commit.indexOf('kubectl kustomize servitium/overlays/live');
    const testOverlay = commit.indexOf('kubectl kustomize servitium/overlays/test');
    const diff = commit.indexOf('git diff --check');
    const push = commit.indexOf('git push');
    assert.ok(tests >= 0 && tests < push, `${name} must run manifest tests before push`);
    assert.ok(live >= 0 && live < push, `${name} must render live before push`);
    assert.ok(testOverlay >= 0 && testOverlay < push, `${name} must render test before push`);
    assert.ok(diff >= 0 && diff < push, `${name} must check diffs before push`);
    assert.match(commit, /git diff --cached --name-only \| grep -qx 'servitium\/overlays\/(live|test)\/kustomization\.yaml'/);
    assert.doesNotMatch(commit, /--force|git rebase/);
  }
});

test('published images carry attestations and pass a digest scan before promotion', () => {
  for (const name of ['release.yml', 'deploy-test.yml']) {
    const source = workflow(name);
    assert.match(source, /--provenance=mode=min/);
    assert.match(source, /--sbom=true/);
    assert.doesNotMatch(source, /--provenance=false/);
    assert.match(source,
      /docker\/setup-buildx-action@37fe631027851001ddb9b187196cc803df7f5f0e/);
    assert.match(source,
      /aquasecurity\/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25/);
    assert.match(source, /image-ref: ghcr\.io\/hannosirkel\/servitium@\$\{\{ steps\.build\.outputs\.digest \}\}/);
    assert.match(source, /severity: CRITICAL/);
    assert.match(source, /ignore-unfixed: true/);
    assert.match(source, /exit-code: '1'/);
    assert.match(source,
      /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
    assert.match(source,
      /if: \$\{\{ always\(\) && hashFiles\('trivy-results\.json'\) != '' \}\}/);
    assert.match(source, /retention-days: 7/);
    const scan = source.indexOf('aquasecurity/trivy-action@');
    const promote = source.indexOf('\n  promote:');
    assert.ok(scan >= 0 && scan < promote,
      `${name} must scan the immutable digest before promotion`);
    for (const reference of source.matchAll(/uses: [^@\n]+@([^\s]+)/g)) {
      assert.match(reference[1], /^[0-9a-f]{40}$/);
    }
  }
});

test('Discord notifications are read-only and limited to authoritative events', () => {
  const source = workflow('notify.yml');
  assert.match(source, /pull_request_target:\n    branches:\n      - main\n    types: \[closed\]/);
  assert.match(source, /workflow_run:\n    workflows: \[Release\]\n    branches:\n      - main\n    types: \[completed\]/);
  assert.match(source, /github\.event\.pull_request\.merged == true/);
  assert.match(source, /github\.event\.workflow_run\.name == 'Release'/);
  assert.match(source, /permissions:\n  actions: read\n  contents: read/);
  assert.doesNotMatch(source, /uses:|checkout|artifact|cache|packages: write|contents: write/);
  assert.doesNotMatch(source, /Deploy Test|\/logs/);
});

test('Discord notifications bound failure details and restrict mentions', () => {
  const source = workflow('notify.yml');
  assert.match(source, /DISCORD_CICD_WEBHOOK_URL/);
  assert.match(source, /jobs\?per_page=100/);
  assert.match(source, /\[0:900\]/);
  assert.match(source, /1485190637644025926/);
  assert.match(source, /allowed_mentions/);
  assert.match(source, /"parse":\[\]/);
  assert.match(source, /"users":\["1485190637644025926"\]/);
  assert.match(source, /--fail-with-body/);
  assert.match(source, /--connect-timeout 10/);
  assert.match(source, /--max-time 30/);
  assert.match(source, /--retry 3/);
});
