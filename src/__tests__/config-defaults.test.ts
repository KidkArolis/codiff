import { copyFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import packageJson from '../../package.json' with { type: 'json' };
import schema from '../config/codiff-config.schema.json' with { type: 'json' };
import { createDefaultConfig } from '../config/defaults.ts';

const require = createRequire(import.meta.url);
const { createDefaultConfig: createElectronDefaultConfig } =
  require('../../electron/config.cjs') as {
    createDefaultConfig: typeof createDefaultConfig;
  };
const { mergeConfig } = require('../../electron/config.cjs') as {
  mergeConfig: (raw: unknown) => ReturnType<typeof createDefaultConfig>;
};

const getSchemaDefaults = (section: 'keymap' | 'settings') =>
  Object.fromEntries(
    Object.entries(schema.properties[section].properties).map(([key, property]) => [
      key,
      property.default,
    ]),
  );

test('schema defaults match config defaults', () => {
  const defaults = createDefaultConfig();

  expect(getSchemaDefaults('settings')).toEqual(defaults.settings);
  expect(getSchemaDefaults('keymap')).toEqual(defaults.keymap);
});

test('electron and renderer defaults match', () => {
  expect(createElectronDefaultConfig()).toEqual(createDefaultConfig());
});

test('electron config accepts diff font settings', () => {
  expect(
    mergeConfig({
      settings: {
        diffFontFamily: ' Fira Mono ',
        diffFontSize: 12.5,
      },
    }).settings,
  ).toMatchObject({
    diffFontFamily: 'Fira Mono',
    diffFontSize: 12.5,
  });
});

test('electron config falls back for invalid diff font settings', () => {
  const defaults = createDefaultConfig();

  expect(
    mergeConfig({
      settings: {
        diffFontFamily: 'Fira Mono, var(--font-mono)',
        diffFontSize: 72,
      },
    }).settings,
  ).toMatchObject({
    diffFontFamily: defaults.settings.diffFontFamily,
    diffFontSize: defaults.settings.diffFontSize,
  });
});

test('electron defaults load from packaged app shape', () => {
  const packageRoot = mkdtempSync(join(tmpdir(), 'codiff-package-shape.'));
  mkdirSync(join(packageRoot, 'config'));
  mkdirSync(join(packageRoot, 'electron'));
  copyFileSync('config/defaults.json', join(packageRoot, 'config/defaults.json'));
  copyFileSync('electron/config.cjs', join(packageRoot, 'electron/config.cjs'));

  const packageRequire = createRequire(join(packageRoot, 'electron/config.cjs'));
  expect(packageRequire('./config.cjs').createDefaultConfig()).toEqual(createDefaultConfig());
});

test('npm package includes shared config defaults', () => {
  expect(packageJson.files).toContain('config');
});
