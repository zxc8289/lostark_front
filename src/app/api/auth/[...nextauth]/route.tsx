// app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { Account, Profile, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { getDb } from "@/db/client";

// Mongo driver는 Edge에서 안 돌아가서 nodejs 런타임 고정하는 게 안전함
export const runtime = "nodejs";

export const authOptions: NextAuthOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
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

                // SQLite의 INSERT ... ON CONFLICT(id) DO UPDATE 와 동일한 동작
                await usersCol.updateOne(
                    { id: userId }, // 조건: id가 같은 사용자
                    {
                        $set: {
                            id: userId,
                            name: user.name ?? null,
                            email: user.email ?? null,
                            image,
                            updatedAt: new Date(),
                        },
                        $setOnInsert: {
                            createdAt: new Date(),
                        },
                    },
                    { upsert: true } // 없으면 insert, 있으면 update
                );

                console.log("User upsert to MongoDB:", user.name, userId);
                return true;
            } catch (error) {
                console.error("Failed to save user to MongoDB", error);
                return false;
            }
        },

        async jwt({ token, account }) {
            if (account?.providerAccountId) {
                token.sub = account.providerAccountId;
            }
            return token;
        },

        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user && token.sub) {
                (session.user as any).id = token.sub;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
