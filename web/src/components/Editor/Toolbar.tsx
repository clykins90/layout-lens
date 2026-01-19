import { Sparkles, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ToolbarProps {
    projectName: string;
    setProjectName: (name: string) => void;
    unitSystem: 'imperial' | 'metric';
    setUnitSystem: (sys: 'imperial' | 'metric') => void;
    gridMode: 'coarse' | 'fine';
    setGridMode: (mode: 'coarse' | 'fine') => void;
    onSave: () => void;
    isSaving: boolean;
    onMagicBuild: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    projectName, setProjectName,
    unitSystem, setUnitSystem,
    gridMode, setGridMode,
    onSave, isSaving,
    onMagicBuild
}) => {
    return (
        <div className="bg-background border-b px-4 py-3 flex justify-between items-center z-10 shadow-sm">
            <div className="flex items-center gap-4">
                <span className="font-bold text-xl text-primary">LayoutLens</span>
                <Input
                    className="w-40 h-8 text-sm"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                />
                <ToggleGroup
                    type="single"
                    value={unitSystem}
                    onValueChange={(v) => v && setUnitSystem(v as 'imperial' | 'metric')}
                    variant="outline"
                    size="sm"
                >
                    <ToggleGroupItem value="imperial">Imperial</ToggleGroupItem>
                    <ToggleGroupItem value="metric">Metric</ToggleGroupItem>
                </ToggleGroup>
                <ToggleGroup
                    type="single"
                    value={gridMode}
                    onValueChange={(v) => v && setGridMode(v as 'coarse' | 'fine')}
                    variant="outline"
                    size="sm"
                >
                    <ToggleGroupItem value="coarse">Coarse</ToggleGroupItem>
                    <ToggleGroupItem value="fine">Fine</ToggleGroupItem>
                </ToggleGroup>
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onMagicBuild}>
                    <Sparkles className="size-4" />
                    Magic Build
                </Button>
                <Button onClick={onSave} disabled={isSaving}>
                    <Save className="size-4" />
                    {isSaving ? 'Saving...' : 'Save Project'}
                </Button>
            </div>
        </div>
    );
};
