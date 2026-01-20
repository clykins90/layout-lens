import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { TOOLS, type ToolType } from './constants';

type ElevationToolbarProps = {
    tool: ToolType;
    onToolChange: (tool: ToolType) => void;
};

export const ElevationToolbar = ({ tool, onToolChange }: ElevationToolbarProps) => (
    <div className="w-16 shrink-0 bg-muted/30 border-r flex flex-col items-center py-4 z-10 overflow-y-auto">
        <ToggleGroup
            type="single"
            value={tool}
            onValueChange={(value) => value && onToolChange(value as ToolType)}
            orientation="vertical"
            className="flex-col gap-2"
        >
            {TOOLS.map((item) => (
                <ToggleGroupItem
                    key={item.id}
                    value={item.id}
                    className="flex flex-col items-center gap-1 h-auto py-2 px-2 w-14 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                    title={item.label}
                >
                    <item.icon className="size-5" />
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    </div>
);
