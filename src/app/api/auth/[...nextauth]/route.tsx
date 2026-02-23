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

                await usersCol.updateOne(
                    { id: userId },
                    {
                        $set: {
                            id: userId,
                            email: user.email ?? null,
                            image,
                            updatedAt: new Date(),
                        },
                        $setOnInsert: {
                            name: user.name ?? null,
                            createdAt: new Date(),
                            canOthersEdit: true, // 🔥 [추가] 신규 가입 시 기본값 true
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
            // 1. 로그인 직후
            if (account?.providerAccountId) {
                token.sub = account.providerAccountId;

                try {
                    const db = await getDb();
                    const storedUser = await db.collection("users").findOne({ id: account.providerAccountId });

                    if (storedUser) {
                        if (storedUser.name) {
                            token.name = storedUser.name;
                        }
                        // 🔥 [추가] DB에 저장된 권한 값을 토큰에 동기화
                        if (storedUser.canOthersEdit !== undefined) {
                            token.canOthersEdit = storedUser.canOthersEdit;
                        }
                    }
                } catch (e) {
                    console.error("DB 정보 불러오기 실패", e);
                }
            }

            // 2. 클라이언트에서 update() 호출 시 세션 갱신
            if (trigger === "update") {
                if (session?.name) token.name = session.name;
                // 🔥 [추가] 클라이언트에서 권한 토글 시 토큰 갱신
                if (session?.canOthersEdit !== undefined) token.canOthersEdit = session.canOthersEdit;
            }

            return token;
        },

        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user && token.sub) {
                (session.user as any).id = token.sub;
            }
            if (token.name) {
                session.user.name = token.name;
            }
            // 🔥 [추가] 토큰에 있는 권한 값을 세션 객체에 넘겨줌 (클라이언트에서 사용 가능)
            if (token.canOthersEdit !== undefined) {
                (session.user as any).canOthersEdit = token.canOthersEdit;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };