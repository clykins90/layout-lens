import { MousePointer2, RectangleHorizontal, PanelTop, DoorOpen, Square, Ruler } from 'lucide-react';
import type { Tool } from '../../hooks/useEditorState';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ToolPaletteProps {
    tool: Tool;
    setTool: (t: Tool) => void;
}

const tools = [
    { id: 'select', icon: MousePointer2, name: 'Select' },
    { id: 'wall', icon: RectangleHorizontal, name: 'Wall' },
    { id: 'window', icon: PanelTop, name: 'Window' },
    { id: 'door', icon: DoorOpen, name: 'Door' },
    { id: 'opening', icon: Square, name: 'Opening' },
    { id: 'room', icon: Ruler, name: 'Room' },
] as const;

export const ToolPalette: React.FC<ToolPaletteProps> = ({ tool, setTool }) => {
    return (
        <div className="w-20 bg-background border-r flex flex-col items-center py-6 z-10 shadow-sm">
            <ToggleGroup
                type="single"
                value={tool}
                onValueChange={(v) => v && setTool(v as Tool)}
                orientation="vertical"
                className="flex-col gap-2"
            >
                {tools.map(t => (
                    <ToggleGroupItem
                        key={t.id}
                        value={t.id}
                        className="flex flex-col items-center gap-1 h-auto py-2 px-3 w-16 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                    >
                        <t.icon className="size-5" />
                        <span className="text-[9px] font-bold tracking-widest uppercase">{t.name}</span>
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
        </div>
    );
};
