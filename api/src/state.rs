use std::sync::{Arc, Mutex};
use crate::models::Project;

// In-memory store (simplified for prototype)
// In a real app, use a DB.
lazy_static::lazy_static! {
    pub static ref PROJECTS: Arc<Mutex<Vec<Project>>> = Arc::new(Mutex::new(Vec::new()));
}
