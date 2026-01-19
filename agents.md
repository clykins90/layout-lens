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
- **Package Manager:** npm (use `npm` for all package operations, NOT pnpm or yarn)
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
- **Backend (`api/src/`)**
    - `main.rs`: Entry point and server configuration.
    - `models.rs`: Data structs (`Project`, `Element`, `Room`).
    - `handlers.rs`: HTTP request handlers.
    - `services.rs`: Business logic (geometry engine, semantic interpretation).
    - `routes.rs`: Route definitions.
- **Frontend (`web/src/`)**
    - `components/BlueprintEditor.tsx`: Main canvas composition.
    - `components/Editor/`: Sub-components (Toolbar, Palette, Properties).
    - `hooks/`: Custom hooks (`useProjectData`, `useEditorState`).
    - `utils/`: Geometry and formatting helpers.

## 🧱 Maintainability Guidelines

To preserve code quality, strict adherence to the following separation of concerns is required:

### Backend (Rust)
1.  **Models (`models.rs`)**: Pure data structures only. No logic.
2.  **Services (`services.rs`)**: Pure business logic (e.g., geometry math, AI interpretation). **Must be testable in isolation.**
3.  **Handlers (`handlers.rs`)**: Web layer only. Extract data from `Json`/`Path`, call a Service, and return a Response. **No complex logic here.**
4.  **State (`state.rs`)**: Global state management.

### Frontend (React)
1.  **Hooks (`hooks/`)**: All stateful logic (selection, mouse position, API calls) must reside here. **View components should be logic-light.**
2.  **Utils (`utils/`)**: All math and formatting (unit conversion, intersection checks) must be pure functions in `utils/`.
3.  **API (`api/`)**: All `fetch` calls must be encapsulated here. Components should never call `fetch` directly.
4.  **Components**:
    - **Container/Page** (e.g., `BlueprintEditor`): Composes hooks and sub-components.
    - **Presentational** (e.g., `Toolbar`): Receives data/callbacks via props. Minimal internal state.

## 🧪 Testing

### Backend (Rust)
Unit and integration tests are located in `api/src/services.rs` and `api/tests/`.
```bash
# Run all backend tests
cd layout-lens/api
export PATH="$HOME/.cargo/bin:$PATH" # Ensure cargo is in PATH
cargo test
```

### Frontend (React)
Tests are powered by Vitest and React Testing Library. Test files are co-located with source files using the `.test.ts` or `.test.tsx` suffix (e.g., `utils/geometry.test.ts`, `components/Editor/Toolbar.test.tsx`).
```bash
# Run all frontend tests
cd layout-lens/web
npm test -- --run
```
