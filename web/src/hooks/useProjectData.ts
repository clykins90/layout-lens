import { useState } from 'react';
import type { Element, Room, Project, UnitSystem } from '../types';
import { DEFAULT_UNIT_SYSTEM, lengthUnitForSystem } from '../utils/units';
import { saveProject as apiSaveProject } from '../api/projects';

export const useProjectData = () => {
    const [elements, setElements] = useState<Element[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [projectName, setProjectName] = useState<string>('My Design');
    const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
    const [isSaving, setIsSaving] = useState(false);

    const saveProject = async () => {
        setIsSaving(true);
        try {
            const payload: Project = {
                id: projectId || '',
                name: projectName,
                units: unitSystem,
                lengthUnit: lengthUnitForSystem(unitSystem),
                elements,
                rooms
            };
            const saved = await apiSaveProject(payload);
            setProjectId(saved.id);
            alert('Saved!');
        } catch (error) {
            console.error(error);
            alert('Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        elements, setElements,
        rooms, setRooms,
        projectId, setProjectId,
        projectName, setProjectName,
        unitSystem, setUnitSystem,
        isSaving,
        saveProject
    };
};
