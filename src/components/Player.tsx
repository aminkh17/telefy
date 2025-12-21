"use client";

import React from "react";
import { usePlayer } from "../contexts/PlayerContext";
import { Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX, Music, Shuffle, Repeat, Repeat1, ArrowUpDown } from "lucide-react";

export default function Player() {
  const { 
      currentTrack, isPlaying, togglePlay, progress, currentTime, downloadProgress, 
      seek, nextTrack, prevTrack, volume, setVolume,
      shuffle, repeatMode, reversed, toggleShuffle, toggleRepeat, toggleReverse
  } = usePlayer();

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    if (!time) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0311]/90 backdrop-blur-xl border-t border-zinc-200 dark:border-purple-500/20 p-4 shadow-lg shadow-purple-900/10 z-50">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">
        
        {/* Track Info */}
        <div className="flex-1 w-full md:w-1/4 flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 bg-zinc-200 dark:bg-purple-900/30 rounded-md shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-purple-500/20">
             {currentTrack.imageUrl ? (
                 // eslint-disable-next-line @next/next/no-img-element
                 <img src={currentTrack.imageUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
             ) : (
                 <Music className="w-6 h-6 text-zinc-400 dark:text-purple-400" />
             )}
          </div>
          <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-zinc-900 dark:text-purple-50 truncate">{currentTrack.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-purple-400 truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-2 w-full md:w-1/2">
            <div className="flex items-center gap-4 md:gap-6">
                <button
                    onClick={toggleReverse}
                    className={`transition-colors ${reversed ? 'text-blue-600 dark:text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'text-zinc-400 hover:text-zinc-600 dark:text-purple-400/40 dark:hover:text-purple-300'}`}
                    title="Reverse Order"
                >
                    <ArrowUpDown className="w-4 h-4" />
                </button>

                <button
                    onClick={toggleShuffle}
                    className={`transition-colors ${shuffle ? 'text-blue-600 dark:text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'text-zinc-400 hover:text-zinc-600 dark:text-purple-400/40 dark:hover:text-purple-300'}`}
                    title="Shuffle"
                >
                    <Shuffle className="w-4 h-4" />
                </button>

                <button 
                    onClick={prevTrack}
                    className="text-zinc-400 hover:text-zinc-600 dark:text-purple-400 dark:hover:text-purple-200 transition-colors"
                >
                    <SkipBack className="w-5 h-5 fill-current" />
                </button>
                
                <button 
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white flex items-center justify-center transition-all hover:scale-105 shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                </button>

                <button 
                    onClick={() => nextTrack(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:text-purple-400 dark:hover:text-purple-200 transition-colors"
                >
                    <SkipForward className="w-5 h-5 fill-current" />
                </button>

                <button
                    onClick={toggleRepeat}
                    className={`transition-colors ${repeatMode !== 'off' ? 'text-blue-600 dark:text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]' : 'text-zinc-400 hover:text-zinc-600 dark:text-purple-400/40 dark:hover:text-purple-300'}`}
                    title={`Repeat: ${repeatMode}`}
                >
                    {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
            </div>
            
            <div className="w-full flex items-center gap-3">
                <span className="text-xs text-zinc-500 dark:text-purple-400 tabular-nums w-10 text-right">{formatTime(currentTime)}</span>
                <div className="flex-1 h-1 bg-zinc-200 dark:bg-purple-900/30 rounded-full relative group cursor-pointer">
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
                        className="absolute h-full bg-zinc-300 dark:bg-purple-800/50 rounded-full transition-all duration-300 z-0"
                        style={{ width: `${downloadProgress}%` }}
                    />
                    
                    {/* Playback Progress Bar */}
                    <div 
                        className="h-full bg-blue-600 dark:bg-purple-500 rounded-full relative z-10 pointer-events-none shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-blue-600 dark:border-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                    </div>
                </div>
                <span className="text-xs text-zinc-500 dark:text-purple-400 tabular-nums w-10">{formatTime(currentTrack.duration)}</span>
            </div>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 w-1/4 justify-end">
            <button 
                onClick={() => setVolume(volume === 0 ? 1 : 0)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-purple-400 dark:hover:text-purple-200"
            >
                <VolumeIcon className="w-5 h-5" />
            </button>
            <div className="w-24 h-1 bg-zinc-200 dark:bg-purple-900/30 rounded-full relative group cursor-pointer">
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
                    className="h-full bg-zinc-400 dark:bg-purple-600 rounded-full relative"
                    style={{ width: `${volume * 100}%` }}
                >
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-400 dark:border-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
