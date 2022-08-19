// @ts-check

const yargsParser = require('yargs-parser');
const releaseIt = require('release-it');
const childProcess = require('child_process');
const { readJsonFile, writeJsonFile } = require('@nrwl/devkit');
const semver = require('semver');
const packageLibraries = require('./package');

const exec = (/** @type {string }*/ command) => {
  console.log('>', command);
  return childProcess.execSync(command, { stdio: [0, 1, 2] });
};

const parsedArgs = yargsParser(process.argv, {
  boolean: ['dry-run', 'local'],
  alias: {
    d: 'dry-run',
    h: 'help',
    l: 'local',
  },
});

console.log('parsedArgs', parsedArgs);

if (!parsedArgs.local && !process.env.GITHUB_TOKEN_RELEASE_IT_NX) {
  console.error('process.env.GITHUB_TOKEN_RELEASE_IT_NX is not set');
  process.exit(1);
}

if (parsedArgs.help) {
  console.log(`
      Usage: yarn nx-release <version> [options]

      Example: "yarn nx-release 1.0.0-beta.1"

      The acceptable format for the version number is:
      {number}.{number}.{number}[-{alpha|beta|rc}.{number}]

      The subsection of the version number in []s is optional, and, if used, will be used to
      mark the release as "prerelease" on GitHub, and tag it with "next" on npm.

      Options:
        --dry-run           Do not touch or write anything, but show the commands
        --help              Show this message
        --local             Publish to local npm registry (IMPORTANT: install & run Verdaccio first & set registry in .npmrc)

    `);
  process.exit(0);
}

if (!parsedArgs.local) {
  exec('git fetch --all');
}

/**
 *
 * @param {string} version
 * @returns {{version: string; isValid: boolean; isPrerelease: boolean}}
 */
function parseVersion(version) {
  const parsed = semver.parse(version);

  if (!parsed || ![0, 2].includes(parsed.prerelease.length)) {
    return {
      version,
      isValid: false,
      isPrerelease: false,
    };
  }

  if (parsed.prerelease.length === 0) {
    return { version, isValid: true, isPrerelease: false };
  }

  return {
    version,
    isValid:
      typeof parsed.prerelease[0] === 'string' &&
      ['alpha', 'beta', 'rc'].includes(parsed.prerelease[0]) &&
      typeof parsed.prerelease[1] === 'number',
    isPrerelease: true,
  };
}

const parsedVersion = parseVersion(`${parsedArgs._[2]}`);
if (!parsedVersion.isValid) {
  console.error(
    `\nError:\nThe specified version is not valid. You specified: "${parsedVersion.version}"`
  );
  console.error(
    `Please run "yarn nx-release --help" for details on the acceptable version format.\n`
  );

  process.exit(1);
} else {
  console.log('parsed version: ', JSON.stringify(parsedVersion));
}

console.log('Checking dependencies in libraries:');

exec(`yarn depcheck`);

console.log('Executing build script:');

try {
  packageLibraries(parsedVersion.version, parsedArgs.local);
  console.log('Build succeeded...');
} catch (e) {
  console.error('Build failed...', e);
  process.exit(1);
}

/**
 * Setting this to true can be useful for development/testing purposes.
 * No git commands, nor npm publish commands will be run when this is
 * true.
 */
const DRY_RUN = !!parsedArgs['dry-run'];

process.env.GITHUB_TOKEN = !parsedArgs.local
  ? process.env.GITHUB_TOKEN_RELEASE_IT_NX
  : 'dummy-gh-token';

/**
 * Set the static options for release-it
 */
const options = {
  'dry-run': DRY_RUN,
  /**
   * Needed so that we can leverage conventional-changelog to generate
   * the changelog
   */
  safeBump: false,
  increment: parsedVersion.version,
  requireUpstream: false,
  github: {
    preRelease: parsedVersion.isPrerelease,
    release: true,
  },
  npm: false,
  git: {
    requireCleanWorkingDir: false,
    changelog: 'conventional-changelog -p angular | tail -n +3',
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'angular',
      header: '# Changelog',
      infile: 'CHANGELOG.md',
      ignoreRecommendedBump: true,
    },
  },
  hooks: {
    'after:conventional-changelog:beforeRelease': 'yarn nx format:write',
  },
};

if (parsedArgs.local) {
  exec(`./tools/publish.sh ${parsedVersion.version} latest --local`);
  process.exit(0);
}

const content = readJsonFile('package.json');
content.version = parsedVersion.version;
writeJsonFile('package.json', content);

releaseIt(options)
  .then((output) => {
    if (!output) {
      console.warn('WARNING: release-it returned invalid output');
      process.exit(1);
    }

    if (DRY_RUN) {
      console.warn('WARNING: In DRY_RUN mode - not running publishing script');
      process.exit(0);
    }

    const npmTag = parsedVersion.isPrerelease ? 'next' : 'latest';
    const npmPublishCommand = `./tools/publish.sh ${output.version} ${npmTag}`;

    console.log('Executing publishing script for all packages:');
    console.log(`> ${npmPublishCommand}`);
    console.log(
      `Note: You will need to authenticate with your NPM credentials`
    );

    exec(npmPublishCommand);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
