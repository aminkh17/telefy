"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTelegram } from "../contexts/TelegramProvider";
import { usePlayer, Track } from "../contexts/PlayerContext";
import { useChat } from "../contexts/ChatProvider";
import { Api } from "telegram";
import { Play, Pause, Search, ArrowLeft } from "lucide-react";
import bigInt from "big-integer";

export default function ChatMusicView() {
  const { client } = useTelegram();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { selectedChatId, selectChat, selectedChatTitle } = useChat();
  
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
                         
                         newTracks.push({
                             id: msg.id.toString(),
                             title: title || filename,
                             artist,
                             duration,
                             url: "", // No pre-downloaded URL
                             mimeType: msg.media.document.mimeType || "audio/mpeg",
                             _message: msg, 
                         });
                     }
                 }
            }
        }
        
        setTracks(prev => reset ? newTracks : [...prev, ...newTracks]);
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
    <div className="w-full max-w-4xl mx-auto p-4 pb-32">
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={() => selectChat(null)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 overflow-hidden">
                <h1 className="text-xl font-bold truncate">{selectedChatTitle || "Chat Music"}</h1>
                <p className="text-sm text-zinc-500">{tracks.length} tracks found</p>
            </div>
        </div>

        <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
                type="text" 
                placeholder="Search tracks or artists..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors group
                            ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'}
                        `}
                    >
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mr-4 shrink-0">
                            {isPlayingCurrent ? (
                                <Pause className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-current" />
                            ) : (
                                <Play className="w-4 h-4 text-zinc-500 group-hover:text-blue-600 dark:text-zinc-400 ml-0.5 fill-current" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                {track.title}
                            </h3>
                            <p className="text-sm text-zinc-500 truncate">{track.artist}</p>
                        </div>
                        <div className="text-xs text-zinc-400 ml-4 tabular-nums">
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
