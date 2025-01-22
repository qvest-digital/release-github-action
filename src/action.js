const core = require('@actions/core');
const github = require('@actions/github');
const semver = require('semver');

async function run() {
  try {
    const token = core.getInput('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GitHub token is not provided');
    }

    const majorKeyword = core.getInput('major-keyword') || 'BREAKING_CHANGE';
    const minorKeywords = core.getInput('minor-keywords') || 'feat';
    const triggerRelease = core.getInput('trigger-release') === 'true';

    const { createActionAuth } = await import('@octokit/auth-action');
    const auth = createActionAuth();
    const authentication = await auth();
    const octokit = github.getOctokit(authentication.token);
    const { owner, repo } = github.context.repo;

    // Check if the event is a pull request
    if (github.context.eventName !== 'pull_request') {
      throw new Error('This action only works for pull_request events');
    }

    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
      throw new Error('Pull request payload is missing');
    }

    const pullNumber = pullRequest.number;

    // Get commits from the pull request
    const commits = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: pullNumber,
    });

    // Log only the commit messages
    const commitMessages = commits.data.map(commit => commit.commit.message);
    core.info(`Commit messages: ${JSON.stringify(commitMessages)}`);
    console.log(`Commit messages: ${JSON.stringify(commitMessages)}`);

    // Get all tags
    const tags = await octokit.rest.repos.listTags({
      owner,
      repo,
    });

    // Sort tags by semver
    const sortedTags = tags.data.map(tag => tag.name).sort(semver.rcompare);

    // Get the latest tag
    const latestTag = sortedTags[0];

    // Determine the next version
    let nextVersion;
    if (!latestTag) {
      core.info('No tags found in the repository. Starting from version 0.0.0.');
      nextVersion = '0.0.0';
    } else {
      nextVersion = latestTag;
    }

    for (const commit of commits.data) {
      const message = commit.commit.message;
      if (minorKeywords.split(',').some(keyword => message.includes(keyword))) {
        nextVersion = semver.inc(nextVersion, 'minor');
        break;
      } else {
        nextVersion = semver.inc(nextVersion, 'patch');
        break;
      }
    }

    if (!nextVersion) {
      throw new Error('Failed to determine the next version');
    }

    if (!triggerRelease) {
      core.info(`Dry run mode: The next version would be ${nextVersion}`);
      return;
    }

    // Create the release
    const response = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: nextVersion,
      name: `Release ${nextVersion}`,
      body: `Release ${nextVersion}`,
    });

    core.setOutput('release-url', response.data.html_url);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error.message}`);
  }
}

run();

module.exports = { run };