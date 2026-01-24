import { db } from "./db";
import { and, desc, eq, ilike, inArray, notInArray, or } from "drizzle-orm";
import {
  users, items, photos, exportProfiles,
  type Item, type InsertItem, type UpdateItemRequest,
  type Photo, type InsertPhoto,
  type ExportProfile, type InsertExportProfile,
  type ItemWithPhotos
} from "@shared/schema";

export interface IStorage {
  // Items
  getItems(options?: { status?: string, search?: string, limit?: number, offset?: number }): Promise<ItemWithPhotos[]>;
  getItem(id: number): Promise<ItemWithPhotos | undefined>;
  getItemBySku(sku: string): Promise<Item | undefined>;
  getItemsByIds(ids: number[]): Promise<ItemWithPhotos[]>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, updates: UpdateItemRequest): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;

  // Photos
  getPhotos(itemId: number): Promise<Photo[]>;
  addPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: number): Promise<void>;
  reorderPhotos(ids: number[]): Promise<void>;

  // Export Profiles
  getExportProfiles(): Promise<ExportProfile[]>;
  createExportProfile(profile: InsertExportProfile): Promise<ExportProfile>;
}

export class DatabaseStorage implements IStorage {
  // Items
  async getItems(options?: { status?: string, search?: string, limit?: number, offset?: number }): Promise<ItemWithPhotos[]> {
    let query = db.select().from(items);
    
    const filters = [];
    if (options?.status) {
      if (options.status === "active") {
        filters.push(notInArray(items.status, ["listed", "sold", "scrap"]));
      } else if (options.status === "archived") {
        filters.push(inArray(items.status, ["listed", "sold", "scrap"]));
      } else {
        filters.push(eq(items.status, options.status));
      }
    }
    if (options?.search) {
      const term = `%${options.search}%`;
      filters.push(or(
        ilike(items.sku, term),
        ilike(items.brand, term),
        ilike(items.model, term),
        ilike(items.category, term),
      ));
    }
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const allItems = await query.orderBy(desc(items.intakeDate));
    
    if (allItems.length === 0) return [];
    
    // Get all photos for these items in one query
    const itemIds = allItems.map(item => item.id);
    const allPhotos = await db
      .select()
      .from(photos)
      .where(inArray(photos.itemId, itemIds))
      .orderBy(photos.sortOrder);
    
    // Map photos to items
    return allItems.map(item => ({
      ...item,
      photos: allPhotos.filter(p => p.itemId === item.id)
    }));
  }

  async getItem(id: number): Promise<ItemWithPhotos | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    if (!item) return undefined;

    const itemPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.itemId, id))
      .orderBy(photos.sortOrder);

    return { ...item, photos: itemPhotos };
  }

  async getItemBySku(sku: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.sku, sku));
    return item;
  }

  async getItemsByIds(ids: number[]): Promise<ItemWithPhotos[]> {
    if (ids.length === 0) return [];
    
    const foundItems = await db.select().from(items).where(inArray(items.id, ids));
    
    // Get all photos for these items
    const allPhotos = await db
      .select()
      .from(photos)
      .where(inArray(photos.itemId, ids))
      .orderBy(photos.sortOrder);

    // Map photos to items
    return foundItems.map(item => ({
      ...item,
      photos: allPhotos.filter(p => p.itemId === item.id)
    }));
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem).returning();
    return item;
  }

  async updateItem(id: number, updates: UpdateItemRequest): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(photos).where(eq(photos.itemId, id)); // Cascade delete photos manually if needed, or rely on DB cascade
    await db.delete(items).where(eq(items.id, id));
  }

  // Photos
  async getPhotos(itemId: number): Promise<Photo[]> {
    return await db
      .select()
      .from(photos)
      .where(eq(photos.itemId, itemId))
      .orderBy(photos.sortOrder);
  }

  async addPhoto(photo: InsertPhoto): Promise<Photo> {
    const [newPhoto] = await db.insert(photos).values(photo).returning();
    return newPhoto;
  }

  async deletePhoto(id: number): Promise<void> {
    await db.delete(photos).where(eq(photos.id, id));
  }

  async reorderPhotos(ids: number[]): Promise<void> {
    // This is not efficient for large sets, but fine for item photos (usually < 12)
    for (let i = 0; i < ids.length; i++) {
      await db
        .update(photos)
        .set({ sortOrder: i })
        .where(eq(photos.id, ids[i]));
    }
  }

  // Export Profiles
  async getExportProfiles(): Promise<ExportProfile[]> {
    return await db.select().from(exportProfiles).orderBy(desc(exportProfiles.createdAt));
  }

  async createExportProfile(profile: InsertExportProfile): Promise<ExportProfile> {
    const [newProfile] = await db.insert(exportProfiles).values(profile).returning();
    return newProfile;
  }
}

export const storage = new DatabaseStorage();
