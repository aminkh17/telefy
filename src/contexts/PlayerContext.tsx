"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { useTelegram } from "./TelegramProvider";
import { AudioStreamer } from "../lib/AudioStreamer";
import { Api } from "telegram";

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  url?: string;
  mimeType?: string;
  _message?: Api.Message;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0 to 100
  currentTime: number;
  downloadProgress: number; // 0 to 100
  volume: number;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  currentTime: 0,
  downloadProgress: 0,
  volume: 1,
  playTrack: () => {},
  togglePlay: () => {},
  seek: () => {},
  setVolume: () => {},
  nextTrack: () => {},
  prevTrack: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const { client } = useTelegram();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<Track[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    // Pass progress callback
    streamerRef.current = new AudioStreamer(audioRef.current, (prog) => {
        setDownloadProgress(prog);
    });
    
    const audio = audioRef.current;

    const updateProgress = () => {
      if (audio.duration) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      nextTrack();
    };
    
    const handleError = (e: Event) => {
        console.error("Audio playback error:", e);
        // Don't auto-stop immediately on some errors, maybe retry?
        // But for now, safe to stop.
        setIsPlaying(false);
    };

    const handlePlayPause = () => {
        setIsPlaying(!audio.paused);
        updateMediaSessionState();
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("play", handlePlayPause);
    audio.addEventListener("pause", handlePlayPause);

    // Initialize Media Session actions
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
             audio.play().catch(console.error);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
             audio.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
             prevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
             nextTrack();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
             if (details.seekTime && isFinite(details.seekTime)) {
                 seek(details.seekTime);
             }
        });
    }

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("play", handlePlayPause);
      audio.removeEventListener("pause", handlePlayPause);
      audio.pause();
      if (streamerRef.current) streamerRef.current.cleanup();
    };
  }, []);

  const updateMediaSessionState = useCallback(() => {
      if (!currentTrack || !('mediaSession' in navigator)) return;
      
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentTrack, isPlaying]);

  const updateMediaSessionMetadata = useCallback((track: Track) => {
      if (!('mediaSession' in navigator)) return;

      navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          artwork: [
              { src: '/file.svg', sizes: '96x96', type: 'image/svg+xml' }, // Placeholder
              // We could extract artwork from Telegram audio attributes if available (often not in basic attr)
          ]
      });
  }, []);

  // Update Media Session when track changes
  useEffect(() => {
      if (currentTrack) {
          updateMediaSessionMetadata(currentTrack);
          updateMediaSessionState();
      }
  }, [currentTrack, updateMediaSessionMetadata, updateMediaSessionState]);


  // Handle Playback Logic
  // We don't use the simple useEffect([currentTrack]) anymore for setting src directly if using streamer.
  // Instead, playTrack initiates the streamer.

  // Handle volume changes
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    const isSameTrack = currentTrack?.id === track.id;

    if (newQueue) setQueue(newQueue);
    setCurrentTrack(track);

    const audio = audioRef.current;
    if (!audio) return;

    if (isSameTrack && audio.src) {
        // Toggle play if same track and already loaded
        if (audio.paused) {
            audio.play().catch(console.error);
        } else {
            audio.pause();
        }
    } else {
        // New track or restart
        setDownloadProgress(0); // Reset progress

        // Use Streamer if we have a message reference and it's not a direct URL yet
        // (Or even if it has a URL, if we want to enforce our streamer logic, but usually URL means direct play)
        
        if (track.url) {
            // Direct URL (e.g. Blob URL already created or external)
             // Clean up previous streamer usage if any
            if (streamerRef.current) streamerRef.current.cleanup();
            
            audio.src = track.url;
            audio.currentTime = 0;
            try {
                await audio.play();
                setDownloadProgress(100);
            } catch(e) { console.error(e); }
        } else if (track._message && client) {
            // Stream from Telegram
            if (streamerRef.current) {
                await streamerRef.current.play(client, track, track._message);
            }
        } else {
            console.error("Cannot play track: No URL and no Message/Client found");
        }
    }
  }, [currentTrack, client]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
        if (audio.paused) audio.play().catch(console.error);
        else audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);
  
  const setVolume = useCallback((val: number) => {
      setVolumeState(Math.max(0, Math.min(1, val)));
  }, []);
  
  const nextTrack = useCallback(() => {
      // Need latest state of currentTrack and queue
      // We can't access state directly in callback easily without refs or dependency injection, 
      // but simpler: use functional update or dependency.
      // We need to trigger playTrack with the next track.
      
      // Since queue and currentTrack are dependencies, this function recreates. 
      // Ensure we don't create infinite loops if used in effects.
      
      // We need to access the LATEST queue/currentTrack.
      // State in closure might be stale if not careful? 
      // With proper dependencies [currentTrack, queue], it's fine.
      
      if (!currentTrack || queue.length === 0) return;
      
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
          const next = queue[currentIndex + 1];
          playTrack(next);
      }
  }, [currentTrack, queue, playTrack]);
  
  const prevTrack = useCallback(() => {
      if (!currentTrack || queue.length === 0) return;
      
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
          const prev = queue[currentIndex - 1];
          playTrack(prev);
      } else {
          // Restart current
          seek(0);
      }
  }, [currentTrack, queue, playTrack, seek]);

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, progress, currentTime, downloadProgress, volume, playTrack, togglePlay, seek, setVolume, nextTrack, prevTrack }}>
      {children}
    </PlayerContext.Provider>
  );
};