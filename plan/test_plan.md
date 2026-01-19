# Test Plan: Layout Lens

## Current Status
- **Coverage:** Partial (Backend Unit & Integration Implemented, Frontend Unit & Component Implemented)
- **Frameworks:**
    - Backend: Rust `cargo test` (built-in).
    - Frontend: Vitest + React Testing Library.

## Strategy

### 1. Backend (Rust)
**Goal:** Verify the Semantic Interpretation Engine and Data Models.

*   **Unit Tests (`api/src/services.rs`):**
    *   **Test Case 1: Basic Room Generation:** Verify a simple "10x10" room generates 4 walls and correct coordinates.
    *   **Test Case 2: Feature Insertion:** Verify adding a "window" splits a wall into 3 segments (Wall -> Window -> Wall).
    *   **Test Case 3: Metric vs Imperial:** Verify `px_per_unit` scaling works correctly.
    *   **Test Case 4: Wall Connectivity:** Ensure end point of Wall A matches start point of Wall B.

*   **Integration Tests (`api/tests/api_tests.rs`):**
    *   **Test Case 1: Project CRUD:** Create a project via API, retrieve it, update it.
    *   **Test Case 2: Interpret Endpoint:** POST to `/interpret` and verify valid JSON response.

### 2. Frontend (React/TypeScript)
**Goal:** Verify Geometry Math and State Logic.

*   **Setup:**
    *   Install `vitest` (faster, Vite-native alternative to Jest) and `@testing-library/react`.

*   **Unit Tests (`web/src/utils/geometry.test.ts`):**
    *   **Geometry:** Test `distance`, `getControlPoint` (bezier math), `calculatePolygonArea`.
    *   **Intersection:** Extensive testing for `doSegmentsOverlap` to prevent invalid wall placements.

*   **Component Tests (`web/src/components/**/*.test.tsx`):**
    *   **Toolbar:** Verify clicking "Save" calls the prop function.
    *   **PropertiesPanel:** Verify input changes trigger update callbacks.

## Implementation Steps

1.  **Backend:**
    *   Add `#[cfg(test)]` module to `api/src/services.rs`.
    *   Implement logic verification tests.

2.  **Frontend:**
    *   Run `npm install -D vitest jsdom @testing-library/react @testing-library/user-event`.
    *   Configure `vite.config.ts` for testing.
    *   Create `web/src/utils/geometry.test.ts`.

3.  **CI/CD (Future):**
    *   Add GitHub Action to run `cargo test` and `npm run test` on PRs.
