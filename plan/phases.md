# LayoutLens Roadmap & Phases

## Vision
LayoutLens bridges the gap between abstract 2D floor plans and real-world visualization.

## Phases

### ✅ Phase 1: Foundation (Completed)
*   **Backend:** Rust Axum server setup, In-memory Project persistence.
*   **Frontend:** Vite/React setup, Konva 2D Canvas.
*   **Features:** Grid snapping, Straight Wall drawing, Room polygon creation.

### ✅ Phase 2: Advanced Geometry & Detail (Completed)
*   **Vertical Editor:** Elevation view for walls. Placement of Switches, Outlets, Sconces, TVs, Pictures.
*   **Curved Walls:** Quadratic Bézier curve support for non-rectangular rooms.
*   **Magic Build:** Natural Language Processing (Simulated LLM) -> Semantic JSON -> Geometry generation.
*   **Precision:** Imperial (Ft/In) vs Metric (Meters) toggles. Fine/Coarse grid snapping.

### 🚧 Phase 3: Visual Integration (Current)
*   **Photo Uploads:** Backend endpoint to store user images.
*   **Camera Tool:** Place "hotspots" on the 2D plan representing camera position and angle.
*   **Photo Mapping:** Link uploads to hotspots for context.

### 🔮 Phase 4: Styling & Intelligence (Future)
*   **Furniture Library:** Drag-and-drop structural furniture.
*   **Generative AI:** Inpainting to "re-style" uploaded photos based on plan changes.
*   **Design Assistant:** LLM-driven suggestions for furniture layout.
