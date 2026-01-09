import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import LayoutShell from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, RotateCcw, FileText, Loader2, CheckCircle2 } from "lucide-react";

export default function EbayScript() {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [savedScript, setSavedScript] = useState<string>("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [pastedSpecs, setPastedSpecs] = useState<string>("");
  const [customSku, setCustomSku] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: items } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const handleGenerateFromItem = async () => {
    if (!selectedItemId) {
      toast({ title: "Error", description: "Please select an item first", variant: "destructive" });
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      const res = await fetch(`/api/ebay-script/prompt/${selectedItemId}`);
      if (!res.ok) throw new Error("Failed to generate prompt");
      const data = await res.json();
      setGeneratedPrompt(data.prompt);
      toast({ title: "Prompt Generated", description: "Ready to send to AI" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate prompt", variant: "destructive" });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerateFromSpecs = async () => {
    if (!pastedSpecs.trim() || !customSku.trim()) {
      toast({ title: "Error", description: "Please enter a SKU and paste specs", variant: "destructive" });
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      const specs = parseSpecs(pastedSpecs, customSku);
      const res = await fetch("/api/ebay-script/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(specs),
      });
      if (!res.ok) throw new Error("Failed to generate prompt");
      const data = await res.json();
      setGeneratedPrompt(data.prompt);
      toast({ title: "Prompt Generated", description: "Ready to send to AI" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate prompt", variant: "destructive" });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const parseSpecs = (rawSpecs: string, sku: string) => {
    const specs: Record<string, string | boolean | undefined> = { sku };
    const lines = rawSpecs.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("DIMMS")) continue;
      
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase().replace(/[_\s]+/g, "");
      const value = trimmed.slice(colonIdx + 1).trim();
      
      if (value === "null" || !value) continue;
      
      if (key === "brand") specs.brand = value;
      else if (key === "model") specs.model = value;
      else if (key === "type" || key === "category") specs.category = value;
      else if (key === "color") specs.color = value;
      else if (key === "formfactor") specs.formFactor = value;
      else if (key === "processor") specs.processor = value;
      else if (key === "raminstalled" || key === "ram") specs.memory = value;
      else if (key === "serialnumber") specs.serialNumber = value;
      else if (key === "hasbattery") specs.hasBattery = value.toLowerCase() === "true" || value.toLowerCase() === "yes";
      else if (key === "batteryhealth" || key === "batterycondition") specs.batteryHealth = value;
      else if (key === "includescharger" || key === "charger") specs.includesCharger = value.toLowerCase() === "true" || value.toLowerCase() === "yes";
      else if (key === "includescables" || key === "cables") specs.includesCables = value;
      else if (key === "accessories" || key === "included" || key === "includedaccessories") specs.accessories = value;
    }
    
    specs.additionalSpecs = rawSpecs;
    return specs;
  };

  const handleGenerateScript = async () => {
    if (!generatedPrompt.trim()) {
      toast({ title: "Error", description: "Generate a prompt first", variant: "destructive" });
      return;
    }

    setIsGeneratingScript(true);
    setAiResponse("");
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/ebay-script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: generatedPrompt }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error("Failed to generate script");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setAiResponse((prev) => prev + data.content);
                }
                if (data.done) {
                  toast({ title: "Script Generated", description: "eBay listing script is ready" });
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parse errors for incomplete data
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({ title: "Error", description: "Failed to generate script", variant: "destructive" });
      }
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const handleSaveScript = () => {
    setSavedScript(aiResponse);
    toast({ title: "Saved", description: "Script saved for reference" });
  };

  const handleClear = () => {
    setGeneratedPrompt("");
    setAiResponse("");
    setPastedSpecs("");
    setCustomSku("");
    setSelectedItemId("");
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">eBay Script Generator</h1>
            <p className="text-muted-foreground">Generate, save, and retrieve eBay listing scripts by SKU.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Enter SKU & Generate Script</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="database">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="database" data-testid="tab-database">From Database</TabsTrigger>
                    <TabsTrigger value="paste" data-testid="tab-paste">Paste Specs</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="database" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Select Item (SKU)</Label>
                      <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger data-testid="select-item">
                          <SelectValue placeholder="Select an item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {items?.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.sku} - {item.brand} {item.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleGenerateFromItem} 
                      disabled={isGeneratingPrompt || !selectedItemId}
                      className="w-full"
                      data-testid="button-generate-from-item"
                    >
                      {isGeneratingPrompt ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Generate Script
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="paste" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Custom Label (SKU)</Label>
                      <Input 
                        value={customSku}
                        onChange={(e) => setCustomSku(e.target.value)}
                        placeholder="e.g. DT-0325-534"
                        data-testid="input-custom-sku"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Paste Specs (from Magic Octopus or manual entry)</Label>
                      <Textarea 
                        value={pastedSpecs}
                        onChange={(e) => setPastedSpecs(e.target.value)}
                        placeholder="Brand: Dell
Model: OptiPlex 7050
Type: Desktop
Processor: Intel Core i5-7500
RAM: 8 GB
Color: Black
Form Factor: SFF
Battery Health: 85%
Includes Charger: Yes
Cables: USB-C cable, Power cord
Accessories: Original box, Manual"
                        className="min-h-[200px] font-mono text-sm"
                        data-testid="textarea-specs"
                      />
                    </div>
                    <Button 
                      onClick={handleGenerateFromSpecs} 
                      disabled={isGeneratingPrompt || !customSku.trim() || !pastedSpecs.trim()}
                      className="w-full"
                      data-testid="button-generate-from-specs"
                    >
                      {isGeneratingPrompt ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      Generate Script
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Generated eBay Script:</span>
                  {generatedPrompt && <Badge variant="secondary">Ready</Badge>}
                </CardTitle>
                <CardDescription>This prompt will be sent to AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea 
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  placeholder="Prompt will appear here after generation..."
                  className="min-h-[180px] font-mono text-xs"
                  readOnly
                  data-testid="textarea-prompt"
                />
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={handleGenerateScript} 
                    disabled={isGeneratingScript || !generatedPrompt.trim()}
                    data-testid="button-generate-listing"
                  >
                    {isGeneratingScript ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Final Listing
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleSaveScript}
                    disabled={!aiResponse}
                    data-testid="button-save-listing"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Final Listing
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleClear}
                    data-testid="button-clear"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paste ChatGPT Response:</CardTitle>
                <CardDescription>If using external AI, paste the response here</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={aiResponse}
                  onChange={(e) => setAiResponse(e.target.value)}
                  placeholder="Paste your ChatGPT response here..."
                  className="min-h-[120px] font-mono text-sm"
                  data-testid="textarea-paste-response"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Final Listing Script:</span>
                  {aiResponse && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCopy(aiResponse, "Script")}
                      data-testid="button-copy-script"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-auto">
                  {aiResponse ? (
                    <pre className="whitespace-pre-wrap text-sm font-mono">{aiResponse}</pre>
                  ) : (
                    <p className="text-muted-foreground italic">AI-generated listing will appear here...</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Saved Final Script:</span>
                  {savedScript && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCopy(savedScript, "Saved script")}
                      data-testid="button-copy-saved"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/30 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-auto">
                  {savedScript ? (
                    <pre className="whitespace-pre-wrap text-sm font-mono">{savedScript}</pre>
                  ) : (
                    <p className="text-muted-foreground italic">Save a script to store it here...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
