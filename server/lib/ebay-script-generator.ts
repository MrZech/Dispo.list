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

Next, construct an appropriate eBay item description by briefly explaining the product and the features it provides, if any. 

Each specification should be on its own line. 

Do not use any opinionated, convincing, or otherwise sales-y statements, claims, or phrases--only provide the unbiased facts and features about the product. Strive to ensure that all information you present is absolutely, undeniably correct. Corroborate your information across multiple sources. 

If the device requires an operating system, unless otherwise mentioned, do not include any mention of an operating system. 

Unless otherwise mentioned do not refer to testing in any way.

Unless otherwise specified above, the storage device is solid state and not a hard disk drive. 

Be as inclusive and thorough as possible, providing all correct product information relevant to the eBay category. Be sure to include both its UPC and MPN. If any information differs from what is listed here, use this information as the correct information for this listing. 

Do not include your sources in the body or in the bulleted lists.

Follow the description with the Inventory Number: "${specs.sku}"

In a section below the description, please recommend an eBay listing price based on the same item's past eBay sales prices. Bonus points if you recommend the most economical way to send this item through USPS, which includes sufficient packaging, padding, and postage. Include product dimensions in inches.

Never mention the condition in this description, and never ask me to choose from options in your response.

Do not reference any memory, previous chats, or past context in any way in your response. Reply as though you are the standard, blank-slate model of yourself. Thank you. Never mention warranties. Do NOT specify if it has a drive or not.`;
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
