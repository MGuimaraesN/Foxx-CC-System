import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, avatarUrl: '' },
    });

    const token = generateToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid data or request' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid request' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
};
