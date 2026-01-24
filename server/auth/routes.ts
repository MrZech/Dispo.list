import type { Express } from "express";
import { loginSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import {
  getUserByUsername,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  toSafeUser,
  isAuthenticated,
  isAdmin,
} from "./local-auth";
import { logAudit } from "../lib/audit";

export function registerLocalAuthRoutes(app: Express) {
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }
      
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      const safeUser = toSafeUser(user);
      req.session.userId = user.id;
      req.session.user = safeUser;

      await logAudit({
        actorId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
      });
      
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const actorId = req.session?.userId;
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
      if (actorId) {
        logAudit({
          actorId,
          action: "auth.logout",
          entityType: "user",
          entityId: actorId,
        }).catch(() => undefined);
      }
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.session?.user) {
      res.json({ user: req.session.user });
    } else {
      res.json({ user: null });
    }
  });

  // Change password (for logged-in user)
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const user = await getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      await updateUser(user.id, { password: newPassword });
      await logAudit({
        actorId: req.session.userId,
        action: "user.password_change",
        entityType: "user",
        entityId: user.id,
      });
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // === ADMIN USER MANAGEMENT ===

  // List all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await getAllUsers();
      res.json(allUsers);
    } catch (err) {
      console.error("List users error:", err);
      res.status(500).json({ message: "Failed to list users" });
    }
  });

  // Create user (admin only)
  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existing = await getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await createUser({
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        role: data.role || "user",
      });
      await logAudit({
        actorId: req.session.userId,
        action: "user.create",
        entityType: "user",
        entityId: user.id,
        details: { username: user.username, role: user.role },
      });

      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Create user error:", err);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user (admin only)
  app.put("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const user = await updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await logAudit({
        actorId: req.session.userId,
        action: "user.update",
        entityType: "user",
        entityId: id,
        details: { fields: Object.keys(updates || {}) },
      });
      
      res.json(user);
    } catch (err) {
      console.error("Update user error:", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting yourself
      if (id === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await deleteUser(id);
      await logAudit({
        actorId: req.session.userId,
        action: "user.delete",
        entityType: "user",
        entityId: id,
      });
      res.status(204).send();
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:id/reset-password", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const user = await updateUser(id, { password: newPassword });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await logAudit({
        actorId: req.session.userId,
        action: "user.password_reset",
        entityType: "user",
        entityId: id,
      });
      
      res.json({ message: "Password reset successfully" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}
