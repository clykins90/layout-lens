# LayoutLens: Interior Design Visualization & Planning

## 1. Vision
LayoutLens is a responsive web application designed to empower users to visualize, plan, and modify interior spaces. It bridges the gap between abstract 2D floor plans and concrete visual reality by allowing users to map real-world photos to a scaled top-down diagram. The goal is to facilitate seamless design iteration for personal use or client presentations.

## 2. Core Features

### 2.1. Top-Down Visualization (The Blueprint)
-   **Scale Editor:** A 2D canvas workspace where users can draw rooms to exact measurements (feet and inches).
-   **Object Management:** Drag-and-drop support for structural elements (walls, windows, doors) and furniture.
-   **Layering:** Support for multiple layers (e.g., electrical, furniture, flooring).

### 2.2. Photo Integration (The Reality)
-   **Hotspot Mapping:** Users can upload photos of specific room angles and "pin" them to the top-down diagram (camera position + direction).
-   **Contextual View:** Clicking a camera icon on the blueprint opens the corresponding real-world view.

### 2.3. Modifications & Design
-   **Visual Attributes:** Ability to change wall colors, flooring textures, and furniture styles in the digital model.
-   **Comparison Mode:** "Before" vs. "After" toggles for client presentations.

## 3. Technology Stack (Proposed)

### Frontend
-   **Framework:** React (TypeScript) for a responsive UI.
-   **Graphics Engine:** `Konva.js` or `PixiJS` for high-performance 2D rendering of the floor plan.
-   **State Management:** Zustand or Redux Toolkit.
-   **Styling:** Tailwind CSS for modern, responsive components.

### Backend
-   **Language:** Rust.
-   **Framework:** Axum or Actix-web (High performance, type-safe).
-   **Database:** PostgreSQL (for relational data like Users, Projects) + JSONB (for storing complex canvas scene graphs).
-   **Storage:** AWS S3 (or MinIO compatible) for storing high-res user photos.

## 4. LLM & AI Use Cases

### 4.1. Generative Styling (Visual)
-   **Inpainting/Restyling:** "Paint this wall Sage Green" or "Replace this carpet with hardwood." The backend can send the photo + mask to an image generation model (like Stable Diffusion) to visualize changes.
-   **Style Transfer:** "Make this room look Industrial Chic."

### 4.2. Intelligent Layout Assistant (Spatial)
-   **Constraint Solving:** "Arrange this living room to seat 6 people focused on the TV." The LLM can suggest coordinate placements for furniture based on standard design rules.
-   **Feasibility Checks:** "Will a King-size bed fit on this wall?" (Parsing dimensions and checking against the spatial model).

### 4.3. Product Discovery
-   **Visual Search:** Analyze a user's uploaded photo to identify existing furniture styles and recommend complementary pieces from a catalog.

## 5. Roadmap
1.  **Phase 1: Foundation:** Project setup, Rust backend hello-world, React frontend with basic canvas.
2.  **Phase 2: The Editor:** Implement drawing walls to scale and placing basic shapes.
3.  **Phase 3: Image System:** Uploading photos and placing camera markers on the map.
4.  **Phase 4: AI Integration:** Connecting an LLM/Image Gen API for basic visual modifications.
