# Current Phase: Visual Integration (Phase 3)

**Goal:** Connect the abstract 2D blueprint with real-world imagery to provide context and "Reality Mapping".

## Active Tasks

### 1. Backend: Image Storage
- [ ] Implement `axum_extra` / `multipart` support in `api/src/main.rs`.
- [ ] Create `/upload` endpoint to save images to local disk (or S3 in production).
- [ ] Return public URLs for uploaded assets.

### 2. Frontend: Camera Tool
- [ ] Add "Camera" (📷) to the Sidebar Tools.
- [ ] Interaction: Click to place camera, drag to set "View Angle" (cone of vision).
- [ ] Store `cameras` in the `Project` model (x, y, rotation, image_url).

### 3. Frontend: Photo Viewer
- [ ] When a Camera icon is clicked, open a modal or overlay showing the linked photo.
- [ ] Allow uploading a file to an empty Camera hotspot.

## Recent Completions
- **Magic Build:** AI-driven room generation.
- **Curved Walls:** Support for bay windows and turrets.
- **Elevation Editor:** Detailed wall styling.
