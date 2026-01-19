use api::create_router;
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt; // for `oneshot`
use serde_json::{json, Value};

#[tokio::test]
async fn test_health_check() {
    let app = create_router();

    let response = app
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_interpret_endpoint() {
    let app = create_router();

    let payload = json!({
        "unit": "imperial",
        "rooms": [{
            "name": "Integration Room",
            "width": 12.0,
            "length": 14.0,
            "walls": []
        }]
    });

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/interpret")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&payload).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let body_json: Value = serde_json::from_slice(&body_bytes).unwrap();

    assert_eq!(body_json["rooms"][0]["name"], "Integration Room");
    // Check generated elements count (12x14 room = 4 walls)
    assert_eq!(body_json["elements"].as_array().unwrap().len(), 4);
}

#[tokio::test]
async fn test_project_crud() {
    let app = create_router();

    // 1. Create Project
    let new_project = json!({
        "id": "test-uuid-123",
        "name": "CRUD Project",
        "rooms": [],
        "elements": []
    });

    let create_res = app.clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/projects")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_project).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(create_res.status(), StatusCode::OK);

    // 2. Get Project
    let get_res = app.clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/projects/test-uuid-123")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(get_res.status(), StatusCode::OK);
    
    let body_bytes = axum::body::to_bytes(get_res.into_body(), usize::MAX).await.unwrap();
    let body_json: Value = serde_json::from_slice(&body_bytes).unwrap();
    
    assert_eq!(body_json["name"], "CRUD Project");
}
