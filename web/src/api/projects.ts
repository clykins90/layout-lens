import type { Project } from '../types';

const API_URL = 'http://localhost:3000';

export const saveProject = async (project: Project): Promise<Project> => {
    let url = `${API_URL}/projects`;
    let method = 'POST';
    if (project.id) { 
        url = `${API_URL}/projects/${project.id}`; 
        method = 'PUT'; 
    }
    const response = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(project) 
    });
    if (!response.ok) throw new Error('Failed to save project');
    return await response.json();
};

export const getProject = async (id: string): Promise<Project | null> => {
    const response = await fetch(`${API_URL}/projects/${id}`);
    if (!response.ok) return null;
    return await response.json();
};
