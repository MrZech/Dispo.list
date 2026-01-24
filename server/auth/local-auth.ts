import bcrypt from "bcryptjs";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db } from "../db";
import { users, sessions, type User, type SafeUser } from "@shared/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
    user: SafeUser;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  if (!sessionSecret) {
    console.warn("SESSION_SECRET is not set; using an insecure default for development.");
  }
  
  return session({
    secret: sessionSecret || "disposlist-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupLocalAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}

// Get user by ID
export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

// Get all users (for admin)
export async function getAllUsers(): Promise<SafeUser[]> {
  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    isActive: users.isActive,
    profileImageUrl: users.profileImageUrl,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users);
  return allUsers;
}

// Create user
export async function createUser(data: {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}): Promise<SafeUser> {
  const passwordHash = await hashPassword(data.password);
  const [user] = await db.insert(users).values({
    username: data.username,
    passwordHash,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role || "user",
  }).returning();
  
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

// Update user
export async function updateUser(id: string, data: {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
}): Promise<SafeUser | undefined> {
  const updates: any = {
    updatedAt: new Date(),
  };
  
  if (data.username) updates.username = data.username;
  if (data.email !== undefined) updates.email = data.email;
  if (data.firstName !== undefined) updates.firstName = data.firstName;
  if (data.lastName !== undefined) updates.lastName = data.lastName;
  if (data.role) updates.role = data.role;
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.password) updates.passwordHash = await hashPassword(data.password);
  
  const [user] = await db.update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();
  
  if (!user) return undefined;
  
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

// Delete user
export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

// Ensure default admin exists
export async function ensureDefaultAdmin(): Promise<void> {
  const existingAdmin = await getUserByUsername("admin");
  if (!existingAdmin) {
    console.log("Creating default admin user (username: admin, password: admin123)");
    await createUser({
      username: "admin",
      password: "admin123",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });
    console.log("Default admin created. Please change the password after first login!");
  }
}

// Strip password from user object
export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

// Middleware: Check if authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session?.userId && req.session?.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Middleware: Check if admin
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.session?.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Admin access required" });
};
