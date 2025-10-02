import NextAuth, { NextAuthOptions, Account, Profile, User, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import DiscordProvider from "next-auth/providers/discord";
import Database from 'better-sqlite3';

const db = new Database('users.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    image TEXT
  )
`);

export const authOptions: NextAuthOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }: { user: User, account: Account | null, profile?: Profile }) {



            try {
                const stmt = db.prepare('REPLACE INTO users (id, name, email, image) VALUES (?, ?, ?, ?)');
                stmt.run(user.id, user.name, user.email, user.image);
                console.log('User saved to DB:', user.name);
            } catch (error) {
                console.error('Failed to save user to DB', error);
                return false;
            }

            console.log('Skipping DB save, proceeding with login for user:', user.name);
            return true;
        },

        async session({ session, token }: { session: Session, token: JWT }) {
            if (session.user) {
                session.user.id = token.sub!;
            }
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };