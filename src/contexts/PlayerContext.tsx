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
  imageUrl?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  progress: number; // 0 to 100
  currentTime: number;
  downloadProgress: number; // 0 to 100
  volume: number;
  shuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  reversed: boolean;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: (auto?: boolean) => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleReverse: () => void;
}

const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  progress: 0,
  currentTime: 0,
  downloadProgress: 0,
  volume: 1,
  shuffle: false,
  repeatMode: 'off',
  reversed: false,
  playTrack: () => {},
  togglePlay: () => {},
  seek: () => {},
  setVolume: () => {},
  nextTrack: () => {},
  prevTrack: () => {},
  toggleShuffle: () => {},
  toggleRepeat: () => {},
  toggleReverse: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const { client } = useTelegram();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<Track[]>([]);
  
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [reversed, setReversed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);

  // Refs for callbacks to be used in static listeners
  const nextTrackRef = useRef<((auto?: boolean) => void) | undefined>(undefined);
  const prevTrackRef = useRef<(() => void) | undefined>(undefined);
  const seekRef = useRef<((time: number) => void) | undefined>(undefined);

  // Ref-based state access for event listeners
  const stateRef = useRef({ queue, currentTrack, shuffle, repeatMode, reversed, isPlaying });
  useEffect(() => {
      stateRef.current = { queue, currentTrack, shuffle, repeatMode, reversed, isPlaying };
  }, [queue, currentTrack, shuffle, repeatMode, reversed, isPlaying]);

  const updateMediaSessionState = useCallback(() => {
      if (!stateRef.current.currentTrack || !('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = stateRef.current.isPlaying ? 'playing' : 'paused';
  }, []);

  const updateMediaSessionMetadata = useCallback((track: Track) => {
      if (!('mediaSession' in navigator)) return;

      navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          artwork: [
              { src: track.imageUrl || '/file.svg', sizes: '96x96', type: 'image/svg+xml' },
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

  // Handle volume changes
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    // Immediate state updates for UI responsiveness
    if (newQueue) setQueue(newQueue);
    
    const isSameTrack = currentTrack?.id === track.id;
    const audio = audioRef.current;
    
    if (isSameTrack && audio && audio.src) {
        if (audio.paused) {
            audio.play().catch(e => {
                if (e.name !== 'AbortError') console.error(e);
            });
        } else {
            audio.pause();
        }
        return;
    }

    setCurrentTrack(track);
    setDownloadProgress(0);
    setIsBuffering(true);
    setIsPlaying(false); // Validating state

    if (!audio) return;
    
    try {
        if (track.url) {
            // Direct URL
            if (streamerRef.current) streamerRef.current.cleanup();
            
            audio.src = track.url;
            audio.currentTime = 0;
            await audio.play();
            setDownloadProgress(100);
        } else if (track._message && client) {
            // Stream from Telegram
            if (streamerRef.current) {
                await streamerRef.current.play(client, track, track._message);
            }
        } else {
            console.error("Cannot play track: No URL and no Message/Client found");
            setIsBuffering(false);
        }
    } catch (e: any) {
        // Ignore AbortError from rapid switching
        if (e.name !== 'AbortError') {
            console.error("Play error:", e);
        }
        setIsBuffering(false);
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

  const toggleShuffle = useCallback(() => setShuffle(prev => !prev), []);
  const toggleReverse = useCallback(() => setReversed(prev => !prev), []);
  const toggleRepeat = useCallback(() => {
      setRepeatMode(prev => {
          if (prev === 'off') return 'all';
          if (prev === 'all') return 'one';
          return 'off';
      });
  }, []);

  const nextTrack = useCallback((auto = false) => {
      const { queue, currentTrack, shuffle, repeatMode, reversed } = stateRef.current;
      
      if (!currentTrack || queue.length === 0) return;
      
      // Handle Repeat One on Auto (Ended)
      if (auto && repeatMode === 'one') {
          if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(console.error);
          }
          return;
      }

      let nextIndex = -1;
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);

      if (shuffle) {
          // Simple random for now
          // Ensure we don't pick the same track if queue > 1
          if (queue.length === 1) nextIndex = 0;
          else {
              do {
                  nextIndex = Math.floor(Math.random() * queue.length);
              } while (nextIndex === currentIndex);
          }
      } else {
          // Normal or Reversed
          if (reversed) {
              nextIndex = currentIndex - 1;
              if (nextIndex < 0) {
                  if (repeatMode === 'all') nextIndex = queue.length - 1;
                  else nextIndex = -1; // Stop
              }
          } else {
              nextIndex = currentIndex + 1;
              if (nextIndex >= queue.length) {
                  if (repeatMode === 'all') nextIndex = 0;
                  else nextIndex = -1; // Stop
              }
          }
      }

      if (nextIndex !== -1) {
          playTrack(queue[nextIndex]);
      }
  }, [playTrack]);

  const prevTrack = useCallback(() => {
      const { queue, currentTrack, shuffle, reversed } = stateRef.current;
      if (!currentTrack || queue.length === 0) return;
      
      // If playing > 3s, restart track
      if (audioRef.current && audioRef.current.currentTime > 3) {
          audioRef.current.currentTime = 0;
          return;
      }
      
      // Logic for prev is basically reverse of next
      let prevIndex = -1;
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      
      if (shuffle) {
           // Random prev? Usually history. For now, random.
           if (queue.length === 1) prevIndex = 0;
           else {
               do {
                   prevIndex = Math.floor(Math.random() * queue.length);
               } while (prevIndex === currentIndex);
           }
      } else {
          if (reversed) {
              // Prev in reversed mode is index + 1
              prevIndex = currentIndex + 1;
              if (prevIndex >= queue.length) prevIndex = 0; // Loop always on prev
          } else {
              prevIndex = currentIndex - 1;
              if (prevIndex < 0) prevIndex = queue.length - 1;
          }
      }
      
      if (prevIndex !== -1) {
          playTrack(queue[prevIndex]);
      }
  }, [playTrack]);

  // Keep refs updated for listeners
  useEffect(() => {
      nextTrackRef.current = nextTrack;
      prevTrackRef.current = prevTrack;
      seekRef.current = seek;
  }, [nextTrack, prevTrack, seek]);

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
    
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
        setIsBuffering(false);
        setIsPlaying(true);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    };
    const handlePause = () => {
        setIsPlaying(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setProgress(0);
      setCurrentTime(0);
      if (nextTrackRef.current) nextTrackRef.current(true);
    };
    
    const handleError = (e: Event) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
        setIsBuffering(false);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);

    // Initialize Media Session actions
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
             audio.play().catch(console.error);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
             audio.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
             if (prevTrackRef.current) prevTrackRef.current();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
             if (nextTrackRef.current) nextTrackRef.current();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
             if (details.seekTime && isFinite(details.seekTime)) {
                 if (seekRef.current) seekRef.current(details.seekTime);
             }
        });
    }

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      if (streamerRef.current) streamerRef.current.cleanup();
    };
  }, []); 

  return (
    <PlayerContext.Provider value={{ 
        currentTrack, isPlaying, isBuffering, progress, currentTime, downloadProgress, volume, 
        shuffle, repeatMode, reversed,
        playTrack, togglePlay, seek, setVolume, nextTrack, prevTrack,
        toggleShuffle, toggleRepeat, toggleReverse
    }}>
      {children}
    </PlayerContext.Provider>
  );
};