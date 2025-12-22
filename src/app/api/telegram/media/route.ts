import { NextRequest, NextResponse } from "next/server";
import { getTelegramClient, saveClientSession } from "@/lib/telegram-client";
import { Api } from "telegram";
import bigInt from "big-integer";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const accessHash = searchParams.get("accessHash");
    const type = searchParams.get("type");

    if (!id || !type) {
        return new NextResponse("Missing id or type", { status: 400 });
    }

    let client;
    try {
        client = await getTelegramClient();

                        const cleanId = (type === 'channel' && id.startsWith('-100')) 
                            ? id.substring(4) 
                            : id;
                        const peerId = bigInt(cleanId);
                        const hash = accessHash ? bigInt(accessHash) : bigInt(0);
                
                        let entity;
                        if (type === 'user') {
                            const inputUser = new Api.InputUser({ userId: peerId, accessHash: hash });
                            const result = await client.invoke(new Api.users.GetUsers({ id: [inputUser] }));
                            entity = result[0];
                        } else if (type === 'channel') {
                            const inputChannel = new Api.InputChannel({ channelId: peerId, accessHash: hash });
                            const result = await client.invoke(new Api.channels.GetChannels({ id: [inputChannel] }));
                            entity = result.chats[0];
                        } else {
                            const inputPeer = new Api.InputPeerChat({ chatId: peerId });
                            entity = await client.getEntity(inputPeer);
                        }                
                if (!entity) {            return new NextResponse("Entity not found", { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyEntity = entity as any;
        if (!anyEntity.photo || anyEntity.photo.className === 'UserProfilePhotoEmpty' || anyEntity.photo.className === 'ChatPhotoEmpty') {
            return new NextResponse("No photo", { status: 404 });
        }

        // Download profile photo
        // @ts-ignore - gramjs types can be strict about Entity vs InputPeer but it usually works
        const buffer = await client.downloadProfilePhoto(entity, { isBig: false });

        await saveClientSession(client);

        if (!buffer || buffer.length === 0) {
            // Return a default transparent pixel or 404
            return new NextResponse("Not found", { status: 404 });
        }

        return new NextResponse(new Uint8Array(buffer as any), {
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=3600"
            }
        });

    } catch (e: any) {
        console.error("Media download error", e);
        return new NextResponse("Error downloading media", { status: 500 });
    }
}
