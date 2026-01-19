use serde::{Deserialize, Serialize};
use serde_json::Value;

// --- Data Models ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VerticalItem {
    pub id: String,
    pub item_type: String, // "switch", "outlet", "sconce", "frame", "tv", "picture", "arch", "circle"
    pub x: f32,
    pub y: f32,
    #[serde(default)]
    pub width: f32,
    #[serde(default)]
    pub height: f32,
}

fn default_element_type() -> String { "wall".to_string() }
fn default_wall_height() -> f32 { 400.0 }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Element {
    pub id: String,
    pub start: Point,
    pub end: Point,
    pub thickness: f32,
    #[serde(default = "default_element_type")]
    pub element_type: String, // "wall", "window", "door", "opening"
    #[serde(default = "default_wall_height")]
    pub height: f32,
    #[serde(default)]
    pub curvature: f32, 
    #[serde(default)]
    pub items: Vec<VerticalItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub points: Vec<Point>,
    pub label_pos: Point,
    #[serde(rename = "wallIds")]
    pub wall_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub elements: Vec<Element>,
    pub rooms: Vec<Room>,
}

// --- Semantic Data Structures (LLM Interface) ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SemanticFeature {
    #[serde(rename = "type")]
    pub feature_type: String, // "window", "door", "opening"
    pub width: f32,
    #[serde(default)]
    pub height: f32,
    pub position: Value, // Can be String("center") or Number(f32)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SemanticWall {
    pub side: String, // "top", "right", "bottom", "left"
    #[serde(default)]
    pub features: Vec<SemanticFeature>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SemanticRoom {
    pub name: String,
    pub width: f32,
    pub length: f32,
    #[serde(default)]
    pub walls: Vec<SemanticWall>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SemanticProject {
    #[serde(default = "default_unit")]
    pub unit: String, // "imperial", "metric"
    pub rooms: Vec<SemanticRoom>,
}

fn default_unit() -> String { "imperial".to_string() }
