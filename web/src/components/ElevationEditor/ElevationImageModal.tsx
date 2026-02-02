import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type ElevationImageModalProps = {
    open: boolean;
    prompt: string;
    generatedImage: string | null;
    error: string | null;
    isGenerating: boolean;
    onPromptChange: (value: string) => void;
    onGenerate: () => void;
    onOpenChange: (open: boolean) => void;
};

export const ElevationImageModal = ({
    open,
    prompt,
    generatedImage,
    error,
    isGenerating,
    onPromptChange,
    onGenerate,
    onOpenChange,
}: ElevationImageModalProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary" />
                    Wall Render (Gemini)
                </DialogTitle>
                <DialogDescription>
                    Send the current elevation diagram to Gemini and generate a photorealistic wall render.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
                <Textarea
                    className="min-h-24"
                    value={prompt}
                    onChange={(event) => onPromptChange(event.target.value)}
                    placeholder="Optional style or material notes."
                />

                <div className="flex items-center justify-between">
                    {error ? <span className="text-sm text-destructive">{error}</span> : <span />}
                    <Button onClick={onGenerate} disabled={isGenerating}>
                        <Sparkles className="size-4" />
                        {isGenerating ? 'Rendering...' : 'Generate Image'}
                    </Button>
                </div>

                {generatedImage ? (
                    <div className="rounded-lg border bg-muted/30 p-2">
                        <img
                            src={generatedImage}
                            alt="Generated wall render"
                            className="w-full rounded-md object-contain"
                            loading="lazy"
                        />
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                        Generated image will appear here.
                    </div>
                )}
            </div>
        </DialogContent>
    </Dialog>
);
