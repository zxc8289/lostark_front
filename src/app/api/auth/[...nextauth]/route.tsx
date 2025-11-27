// app/api/auth/[...nextauth]/route.ts (일부만)

import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { Account, Profile, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { db } from "@/db/client";

// ✅ REPLACE 대신 UPSERT용 쿼리 준비
const upsertUserStmt = db.prepare(`
  INSERT INTO users (id, name, email, image)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name  = excluded.name,
    email = excluded.email,
    image = excluded.image
`);

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
                // ✅ 여기서 REPLACE 말고 upsert 사용
                upsertUserStmt.run(
                    userId,
                    user.name ?? null,
                    user.email ?? null,
                    (user as any).image ?? (user as any).picture ?? null
                );

                console.log("User upsert to DB:", user.name, userId);
                return true;
            } catch (error) {
                console.error("Failed to save user to DB", error);
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
