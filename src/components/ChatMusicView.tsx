"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTelegram } from "../contexts/TelegramProvider";
import { usePlayer } from "../contexts/PlayerContext";
import { useChat } from "../contexts/ChatProvider";
import { Play, Pause, Search, ArrowLeft, Music } from "lucide-react";
import { DynamicRipple } from "./ui/DynamicRipple";
import { fetchAudioTracks, AudioTrack } from "@/app/actions/chat";

// Extend AudioTrack to include UI-specific fields if needed, or just use it directly
interface Track extends AudioTrack {
    url?: string;
    imageUrl?: string;
}

export default function ChatMusicView() {
    const { playTrack, currentTrack, isPlaying } = usePlayer();
    const { selectChat, selectedChat } = useChat();

    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [hasMore, setHasMore] = useState(true);

    const loadingRef = useRef(false);
    const offsetIdRef = useRef<number>(0);

    const filteredTracks = tracks.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fetchMusic = useCallback(async (reset = false) => {
        if (!selectedChat || loadingRef.current) return;
        if (!reset && !hasMore) return;

        loadingRef.current = true;
        setIsLoading(true);

        if (reset) {
            setTracks([]);
            offsetIdRef.current = 0;
            setHasMore(true);
        }

        try {
            const result = await fetchAudioTracks(
                selectedChat.id, 
                selectedChat.accessHash, 
                selectedChat.type, 
                offsetIdRef.current, 
                50
            );

            if (result.tracks.length === 0) {
                setHasMore(false);
            } else {
                offsetIdRef.current = result.lastId;
            }

            const newTracks: Track[] = result.tracks.map(t => ({
                ...t,
                // Construct URLs for streaming and thumbnail
                url: `/api/telegram/stream?chatId=${t.chatId}&messageId=${t.id}&accessHash=${selectedChat.accessHash}&chatType=${selectedChat.type}`,
                imageUrl: `/api/telegram/thumbnail?chatId=${t.chatId}&messageId=${t.id}&accessHash=${selectedChat.accessHash}&chatType=${selectedChat.type}`
            }));

            setTracks(prev => reset ? newTracks : [...prev, ...newTracks]);
            setHasMore(result.hasMore);

        } catch (e) {
            console.error("Failed to fetch music from chat", e);
            setHasMore(false);
        } finally {
            setIsLoading(false);
            loadingRef.current = false;
        }
    }, [selectedChat, hasMore]);

    useEffect(() => {
        if (selectedChat) {
            fetchMusic(true);
        }
    }, [selectedChat, fetchMusic]);

    const handlePlay = (track: Track) => {
        playTrack(track, filteredTracks);
    };

    const SelectedTrack: React.FC<React.PropsWithChildren<{ isCurrent: boolean }>> = ({ isCurrent, children }) => {
        return (
            <>
                {isCurrent ? (
                    <DynamicRipple
                        theme="purple"
                        intensity={4}
                        speed={2}
                        className="border border-purple-200 dark:border-purple-800"
                    >
                        {children}
                    </DynamicRipple>

                ) : (<div>
                    {children}
                </div>)}
            </>
        );
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
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-purple-900/30 flex items-center justify-center overflow-hidden shrink-0 border border-transparent dark:border-purple-500/20">
                        {selectedChat?.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={selectedChat.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Music className="w-5 h-5 text-zinc-500 dark:text-purple-400" />
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <h1 className="text-xl font-bold truncate dark:text-purple-50 dark:drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">{selectedChat?.title || "Chat Music"}</h1>
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
                        <SelectedTrack key={track.id} isCurrent={isCurrent}>
                            <div
                                key={track.id}
                                onClick={() => handlePlay(track)}
                                className={`flex items-center p-3 rounded-lg cursor-pointer transition-all group border border-transparent
                            ${isCurrent ? 'bg-blue-50 dark:bg-purple-900/40 dark:border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]' : 'hover:bg-zinc-50 dark:hover:bg-purple-900/20 dark:hover:border-purple-500/10'}
                        `}
                            >
                                <div className="w-12 h-12 rounded-md bg-zinc-200 dark:bg-purple-900/30 flex items-center justify-center mr-4 shrink-0 overflow-hidden relative">
                                    {/* Use img for thumbnail, with fallback */}
                                    <img 
                                        src={track.imageUrl} 
                                        alt="" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                             (e.target as HTMLImageElement).style.display = 'none';
                                             (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    {/* Fallback Icon (hidden by default unless img fails) */}
                                    <div className="hidden absolute inset-0 flex items-center justify-center bg-zinc-200 dark:bg-purple-900/30">
                                         <Music className="w-5 h-5 text-zinc-400 dark:text-purple-500/50" />
                                    </div>

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
                        </SelectedTrack>
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