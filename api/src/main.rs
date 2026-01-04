use axum::{
    routing::{get, post},
    Router,
    Json,
    extract::{Path, State},
};
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, RwLock};
use tower_http::cors::{CorsLayer, Any};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Point {
    x: f32,
    y: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Wall {
    id: String,
    start: Point,
    end: Point,
    thickness: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Project {
    id: String,
    name: String,
    walls: Vec<Wall>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CreateProject {
    name: String,
}

type AppState = Arc<RwLock<HashMap<String, Project>>>;

#[tokio::main]
async fn main() {
    let state: AppState = Arc::new(RwLock::new(HashMap::new()));

    // Initialize CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build our application with routes
    // Axum 0.8 uses {id} for path params
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/projects", post(create_project))
        .route("/projects/{id}", get(get_project).put(update_project))
        .layer(cors)
        .with_state(state);

    // Run it
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> Json<Value> {
    Json(json!({ "status": "ok", "message": "LayoutLens API is running" }))
}

async fn create_project(
    State(state): State<AppState>,
    Json(payload): Json<CreateProject>,
) -> Json<Project> {
    let id = Uuid::new_v4().to_string();
    let project = Project {
        id: id.clone(),
        name: payload.name,
        walls: Vec::new(),
    };

    state.write().unwrap().insert(id, project.clone());
    Json(project)
}

async fn get_project(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<Project>, (axum::http::StatusCode, String)> {
    let state = state.read().unwrap();
    if let Some(project) = state.get(&id) {
        Ok(Json(project.clone()))
    } else {
        Err((axum::http::StatusCode::NOT_FOUND, "Project not found".to_string()))
    }
}

async fn update_project(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(updated_project): Json<Project>,
) -> Result<Json<Project>, (axum::http::StatusCode, String)> {
    let mut state = state.write().unwrap();
    if state.contains_key(&id) {
        state.insert(id, updated_project.clone());
        Ok(Json(updated_project))
    } else {
        Err((axum::http::StatusCode::NOT_FOUND, "Project not found".to_string()))
    }
}