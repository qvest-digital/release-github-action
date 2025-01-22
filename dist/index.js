const core = require('@actions/core');
const github = require('@actions/github');
const semver = require('semver');

async function run() {
  try {
    const token = core.getInput('repo-token');
    if (!token) {
      throw new Error('GitHub token is not provided');
    }

    const majorKeyword = core.getInput('major-keyword') || 'BREAKING_CHANGE';
    const minorKeywords = core.getInput('minor-keywords') || 'fix,feat';
    const triggerRelease = core.getInput('trigger-release') === 'true';

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    // Debug information
    core.debug(`Token: ${token}`);
    core.debug(`Owner: ${owner}`);
    core.debug(`Repo: ${repo}`);
    core.debug(`Octokit: ${JSON.stringify(octokit)}`);

    // Check if octokit.repos is defined
    if (!octokit.repos) {
      throw new Error('octokit.repos is undefined');
    }

    // Get all tags
    const tags = await octokit.repos.listTags({
      owner,
      repo,
    });

    // Sort tags by semver
    const sortedTags = tags.data.map(tag => tag.name).sort(semver.rcompare);

    // Get the latest tag
    const latestTag = sortedTags[0];

    // Get commits since the latest tag
    const commits = await octokit.repos.listCommits({
      owner,
      repo,
      sha: 'main',
      since: latestTag ? (await octokit.git.getTag({ owner, repo, tag_sha: latestTag })).data.tagger.date : undefined,
    });

    // Determine the next version
    let nextVersion = latestTag ? semver.inc(latestTag, 'patch') : '1.0.0';
    for (const commit of commits.data) {
      const message = commit.commit.message;
      if (message.includes(majorKeyword)) {
        nextVersion = semver.inc(latestTag, 'major');
        break;
      }
      if (minorKeywords.split(',').some(keyword => message.includes(keyword))) {
        nextVersion = semver.inc(latestTag, 'minor');
      }
    }

    if (!triggerRelease) {
      core.info(`Dry run mode: The next version would be ${nextVersion}`);
      return;
    }

    // Create the release
    const response = await octokit.repos.createRelease({
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
