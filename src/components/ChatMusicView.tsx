"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTelegram } from "../contexts/TelegramProvider";
import { usePlayer, Track } from "../contexts/PlayerContext";
import { useChat } from "../contexts/ChatProvider";
import { Api } from "telegram";
import { Play, Pause, Search, ArrowLeft, Music } from "lucide-react";
import bigInt from "big-integer";

export default function ChatMusicView() {
  const { client } = useTelegram();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { selectedChatId, selectChat, selectedChatTitle, selectedChatPhotoUrl } = useChat();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(true);
  
  // Use a ref to track if we are currently loading to prevent double fetches
  const loadingRef = useRef(false);
  const offsetIdRef = useRef<number>(0);
  
  // Filter tracks first so we can pass the correct queue
  const filteredTracks = tracks.filter(t => 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchMusic = useCallback(async (reset = false) => {
    if (!client || !selectedChatId || loadingRef.current) return;
    
    // If we finished loading all messages, don't fetch again unless it's a reset
    if (!reset && !hasMore) return;

    loadingRef.current = true;
    setIsLoading(true);
    
    if (reset) {
        setTracks([]);
        offsetIdRef.current = 0;
        setHasMore(true);
    }

    try {
        // Fetch in batches
        const entityId = bigInt(selectedChatId);
        
        const messages = await client.getMessages(entityId, {
            limit: 50,
            offsetId: offsetIdRef.current,
            filter: new Api.InputMessagesFilterMusic(),
        });

        if (messages.length === 0) {
            setHasMore(false);
        } else {
            // Update offset for next batch
             const lastMsg = messages[messages.length - 1];
             if (lastMsg) {
                 offsetIdRef.current = lastMsg.id;
             }
        }

        const newTracks: Track[] = [];
        for (const msg of messages) {
            if (msg.media && msg.media instanceof Api.MessageMediaDocument) {
                 if (msg.media.document instanceof Api.Document) {
                     const attributes = msg.media.document.attributes;
                     const audioAttr = attributes.find(
                         (a): a is Api.DocumentAttributeAudio => a instanceof Api.DocumentAttributeAudio
                     );
                     
                     if (audioAttr) {
                         const title = audioAttr.title || "Unknown Title";
                         const artist = audioAttr.performer || "Unknown Artist";
                         const duration = audioAttr.duration || 0;
                         
                         const filenameAttr = attributes.find((a): a is Api.DocumentAttributeFilename => a instanceof Api.DocumentAttributeFilename);
                         const filename = filenameAttr?.fileName || "audio.mp3";
                         
                         // Try to get thumbnail asynchronously
                         let imageUrl: string | undefined = undefined;
                         
                         newTracks.push({
                             id: msg.id.toString(),
                             title: title || filename,
                             artist,
                             duration,
                             url: "", // No pre-downloaded URL
                             mimeType: msg.media.document.mimeType || "audio/mpeg",
                             _message: msg,
                             imageUrl 
                         });
                     }
                 }
            }
        }
        
        // Asynchronously fetch thumbnails for new tracks
        // We do this after setting tracks to avoid blocking UI, then update state
        const tracksWithImages = [...newTracks];
        
        setTracks(prev => reset ? newTracks : [...prev, ...newTracks]);
        
        // Fetch thumbnails in background
        Promise.all(tracksWithImages.map(async (track) => {
             if (track._message && track._message.media && track._message.media instanceof Api.MessageMediaDocument && track._message.media.document instanceof Api.Document) {
                 if (track._message.media.document.thumbs && track._message.media.document.thumbs.length > 0) {
                     try {
                        const thumbData = await client.downloadMedia(track._message, { thumb: 0 }); // Get smallest thumb
                        if (thumbData && thumbData.length > 0) {
                             // eslint-disable-next-line @typescript-eslint/no-explicit-any
                             const blob = new Blob([thumbData as any], { type: "image/jpeg" });
                             const url = URL.createObjectURL(blob);
                             return { ...track, imageUrl: url };
                        }
                     } catch(e) { console.error("Thumb fetch error", e); }
                 }
             }
             return track;
        })).then(updatedTracks => {
             // Only update if we actually got new images
             if (updatedTracks.some((t, i) => t.imageUrl !== tracksWithImages[i].imageUrl)) {
                  setTracks(prev => {
                      const updatedIds = new Set(updatedTracks.map(t => t.id));
                      return prev.map(t => {
                          const updated = updatedTracks.find(u => u.id === t.id);
                          return updated || t;
                      });
                  });
             }
        });

    } catch (e) {
        console.error("Failed to fetch music from chat", e);
        setHasMore(false);
    } finally {
        setIsLoading(false);
        loadingRef.current = false;
    }
  }, [client, selectedChatId, hasMore]);

  // Initial fetch when chat changes
  useEffect(() => {
    if (selectedChatId) {
      fetchMusic(true);
    }
  }, [selectedChatId, fetchMusic]);

  const handlePlay = (track: Track) => {
      // Just tell the player to play. It will handle streaming/downloading via AudioStreamer.
      playTrack(track, filteredTracks);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={() => selectChat(null)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-purple-900/30 transition-colors"
            >
                <ArrowLeft className="w-6 h-6 dark:text-purple-400" />
            </button>
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                 {/* Chat Photo */}
                 <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-purple-900/30 flex items-center justify-center overflow-hidden shrink-0 border border-transparent dark:border-purple-500/20">
                    {selectedChatPhotoUrl ? (
                         // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedChatPhotoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Music className="w-5 h-5 text-zinc-500 dark:text-purple-400" />
                    )}
                 </div>

                <div className="flex-1 overflow-hidden">
                    <h1 className="text-xl font-bold truncate dark:text-purple-50 dark:drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">{selectedChatTitle || "Chat Music"}</h1>
                    <p className="text-sm text-zinc-500 dark:text-purple-400/70">{tracks.length} tracks found</p>
                </div>
            </div>
        </div>

        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-purple-400/50" />
            <input 
                type="text" 
                placeholder="Search tracks or artists..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-[#1a0b2e] border border-zinc-200 dark:border-purple-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500/50 dark:text-purple-100 placeholder-zinc-400 dark:placeholder-purple-400/30 transition-all shadow-inner"
            />
        </div>

        <div className="space-y-2">
            {filteredTracks.map(track => {
                const isCurrent = currentTrack?.id === track.id;
                const isPlayingCurrent = isCurrent && isPlaying;

                return (
                    <div 
                        key={track.id}
                        onClick={() => handlePlay(track)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-all group border border-transparent
                            ${isCurrent ? 'bg-blue-50 dark:bg-purple-900/40 dark:border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]' : 'hover:bg-zinc-50 dark:hover:bg-purple-900/20 dark:hover:border-purple-500/10'}
                        `}
                    >
                        <div className="w-12 h-12 rounded-md bg-zinc-200 dark:bg-purple-900/30 flex items-center justify-center mr-4 shrink-0 overflow-hidden relative">
                            {track.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={track.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Music className="w-5 h-5 text-zinc-400 dark:text-purple-500/50" />
                            )}
                            
                            {/* Overlay Play/Pause on hover or active */}
                            <div className={`absolute inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {isPlayingCurrent ? (
                                    <Pause className="w-5 h-5 text-white dark:text-purple-200 fill-current" />
                                ) : (
                                    <Play className="w-5 h-5 text-white dark:text-purple-200 fill-current" />
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate transition-colors ${isCurrent ? 'text-blue-600 dark:text-purple-300' : 'text-zinc-900 dark:text-purple-100 group-hover:dark:text-white'}`}>
                                {track.title}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-purple-400/60 truncate">{track.artist}</p>
                        </div>
                        <div className="text-xs text-zinc-400 dark:text-purple-500/50 ml-4 tabular-nums">
                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                );
            })}
            
            {isLoading && (
                <div className="text-center py-4 text-zinc-500 text-sm animate-pulse">Loading more music...</div>
            )}
            
            {!isLoading && hasMore && filteredTracks.length > 0 && (
                 <button 
                    onClick={() => fetchMusic(false)}
                    className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-4"
                 >
                     Load More
                 </button>
            )}

            {!isLoading && tracks.length === 0 && (
                <div className="text-center py-20 text-zinc-500">No music found in this chat.</div>
            )}
        </div>
    </div>
  );
}
