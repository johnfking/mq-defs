import * as assert from 'assert';
import * as path from 'path';
import { buildStoragePath, mergeLibraryPath, shouldShowOptionalNotifications } from '../../definitions';

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
});
