import React, { useState } from 'react';

interface MagicBuildModalProps {
    onClose: () => void;
    onGenerate: (project: any) => void;
}

const MagicBuildModal: React.FC<MagicBuildModalProps> = ({ onClose, onGenerate }) => {
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
            
            onClose();

        } catch (e) {
            console.error(e);
            alert("Failed to generate room. Check format.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-indigo-600 p-4 flex justify-between items-center">
                    <h2 className="text-white font-bold flex items-center gap-2">✨ Magic Build</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
                </div>
                
                <div className="p-6">
                    <div className="flex gap-4 mb-4 border-b pb-2">
                        <button onClick={() => setMode('text')} className={`pb-2 text-sm font-medium transition ${mode === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Natural Language</button>
                        <button onClick={() => setMode('json')} className={`pb-2 text-sm font-medium transition ${mode === 'json' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>Raw JSON (Dev)</button>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                        {mode === 'text' ? "Describe the room dimensions and features (e.g. '12x14 with window on top')." : "Paste the Semantic JSON structure."}
                    </p>
                    
                    <textarea 
                        className="w-full border rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                    />
                    
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? 'Thinking...' : '✨ Generate Room'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MagicBuildModal;
