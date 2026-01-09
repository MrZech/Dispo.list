import { stringify } from 'csv-stringify/sync';
import type { ItemWithPhotos, ExportProfile } from "@shared/schema";

interface Mapping {
  csvHeader: string;
  type: 'field' | 'static';
  value: string;
}

export function generateCSV(items: ItemWithPhotos[], profile: ExportProfile): string {
  // Parse mappings from the profile
  // The profile.mappings is JSONB, so we cast it
  const mappings = profile.mappings as unknown as Mapping[];

  if (!Array.isArray(mappings)) {
    throw new Error("Invalid mappings in export profile");
  }

  // Prepare records
  const records = items.map(item => {
    const row: Record<string, string | number | null> = {};

    for (const mapping of mappings) {
      if (mapping.type === 'static') {
        row[mapping.csvHeader] = mapping.value;
      } else if (mapping.type === 'field') {
        // Handle special cases or complex fields here
        if (mapping.value === 'photos') {
          // Join photo URLs with pipe | (eBay standard)
          row[mapping.csvHeader] = item.photos.map(p => p.url).join('|');
        } else {
          // Direct field access
          // Use type assertion to access arbitrary properties
          const val = (item as any)[mapping.value];
          row[mapping.csvHeader] = val !== undefined && val !== null ? String(val) : '';
        }
      }
    }
    return row;
  });

  // Generate CSV
  // columns option ensures the order matches the profile mappings
  const columns = mappings.map(m => m.csvHeader);
  
  return stringify(records, {
    header: true,
    columns: columns
  });
}
