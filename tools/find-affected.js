// @ts-check

const { Workspaces } = require('@nrwl/devkit');
const { execSync } = require('child_process');
const { join } = require('path');

const [tag = null] = process.argv.slice(2);

if (!tag) {
  console.error(`Missing tag`);
  process.exit(1);
}

const workspace = new Workspaces(
  join(__dirname, '..')
).readWorkspaceConfiguration();

const projects = execSync('yarn -s nx print-affected --select projects')
  .toString('utf-8')
  .trim()
  .split(', ')
  .filter((project) => !!project);

const affected = projects.filter((project) =>
  workspace.projects[project].tags?.includes(tag)
);

const affectedMatrix = JSON.stringify(affected);
const hasAffected = affected.length > 0;

console.log(JSON.stringify({ affectedMatrix, hasAffected }));
