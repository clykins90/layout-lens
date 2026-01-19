import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { PaintColor } from '../../types';

// @ts-ignore
import behrColors from 'colornerd/json/behr.json';
// @ts-ignore
import swColors from 'colornerd/json/sherwin-williams.json';

interface PaintSelectorProps {
    onSelect: (color: PaintColor) => void;
    initialColor?: PaintColor;
}

export const PaintSelector: React.FC<PaintSelectorProps> = ({ onSelect, initialColor }) => {
    const [brand, setBrand] = useState(initialColor?.manufacturer || 'Behr');
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [visibleCount, setVisibleCount] = useState(50);

    const colors = brand === 'Behr' ? behrColors : swColors;

    useEffect(() => {
        setVisibleCount(50);
        if (!search) {
            setResults(colors);
            return;
        }
        const lowerSearch = search.toLowerCase();
        const filtered = colors.filter((c: any) => {
            const nameMatch = c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(lowerSearch);
            const labelMatch = c.label && typeof c.label === 'string' && c.label.toLowerCase().includes(lowerSearch);
            return nameMatch || labelMatch;
        });
        setResults(filtered);
    }, [search, brand, colors]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            setVisibleCount(prev => Math.min(prev + 50, results.length));
        }
    };

    const visibleResults = results.slice(0, visibleCount);

    return (
        <div className="space-y-4 p-2 border rounded-md bg-muted/30">
            <div className="space-y-2">
                <Label className="text-xs">Manufacturer</Label>
                <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Behr">Behr</SelectItem>
                        <SelectItem value="Sherwin-Williams">Sherwin-Williams</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-xs">Search Color</Label>
                <Input 
                    className="h-8"
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="Name or Code..."
                />
            </div>
            {results.length > 0 && (
                <div 
                    className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto border rounded p-1 bg-background"
                    onScroll={handleScroll}
                >
                    {visibleResults.map((c, i) => (
                        <button
                            key={i}
                            className="flex items-center gap-2 p-2 hover:bg-accent rounded text-sm text-left w-full transition-colors"
                            onClick={() => onSelect({
                                manufacturer: brand,
                                name: c.name,
                                code: c.label,
                                hex: c.hex
                            })}
                        >
                            <div className="w-6 h-6 rounded border shadow-sm" style={{ backgroundColor: c.hex }} />
                            <div className="flex-1 overflow-hidden">
                                <div className="font-medium truncate">{c.name}</div>
                                <div className="text-[10px] text-muted-foreground">{c.label}</div>
                            </div>
                        </button>
                    ))}
                    {visibleCount < results.length && (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                            Loading more...
                        </div>
                    )}
                </div>
            )}
            {initialColor && !search && (
                <div className="flex items-center gap-2 p-2 bg-background border rounded-sm">
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: initialColor.hex }} />
                    <div className="flex-1">
                        <div className="text-xs font-medium">{initialColor.name}</div>
                        <div className="text-[10px] text-muted-foreground">{initialColor.manufacturer} - {initialColor.code}</div>
                    </div>
                </div>
            )}
        </div>
    );
};
