declare module "better-auth/adapters/prisma" {
    import type { DBAdapter } from "@better-auth/core/db/adapter";
    import type { BetterAuthOptions } from "@better-auth/core";
    import type { PrismaClient } from "@prisma/client";

    export function prismaAdapter(
        prisma: any,
        config: { provider: string }
    ): (options: BetterAuthOptions) => DBAdapter<BetterAuthOptions>;
}
