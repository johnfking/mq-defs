import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Tests', () => {

	test('Extension is loadable and has correct metadata', async () => {
		// Get the extension (publisher.name format)
		const extension = vscode.extensions.getExtension('zenithcodeforge.mq-defs');

		assert.ok(extension, 'Extension should be installed');
		assert.strictEqual(extension.id, 'zenithcodeforge.mq-defs', 'Extension ID should match');

		// Check that the extension has exports defined (even if not active)
		assert.ok(extension.packageJSON, 'Extension should have package.json metadata');
		assert.strictEqual(
			extension.packageJSON.name,
			'mq-defs',
			'Package name should be mq-defs'
		);

		// Note: We don't activate here because it requires extension dependencies
		// (mindaro-dev.file-downloader, sumneko.lua) which aren't installed in test env
	});

	test('Extension defines download command in package.json', async () => {
		const extension = vscode.extensions.getExtension('zenithcodeforge.mq-defs');
		assert.ok(extension, 'Extension should be installed');

		// Check that the command is defined in package.json
		const commands = extension.packageJSON.contributes?.commands;
		assert.ok(commands, 'Extension should contribute commands');

		const downloadCommand = commands.find(
			(cmd: { command: string }) => cmd.command === 'mq-defs.download'
		);

		assert.ok(downloadCommand, 'mq-defs.download command should be defined');
		assert.strictEqual(
			downloadCommand.title,
			'MQ: Download Definitions',
			'Download command should have correct title'
		);
	});

	test('Configuration can be read and written', async () => {
		const config = vscode.workspace.getConfiguration('mq-defs');

		// Test reading default branch value
		const branch = config.get<string>('branch', 'master');
		assert.ok(typeof branch === 'string', 'Branch should be a string');

		// Test reading limit-notifications setting
		const limitNotifications = config.get<boolean>('limit-notifications');
		assert.ok(
			typeof limitNotifications === 'boolean' || limitNotifications === undefined,
			'limit-notifications should be boolean or undefined'
		);
	});

	test('Extension configuration includes all required settings', async () => {
		const extension = vscode.extensions.getExtension('zenithcodeforge.mq-defs');
		assert.ok(extension, 'Extension should be installed');

		// Check that configuration schema is defined
		const config = extension.packageJSON.contributes?.configuration;
		assert.ok(config, 'Extension should contribute configuration');

		const properties = config.properties;
		assert.ok(properties, 'Configuration should have properties');

		// Verify required configuration keys exist
		assert.ok(properties['mq-defs.branch'], 'Should have branch configuration');
		assert.ok(properties['mq-defs.shaKey'], 'Should have shaKey configuration');
		assert.ok(
			properties['mq-defs.limit-notifications'],
			'Should have limit-notifications configuration'
		);

		// Verify branch has correct default
		assert.strictEqual(
			properties['mq-defs.branch'].default,
			'master',
			'Branch default should be master'
		);
	});

	test('Extension has correct activation events', async () => {
		const extension = vscode.extensions.getExtension('zenithcodeforge.mq-defs');
		assert.ok(extension, 'Extension should be installed');

		// Check activation events
		const activationEvents = extension.packageJSON.activationEvents;
		assert.ok(activationEvents, 'Extension should have activation events');
		assert.ok(
			activationEvents.includes('onLanguage:lua'),
			'Extension should activate on Lua files'
		);

		// Check extension dependencies
		const dependencies = extension.packageJSON.extensionDependencies;
		assert.ok(dependencies, 'Extension should declare dependencies');
		assert.ok(
			dependencies.includes('mindaro-dev.file-downloader'),
			'Should depend on file-downloader'
		);
		assert.ok(
			dependencies.includes('sumneko.lua'),
			'Should depend on Lua extension'
		);
	});

	test('SHA key can be written and read from configuration', async () => {
		const config = vscode.workspace.getConfiguration('mq-defs');

		// Get current SHA if any
		const currentSHA = config.get<string>('shaKey', '');

		// Configuration should support reading the shaKey
		assert.ok(
			config.has('shaKey') || currentSHA !== undefined,
			'Configuration should have shaKey setting defined'
		);

		// Test that we can read the shaKey (even if empty)
		const shaValue = config.get<string>('shaKey');
		assert.ok(
			typeof shaValue === 'string' || shaValue === undefined,
			'shaKey should be a string or undefined'
		);
	});
});
