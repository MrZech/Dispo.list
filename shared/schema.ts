import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth Models
export * from "./models/auth";
import { users } from "./models/auth";

// === TABLE DEFINITIONS ===

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  status: text("status").notNull().default("intake"), // intake, processing, drafted, review, ready, listed, sold, scrap
  
  // Intake Fields
  intakeDate: timestamp("intake_date").defaultNow(),
  source: text("source"),
  sourceLocation: text("source_location"),
  dropoffType: text("dropoff_type"), // dropoff, pickup, shipment
  category: text("category"), // Laptop, Desktop, Monitor, etc.
  powerTest: boolean("power_test"),
  intakeNotes: text("intake_notes"),
  
  // Test & Spec Fields
  brand: text("brand"),
  model: text("model"),
  cpu: text("cpu"),
  ram: text("ram"),
  storageType: text("storage_type"), // SSD, HDD
  storageSize: text("storage_size"),
  batteryHealth: text("battery_health"),
  chargerIncluded: text("charger_included"), // Yes, No, Unknown
  benchTested: boolean("bench_tested"),
  testTool: text("test_tool"),
  magicOctopusRun: boolean("magic_octopus_run").default(false),
  benchNotes: text("bench_notes"),
  testNotes: text("test_notes"), 
  dataDestruction: boolean("data_destruction"),
  
  // eBay Listing Fields
  ebayCategoryId: text("ebay_category_id"),
  ebayConditionId: text("ebay_condition_id"),
  listingFormat: text("listing_format"), // FixedPrice, Auction
  listPrice: decimal("list_price"),
  researchPrice: decimal("research_price"),
  quantity: integer("quantity").default(1),
  upc: text("upc"),
  storageLocation: text("storage_location"),
  listingTitle: text("listing_title"),
  listingDescription: text("listing_description"),
  sourceVendor: text("source_vendor"),

  // Chain of Custody
  intakeConfirmedBy: text("intake_confirmed_by").references(() => users.id),
  processingConfirmedBy: text("processing_confirmed_by").references(() => users.id),
  listingConfirmedBy: text("listing_confirmed_by").references(() => users.id),
  reviewConfirmedBy: text("review_confirmed_by").references(() => users.id),

  // Workflow Flags
  isDrafted: boolean("is_drafted").default(false),
  isReviewed: boolean("is_reviewed").default(false),
  isTemplateDrafted: boolean("is_template_drafted").default(false),
  isSecondReviewCompleted: boolean("is_second_review_completed").default(false),
  
  // Metadata
  createdBy: text("created_by").references(() => users.id),
  reviewerId: text("reviewer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => items.id).notNull(),
  type: text("type").notNull(), // intake, listing
  url: text("url").notNull(),
  storageKey: text("storage_key"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exportProfiles = pgTable("export_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  mappings: jsonb("mappings").notNull(), // Map internal fields to CSV headers
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const itemsRelations = relations(items, ({ one, many }) => ({
  photos: many(photos),
  creator: one(users, {
    fields: [items.createdBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [items.reviewerId],
    references: [users.id],
  }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  item: one(items, {
    fields: [photos.itemId],
    references: [items.id],
  }),
}));

// === SCHEMAS ===

export const insertItemSchema = createInsertSchema(items).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertPhotoSchema = createInsertSchema(photos).omit({ 
  id: true, 
  createdAt: true 
});

export const insertExportProfileSchema = createInsertSchema(exportProfiles).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT API TYPES ===

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type ExportProfile = typeof exportProfiles.$inferSelect;
export type InsertExportProfile = z.infer<typeof insertExportProfileSchema>;

export type CreateItemRequest = InsertItem;
export type UpdateItemRequest = Partial<InsertItem>;
export type CreatePhotoRequest = InsertPhoto;

// Complex types
export type ItemWithPhotos = Item & { photos: Photo[] };
