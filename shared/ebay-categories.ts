export interface EbayCategory {
  id: string;
  name: string;
  parentName?: string;
}

export const EBAY_COMPUTER_CATEGORIES: EbayCategory[] = [
  { id: "179", name: "Desktop Computers", parentName: "Computers/Tablets & Networking" },
  { id: "175672", name: "Laptops & Netbooks", parentName: "Computers/Tablets & Networking" },
  { id: "80053", name: "Monitors", parentName: "Computers/Tablets & Networking" },
  { id: "171957", name: "All-In-One Desktops", parentName: "Computers/Tablets & Networking" },
  { id: "175673", name: "PC Laptops & Netbooks", parentName: "Laptops & Netbooks" },
  { id: "111418", name: "Apple Laptops", parentName: "Laptops & Netbooks" },
  { id: "171485", name: "2-in-1 Laptops", parentName: "Laptops & Netbooks" },
  { id: "31530", name: "Computer Components & Parts", parentName: "Computers/Tablets & Networking" },
  { id: "16145", name: "CPUs/Processors", parentName: "Computer Components & Parts" },
  { id: "170083", name: "Memory (RAM)", parentName: "Computer Components & Parts" },
  { id: "175669", name: "Solid State Drives", parentName: "Drives, Storage & Blank Media" },
  { id: "56083", name: "Hard Drives (HDD, SSD & NAS)", parentName: "Drives, Storage & Blank Media" },
  { id: "27386", name: "Graphics/Video Cards", parentName: "Computer Components & Parts" },
  { id: "1244", name: "Motherboards", parentName: "Computer Components & Parts" },
  { id: "42017", name: "Power Supplies", parentName: "Computer Components & Parts" },
  { id: "131486", name: "Computer Cases", parentName: "Computer Components & Parts" },
  { id: "165", name: "Keyboards & Mice", parentName: "Computers/Tablets & Networking" },
  { id: "3676", name: "Keyboards", parentName: "Keyboards & Mice" },
  { id: "23160", name: "Mice, Trackballs & Touchpads", parentName: "Keyboards & Mice" },
  { id: "182094", name: "Docking Stations", parentName: "Laptop & Desktop Accessories" },
  { id: "31534", name: "Laptop Batteries", parentName: "Laptop & Desktop Accessories" },
  { id: "31519", name: "Laptop Power Adapters/Chargers", parentName: "Laptop & Desktop Accessories" },
  { id: "171961", name: "Tablets & eBook Readers", parentName: "Computers/Tablets & Networking" },
  { id: "171485", name: "Apple iPad", parentName: "Tablets & eBook Readers" },
  { id: "176972", name: "Android Tablets", parentName: "Tablets & eBook Readers" },
  { id: "73839", name: "Networking Products", parentName: "Computers/Tablets & Networking" },
  { id: "11176", name: "Routers", parentName: "Networking Products" },
  { id: "175709", name: "Switches & Hubs", parentName: "Networking Products" },
  { id: "44995", name: "Printers", parentName: "Computers/Tablets & Networking" },
  { id: "19303", name: "Scanners", parentName: "Computers/Tablets & Networking" },
  { id: "4626", name: "Servers", parentName: "Enterprise Networking, Servers" },
  { id: "175698", name: "Server Memory (RAM)", parentName: "Enterprise Networking, Servers" },
  { id: "175699", name: "Server Hard Drives", parentName: "Enterprise Networking, Servers" },
  { id: "58058", name: "USB Flash Drives", parentName: "Drives, Storage & Blank Media" },
  { id: "175698", name: "External Hard Drives", parentName: "Drives, Storage & Blank Media" },
  { id: "86722", name: "Webcams", parentName: "Computers/Tablets & Networking" },
  { id: "162497", name: "Computer Cables & Connectors", parentName: "Computers/Tablets & Networking" },
  { id: "31530", name: "Other Computer Components", parentName: "Computer Components & Parts" },
];

export const EBAY_CONDITION_IDS = [
  { id: "1000", name: "New", description: "A brand-new, unused, unopened, undamaged item in its original packaging" },
  { id: "1500", name: "New other", description: "A new, unused item with no signs of wear. May be missing original packaging or tags." },
  { id: "2000", name: "Certified - Refurbished", description: "Professionally restored to working order by a manufacturer-approved vendor." },
  { id: "2500", name: "Seller refurbished", description: "The item has been restored to working order by the eBay seller." },
  { id: "3000", name: "Used", description: "An item that has been used previously. May have some signs of cosmetic wear." },
  { id: "4000", name: "Very Good", description: "An item that is used but still in very good condition. No damage to the item itself." },
  { id: "5000", name: "Good", description: "An item in good working order but that may show signs of wear." },
  { id: "6000", name: "Acceptable", description: "An item with obvious wear, but still fully operational and functional." },
  { id: "7000", name: "For parts or not working", description: "An item that does not function as intended and is not fully operational." },
];

export function getCategoryById(id: string): EbayCategory | undefined {
  return EBAY_COMPUTER_CATEGORIES.find(c => c.id === id);
}

export function getCategoryName(id: string): string {
  const category = getCategoryById(id);
  return category ? category.name : id;
}

export function getConditionName(id: string): string {
  const condition = EBAY_CONDITION_IDS.find(c => c.id === id);
  return condition ? condition.name : id;
}
