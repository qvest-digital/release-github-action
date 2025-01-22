const core = require('@actions/core');
const { run } = require('../src/action');

jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('semver');

describe('Action Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fail if GITHUB_TOKEN is not provided', async () => {
    core.getInput.mockReturnValueOnce('');
    await run();
    expect(core.setFailed).toHaveBeenCalledWith('Action failed with error: GitHub token is not provided');
  });

});
