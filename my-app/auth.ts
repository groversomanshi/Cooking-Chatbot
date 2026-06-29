import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const googleConfigured =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: pool ? PostgresAdapter(pool) : undefined,
  providers: googleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : [],
  session: {
    strategy: pool ? "database" : "jwt",
  },
  trustHost: true,
  callbacks: {
    session({ session, user, token }) {
      const id = user?.id ?? token?.sub;
      if (session.user && id) {
        (session.user as typeof session.user & { id: string }).id = String(id);
      }
      return session;
    },
  },
});
