import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Global Soft Delete Middleware
prisma.$use(async (params, next) => {
  if (params.model === 'Transaction') {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where['deletedAt'] = null;
    }
    if (params.action === 'findMany') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args.where = { deletedAt: null };
      }
    }
  }
  return next(params);
});

export default prisma;
