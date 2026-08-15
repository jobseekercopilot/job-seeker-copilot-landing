import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {validateAmplifyReleaseBranch} from './amplify-release-branch-gate.mjs';

describe('Amplify release branch gate', () => {
  it('requires both the protected main branch and explicit release authorisation', () => {
    assert.doesNotThrow(() => validateAmplifyReleaseBranch({
      AWS_BRANCH: 'main',
      AMPLIFY_RELEASE_AUTHORISED: 'true',
    }));
    assert.throws(
      () => validateAmplifyReleaseBranch({
        AWS_BRANCH: 'develop',
        AMPLIFY_RELEASE_AUTHORISED: 'true',
      }),
      /protected main release branch/,
    );
    assert.throws(
      () => validateAmplifyReleaseBranch({}),
      /protected main release branch/,
    );
    assert.throws(
      () => validateAmplifyReleaseBranch({AWS_BRANCH: 'main'}),
      /explicit production release authorisation/,
    );
    assert.throws(
      () => validateAmplifyReleaseBranch({
        AWS_BRANCH: 'main',
        AMPLIFY_RELEASE_AUTHORISED: 'false',
      }),
      /explicit production release authorisation/,
    );
  });
});
