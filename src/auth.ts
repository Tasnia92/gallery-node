import { NextFunction, Request, Response } from 'express';

// Tiny auth helper — stores the signed-in user on the session.
// Call requireLogin() on any protected route.

export interface SessionUser {
  id: number;
  name: string;
  email: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

export function currentUser(req: Request): SessionUser | null {
  return req.session.user ?? null;
}

export function requireLogin(req: Request, res: Response, next: NextFunction): void {
  const user = currentUser(req);
  if (!user) {
    res.redirect('/login');
    return;
  }
  next();
}

// For the login/register pages: bounce signed-in users to the gallery.
export function redirectIfAuthed(req: Request, res: Response, next: NextFunction): void {
  if (currentUser(req)) {
    res.redirect('/');
    return;
  }
  next();
}
