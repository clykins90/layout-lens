const API_URL = 'http://localhost:3000';

type WallImageResponse = {
    image_data_url: string;
};

export const generateWallImage = async (diagramDataUrl: string, prompt?: string): Promise<string> => {
    const response = await fetch(`${API_URL}/ai/wall-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            diagram_data_url: diagramDataUrl,
            prompt: prompt?.trim() ? prompt : undefined,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to generate wall image');
    }

    const data: WallImageResponse = await response.json();
    return data.image_data_url;
};
