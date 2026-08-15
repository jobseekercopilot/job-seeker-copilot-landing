import {pathToFileURL} from 'node:url';

export function validateAmplifyReleaseBranch(environment = process.env) {
  if (environment.AWS_BRANCH?.trim() !== 'main') {
    throw new Error('Amplify publication is allowed only from the protected main release branch.');
  }
  if (environment.AMPLIFY_RELEASE_AUTHORISED?.trim() !== 'true') {
    throw new Error('Amplify publication requires explicit production release authorisation.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateAmplifyReleaseBranch();
}
