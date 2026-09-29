import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    version?: string;
  }
  interface Session {
    user: DefaultSession["user"] & { id: string; version?: string };
  }
}
