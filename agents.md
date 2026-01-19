# LayoutLens - Project Summary

**Goal:** A responsive interior design application for visualizing rooms in 2D top-down and vertical elevation views, featuring AI-driven layout generation.

## 🏗️ Architecture

### Backend (Rust / Axum)
- **Framework:** Axum v0.8.
- **State:** In-memory `Arc<Mutex<Vec<Project>>>` (Prototype).
- **Core Models:**
    - `Project`: Container for Elements and Rooms.
    - `Element`: The atomic unit (Wall, Window, Door). Supports `curvature` for round walls.
    - `VerticalItem`: Attached to Walls (Switch, Outlet, Sconce, TV, Picture, Arch).
    - `Room`: Semantic grouping of points defining a floor zone.
- **Endpoints:**
    - `GET/POST /projects`: CRUD operations.
    - `POST /interpret`: **AI Bridge**. Accepts simplified "Semantic JSON" (e.g., "Room 12x12") and calculates the vector geometry (Turtle Graphics approach) to generate a full Project struct.

### Frontend (React / Vite / Konva)
- **Canvas Engine:** `react-konva` for high-performance 2D vector rendering.
- **Components:**
    - **BlueprintEditor:** Main top-down view. Handles grid snapping, wall drawing, room creation, and property editing.
    - **ElevationEditor:** Modal view for a specific wall. Allows placing electrical and decor items on the vertical face. Supports collision detection with windows/doors from the 2D plan.
    - **MagicBuildModal:** Interface for Natural Language input (simulated LLM) to trigger the backend's `/interpret` engine.

## ✨ Key Features

1.  **Unified Geometry:**
    - Walls are vectors. Windows/Doors are overlay segments.
    - **Curved Walls:** Quadratic Bézier curves controlled by a `curvature` parameter.
    - **Verticals:** detailed placement of items on wall faces, linked to the 2D plan.

2.  **Precision Tools:**
    - **Grid:** Dynamic switching between **Coarse** (1ft / 0.5m) and **Fine** (1in / 0.1m) snapping.
    - **Units:** Full support for **Imperial (Ft/In)** and **Metric (Meters)**.

3.  **AI "Magic Build":**
    - Users can describe a room (e.g., *"15x20 room with a door on the right"*).
    - The system translates this Natural Language -> Semantic JSON -> Coordinate Geometry.

## 📁 File Structure
- `api/src/main.rs`: Entire backend logic (Models + Routes + Geometry Engine).
- `web/src/components/BlueprintEditor.tsx`: Core 2D logic.
- `web/src/components/ElevationEditor.tsx`: Vertical view logic.
- `web/src/components/MagicBuildModal.tsx`: AI input interface.
- `semantic_protocol.md`: Spec for the AI JSON interface.
