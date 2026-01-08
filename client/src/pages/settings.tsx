import { useState } from "react";
import { useExportProfiles, useCreateExportProfile, useGenerateCsv } from "@/hooks/use-export-profiles";
import { useItems } from "@/hooks/use-items";
import LayoutShell from "@/components/layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Settings() {
  const { data: profiles } = useExportProfiles();
  const createProfile = useCreateExportProfile();
  const generateCsv = useGenerateCsv();
  const { data: readyItems } = useItems({ status: "ready" });
  
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  const [name, setName] = useState("");
  const [mappings, setMappings] = useState('{\n  "Title": "brand + model",\n  "Price": "listPrice",\n  "ConditionID": "ebayConditionId"\n}');

  const handleCreateProfile = async () => {
    try {
      await createProfile.mutateAsync({
        name,
        mappings: JSON.parse(mappings)
      });
      setNewProfileOpen(false);
      setName("");
    } catch (e) {
      alert("Invalid JSON mappings");
    }
  };

  const handleExport = (profileId: number) => {
    if (!readyItems) return;
    const itemIds = readyItems.map(i => i.id);
    generateCsv.mutate({ profileId, itemIds });
  };

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings & Exports</h1>
          <p className="text-muted-foreground mt-1">Manage CSV export templates and download listings.</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Export Profiles</CardTitle>
              <CardDescription>Define how database fields map to CSV headers.</CardDescription>
            </div>
            <Dialog open={newProfileOpen} onOpenChange={setNewProfileOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> New Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Export Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Profile Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. eBay Electronics" />
                  </div>
                  <div className="space-y-2">
                    <Label>Column Mappings (JSON)</Label>
                    <Textarea 
                      value={mappings} 
                      onChange={e => setMappings(e.target.value)} 
                      className="font-mono h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">Map CSV headers to database fields.</p>
                  </div>
                  <Button onClick={handleCreateProfile} className="w-full">Create Profile</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile Name</TableHead>
                  <TableHead>Items Ready</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles?.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell>{readyItems?.length || 0} items</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleExport(profile.id)}
                        disabled={!readyItems?.length || generateCsv.isPending}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
