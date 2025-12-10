"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  url?: string;
  mimeType?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0 to 100
  currentTime: number;
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
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<Track[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    
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
      // Auto-play next track
      nextTrack();
    };
    
    const handleError = (e: Event) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
    };
  }, []);

  // Update audio source when track changes
  useEffect(() => {
    if (currentTrack && audioRef.current && currentTrack.url) {
      if (audioRef.current.src !== currentTrack.url) {
        audioRef.current.src = currentTrack.url;
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(e => console.error("Playback error:", e));
      }
    }
  }, [currentTrack]);

  // Handle play/pause toggle
  useEffect(() => {
      if(audioRef.current) {
          if (isPlaying) {
              audioRef.current.play().catch(e => console.error("Play error", e));
          } else {
              audioRef.current.pause();
          }
      }
  }, [isPlaying]);
  
  // Handle volume changes
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  const playTrack = useCallback((track: Track, newQueue?: Track[]) => {
    // If it's the same track, just toggle play if it's paused
    if (currentTrack?.id === track.id) {
        if (!isPlaying) setIsPlaying(true);
        // Even if same track, update queue if provided
        if (newQueue) setQueue(newQueue);
        return;
    }
    
    setCurrentTrack(track);
    if (newQueue) setQueue(newQueue);
  }, [currentTrack, isPlaying]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
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
      if (!currentTrack || queue.length === 0) return;
      
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
          const next = queue[currentIndex + 1];
          // We need to ensure the next track has a URL (might need downloading logic handling in the component or pre-fetching)
          // For now, if no URL, we can't really play it automatically without the component's help.
          // However, since we rely on ChatMusicView for downloading, this simple next logic might fail if the next track isn't downloaded.
          // BUT, currently ChatMusicView downloads only on click. 
          // We'll update the context state, and ChatMusicView (or a new effect) should handle downloading if URL is missing.
          // Actually, we can't trigger download from here easily without access to client.
          // Playback will fail if url is empty. 
          // Ideally, we just set the track, and the UI should react.
          setCurrentTrack(next);
      }
  }, [currentTrack, queue]);
  
  const prevTrack = useCallback(() => {
      if (!currentTrack || queue.length === 0) return;
      
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
          const prev = queue[currentIndex - 1];
          setCurrentTrack(prev);
      }
  }, [currentTrack, queue]);

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, progress, currentTime, volume, playTrack, togglePlay, seek, setVolume, nextTrack, prevTrack }}>
      {children}
    </PlayerContext.Provider>
  );
};