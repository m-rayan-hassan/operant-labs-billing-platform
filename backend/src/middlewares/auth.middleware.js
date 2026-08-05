import { verifyAccessToken } from "../auth/token.js";

export function protect(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
        return res.status(401).json({ error: "Missing access token" });

    try {
        req.user = verifyAccessToken(header.slice(7));
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired access token" }); // client should call /auth/refresh and retry
    }
}

// usage: requireRole('CEO') or requireRole('CEO', 'HR')
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: "Unauthenticated" });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ error: "Forbidden" });
        next();
    };
}
