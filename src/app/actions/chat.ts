"use server";

import { getTelegramClient, saveClientSession } from "@/lib/telegram-client";
import { Api } from "telegram";
import bigInt from "big-integer";

export interface ChatDialog {
    id: string;
    title: string;
    isGroup: boolean;
    isChannel: boolean;
    isUser: boolean;
    unreadCount: number;
    date: number;
    accessHash?: string;
    type: 'user' | 'channel' | 'chat';
}

export interface AudioTrack {
    id: string; // Message ID
    chatId: string;
    title: string;
    artist: string;
    duration: number;
    mimeType: string;
}

export async function fetchDialogs(limit = 50): Promise<ChatDialog[]> {
    let client;
    try {
        client = await getTelegramClient();
        const dialogs = await client.getDialogs({ limit });
        
        const results = dialogs.map(d => {
             let accessHash = "";
             let type: 'user' | 'channel' | 'chat' = 'chat';
             
             if (d.isUser) type = 'user';
             else if (d.isChannel) type = 'channel';
             
             if (d.entity) {
                 if ('accessHash' in d.entity && d.entity.accessHash) {
                     accessHash = d.entity.accessHash.toString();
                 }
             }
             
             return {
                id: d.id ? d.id.toString() : "0",
                title: d.title || "Unknown",
                isGroup: d.isGroup,
                isChannel: d.isChannel,
                isUser: d.isUser,
                unreadCount: d.unreadCount,
                date: d.date,
                accessHash: accessHash,
                type: type,
            };
        });
        
        await saveClientSession(client);
        return results;
    } catch (e: any) {
        console.error("fetchDialogs error", e);
        return [];
    }
}

export async function fetchAudioTracks(chatId: string, accessHash: string = "", type: 'user' | 'channel' | 'chat' = 'chat', offsetId = 0, limit = 50) {
    let client;
    try {
        client = await getTelegramClient();
        
        let inputPeer;
        // Fix for -100 prefix in channel IDs
        const cleanId = (type === 'channel' && chatId.toString().startsWith('-100')) 
            ? chatId.toString().substring(4) 
            : chatId;
        const peerId = bigInt(cleanId);
        const hash = accessHash ? bigInt(accessHash) : bigInt(0);
        
        if (type === 'user') {
            inputPeer = new Api.InputPeerUser({ userId: peerId, accessHash: hash });
        } else if (type === 'channel') {
            inputPeer = new Api.InputPeerChannel({ channelId: peerId, accessHash: hash });
        } else {
            inputPeer = new Api.InputPeerChat({ chatId: peerId });
        }
        
        const messages = await client.getMessages(inputPeer, {
            limit,
            offsetId,
            filter: new Api.InputMessagesFilterMusic(),
        });
        
        const tracks: AudioTrack[] = [];
        
        for (const msg of messages) {
            if (msg.media && msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
                 const attributes = msg.media.document.attributes;
                 const audioAttr = attributes.find(
                    (a): a is Api.DocumentAttributeAudio => a instanceof Api.DocumentAttributeAudio
                 );
                 
                 if (audioAttr) {
                     const title = audioAttr.title || "Unknown Title";
                     const artist = audioAttr.performer || "Unknown Artist";
                     const duration = audioAttr.duration || 0;
                     
                     tracks.push({
                         id: msg.id.toString(),
                         chatId: chatId,
                         title,
                         artist,
                         duration,
                         mimeType: msg.media.document.mimeType || "audio/mpeg"
                     });
                 }
            }
        }
        
        await saveClientSession(client);
        return {
            tracks,
            hasMore: messages.length >= limit,
            lastId: messages.length > 0 ? messages[messages.length - 1].id : 0
        };
        
    } catch (e: any) {
        console.error("fetchAudioTracks error", e);
        return { tracks: [], hasMore: false, lastId: 0 };
    }
}
