"use client";

import React from "react";
import { usePlayer } from "../contexts/PlayerContext";
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX } from "lucide-react";

export default function Player() {
  const { currentTrack, isPlaying, togglePlay, progress, currentTime, downloadProgress, seek, nextTrack, prevTrack, volume, setVolume } = usePlayer();

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    if (!time) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 shadow-lg z-50">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">
        
        {/* Track Info */}
        <div className="flex-1 w-full md:w-1/4 text-center md:text-left min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{currentTrack.title}</h3>
          <p className="text-sm text-zinc-500 truncate">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-2 w-full md:w-1/2">
            <div className="flex items-center gap-6">
                <button 
                    onClick={prevTrack}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                    <SkipBack className="w-5 h-5 fill-current" />
                </button>
                
                <button 
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-transform hover:scale-105"
                >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                </button>

                <button 
                    onClick={nextTrack}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                    <SkipForward className="w-5 h-5 fill-current" />
                </button>
            </div>
            
            <div className="w-full flex items-center gap-3">
                <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full relative group cursor-pointer">
                    <input 
                        type="range"
                        min="0"
                        max={currentTrack.duration || 100}
                        value={currentTime}
                        onChange={(e) => seek(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                    
                    {/* Download Progress Bar */}
                    <div 
                        className="absolute h-full bg-zinc-300 dark:bg-zinc-700 rounded-full transition-all duration-300 z-0"
                        style={{ width: `${downloadProgress}%` }}
                    />
                    
                    {/* Playback Progress Bar */}
                    <div 
                        className="h-full bg-blue-600 rounded-full relative z-10 pointer-events-none"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                    </div>
                </div>
                <span className="text-xs text-zinc-500 tabular-nums w-10">{formatTime(currentTrack.duration)}</span>
            </div>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 w-1/4 justify-end">
            <button 
                onClick={() => setVolume(volume === 0 ? 1 : 0)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
                <VolumeIcon className="w-5 h-5" />
            </button>
            <div className="w-24 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full relative group cursor-pointer">
                <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                 <div 
                    className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full relative"
                    style={{ width: `${volume * 100}%` }}
                >
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
