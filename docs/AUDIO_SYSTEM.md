# Audio Subsystem & Streaming

## Overview

Telefy uses a custom audio engine, `AudioStreamer`, to handle playback. Since Telegram files must be downloaded via MTProto, standard HTML5 `<audio src="...">` cannot be used directly without a proxy. Instead, we use the **Media Source Extensions (MSE)** API to feed binary chunks directly into the audio element in the browser.

## The Streaming Pipeline

### 1. Source Acquisition
- **Input**: A Telegram `Api.Message` containing a `MediaDocument`.
- **Method**: `client.iterDownload({ requestSize: 128 * 1024 })`.
- **Logic**: The file is downloaded in **128KB chunks**. This size is a specific trade-off:
    - *Smaller chunks* would reduce initial time-to-first-byte (TTFB) but increase CPU overhead and protocol chatter.
    - *Larger chunks* would be more efficient but introduce significant startup latency.

### 2. Buffering (MSE)
1. `AudioStreamer` creates a `MediaSource` and attaches it to the `<audio>` element.
2. It creates a `SourceBuffer` for `audio/mpeg` (mp3).
3. As chunks arrive from `iterDownload`:
    - They are pushed to a `queue`.
    - A processing loop appends them to the `SourceBuffer`.
    - **Critical Fix**: The system explicitly handles `updateend` events to ensure `isAppending` flags are reset, preventing queue stalls.

### 3. Caching & Offline Support
- **Library**: `idb` (IndexedDB Promise wrapper).
- **Mechanism**:
    - As chunks are streamed for playback, they are also accumulated in memory.
    - Upon successful completion of the stream, the full file is re-assembled into a `Blob`.
    - This Blob is saved to IndexedDB (`telefy-music-db`) keyed by the Track ID.
- **Playback**: Before streaming, `AudioStreamer` checks DB. If found, it creates a Blob URL from the cache, bypassing the network entirely.

## Latency & Responsiveness

### Initial Latency (~2-6s)
Because we stream directly from Telegram API to the client:
1. The request goes to Telegram servers.
2. Telegram prepares the file.
3. The first 128KB chunk must be fully downloaded.
4. The browser's audio decoder must buffer enough data to verify sync.

*Optimization*: We prioritize `audioElement.play()` immediately upon `sourceopen` to minimize browser-side delays.

### Race Condition Handling
Rapidly switching tracks triggers `AudioStreamer.cleanup()`, which calls `audio.load()` to reset the buffer.
- **Problem**: Calling `load()` while a previous promise is pending throws `AbortError`.
- **Solution**: We explicitly catch and ignore `AbortError` in the play promise chain, ensuring the UI remains stable.

## Metadata & Integration

- **Media Session API**: `PlayerContext` updates `navigator.mediaSession` with:
    - Title / Artist.
    - Artwork (extracted from Telegram message thumbnails).
    - Play/Pause state.
- **Visuals**: Download progress is calculated (`totalDownloaded / documentSize`) and visualized in the UI via a secondary progress bar.
