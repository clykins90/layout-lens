use axum::{
    routing::{get, post, put},
    Router,
};
use tower_http::cors::CorsLayer;
use crate::handlers::{health_check, create_project, get_projects, update_project, get_project, interpret_semantic};

pub fn create_router() -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/projects", post(create_project).get(get_projects))
        .route("/projects/{id}", put(update_project).get(get_project))
        .route("/interpret", post(interpret_semantic))
        .layer(CorsLayer::permissive())
}
