import { NextRequest, NextResponse } from "next/server";
import { getTelegramClient, saveClientSession } from "@/lib/telegram-client";
import { Api } from "telegram";
import bigInt from "big-integer";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get("chatId");
    const messageId = searchParams.get("messageId");
    const accessHash = searchParams.get("accessHash");
    const chatType = searchParams.get("chatType");
    
    if (!chatId || !messageId) return new NextResponse("Missing params", { status: 400 });

    let client;
    try {
        client = await getTelegramClient();
        
        let inputPeer;
        const cleanId = (chatType === 'channel' && chatId.startsWith('-100')) 
            ? chatId.substring(4) 
            : chatId;
        const peerId = bigInt(cleanId);
        const hash = accessHash ? bigInt(accessHash) : bigInt(0);
        
        if (chatType === 'user') {
            inputPeer = new Api.InputPeerUser({ userId: peerId, accessHash: hash });
        } else if (chatType === 'channel') {
            inputPeer = new Api.InputPeerChannel({ channelId: peerId, accessHash: hash });
        } else {
            inputPeer = new Api.InputPeerChat({ chatId: peerId });
        }

        const msgs = await client.getMessages(inputPeer, { ids: [Number(messageId)] });
        if (!msgs || msgs.length === 0) {
             return new NextResponse("Not found", { status: 404 });
        }
        
        const msg = msgs[0];
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buffer = await client.downloadMedia(msg, { thumb: 0 }); 
        
        await saveClientSession(client);
        
        if (!buffer || buffer.length === 0) return new NextResponse("No image", { status: 404 });
        
        return new NextResponse(new Uint8Array(buffer as any), {
            headers: { 
                "Content-Type": "image/jpeg", 
                "Cache-Control": "public, max-age=3600" 
            }
        });
    } catch (e) {
        console.error("Thumbnail error", e);
        return new NextResponse("Error", { status: 500 });
    }
}
