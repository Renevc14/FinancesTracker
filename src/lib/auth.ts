import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const expectedUser = (process.env.AUTH_USERNAME ?? "rene").trim();
        const expectedPass = (process.env.AUTH_PASSWORD ?? "patrimonio2026").trim();

        if (
          parsed.data.username === expectedUser &&
          parsed.data.password === expectedPass
        ) {
          return {
            id: "owner",
            name: expectedUser,
            email: `${expectedUser}@local`,
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});
