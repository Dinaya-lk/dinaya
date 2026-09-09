import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { authConfig } from "@/auth.config";
import { grantDeveloperFullAccess } from "@/lib/developer-access";
import { normalizeEmail } from "@/lib/developer-access-emails";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        impersonationToken: { label: "Impersonation token", type: "text" },
      },
      async authorize(credentials) {
        try {
        const impersonationToken = credentials?.impersonationToken as string | undefined;
        if (impersonationToken) {
          const { verifyImpersonationToken } = await import("@/lib/impersonation");
          const payload = verifyImpersonationToken(impersonationToken);
          if (!payload) return null;

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payload.userId))
            .limit(1);
          if (!user) return null;

          const [business] = await db
            .select({
              isSuspended: businesses.isSuspended,
              deletedAt: businesses.deletedAt,
            })
            .from(businesses)
            .where(eq(businesses.id, user.businessId))
            .limit(1);
          if (!business || business.isSuspended || business.deletedAt) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            businessId: user.businessId,
            role: user.role,
            impersonatedBy: payload.adminEmail,
            readOnlyImpersonation: true,
          };
        }

        if (!credentials?.email || !credentials?.password) return null;

        const email = normalizeEmail(String(credentials.email));
        const [user] = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1);

        if (!user) return null;

        const [business] = await db
          .select({
            isSuspended: businesses.isSuspended,
            deletedAt: businesses.deletedAt,
          })
          .from(businesses)
          .where(eq(businesses.id, user.businessId))
          .limit(1);

        if (!business || business.isSuspended || business.deletedAt) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        await grantDeveloperFullAccess({
          businessId: user.businessId,
          email: user.email,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          businessId: user.businessId,
          role: user.role,
        };
        } catch (err) {
          console.error("[authorize] unexpected error", err);
          return null;
        }
      },
    }),
  ],
});
