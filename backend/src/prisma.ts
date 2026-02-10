import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

// In Prisma 7, the adapter takes configuration object, not an instance?
// Based on d.ts: constructor(config: BetterSQLite3InputParams)
// BetterSQLite3InputParams = Options & { url: ... }
const adapter = new PrismaBetterSqlite3({
  url: dbPath
});

const prismaClient = new PrismaClient({ adapter });

const prisma = prismaClient.$extends({
  query: {
    transaction: {
      async findUnique({ args, query }) {
        const { where, ...rest } = args;
        return prismaClient.transaction.findFirst({
          where: { ...where, deletedAt: null },
          ...rest,
        });
      },
      async findFirst({ args, query }) {
        const { where, ...rest } = args;
        const newWhere = where ? { ...where, deletedAt: null } : { deletedAt: null };
        return query({ where: newWhere, ...rest });
      },
      async findMany({ args, query }) {
        const { where, ...rest } = args;
        const newWhere = where ? { ...where, deletedAt: null } : { deletedAt: null };
        return query({ where: newWhere, ...rest });
      },
    },
  },
});

export default prisma;
