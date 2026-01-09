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
  if (specs.ram || specs.memory) specLines.push(`RAM_Installed: ${specs.ram || specs.memory}`);
  if (specs.storageType) specLines.push(`Storage Type: ${specs.storageType}`);
  if (specs.storageSize) specLines.push(`Storage Size: ${specs.storageSize}`);
  if (specs.serialNumber) specLines.push(`Serial_Number: ${specs.serialNumber}`);
  if (specs.hasBattery !== undefined) specLines.push(`Has_Battery: ${specs.hasBattery}`);
  if (specs.additionalSpecs) specLines.push(specs.additionalSpecs);
  
  const specsBlock = specLines.join('\n');
  
  return `Read the whole prompt closely: Exclude Sources from final result. Using search, gather the specifications and information for an eBay listing of "${specsBlock}
Category: ${specs.category || 'Electronics'}
Description: ${specs.brand || ''} ${specs.model || ''} ${specs.category || 'Device'}". 

Identify the relevant eBay category and its fields, and ONLY PROVIDE INFORMATION THAT THE EBAY CATEGORY'S FIELDS REQUEST. Ensure that the information you provide is as up-to-date and factual as possible, reason through each piece of information, and determine if it is correct and should be included. Do not provide any extra information outside of what is being requested. DO NOT put the source links in the response. 

In your response, start with a recommended title for the eBay listing, but limit that title to 80 characters at most. 

Next, construct an appropriate eBay item description. The description MUST follow this exact template format, filling in the product-specific details where indicated:

=== TEMPLATE START ===
Please Read This First
This product previously belonged to someone who either upgraded or no longer needed it. Regardless of the reason, it has come to us with the hope of finding a new purpose. (Lucky you!)

[INSERT PRODUCT DETAILS HERE - Brief product overview with brand, model, key specs. Each specification on its own line. Include UPC and MPN if available.]

Inventory Number: ${specs.sku}

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
=== TEMPLATE END ===

Do not use any opinionated, convincing, or otherwise sales-y statements in the product details section--only provide the unbiased facts and features about the product. Strive to ensure that all information you present is absolutely, undeniably correct.

If the device requires an operating system, unless otherwise mentioned, do not include any mention of an operating system. 

Unless otherwise specified above, the storage device is solid state and not a hard disk drive. 

Be as inclusive and thorough as possible in the product details section, providing all correct product information relevant to the eBay category.

Do not include your sources anywhere.

In a section AFTER the template, please recommend an eBay listing price based on the same item's past eBay sales prices. Also recommend the most economical way to send this item through USPS, which includes sufficient packaging, padding, and postage. Include product dimensions in inches.

Never mention the condition in the description, and never ask me to choose from options in your response.

Do not reference any memory, previous chats, or past context in any way in your response. Reply as though you are the standard, blank-slate model of yourself. Never mention warranties. Do NOT specify if it has a drive or not.`;
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

export async function generateEbayScript(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that generates accurate eBay listing information based on product specifications. Be factual and concise. Never make up information - only provide verified specifications."
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
        content: "You are a helpful assistant that generates accurate eBay listing information based on product specifications. Be factual and concise. Never make up information - only provide verified specifications."
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
