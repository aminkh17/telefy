# System Architecture

## Overview

Telefy is a specialized Telegram client built with **Next.js 15 (App Router)** that focuses exclusively on music playback. It leverages **GramJS** for direct interaction with the Telegram MTProto API in the browser.

## Directory Structure

```
src/
├── app/                 # Next.js App Router pages and layouts
├── components/          # React UI components
│   ├── Auth.tsx         # Login handling
│   ├── ChatList.tsx     # Chat navigation with lazy-loaded icons
│   ├── ChatMusicView.tsx # Message fetching and track list
│   └── Player.tsx       # Global audio player UI
├── contexts/            # React Contexts for global state
│   ├── TelegramProvider.tsx # GramJS client instance
│   ├── ChatContext.tsx      # Selected chat state
│   └── PlayerContext.tsx    # Audio playback orchestration
└── lib/                 # Core logic and utilities
    ├── AudioStreamer.ts # Custom MSE-based audio engine
    └── db.ts            # IndexedDB wrapper for caching
```

## Core State Management

The application uses React Context to manage global state without external libraries like Redux, keeping the bundle size optimized.

### 1. TelegramProvider
- **Responsibility**: Initializes the `TelegramClient`.
- **Session Management**: Stores the session string in `localStorage`.
- **Exports**: `client` (the GramJS instance), `user` (current user profile), and connection status.

### 2. ChatContext
- **Responsibility**: Tracks the currently selected chat.
- **State**:
    - `selectedChatId`: ID of the active chat.
    - `selectedChatTitle`: Display name.
    - `selectedChatPhotoUrl`: Blob URL of the high-quality profile photo.

### 3. PlayerContext
- **Responsibility**: The central nervous system of the app. It connects the UI (`Player.tsx`, `ChatMusicView.tsx`) with the logic (`AudioStreamer.ts`).
- **Features**:
    - Queue management (next/prev).
    - Playback state (playing, buffering, paused).
    - Progress tracking (playback time, download progress).
    - **Media Session API**: Updates OS-level controls and metadata (including artwork).

## Key Workflows

### 1. Chat Loading & Lazy Images
- `ChatList` fetches dialogs using `client.getDialogs`.
- **Optimization**: Profile photos are not fetched initially. An `IntersectionObserver` monitors the list. When a chat item scrolls into view, `client.downloadProfilePhoto` is called with `{ isBig: true }`.
- The resulting buffer is converted to a Blob URL and cached in the component state.

### 2. Music Fetching
- `ChatMusicView` uses `client.getMessages` with `InputMessagesFilterMusic`.
- **Metadata**: It parses `DocumentAttributeAudio` for title/artist.
- **Thumbnails**: It asynchronously downloads message thumbnails (`client.downloadMedia({ thumb: 0 })`) to avoid blocking the UI thread.

### 3. Playback Initiation
1. User clicks a track.
2. `PlayerContext.playTrack` is called.
3. `AudioStreamer` checks IndexedDB for a cached copy.
4. If not found, it initializes a `MediaSource` and begins streaming chunks from Telegram.
