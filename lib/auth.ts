import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ipHash, rateLimit } from "@/lib/security";

export type StaffRole = "owner" | "admin" | "moderator" | "editor";
const roles: readonly string[] = ["owner", "admin", "moderator", "editor"];
export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        const parsed = z
          .object({ email: z.email(), password: z.string().min(1).max(200) })
          .safeParse(credentials);
        if (!parsed.success) return null;
        try {
          await rateLimit(`login:${ipHash(request.headers)}`, 15, 900);
        } catch {
          return null;
        }
        const user = await db.foreverUser.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        // A fixed dummy hash keeps unknown accounts on the password-check path.
        const valid = await compare(
          parsed.data.password,
          user?.passwordHash ||
            "$2b$12$zDHZH.EBdGeQBDyD1Flj0OS.JpsDOZ1EIDo1GhPBNaMoMDmbmx1lK",
        );
        if (!user?.active || !valid || !roles.includes(user.role)) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          version: user.updatedAt.toISOString(),
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.userVersion = user.version;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.version =
          typeof token.userVersion === "string" ? token.userVersion : undefined;
      }
      return session;
    },
  },
});

export async function getStaff(): Promise<Staff | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.foreverUser.findUnique({
    where: { id: session.user.id },
  });
  if (
    !user?.active ||
    !roles.includes(user.role) ||
    session.user.version !== user.updatedAt.toISOString()
  )
    return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as StaffRole,
  };
}

export async function requireStaff(
  allowed: readonly StaffRole[] = ["owner", "admin", "moderator", "editor"],
): Promise<Staff> {
  const user = await getStaff();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  if (!allowed.includes(user.role))
    throw new HttpError(403, "Your role does not have access to this action.");
  return user;
}
