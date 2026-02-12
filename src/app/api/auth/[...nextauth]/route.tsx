// app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { Account, Profile, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getDb } from "@/db/client";

// Mongo driver 사용을 위해 nodejs 런타임 필수
export const runtime = "nodejs";

export const authOptions: NextAuthOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
            profile(profile) {
                let image_url = "";
                if (profile.avatar === null) {
                    const defaultAvatarNumber = parseInt(profile.discriminator) % 5;
                    image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
                } else {
                    const format = profile.avatar.startsWith("a_") ? "gif" : "png";
                    image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
                }

                return {
                    id: profile.id,
                    name: profile.global_name ?? profile.username,
                    email: profile.email,
                    image: image_url,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({
            user,
            account,
        }: {
            user: User;
            account: Account | null;
            profile?: Profile;
        }) {
            const userId = account?.providerAccountId;

            if (!userId) {
                console.error("Discord providerAccountId 없음");
                return false;
            }

            try {
                const db = await getDb();
                const usersCol = db.collection("users");

                const image =
                    (user as any).image ?? (user as any).picture ?? null;

                // 🔥 [수정 1] name 필드를 $set에서 제거하고 $setOnInsert로 이동했습니다.
                await usersCol.updateOne(
                    { id: userId },
                    {
                        $set: {
                            id: userId,
                            // name: user.name ?? null,  <-- (제거됨) 여기 있으면 매번 덮어써짐
                            email: user.email ?? null,
                            image, // 프사나 이메일은 디스코드 따라가는 게 보통 맞음
                            updatedAt: new Date(),
                        },
                        $setOnInsert: {
                            name: user.name ?? null, // 👈 (이동됨) 처음 가입할 때만 디스코드 이름 사용
                            createdAt: new Date(),
                        },
                    },
                    { upsert: true }
                );

                console.log("User logged in:", userId);
                return true;
            } catch (error) {
                console.error("Failed to save user to MongoDB", error);
                return false;
            }
        },

        async jwt({ token, account, trigger, session }) {
            // 1. 로그인 직후 (account 객체가 존재함)
            if (account?.providerAccountId) {
                token.sub = account.providerAccountId;

                // 🔥 [수정 2] 로그인 시, Discord 이름 대신 DB에 있는 '진짜 닉네임'을 가져와야 합니다.
                try {
                    const db = await getDb();
                    const storedUser = await db.collection("users").findOne({ id: account.providerAccountId });

                    if (storedUser && storedUser.name) {
                        token.name = storedUser.name; // DB 닉네임으로 토큰 덮어쓰기
                    }
                } catch (e) {
                    console.error("DB 닉네임 불러오기 실패", e);
                }
            }

            // 2. 클라이언트에서 닉네임 변경 시 (update 호출)
            if (trigger === "update" && session?.name) {
                token.name = session.name;
            }

            return token;
        },

        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user && token.sub) {
                (session.user as any).id = token.sub;
            }
            // token.name은 위 jwt 함수에서 DB 값으로 잘 세팅되었으므로 그대로 씁니다.
            if (token.name) {
                session.user.name = token.name;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };