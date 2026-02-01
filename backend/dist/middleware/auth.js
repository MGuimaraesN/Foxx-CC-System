"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    const token = header.split(' ')[1];
    try {
        const payload = (0, auth_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
