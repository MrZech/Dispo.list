import { stringify } from 'csv-stringify/sync';
import type { ItemWithPhotos } from "@shared/schema";

export function generateEbayDraftCSV(items: ItemWithPhotos[]): string {
  const infoRows = [
    ['#INFO', 'Version=0.0.2', 'Template= eBay-draft-listings-template_US', '', '', '', '', '', '', '', ''],
    ['#INFO', 'Action and Category ID are required fields. 1) Set Action to Draft 2) Please find the category ID for your listings here: https://pages.ebay.com/sellerinformation/news/categorychanges.html', '', '', '', '', '', '', '', '', ''],
    ['#INFO', "After you've successfully uploaded your draft from the Seller Hub Reports tab, complete your drafts to active listings here: https://www.ebay.com/sh/lst/drafts", '', '', '', '', '', '', '', '', ''],
    ['#INFO', '', '', '', '', '', '', '', '', '', ''],
  ];

  const header = [
    'Action(SiteID=US|Country=US|Currency=USD|Version=1193|CC=UTF-8)',
    'Custom label (SKU)',
    'Category ID',
    'Title',
    'UPC',
    'Price',
    'Quantity',
    'Item photo URL',
    'Condition ID',
    'Description',
    'Format'
  ];

  const dataRows = items.map(item => {
    const photoUrls = (item.photos || []).map(p => p.url).join('|');
    
    const title = item.listingTitle || buildListingTitle(item);
    const description = item.listingDescription || buildListingDescription(item);
    
    return [
      'Draft',
      item.sku || '',
      item.ebayCategoryId || '',
      title,
      item.upc || '',
      item.listPrice ? String(item.listPrice) : '',
      item.quantity ? String(item.quantity) : '1',
      photoUrls,
      item.ebayConditionId || '3000',
      description,
      item.listingFormat || 'FixedPrice'
    ];
  });

  const allRows = [
    ...infoRows,
    header,
    ...dataRows
  ];

  return stringify(allRows, {
    quoted: false,
    quoted_string: true,
  });
}

function buildListingTitle(item: ItemWithPhotos): string {
  const parts: string[] = [];
  
  if (item.brand) parts.push(item.brand);
  if (item.model) parts.push(item.model);
  
  if (item.cpu) parts.push(item.cpu);
  if (item.ram) parts.push(item.ram);
  if (item.storageSize && item.storageType) {
    parts.push(`${item.storageSize} ${item.storageType}`);
  } else if (item.storageSize) {
    parts.push(item.storageSize);
  }
  
  if (parts.length === 0) {
    parts.push(item.sku || 'Item');
  }
  
  return parts.join(' ').substring(0, 80);
}

function buildListingDescription(item: ItemWithPhotos): string {
  const lines: string[] = [];
  
  if (item.brand || item.model) {
    lines.push(`<h3>${item.brand || ''} ${item.model || ''}</h3>`);
  }
  
  lines.push('<p><strong>Specifications:</strong></p>');
  lines.push('<ul>');
  
  if (item.cpu) lines.push(`<li>CPU: ${item.cpu}</li>`);
  if (item.ram) lines.push(`<li>RAM: ${item.ram}</li>`);
  if (item.storageType || item.storageSize) {
    lines.push(`<li>Storage: ${item.storageSize || ''} ${item.storageType || ''}</li>`);
  }
  if (item.batteryHealth) lines.push(`<li>Battery Health: ${item.batteryHealth}</li>`);
  if (item.chargerIncluded) lines.push(`<li>Charger Included: ${item.chargerIncluded}</li>`);
  
  lines.push('</ul>');
  
  if (item.testNotes || item.benchNotes) {
    lines.push('<p><strong>Testing Notes:</strong></p>');
    lines.push(`<p>${item.testNotes || ''} ${item.benchNotes || ''}</p>`);
  }
  
  if (item.intakeNotes) {
    lines.push('<p><strong>Condition Notes:</strong></p>');
    lines.push(`<p>${item.intakeNotes}</p>`);
  }
  
  return lines.join('');
}
