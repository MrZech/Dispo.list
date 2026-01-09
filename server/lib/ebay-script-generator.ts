import OpenAI from "openai";
import type { Item } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ItemSpecs {
  sku: string;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  cpu?: string | null;
  ram?: string | null;
  storageType?: string | null;
  storageSize?: string | null;
  color?: string;
  formFactor?: string;
  serialNumber?: string;
  processor?: string;
  memory?: string;
  hasBattery?: boolean;
  batteryHealth?: string;
  includesCharger?: boolean;
  includesCables?: string;
  accessories?: string;
  additionalSpecs?: string;
}

const DESCRIPTION_TEMPLATE = `Please Read This First
This product previously belonged to someone who either upgraded or no longer needed it. Regardless of the reason, it has come to us with the hope of finding a new purpose. (Lucky you!)

Descriptions
We strive to provide accurate product descriptions by including the following details:
The item's brand and model name or number.
The item's physical condition.
Basic BIOS or system information (if applicable).
Testing status (if applicable—see below).
Any included accessories (see below).

The weight, length, width, height, circumference, volume, diameter, etc., were likely entered to calculate shipping. Therefore, if the item includes any packaging, that is what was measured, and the actual product may be smaller. If you have any questions, please contact us; we will get those exact measurements for you. 

While we sometimes use AI to assist with descriptions, it may not always be as accurate as you might expect from a robot. Use the provided details to verify the product's suitability for your needs. Let us know if you spot an error—we appreciate your input!

Images
In most cases, the pictures in the listing are of the actual item for sale. However, we may use representative images instead for bulk listings or new, unused items in original packaging. Pay close attention to the photos to identify any physical defects and to confirm what is (or is not) included.

Accessories
While we wish every previous owner included power cables, connectors, chargers, dongles, keyboards, mice, and other accessories, this is rarely the case. Unless specifically mentioned in the product description or visible in the product photos, accessories are not included.

Testing
Although we aim to test all items thoroughly, there are instances where we may lack the technical expertise for certain equipment. In other cases, testing may not be possible due to missing cables or connectors. If an item cannot be tested but appears to be in working condition, we will label it "as-is" to indicate that its functionality cannot be guaranteed. These items are priced significantly lower, leaving the testing up to you.

Storage
We take data security seriously. Unless we specify something different in the product description, computers do not include hard disk drives (HDDs) or solid-state drives (SSDs). Exceptions will be noted in the description. In those cases, we obtained the previous owner's assurances that they had removed all sensitive data or that we had reformatted the storage media ourselves.

Pricing
Please note that prices are subject to change.

Shipping Times
Estimated shipping times are provided as general guidelines and may vary. Orders are processed in the order received, Monday through Friday, from 9:00 AM to 3:30 PM CST. Please remember that weather, carrier workloads, and holiday delivery schedules can affect delivery times.`;

export function buildPromptFromSpecs(specs: ItemSpecs): string {
  const specLines: string[] = [];
  
  if (specs.brand) specLines.push(`Brand: ${specs.brand}`);
  if (specs.model) specLines.push(`Model: ${specs.model}`);
  if (specs.category) specLines.push(`Type: ${specs.category}`);
  if (specs.color) specLines.push(`Color: ${specs.color}`);
  if (specs.formFactor) specLines.push(`Form Factor: ${specs.formFactor}`);
  if (specs.cpu || specs.processor) specLines.push(`Processor: ${specs.cpu || specs.processor}`);
  if (specs.ram || specs.memory) specLines.push(`RAM: ${specs.ram || specs.memory}`);
  if (specs.storageType) specLines.push(`Storage Type: ${specs.storageType}`);
  if (specs.storageSize) specLines.push(`Storage Size: ${specs.storageSize}`);
  if (specs.serialNumber) specLines.push(`Serial Number: ${specs.serialNumber}`);
  if (specs.hasBattery !== undefined) specLines.push(`Has Battery: ${specs.hasBattery ? 'Yes' : 'No'}`);
  if (specs.batteryHealth) specLines.push(`Battery Health: ${specs.batteryHealth}`);
  if (specs.includesCharger !== undefined) specLines.push(`Includes Charger: ${specs.includesCharger ? 'Yes' : 'No'}`);
  if (specs.includesCables) specLines.push(`Included Cables: ${specs.includesCables}`);
  if (specs.accessories) specLines.push(`Accessories Included: ${specs.accessories}`);
  if (specs.additionalSpecs) specLines.push(specs.additionalSpecs);
  
  const specsBlock = specLines.join('\n');
  
  return `Generate a concise eBay listing for this item. ONLY include information that is explicitly provided below - do not add extra specs or features not listed here.

PROVIDED SPECS:
${specsBlock}
SKU: ${specs.sku}

INSTRUCTIONS:
1. Start with a recommended eBay title (max 80 characters) using only the brand, model, and key provided specs.

2. Generate ONLY the product details section - a brief, factual description with the provided specs. Keep it concise. Include:
   - Brand and model
   - Only the specs explicitly provided above
   - Battery health if provided
   - Charger/cables/accessories if specified
   - UPC and MPN only if you can verify them

3. After the product details, include: Inventory Number: ${specs.sku}

4. Then include this EXACT boilerplate text (copy it exactly as shown):

---
Descriptions
We strive to provide accurate product descriptions by including the following details:
The item's brand and model name or number.
The item's physical condition.
Basic BIOS or system information (if applicable).
Testing status (if applicable—see below).
Any included accessories (see below).

The weight, length, width, height, circumference, volume, diameter, etc., were likely entered to calculate shipping. Therefore, if the item includes any packaging, that is what was measured, and the actual product may be smaller. If you have any questions, please contact us; we will get those exact measurements for you.

While we sometimes use AI to assist with descriptions, it may not always be as accurate as you might expect from a robot. Use the provided details to verify the product's suitability for your needs. Let us know if you spot an error—we appreciate your input!

Images
In most cases, the pictures in the listing are of the actual item for sale. However, we may use representative images instead for bulk listings or new, unused items in original packaging. Pay close attention to the photos to identify any physical defects and to confirm what is (or is not) included.

Accessories
While we wish every previous owner included power cables, connectors, chargers, dongles, keyboards, mice, and other accessories, this is rarely the case. Unless specifically mentioned in the product description or visible in the product photos, accessories are not included.

Testing
Although we aim to test all items thoroughly, there are instances where we may lack the technical expertise for certain equipment. In other cases, testing may not be possible due to missing cables or connectors. If an item cannot be tested but appears to be in working condition, we will label it "as-is" to indicate that its functionality cannot be guaranteed. These items are priced significantly lower, leaving the testing up to you.

Storage
We take data security seriously. Unless we specify something different in the product description, computers do not include hard disk drives (HDDs) or solid-state drives (SSDs). Exceptions will be noted in the description. In those cases, we obtained the previous owner's assurances that they had removed all sensitive data or that we had reformatted the storage media ourselves.

Pricing
Please note that prices are subject to change.

Shipping Times
Estimated shipping times are provided as general guidelines and may vary. Orders are processed in the order received, Monday through Friday, from 9:00 AM to 3:30 PM CST. Please remember that weather, carrier workloads, and holiday delivery schedules can affect delivery times.
---

5. After the boilerplate, add a brief section with:
   - Suggested eBay price based on similar sold items
   - Recommended USPS shipping method with estimated cost

RULES:
- Be concise - only include provided information
- No sales language or opinions
- No condition mentions
- No warranty mentions
- No operating system unless specified
- Do not invent specs not provided above`;
}

export function buildPromptFromItem(item: Item): string {
  return buildPromptFromSpecs({
    sku: item.sku,
    brand: item.brand,
    model: item.model,
    category: item.category,
    cpu: item.cpu,
    ram: item.ram,
    storageType: item.storageType,
    storageSize: item.storageSize,
  });
}

const SYSTEM_PROMPT = `You generate concise eBay listings. Rules:
- ONLY include specs explicitly provided - never add extras
- Be brief and factual - no sales language
- Include battery health, charger, cables, accessories ONLY if provided
- Copy the boilerplate template sections exactly as given
- Keep the product details section short - just the facts`;

export async function generateEbayScript(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_completion_tokens: 2048,
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateEbayScriptStreaming(
  prompt: string, 
  onChunk: (content: string) => void
): Promise<string> {
  const stream = await openai.chat.completions.create({
    model: "gpt-5.1",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_completion_tokens: 2048,
    stream: true,
  });

  let fullResponse = "";
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullResponse += content;
      onChunk(content);
    }
  }

  return fullResponse;
}
