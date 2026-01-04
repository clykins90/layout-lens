import React, { useState, useRef } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import Konva from 'konva';

interface Point {
  x: number;
  y: number;
}

interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
}

interface Project {
    id: string;
    name: string;
    walls: Wall[];
}

const GRID_SIZE = 50; // pixels per unit (e.g., 1 foot)
const API_URL = 'http://localhost:3000';

const BlueprintEditor: React.FC = () => {
  const [walls, setWalls] = useState<Wall[]>([]);
  const [currentWall, setCurrentWall] = useState<Point | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Project State
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('My Room');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Ref to access the stage for relative pointer position
  const stageRef = useRef<Konva.Stage>(null);

  // Helper to snap to grid
  const snapToGrid = (pos: Point) => {
    return {
      x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
    };
  };

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const payload = {
              id: projectId || '', // For type safety, though POST doesn't need it
              name: projectName,
              walls: walls
          };

          let url = `${API_URL}/projects`;
          let method = 'POST';

          if (projectId) {
              url = `${API_URL}/projects/${projectId}`;
              method = 'PUT';
          }

          const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              throw new Error('Failed to save project');
          }

          const savedProject: Project = await response.json();
          setProjectId(savedProject.id);
          setLastSaved(new Date());
          console.log('Project saved:', savedProject);

      } catch (error) {
          console.error('Error saving project:', error);
          alert('Failed to save project. Is the backend running?');
      } finally {
          setIsSaving(false);
      }
  };

  const handleMouseDown = () => {
    if (!stageRef.current) return;
    const stage = stageRef.current;
    const pointerPosition = stage.getPointerPosition();
    
    if (!pointerPosition) return;

    const snappedPos = snapToGrid(pointerPosition);

    if (!isDrawing) {
      // Start drawing
      setIsDrawing(true);
      setCurrentWall(snappedPos);
    } else {
      // Finish drawing current wall
      if (currentWall) {
        const newWall: Wall = {
          id: crypto.randomUUID(),
          start: currentWall,
          end: snappedPos,
          thickness: 10,
        };
        setWalls([...walls, newWall]);
        setCurrentWall(snappedPos); // Start next wall from here (polylines)
      }
    }
  };

  const handleMouseMove = () => {
      // We force update or use a ref for temp line if performance issues arise, 
      // but React state is fine for simple prototypes.
      if (!isDrawing) return;
      // We trigger a re-render to show the preview line? 
      // Actually, we just need to know the mouse position.
      // For this simple version, we'll just use the preview logic in render.
      // But we need to store the "current mouse pos" in state to render the preview line.
      // Let's add that state.
  };
  
  // Track mouse for preview line
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const handleStageMouseMove = () => {
      if(!stageRef.current) return;
      const stage = stageRef.current;
      const pos = stage.getPointerPosition();
      if(pos) setMousePos(snapToGrid(pos));
  }

  // Generate Grid Lines
  const renderGrid = () => {
    const lines = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    for (let i = 0; i < width / GRID_SIZE; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }
    for (let j = 0; j < height / GRID_SIZE; j++) {
      lines.push(
        <Line
          key={`h-${j}`}
          points={[0, j * GRID_SIZE, width, j * GRID_SIZE]}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }
    return lines;
  };

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
        <div className="bg-white p-4 border-b flex items-center justify-between shadow-sm z-10 relative">
            <div className="flex items-center gap-4">
                <h1 className="font-bold text-xl text-gray-800">LayoutLens</h1>
                <div className="h-6 w-px bg-gray-300"></div>
                <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
                    placeholder="Project Name"
                />
            </div>
            
            <div className="flex items-center gap-3">
                {lastSaved && (
                    <span className="text-xs text-gray-400">
                        Saved {lastSaved.toLocaleTimeString()}
                    </span>
                )}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded text-sm font-medium text-white transition-colors ${
                        isSaving ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {isSaving ? 'Saving...' : (projectId ? 'Save Changes' : 'Save Project')}
                </button>
            </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
             <div className="absolute top-4 left-4 z-10 bg-white/90 p-3 rounded shadow backdrop-blur-sm pointer-events-none select-none">
                <p className="text-sm font-medium text-gray-700">Tools</p>
                <div className="mt-1 text-xs text-gray-500 space-y-1">
                    <p>Click to start/end wall</p>
                    <p>Scale: 1 box = 1 ft</p>
                </div>
                 {isDrawing && (
                    <div className="mt-2 pointer-events-auto">
                        <button 
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 w-full"
                            onClick={() => {
                                setIsDrawing(false);
                                setCurrentWall(null);
                            }}
                        >
                            Cancel (Esc)
                        </button>
                    </div>
                 )}
            </div>

            <Stage
                width={window.innerWidth}
                height={window.innerHeight - 64} // Subtract header height
                ref={stageRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleStageMouseMove}
                style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
            >
                <Layer>
                {renderGrid()}
                </Layer>
                <Layer>
                {/* Existing Walls */}
                {walls.map((wall) => (
                    <Line
                    key={wall.id}
                    points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
                    stroke="#333"
                    strokeWidth={wall.thickness}
                    lineCap="round"
                    lineJoin="round"
                    />
                ))}

                {/* Preview Line (Current Drawing) */}
                {isDrawing && currentWall && mousePos && (
                    <>
                        <Circle x={currentWall.x} y={currentWall.y} radius={5} fill="#3b82f6" />
                        <Line
                            points={[currentWall.x, currentWall.y, mousePos.x, mousePos.y]}
                            stroke="#3b82f6"
                            strokeWidth={5}
                            dash={[10, 5]}
                        />
                        <Circle x={mousePos.x} y={mousePos.y} radius={5} fill="#3b82f6" opacity={0.5} />
                    </>
                )}
                </Layer>
            </Stage>
        </div>
    </div>
  );
};

export default BlueprintEditor;
