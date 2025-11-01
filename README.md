# Session Manager: Local and flexible

A Chromium and Firefox extension that saves your session on websites like social networks (Facebook, Twitter, Instagram, Telegram, Reddit) and other sites where session tokens are stored in cookies, localStorage, sessionStorage, and IndexedDB. I created this extension because it's useful when I log in incognito mode or simply don't want to spend time logging in, avoiding email verification or 2FA, or just entering my email and password.

It's a very useful way to speed up web browsing.

**Use Cases:**
- Quickly switch between multiple accounts on the same website
- Test different user states without manual login
- Backup important logged-in sessions before clearing browser data
- Share session states with team members for debugging
- Keep separate work and personal browsing sessions

## Features

- **Complete Session Management**: Save and restore entire browsing sessions including:
  - Cookies
  - localStorage
  - sessionStorage
  - IndexedDB
- **Local Storage**: All data is stored locally on your device - no cloud sync, no external servers
- **Import/Export**: Easily backup and transfer sessions between browsers
- **Domain-Based Organization**: Sessions are organized by domain for easy management
- **Search Functionality**: Quickly find saved sessions with built-in search
- **Privacy First**: Your data never leaves your device

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open your browser and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `session-extension-chromium` folder

## Usage

### Saving a Session

1. Click the extension icon in your browser toolbar
2. Navigate to the "Sessions" tab
3. Click "Save Current Session"
4. Your current cookies, localStorage, sessionStorage, and IndexedDB will be saved

### Restoring a Session

1. Click the extension icon
2. Find the session you want to restore in the list
3. Click "Restore"
4. The page will reload with the restored session data

### Exporting Sessions

1. Click the extension icon
2. Find the session you want to export
3. Click "Export"
4. A JSON file will be downloaded to your computer

### Importing Sessions

1. Click the extension icon
2. Click "Import"
3. Select a previously exported JSON file
4. The session will be added to your saved sessions list

## Permissions

This extension requires the following permissions:

- **cookies**: To save and restore cookies
- **tabs**: To reload pages after restoring sessions
- **storage**: To store session data locally
- **scripting**: To inject scripts for localStorage/sessionStorage/IndexedDB restoration
- **host_permissions (`<all_urls>`)**: To access and restore data on any website

## Supported Languages

- English (en)
- Spanish (es)

The extension automatically detects your browser language and displays the appropriate translation.

## Technical Details

- **Manifest Version**: 3
- **Minimum Chrome Version**: 102
- **Storage**: Uses Chrome's local storage API
- **Architecture**: Service Worker-based background script

## Project Structure

```
session-extension-chromium/
├── manifest.json           # Extension configuration
├── cookie-editor.js        # Background service worker
├── icons/                  # Extension icons
├── interface/              # UI files
│   ├── popup/             # Main popup interface
│   ├── lib/               # Utility libraries
│   ├── sprites/           # SVG icons
│   └── theme/             # CSS themes
└── _locales/              # Internationalization
    ├── en/                # English translations
    └── es/                # Spanish translations
```

## Privacy & Security

- **No Cloud Sync**: All data is stored locally on your device
- **No Analytics**: We don't track your usage
- **No External Requests**: The extension doesn't communicate with external servers
- **Open Source**: Full transparency - review the code yourself

## Known Issues

- IndexedDB restoration may require a page reload to take full effect
- Some websites with strict Content Security Policies may prevent storage restoration

## Version History

### 1.0.0 (Initial Release)
- Complete session management (cookies, localStorage, sessionStorage, IndexedDB)
- Import/Export functionality
- Multi-language support (English/Spanish)
- Domain-based session organization
- Search functionality

## Author

**gn0sys11root**

## License

This project is open source and available for personal and educational use.

## Contributing

Contributions, issues, and feature requests are welcome!

## Disclaimer

This extension is provided as-is. Always backup important session data before performing restore operations. The author is not responsible for any data loss or issues arising from the use of this extension.
