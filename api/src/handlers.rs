use axum::{
    extract::{Path, Json},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;
use crate::models::{Project, SemanticProject};
use crate::state::PROJECTS;
use crate::services::interpret_semantic_logic;
use crate::ai;

#[derive(serde::Deserialize)]
pub struct AiPrompt {
    pub prompt: String,
}

pub async fn health_check() -> &'static str {
    "OK"
}

pub async fn create_project(Json(payload): Json<Project>) -> Json<Project> {
    let mut projects = PROJECTS.lock().unwrap();
    let mut new_project = payload;
    if new_project.id.is_empty() {
        new_project.id = Uuid::new_v4().to_string();
    }
    projects.push(new_project.clone());
    Json(new_project)
}

pub async fn update_project(Path(id): Path<String>, Json(payload): Json<Project>) -> Json<Project> {
    let mut projects = PROJECTS.lock().unwrap();
    if let Some(proj) = projects.iter_mut().find(|p| p.id == id) {
        *proj = payload.clone();
    } else {
        projects.push(payload.clone());
    }
    Json(payload)
}

pub async fn get_projects() -> Json<Vec<Project>> {
    let projects = PROJECTS.lock().unwrap();
    Json(projects.clone())
}

pub async fn get_project(Path(id): Path<String>) -> Json<Option<Project>> {
    let projects = PROJECTS.lock().unwrap();
    Json(projects.iter().find(|p| p.id == id).cloned())
}

pub async fn interpret_semantic(Json(payload): Json<SemanticProject>) -> Json<Project> {
    let project = interpret_semantic_logic(payload);
    Json(project)
}

pub async fn generate_ai_layout(Json(payload): Json<AiPrompt>) -> impl IntoResponse {
    match ai::generate_semantic_project(payload.prompt).await {
        Ok(semantic_proj) => {
            let project = interpret_semantic_logic(semantic_proj);
            (StatusCode::OK, Json(project)).into_response()
        },
        Err(e) => {
            (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
        }
    }
}
