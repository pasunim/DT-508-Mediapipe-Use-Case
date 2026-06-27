import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DUMMY_HASH = "$2a$12$WwqxeBM9rV1yh9fJ1xYK8.dQ3NKkb8VjP3qJw3Pm5sEkMaBgzXrG6";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase() ?? "";
        const password = (credentials?.password as string | undefined) ?? "";

        if (!email || !password || password.length > 128) {
          // Still run a dummy compare to prevent timing attacks
          await bcrypt.compare("dummy", DUMMY_HASH);
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, username: true, passwordHash: true },
        });

        // Always run bcrypt — prevents user enumeration via timing
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;

        return { id: user.id, email: user.email, name: user.username };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  // Rotate secret to invalidate old sessions when secret changes
  secret: process.env.NEXTAUTH_SECRET,
});
