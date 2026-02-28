import * as assert from 'assert';
import * as sinon from 'sinon';
import axios from 'axios';
import * as path from 'path';
import Module from 'module';

// Set up module aliasing before any imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalResolveFilename = (Module as any)._resolveFilename;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean) {
   if (request === 'vscode') {
      // Redirect to our stub
      return path.join(__dirname, 'vscode-stub.js');
   }
   return originalResolveFilename(request, parent, isMain);
};

// Now import vscode stub and extension
import * as vscode from './vscode-stub';
import { checkForUpdates, updateDefinitions, mqDefinitions } from '../../extension';

// Create file downloader stub
const fileDownloaderStub = {
   downloadFile: sinon.stub().resolves()
};

suite('extension - checkForUpdates', () => {
   let axiosGetStub: sinon.SinonStub;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   let mockConfig: any;
   let getConfigStub: sinon.SinonStub;
   let showInfoStub: sinon.SinonStub;

   setup(() => {
      // Reset all stubs
      axiosGetStub = sinon.stub(axios, 'get');

      mockConfig = {
         get: sinon.stub(),
         update: sinon.stub().resolves()
      };

      getConfigStub = vscode.workspace.getConfiguration as sinon.SinonStub;
      getConfigStub.returns(mockConfig);

      showInfoStub = vscode.window.showInformationMessage as sinon.SinonStub;
      showInfoStub.resolves();

      // Default config values
      mockConfig.get.withArgs('branch', 'master').returns('master');
      mockConfig.get.withArgs('mq-defs.limit-notifications', true).returns(true);
   });

   teardown(() => {
      sinon.restore();
      getConfigStub.reset();
      showInfoStub.reset();
   });

   // ====================================================================
   // Priority 1: SHA Clearing Mechanism (Critical)
   // ====================================================================

   test('SHA cleared forces update (empty string)', async () => {
      // Simulate user clearing the SHA (setting it to empty string)
      mockConfig.get.withArgs('shaKey', '').returns('');

      // API returns a real SHA
      axiosGetStub.resolves({
         data: { sha: 'abc123def456' },
         status: 200,
         headers: {}
      });

      const result = await checkForUpdates(mockConfig, mqDefinitions);

      assert.strictEqual(result.update, true, 'Should trigger update when SHA is cleared');
      assert.strictEqual(result.latestSHA, 'abc123def456', 'Should return latest SHA from API');
   });

   test('First run with no stored SHA triggers update', async () => {
      // Default config returns empty string (no stored SHA yet)
      mockConfig.get.withArgs('shaKey', '').returns('');

      // API returns a SHA
      axiosGetStub.resolves({
         data: { sha: 'first-run-sha' },
         status: 200,
         headers: {}
      });

      const result = await checkForUpdates(mockConfig, mqDefinitions);

      assert.strictEqual(result.update, true, 'Should trigger update on first run');
      assert.strictEqual(result.latestSHA, 'first-run-sha', 'Should return SHA from API');
   });

   // ====================================================================
   // Priority 2: Core SHA Comparison Logic
   // ====================================================================

   test('SHA match - no update needed', async () => {
      const matchingSHA = 'matching-sha-12345';
      mockConfig.get.withArgs('shaKey', '').returns(matchingSHA);

      axiosGetStub.resolves({
         data: { sha: matchingSHA },
         status: 200,
         headers: {}
      });

      const result = await checkForUpdates(mockConfig, mqDefinitions);

      assert.strictEqual(result.update, false, 'Should not update when SHAs match');
      assert.strictEqual(result.latestSHA, matchingSHA, 'Should return stored SHA');
   });

   test('SHA mismatch - update needed', async () => {
      const storedSHA = 'old-sha-12345';
      const latestSHA = 'new-sha-67890';

      mockConfig.get.withArgs('shaKey', '').returns(storedSHA);

      axiosGetStub.resolves({
         data: { sha: latestSHA },
         status: 200,
         headers: {}
      });

      const result = await checkForUpdates(mockConfig, mqDefinitions);

      assert.strictEqual(result.update, true, 'Should update when SHAs differ');
      assert.strictEqual(result.latestSHA, latestSHA, 'Should return new SHA from API');
   });

   // ====================================================================
   // Priority 3: Error Handling
   // ====================================================================

   test('Network error preserves stored SHA', async () => {
      const storedSHA = 'stored-sha-before-error';
      mockConfig.get.withArgs('shaKey', '').returns(storedSHA);

      // Simulate network error
      axiosGetStub.rejects(new Error('Network failure'));

      const result = await checkForUpdates(mockConfig, mqDefinitions);

      assert.strictEqual(result.update, false, 'Should not update on network error');
      assert.strictEqual(result.latestSHA, storedSHA, 'Should preserve stored SHA on error');
   });

   test('Non-200 status throws and preserves stored SHA', async () => {
      const storedSHA = 'stored-sha-before-404';
      mockConfig.get.withArgs('shaKey', '').returns(storedSHA);

      // validateStatus: status => status === 200 will cause axios to throw on non-200
      axiosGetStub.rejects(new Error('Request failed with status code 404'));

      const result = await checkForUpdates(mockConfig, mqDefinitions);

      assert.strictEqual(result.update, false, 'Should not update on HTTP error');
      assert.strictEqual(result.latestSHA, storedSHA, 'Should preserve stored SHA on HTTP error');
   });

   // ====================================================================
   // Priority 4: Configuration & Branch Handling
   // ====================================================================

   test('Different branch configurations', async () => {
      mockConfig.get.withArgs('shaKey', '').returns('');
      mockConfig.get.withArgs('branch', 'master').returns('development');

      axiosGetStub.resolves({
         data: { sha: 'dev-branch-sha' },
         status: 200,
         headers: {}
      });

      await checkForUpdates(mockConfig, mqDefinitions);

      // Verify the correct branch URL was called
      const calledUrl = axiosGetStub.firstCall.args[0];
      assert.strictEqual(
         calledUrl,
         'https://api.github.com/repos/macroquest/mq-definitions/commits/development',
         'Should use configured branch in API URL'
      );
   });

   test('API request includes User-Agent header', async () => {
      mockConfig.get.withArgs('shaKey', '').returns('');

      axiosGetStub.resolves({
         data: { sha: 'test-sha' },
         status: 200,
         headers: {}
      });

      await checkForUpdates(mockConfig, mqDefinitions);

      const callOptions = axiosGetStub.firstCall.args[1];
      assert.strictEqual(
         callOptions.headers['User-Agent'],
         'VSCode Extension',
         'Should include User-Agent header'
      );
   });
});

suite('extension - updateDefinitions', () => {
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   let mockConfig: any;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   let mockContext: any;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   let mockLuaConfig: any;
   let getConfigStub: sinon.SinonStub;
   let showInfoStub: sinon.SinonStub;
   let getApiStub: sinon.SinonStub;

   setup(() => {
      // Create mock configuration
      mockConfig = {
         get: sinon.stub(),
         update: sinon.stub().resolves()
      };

      mockConfig.get.withArgs('branch', 'master').returns('master');

      // Create mock context
      mockContext = {
         globalStorageUri: {
            fsPath: '/mock/global/storage'
         },
         subscriptions: []
      };

      // Mock Lua configuration
      mockLuaConfig = {
         get: sinon.stub(),
         update: sinon.stub().resolves()
      };
      mockLuaConfig.get.withArgs('workspace.library').returns([]);

      getConfigStub = vscode.workspace.getConfiguration as sinon.SinonStub;
      getConfigStub.callsFake((section?: string) => {
         if (section === 'Lua') {
            return mockLuaConfig;
         }
         return mockConfig;
      });

      showInfoStub = vscode.window.showInformationMessage as sinon.SinonStub;
      showInfoStub.resolves();

      // Reset file downloader stub
      fileDownloaderStub.downloadFile.reset();
      fileDownloaderStub.downloadFile.resolves();

      // Stub getApi using dynamic import
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fileDownloaderModule = require('@microsoft/vscode-file-downloader-api');
      getApiStub = sinon.stub(fileDownloaderModule, 'getApi');
      getApiStub.resolves(fileDownloaderStub);
   });

   teardown(() => {
      getConfigStub.reset();
      showInfoStub.reset();
      fileDownloaderStub.downloadFile.reset();
      sinon.restore();
   });

   // ====================================================================
   // Priority 4: Configuration & Storage
   // ====================================================================

   test('SHA stored at all three configuration levels', async () => {
      const newSHA = 'new-sha-to-store';

      await updateDefinitions(mockContext, mockConfig, mqDefinitions, newSHA);

      // Verify SHA was stored at all three levels
      const updateCalls = mockConfig.update.getCalls().filter((call: sinon.SinonSpyCall) => call.args[0] === 'shaKey');

      assert.strictEqual(updateCalls.length, 3, 'Should call update three times for shaKey');

      // Check each configuration target
      const targets = updateCalls.map((call: sinon.SinonSpyCall) => call.args[2]);
      assert.ok(targets.includes(vscode.ConfigurationTarget.Global), 'Should update Global config');
      assert.ok(targets.includes(vscode.ConfigurationTarget.Workspace), 'Should update Workspace config');
      assert.ok(targets.includes(vscode.ConfigurationTarget.WorkspaceFolder), 'Should update WorkspaceFolder config');

      // Check all updates have the correct SHA value
      updateCalls.forEach((call: sinon.SinonSpyCall) => {
         assert.strictEqual(call.args[1], newSHA, 'Should store the new SHA value');
      });
   });

   test('Download uses correct branch in repository URL', async () => {
      mockConfig.get.withArgs('branch', 'master').returns('feature-branch');

      await updateDefinitions(mockContext, mockConfig, mqDefinitions, 'test-sha');

      const downloadCall = fileDownloaderStub.downloadFile.firstCall;
      const uri = downloadCall.args[0];

      assert.ok(
         uri.toString().includes('feature-branch'),
         'Should use configured branch in repository URL'
      );
   });

   test('Download error does not update SHA', async () => {
      // Mock download to fail
      fileDownloaderStub.downloadFile.rejects(new Error('Download failed'));

      await assert.rejects(
         async () => {
            await updateDefinitions(mockContext, mockConfig, mqDefinitions, 'new-sha');
         },
         /Download failed/,
         'Should throw error when download fails'
      );

      // Verify SHA was NOT updated when download failed
      const shaUpdateCalls = mockConfig.update.getCalls().filter((call: sinon.SinonSpyCall) => call.args[0] === 'shaKey');
      assert.strictEqual(shaUpdateCalls.length, 0, 'Should not update SHA when download fails');
   });

   test('Successfully downloads and updates library configuration', async () => {
      const newSHA = 'successful-download-sha';

      await updateDefinitions(mockContext, mockConfig, mqDefinitions, newSHA);

      // Verify download was called
      assert.strictEqual(fileDownloaderStub.downloadFile.callCount, 1, 'Should call downloadFile once');

      // Verify download was called with shouldUnzip
      const downloadOptions = fileDownloaderStub.downloadFile.firstCall.args[5];
      assert.strictEqual(downloadOptions.shouldUnzip, true, 'Should unzip downloaded file');

      // Verify library path was updated in Lua configuration
      const libraryUpdateCalls = mockLuaConfig.update.getCalls().filter(
         (call: sinon.SinonSpyCall) => call.args[0] === 'workspace.library'
      );
      assert.ok(libraryUpdateCalls.length > 0, 'Should update Lua library configuration');
   });
});
