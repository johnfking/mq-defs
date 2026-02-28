# MacroQuest Lua Definitions for VS Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/zenithcodeforge.mq-defs?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=zenithcodeforge.mq-defs)
[![License](https://img.shields.io/github/license/johnfking/mq-defs?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/johnfking/mq-defs/ci.yml?branch=master&style=flat-square)](https://github.com/johnfking/mq-defs/actions)

> Supercharge your MacroQuest Lua development with intelligent autocomplete, hover documentation, and type checking powered by the official MQ definitions.

Stop wrestling with documentation tabs and memorizing API signatures. This extension automatically downloads and configures the [official MacroQuest Lua definitions](https://github.com/macroquest/mq-definitions) for the Lua Language Server, giving you instant IntelliSense for all MacroQuest APIs right in VS Code.

## ✨ Features

### 🚀 Automatic Definition Management
- **One-Click Setup**: Downloads and configures MQ definitions automatically on first Lua file open
- **Smart Updates**: Checks for new definitions using SHA comparison (no unnecessary downloads)
- **Branch Selection**: Choose which MQ definitions branch to use (master, development, etc.)

### 🧠 Enhanced Development Experience
- **IntelliSense**: Full autocomplete for all MacroQuest TLOs, methods, and properties
- **Type Information**: Hover over any MQ object to see its type and documentation
- **Error Detection**: Catch typos and invalid API usage before runtime
- **Go to Definition**: Jump directly to definition sources

### ⚙️ Smart Configuration
- **Global Settings**: Definitions work across all your Lua projects
- **Minimal Notifications**: Optional quiet mode to reduce notification clutter
- **Manual Control**: Force re-download anytime by clearing the SHA key

## 📦 Installation

### From VS Code Marketplace (Recommended)
1. Open VS Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install zenithcodeforge.mq-defs`
4. Press Enter

### From VSIX File
1. Download the latest `.vsix` file from [Releases](https://github.com/johnfking/mq-defs/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P` / `Cmd+Shift+P` and run `Extensions: Install from VSIX...`
4. Select the downloaded file

## 🚀 Quick Start

1. **Install Prerequisites**:
   - Install the [Lua Language Server extension](https://marketplace.visualstudio.com/items?itemName=sumneko.lua)
   - This extension installs automatically with mq-defs

2. **Open a Lua File**:
   - Create or open any `.lua` file
   - The extension activates automatically
   - Definitions download on first activation

3. **Start Coding**:
   ```lua
   -- Type 'mq.' and watch the magic happen! ✨
   local me = mq.TLO.Me
   print(me.Name())  -- Full autocomplete and type hints!
   ```

4. **Manual Download** (Optional):
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Run command: `MQ: Download Definitions`

## ⚙️ Configuration

Access settings via `File > Preferences > Settings` and search for "mq-defs":

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mq-defs.branch` | string | `"master"` | GitHub branch to download definitions from. Use `"development"` for bleeding-edge features. |
| `mq-defs.limit-notifications` | boolean | `true` | When enabled, only shows notifications for new definition downloads (recommended). |
| `mq-defs.shaKey` | string | `""` | SHA hash of currently installed definitions. **Tip**: Clear this to force a fresh download. |

### Example Configuration

```json
{
  "mq-defs.branch": "master",
  "mq-defs.limit-notifications": true
}
```

## 🎯 Commands

| Command | Description |
|---------|-------------|
| `MQ: Download Definitions` | Manually download/update MacroQuest definitions |

**Access commands**: Press `Ctrl+Shift+P` / `Cmd+Shift+P` and type `MQ:`

## 🔧 How It Works

1. **Detection**: Extension activates when you open a Lua file
2. **Version Check**: Queries GitHub API for the latest definition SHA
3. **Smart Download**: Only downloads if definitions are missing or outdated
4. **Configuration**: Automatically updates Lua Language Server workspace settings
5. **Ready**: Full IntelliSense available immediately after download

## 🐛 Troubleshooting

### Definitions Not Showing Up?

1. **Verify Lua Language Server is installed**:
   ```
   Extensions > Search "Lua" > Install "sumneko.lua"
   ```

2. **Check configuration**:
   - Open Settings (`Ctrl+,`)
   - Search for `Lua.workspace.library`
   - Verify the MQ definitions path is listed

3. **Force re-download**:
   - Open Settings
   - Search for `mq-defs.shaKey`
   - Clear the value (set to empty string)
   - Reload VS Code or run `MQ: Download Definitions`

### Still Having Issues?

[Open an issue](https://github.com/johnfking/mq-defs/issues) with:
- VS Code version
- Extension version
- Error messages (check `Help > Toggle Developer Tools > Console`)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: [Open an issue](https://github.com/johnfking/mq-defs/issues) with reproduction steps
2. **Suggest Features**: Share your ideas in [Discussions](https://github.com/johnfking/mq-defs/discussions)
3. **Submit PRs**: Fork, code, test, and submit!

### Development Setup

```bash
# Clone the repository
git clone https://github.com/johnfking/mq-defs.git
cd mq-defs

# Install dependencies
npm install

# Run tests
npm test              # Full test suite
npm run test:unit     # Unit tests only

# Compile TypeScript
npm run compile

# Run linter
npm run lint
```

### Testing

This project maintains high test coverage:
- ✅ 15 unit tests covering core logic
- ✅ 6 integration tests validating VS Code extension contract
- All PRs must pass CI checks

## 📋 Requirements

- **VS Code**: Version 1.94.0 or higher
- **Lua Language Server**: Auto-installed as dependency ([sumneko.lua](https://marketplace.visualstudio.com/items?itemName=sumneko.lua))
- **File Downloader API**: Auto-installed as dependency

## 📄 License

[MIT](LICENSE) © [johnfking](https://github.com/johnfking)

## 🙏 Acknowledgments

- [MacroQuest Team](https://github.com/macroquest) for maintaining the [official Lua definitions](https://github.com/macroquest/mq-definitions)
- [sumneko](https://github.com/sumneko) for the excellent [Lua Language Server](https://github.com/LuaLS/lua-language-server)
- All contributors who help improve this extension

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/johnfking/mq-defs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/johnfking/mq-defs/discussions)
- **MacroQuest**: [Official Discord](https://discord.gg/macroquest)

---

<p align="center">
  Made with ❤️ for the MacroQuest community
</p>
