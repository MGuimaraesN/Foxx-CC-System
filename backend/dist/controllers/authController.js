"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.login = exports.register = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../utils/auth");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const register = async (req, res) => {
    try {
        const { name, email, password } = registerSchema.parse(req.body);
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'Email already exists' });
            return;
        }
        const passwordHash = await (0, auth_1.hashPassword)(password);
        const user = await prisma_1.default.user.create({
            data: { name, email, passwordHash, avatarUrl: '' },
        });
        const token = (0, auth_1.generateToken)({ id: user.id, email: user.email });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid data or request' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const valid = await (0, auth_1.comparePassword)(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = (0, auth_1.generateToken)({ id: user.id, email: user.email });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid request' });
    }
};
exports.login = login;
const me = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const user = await prisma_1.default.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
};
exports.me = me;
