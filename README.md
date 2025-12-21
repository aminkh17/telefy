# Telefy - Telegram Music Client

This is a Next.js application that acts as a specialized Telegram client for music.

## Features

- **Telegram Login:** Securely log in with your existing Telegram account.
- **Music Only:** Automatically filters your chats to show only audio files.
- **Player:** Built-in audio player with persistent controls, scrubbing, and volume.
- **Streaming:** Custom MSE-based audio engine for instant playback without full downloads.
- **Offline Support:** Caches played tracks for offline listening.
- **Search:** Quickly find tracks by title or artist.

## Documentation

- [**System Architecture**](docs/ARCHITECTURE.md): Components, State Management, and Providers.
- [**Audio System**](docs/AUDIO_SYSTEM.md): Deep dive into the streaming engine, MSE, and caching.

## Setup

1.  **Get API Credentials:**
    - Go to [my.telegram.org](https://my.telegram.org) and log in.
    - Click on "API development tools".
    - Create a new application to get your `API_ID` and `API_HASH`.

2.  **Configure Environment:**
    - Copy `.env.local.example` to `.env.local`:
      ```bash
      cp .env.local.example .env.local
      ```
    - Open `.env.local` and paste your `API_ID` and `API_HASH`.

3.  **Run the App:**
    ```bash
    npm install
    npm run dev
    ```

4.  **Login:**
    - Open `http://localhost:3000`.
    - Enter your phone number (international format, e.g., `+1234567890`).
    - Enter the code sent to your Telegram app.
    - (Optional) Enter your 2FA password if enabled.

## Technologies

- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- GramJS (Telegram Client)
- Lucide React (Icons)
- IndexedDB (Caching)
