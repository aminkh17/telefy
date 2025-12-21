# Changelog

## [0.1.0] - 2025-12-21

### Added
- **AudioStreamer**: Implemented robust audio streaming logic using `MediaSource` API (MSE) with fallback to full download.
- **Offline Support**: Integrated `idb` for offline playback caching of full tracks.
- **Metadata Support**: Added album art (thumbnail) extraction from Telegram messages and display in the Player UI.
- **Media Session**: Added integration with Media Session API for OS-level media controls (Play/Pause/Next/Prev/Seek/Artwork).
- **Sync Check**: Added basic sync monitoring interval in `AudioStreamer`.

### Changed
- **Responsiveness**: Removed playback debounce to restore instant UI feedback and player start latency.
- **Buffering**: Enhanced buffering logic to handle `AbortError` gracefully during rapid track switching.
- **Player UI**: Updated `Player.tsx` to show download progress and album art.
- **ChatMusicView**: Updated track fetching to asynchronously load thumbnails.
- **Next.js Config**: Suppressed specific node module fallback errors for `gramjs` in client builds.

### Fixed
- **Race Condition**: Fixed "play() request interrupted by new load request" by handling `AbortError` and proper cleanup in `AudioStreamer`.
- **Stalling**: Fixed `isAppending` logic bug in `AudioStreamer` queue processing.
- **TypeScript**: Resolved various type errors in `AudioStreamer` and `db.ts`.
