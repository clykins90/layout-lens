import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MagicBuildModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (project: any) => void;
}

const MagicBuildModal: React.FC<MagicBuildModalProps> = ({ open, onOpenChange, onGenerate }) => {
    const [prompt, setPrompt] = useState("12x15 Master Bedroom with a window on the top wall and a door on the right.");
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'text' | 'json'>('text');

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            let payload;

            if (mode === 'json') {
                payload = JSON.parse(prompt);

                const res = await fetch('http://localhost:3000/interpret', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error("Failed to interpret");
                const project = await res.json();
                onGenerate(project);

            } else {
                // Real AI Call
                const res = await fetch('http://localhost:3000/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error("AI Generation Failed: " + errText);
                }
                const project = await res.json();
                onGenerate(project);
            }

            onOpenChange(false);

        } catch (e) {
            console.error(e);
            alert("Failed to generate room. Check format.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-primary" />
                        Magic Build
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'text' | 'json')}>
                    <TabsList className="w-full">
                        <TabsTrigger value="text" className="flex-1">Natural Language</TabsTrigger>
                        <TabsTrigger value="json" className="flex-1">Raw JSON (Dev)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                            Describe the room dimensions and features (e.g. '12x14 with window on top').
                        </p>
                    </TabsContent>

                    <TabsContent value="json" className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">
                            Paste the Semantic JSON structure.
                        </p>
                    </TabsContent>
                </Tabs>

                <Textarea
                    className="min-h-32"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                />

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        <Sparkles className="size-4" />
                        {isLoading ? 'Thinking...' : 'Generate Room'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MagicBuildModal;
