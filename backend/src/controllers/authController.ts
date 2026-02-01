import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
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

const settingsSchema = z.object({
  currency: z.string().optional(),
  language: z.string().optional(),
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
    const refreshToken = uuidv4();

    const user = await prisma.user.create({
      data: { name, email, passwordHash, avatarUrl: '', refreshToken },
    });

    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        currency: user.currency,
        language: user.language
      }
    });
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

    const refreshToken = uuidv4();
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
    });

    const token = generateToken({ id: user.id, email: user.email });
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        currency: user.currency,
        language: user.language
      }
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid request' });
  }
};

export const refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    try {
        const user = await prisma.user.findFirst({ where: { refreshToken } });
        if (!user) return res.status(403).json({ error: 'Invalid refresh token' });

        const token = generateToken({ id: user.id, email: user.email });
        // Optionally rotate refresh token here
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Failed to refresh token' });
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
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    currency: user.currency,
    language: user.language
  });
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { currency, language } = settingsSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(currency && { currency }),
        ...(language && { language }),
      },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      currency: user.currency,
      language: user.language,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid data or request' });
  }
};
