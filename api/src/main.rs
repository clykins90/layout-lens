use axum::{
    extract::{Path, Json},
    routing::{get, post, put},
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;
use uuid::Uuid;
use std::sync::{Arc, Mutex};
use serde_json::Value;

// --- Data Models ---

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Point {
    x: f32,
    y: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct VerticalItem {
    id: String,
    item_type: String, // "switch", "outlet", "sconce", "frame", "tv", "picture", "arch", "circle"
    x: f32,
    y: f32,
    #[serde(default)]
    width: f32,
    #[serde(default)]
    height: f32,
}

fn default_element_type() -> String { "wall".to_string() }
fn default_wall_height() -> f32 { 400.0 }

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Element {
    id: String,
    start: Point,
    end: Point,
    thickness: f32,
    #[serde(default = "default_element_type")]
    element_type: String, // "wall", "window", "door", "opening"
    #[serde(default = "default_wall_height")]
    height: f32,
    #[serde(default)]
    curvature: f32, 
    #[serde(default)]
    items: Vec<VerticalItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Room {
    id: String,
    name: String,
    points: Vec<Point>,
    label_pos: Point,
    #[serde(rename = "wallIds")]
    wall_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Project {
    id: String,
    name: String,
    elements: Vec<Element>,
    rooms: Vec<Room>,
}

// --- Semantic Data Structures (LLM Interface) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SemanticFeature {
    #[serde(rename = "type")]
    feature_type: String, // "window", "door", "opening"
    width: f32,
    #[serde(default)]
    height: f32,
    position: Value, // Can be String("center") or Number(f32)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SemanticWall {
    side: String, // "top", "right", "bottom", "left"
    #[serde(default)]
    features: Vec<SemanticFeature>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SemanticRoom {
    name: String,
    width: f32,
    length: f32,
    #[serde(default)]
    walls: Vec<SemanticWall>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SemanticProject {
    #[serde(default = "default_unit")]
    unit: String, // "imperial", "metric"
    rooms: Vec<SemanticRoom>,
}

fn default_unit() -> String { "imperial".to_string() }

// --- Logic ---

async fn health_check() -> &'static str {
    "OK"
}

// In-memory store (simplified for prototype)
// In a real app, use a DB.
lazy_static::lazy_static! {
    static ref PROJECTS: Arc<Mutex<Vec<Project>>> = Arc::new(Mutex::new(Vec::new()));
}

async fn create_project(Json(payload): Json<Project>) -> Json<Project> {
    let mut projects = PROJECTS.lock().unwrap();
    let mut new_project = payload;
    if new_project.id.is_empty() {
        new_project.id = Uuid::new_v4().to_string();
    }
    projects.push(new_project.clone());
    Json(new_project)
}

async fn update_project(Path(id): Path<String>, Json(payload): Json<Project>) -> Json<Project> {
    let mut projects = PROJECTS.lock().unwrap();
    if let Some(proj) = projects.iter_mut().find(|p| p.id == id) {
        *proj = payload.clone();
    } else {
        projects.push(payload.clone());
    }
    Json(payload)
}

async fn get_projects() -> Json<Vec<Project>> {
    let projects = PROJECTS.lock().unwrap();
    Json(projects.clone())
}

async fn get_project(Path(id): Path<String>) -> Json<Option<Project>> {
    let projects = PROJECTS.lock().unwrap();
    Json(projects.iter().find(|p| p.id == id).cloned())
}

async fn interpret_semantic(Json(payload): Json<SemanticProject>) -> Json<Project> {
    let mut project = Project {
        id: Uuid::new_v4().to_string(),
        name: "Generated Project".to_string(),
        elements: vec![],
        rooms: vec![],
    };

    let px_per_unit = if payload.unit == "metric" { 164.0 } else { 50.0 }; // 1m=164px or 1ft=50px
    let mut offset_x = 100.0;
    
    for s_room in payload.rooms {
        let r_width = s_room.width * px_per_unit;
        let r_length = s_room.length * px_per_unit;
        let start_x = offset_x;
        let start_y = 100.0;

        // Vertices (Clockwise from Top-Left)
        let p_tl = Point { x: start_x, y: start_y };
        let p_tr = Point { x: start_x + r_width, y: start_y };
        let p_br = Point { x: start_x + r_width, y: start_y + r_length };
        let p_bl = Point { x: start_x, y: start_y + r_length };

        let room_points = vec![p_tl.clone(), p_tr.clone(), p_br.clone(), p_bl.clone()];
        let mut wall_ids = vec![];

        // Define Walls: Top, Right, Bottom, Left
        let definitions = vec![
            ("top", p_tl.clone(), p_tr.clone()),
            ("right", p_tr.clone(), p_br.clone()),
            ("bottom", p_br.clone(), p_bl.clone()),
            ("left", p_bl.clone(), p_tl.clone()),
        ];

        for (side, start, end) in definitions {
            let wall_len = ((end.x - start.x).powi(2) + (end.y - start.y).powi(2)).sqrt();
            let s_wall = s_room.walls.iter().find(|w| w.side == side);
            
            let mut stops: Vec<(f32, f32, String)> = vec![];

            if let Some(sw) = s_wall {
                for feat in &sw.features {
                    let f_width_px = feat.width * px_per_unit;
                    let center_dist = match &feat.position {
                        Value::String(s) if s == "center" => wall_len / 2.0,
                        Value::Number(n) => n.as_f64().unwrap_or(0.0) as f32 * px_per_unit,
                        _ => 0.0,
                    };
                    let f_start = center_dist - (f_width_px / 2.0);
                    let f_end = center_dist + (f_width_px / 2.0);
                    let f_start = f_start.max(0.0);
                    let f_end = f_end.min(wall_len);
                    stops.push((f_start, f_end, feat.feature_type.clone()));
                }
            }
            
            stops.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

            let mut cursor = 0.0;
            let dx = end.x - start.x;
            let dy = end.y - start.y;
            let ux = dx / wall_len;
            let uy = dy / wall_len;

            for (s, e, f_type) in stops {
                if s > cursor {
                    let w_start = Point { x: start.x + ux * cursor, y: start.y + uy * cursor };
                    let w_end = Point { x: start.x + ux * s, y: start.y + uy * s };
                    let wid = Uuid::new_v4().to_string();
                    project.elements.push(Element {
                        id: wid.clone(), start: w_start, end: w_end, thickness: 10.0, element_type: "wall".to_string(), height: 400.0, curvature: 0.0, items: vec![]
                    });
                    wall_ids.push(wid);
                }
                let f_start = Point { x: start.x + ux * s, y: start.y + uy * s };
                let f_end = Point { x: start.x + ux * e, y: start.y + uy * e };
                let fid = Uuid::new_v4().to_string();
                project.elements.push(Element {
                    id: fid.clone(), start: f_start, end: f_end, thickness: 10.0, element_type: f_type, height: 400.0, curvature: 0.0, items: vec![]
                });
                wall_ids.push(fid);
                cursor = e;
            }

            if cursor < wall_len {
                let w_start = Point { x: start.x + ux * cursor, y: start.y + uy * cursor };
                let w_end = end.clone();
                let wid = Uuid::new_v4().to_string();
                project.elements.push(Element {
                    id: wid.clone(), start: w_start, end: w_end, thickness: 10.0, element_type: "wall".to_string(), height: 400.0, curvature: 0.0, items: vec![]
                });
                wall_ids.push(wid);
            }
        }

        project.rooms.push(Room {
            id: Uuid::new_v4().to_string(),
            name: s_room.name,
            points: room_points,
            label_pos: Point { x: start_x + r_width/2.0, y: start_y + r_length/2.0 },
            wall_ids,
        });

        offset_x += r_width + 100.0; 
    }

    Json(project)
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/projects", post(create_project).get(get_projects))
        .route("/projects/{id}", put(update_project).get(get_project))
        .route("/interpret", post(interpret_semantic))
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Listening on 3000");
    axum::serve(listener, app).await.unwrap();
}
