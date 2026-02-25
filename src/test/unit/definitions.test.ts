import * as assert from 'assert';
import * as path from 'path';
import { buildCommandId, buildStoragePath, getInitializationTargets, mergeLibraryPath, shouldShowOptionalNotifications, type InitializationTarget } from '../../definitions';

type ConfigValues = Record<string, string>;

function fakeConfig(values: ConfigValues) {
   return {
      get<T>(key: string, defaultValue: T): T {
         return (values[key] as T | undefined) ?? defaultValue;
      }
   };
}

suite('definitions helpers', () => {
   test('buildStoragePath creates expected nested path', () => {
      const actual = buildStoragePath('/tmp/storage', 'macroquest', 'mq-definitions-main');
      const expected = path.join('/tmp/storage', 'file-downloader-downloads', 'macroquest', 'mq-definitions-main');
      assert.strictEqual(actual, expected);
   });

   test('mergeLibraryPath appends only when missing', () => {
      const original = ['/a', '/b'];
      const added = mergeLibraryPath(original, '/c');

      assert.strictEqual(added.changed, true);
      assert.deepStrictEqual(added.updated, ['/a', '/b', '/c']);
      assert.deepStrictEqual(original, ['/a', '/b']);

      const unchanged = mergeLibraryPath(added.updated, '/c');
      assert.strictEqual(unchanged.changed, false);
      assert.deepStrictEqual(unchanged.updated, ['/a', '/b', '/c']);
   });

   test('shouldShowOptionalNotifications inverts limit setting', () => {
      assert.strictEqual(shouldShowOptionalNotifications(true), false);
      assert.strictEqual(shouldShowOptionalNotifications(false), true);
   });

   test('buildCommandId returns expected fully-qualified command', () => {
      assert.strictEqual(buildCommandId('core.download'), 'mq-defs.core.download');
      assert.strictEqual(buildCommandId('plugins.download'), 'mq-defs.plugins.download');
   });

   test('getInitializationTargets returns only branches that are configured', () => {
      const targets: InitializationTarget[] = [
         {
            commandKeyword: 'core.download',
            definition: {
               Name: 'Core',
               ETagKey: () => 'etag',
               FileName: () => 'macroquest',
               CurrentBranch: config => config.get<string>('branch', ''),
               RepositoryUrl: branch => `https://example.test/${branch}`,
               StoragePath: () => '/tmp/core'
            }
         },
         {
            commandKeyword: 'plugins.download',
            definition: {
               Name: 'Plugins',
               ETagKey: () => 'plugins.etag',
               FileName: () => 'macroquest-plugin',
               CurrentBranch: config => config.get<string>('plugins.branch', ''),
               RepositoryUrl: branch => `https://example.test/${branch}`,
               StoragePath: () => '/tmp/plugins'
            }
         }
      ];

      const allEnabled = getInitializationTargets(fakeConfig({ branch: 'main', 'plugins.branch': 'main' }) as never, targets);
      assert.deepStrictEqual(allEnabled.map(target => target.commandKeyword), ['core.download', 'plugins.download']);

      const coreOnly = getInitializationTargets(fakeConfig({ branch: 'main', 'plugins.branch': '' }) as never, targets);
      assert.deepStrictEqual(coreOnly.map(target => target.commandKeyword), ['core.download']);

      const none = getInitializationTargets(fakeConfig({ branch: '', 'plugins.branch': '' }) as never, targets);
      assert.deepStrictEqual(none, []);
   });
});
