import { joinPathFragments, readProjectConfiguration } from '@nrwl/devkit';
import { createTree, createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { applicationGenerator } from '@nrwl/node';
import { removeGenerator } from '@nrwl/workspace';
import assert from 'assert';
import {
  appendLinesToFile,
  commonAddFiles,
  ensureProjectExists,
  readFileFromRoot,
  readFileFromSource,
  readYaml,
  updateFileInTree,
  updateProjectConfigInTree,
  updateYaml,
  writeYaml,
  formatGitRemoteUrl,
} from './utils';

test('updateFileInTree', () => {
  const tree = createTree();

  function updater(content: string | null) {
    if (!content) {
      return '1';
    }
    return `${content}-2`;
  }

  const path = 'file.txt';

  updateFileInTree(tree, path, updater);
  expect(tree.read(path, 'utf-8')).toEqual('1');

  updateFileInTree(tree, path, updater);
  expect(tree.read(path, 'utf-8')).toEqual('1-2');
});

test('readFileFromSource', async () => {
  const tree = createTreeWithEmptyWorkspace();

  await applicationGenerator(tree, { name: 'my-app' });

  const indexContent = tree.read('apps/my-app/index.ts', 'utf-8');

  expect(readFileFromSource(tree, 'my-app', 'index.ts')).toEqual(indexContent);

  expect(
    readFileFromSource(
      tree,
      readProjectConfiguration(tree, 'my-app'),
      'my-app',
      'index.ts'
    )
  ).toEqual(indexContent);

  updateProjectConfigInTree(tree, 'my-app', (project) => {
    delete project.sourceRoot;
  });

  expect(() => readFileFromSource(tree, 'my-app', 'index.ts')).toThrow();
});

test('readFileFromRoot', async () => {
  const tree = createTreeWithEmptyWorkspace();

  await applicationGenerator(tree, { name: 'my-app' });

  const projectJsonContent = tree.read('apps/my-app/project.json', 'utf-8');

  expect(readFileFromRoot(tree, 'my-app', 'project.json')).toEqual(
    projectJsonContent
  );

  expect(
    readFileFromRoot(
      tree,
      readProjectConfiguration(tree, 'my-app'),
      'project.json'
    )
  ).toEqual(projectJsonContent);
});

test('ensureProjectExists', async () => {
  const tree = createTreeWithEmptyWorkspace();

  expect(() => ensureProjectExists(tree, 'my-app')).toThrow();

  await applicationGenerator(tree, { name: 'my-app' });

  expect(() => ensureProjectExists(tree, 'my-app')).not.toThrow();

  await removeGenerator(tree, {
    projectName: 'my-app',
    forceRemove: false,
    skipFormat: false,
  });

  expect(() => ensureProjectExists(tree, 'my-app')).toThrow();
});

test('updateProjectConfigInTree', async () => {
  const tree = createTreeWithEmptyWorkspace();

  function updateConfig() {
    updateProjectConfigInTree(tree, 'my-app', (project) => {
      project.tags?.push('my-tag');
    });
  }

  expect(updateConfig).toThrow();

  await applicationGenerator(tree, { name: 'my-app' });

  updateConfig();

  expect(readProjectConfiguration(tree, 'my-app')).toMatchObject({
    tags: ['my-tag'],
  });
});

test('readYaml', () => {
  const tree = createTree();

  expect(() => readYaml(tree, 'file.yaml')).toThrow(/cannot find file.yaml/i);

  tree.write('file.yaml', 'invalid: {yaml');

  expect(() => readYaml(tree, 'file.yaml')).toThrow(/cannot parse file.yaml/i);

  tree.write(
    'file.yaml',
    `hello:
  - world
  - valid yaml`
  );

  expect(readYaml(tree, 'file.yaml')).toStrictEqual({
    hello: ['world', 'valid yaml'],
  });
});

describe('writeYaml', () => {
  test.each([null, true, false, 1, -1, 'hello', { hello: 'world' }, [1, 2]])(
    '%s',
    (value) => {
      const tree = createTree();

      writeYaml(tree, 'file.yaml', value);

      expect(readYaml(tree, 'file.yaml')).toStrictEqual(value);
    }
  );
});

test('updateYaml', () => {
  const tree = createTree();

  writeYaml(tree, 'file.yaml', {
    foo: 'bar',
  });

  updateYaml(tree, 'file.yaml', (yaml) => {
    yaml.fizz = 'buzz';
  });

  expect(readYaml(tree, 'file.yaml')).toStrictEqual({
    foo: 'bar',
    fizz: 'buzz',
  });

  updateYaml(tree, 'file.yaml', () => ({ hello: 'world' }));

  expect(readYaml(tree, 'file.yaml')).toStrictEqual({ hello: 'world' });

  updateYaml(tree, 'file.yaml', 'hello world');

  expect(readYaml(tree, 'file.yaml')).toStrictEqual('hello world');
});

test('commonAddFiles', async () => {
  const tree = createTreeWithEmptyWorkspace();

  await applicationGenerator(tree, { name: 'my-app' });

  const { root } = readProjectConfiguration(tree, 'my-app');

  commonAddFiles(tree, joinPathFragments(__dirname, 'files'), {
    name: 'my-name',
    projectRoot: root,
    someText: 'some text',
  });

  expect(tree.read(joinPathFragments(root, `index.ts`), 'utf-8')).toBe(
    `console.log('some text');\n`
  );

  const somethingJson = tree.read(
    joinPathFragments(root, 'something.json'),
    'utf-8'
  );

  assert(somethingJson);

  expect(JSON.parse(somethingJson)).toStrictEqual({
    name: 'my-name',
    className: 'MyName',
    propertyName: 'myName',
    constantName: 'MY_NAME',
    fileName: 'my-name',
  });
});

test('appendToFile', () => {
  const tree = createTree();

  appendLinesToFile(tree, '.gitignore', []);
  expect(tree.read('.gitignore', 'utf-8')).toEqual('');

  tree.delete('.gitignore');

  appendLinesToFile(tree, '.gitignore', ['line1', 'line2']);
  expect(tree.read('.gitignore', 'utf-8')).toEqual('line1\nline2');

  appendLinesToFile(tree, '.gitignore', ['line3']);
  expect(tree.read('.gitignore', 'utf-8')).toEqual('line1\nline2\nline3');

  updateFileInTree(tree, '.gitignore', (content) => `${content}\n`);

  appendLinesToFile(tree, '.gitignore', ['line4']);
  expect(tree.read('.gitignore', 'utf-8')).toEqual(
    'line1\nline2\nline3\nline4\n'
  );

  appendLinesToFile(tree, '.gitignore', ['line5', '']);
  expect(tree.read('.gitignore', 'utf-8')).toEqual(
    'line1\nline2\nline3\nline4\nline5\n'
  );

  appendLinesToFile(
    tree,
    '.gitignore',
    [1, 2, 3, 4, 5, 6].map((num) => `line${num}`)
  );
  expect(tree.read('.gitignore', 'utf-8')).toEqual(
    'line1\nline2\nline3\nline4\nline5\nline6\n'
  );
});

test('formatGitRemoteUrl', () => {
  expect(
    formatGitRemoteUrl(() => 'https://github.com/some-org/some-repo')
  ).toBe('git+https://github.com/some-org/some-repo.git');

  expect(
    formatGitRemoteUrl(() => 'git@github.com:some-org/some-repo.git')
  ).toBe('git+https://github.com/some-org/some-repo.git');

  expect(
    formatGitRemoteUrl(() => {
      throw new Error('');
    })
  ).toBe(undefined);
});
