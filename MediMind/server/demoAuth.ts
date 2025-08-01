import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

// Demo authentication for development when Replit Auth is not available
export function setupDemoAuth(app: Express) {
  // Simple session setup for demo
  app.use(session({
    secret: 'demo-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // false for development
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

  // Demo login endpoint
  app.post('/api/demo-login', async (req, res) => {
    try {
      const { email, role = 'patient' } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      // Create or get demo user
      let user = await storage.getUserByEmail?.(email);
      
      if (!user) {
        const userData = {
          id: `demo_${Date.now()}`,
          email,
          firstName: email.split('@')[0],
          lastName: 'Demo',
          role,
        };
        user = await storage.upsertUser(userData);
      }

      // Set session
      (req.session as any).user = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
        }
      };

      res.json({ success: true, user });
    } catch (error) {
      console.error("Demo login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Demo logout endpoint
  app.post('/api/demo-logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Standard logout endpoint (for compatibility)
  app.get('/api/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

  // Check if user is authenticated (demo version)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const sessionUser = (req.session as any)?.user;
      
      if (!sessionUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = sessionUser.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Demo authentication middleware
export const isDemoAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const sessionUser = (req.session as any)?.user;
    
    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request for compatibility
    req.user = sessionUser;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};