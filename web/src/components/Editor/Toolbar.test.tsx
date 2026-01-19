import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
    it('renders project name', () => {
        const props = {
            projectName: "Test Project",
            setProjectName: vi.fn(),
            unitSystem: 'imperial' as const,
            setUnitSystem: vi.fn(),
            gridMode: 'coarse' as const,
            setGridMode: vi.fn(),
            onSave: vi.fn(),
            isSaving: false,
            onMagicBuild: vi.fn(),
        };
        render(<Toolbar {...props} />);
        expect(screen.getByDisplayValue("Test Project")).toBeInTheDocument();
    });

    it('calls onSave when save button clicked', () => {
        const onSave = vi.fn();
        const props = {
            projectName: "Test Project",
            setProjectName: vi.fn(),
            unitSystem: 'imperial' as const,
            setUnitSystem: vi.fn(),
            gridMode: 'coarse' as const,
            setGridMode: vi.fn(),
            onSave: onSave,
            isSaving: false,
            onMagicBuild: vi.fn(),
        };
        render(<Toolbar {...props} />);
        fireEvent.click(screen.getByText("Save Project"));
        expect(onSave).toHaveBeenCalled();
    });

    it('toggles unit system', () => {
        const setUnitSystem = vi.fn();
        const props = {
            projectName: "Test Project",
            setProjectName: vi.fn(),
            unitSystem: 'imperial' as const,
            setUnitSystem: setUnitSystem,
            gridMode: 'coarse' as const,
            setGridMode: vi.fn(),
            onSave: vi.fn(),
            isSaving: false,
            onMagicBuild: vi.fn(),
        };
        render(<Toolbar {...props} />);
        fireEvent.click(screen.getByText("Metric"));
        expect(setUnitSystem).toHaveBeenCalledWith("metric");
    });
});
