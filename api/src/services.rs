use crate::models::{
    Element, Point, Project, Room, SemanticProject
};
use serde_json::Value;
use uuid::Uuid;

pub fn interpret_semantic_logic(payload: SemanticProject) -> Project {
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
    
    project
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{SemanticRoom, SemanticWall, SemanticFeature};
    use serde_json::json;

    #[test]
    fn test_interpret_simple_room() {
        let payload = SemanticProject {
            unit: "imperial".to_string(),
            rooms: vec![SemanticRoom {
                name: "Test Room".to_string(),
                width: 10.0,
                length: 10.0,
                walls: vec![],
            }],
        };

        let project = interpret_semantic_logic(payload);
        
        // 10x10 room = 4 walls. 
        // Imperial 1 unit = 50px. 10 units = 500px.
        // Perimeter = 500 * 4 = 2000px total length roughly.
        // Actually 4 distinct walls.
        
        assert_eq!(project.rooms.len(), 1);
        assert_eq!(project.elements.len(), 4); // 4 walls

        let room = &project.rooms[0];
        assert_eq!(room.name, "Test Room");
    }

    #[test]
    fn test_interpret_room_with_window() {
        let payload = SemanticProject {
            unit: "imperial".to_string(),
            rooms: vec![SemanticRoom {
                name: "Window Room".to_string(),
                width: 10.0,
                length: 10.0,
                walls: vec![SemanticWall {
                    side: "top".to_string(),
                    features: vec![SemanticFeature {
                        feature_type: "window".to_string(),
                        width: 4.0,
                        height: 3.0,
                        position: json!("center"),
                    }],
                }],
            }],
        };

        let project = interpret_semantic_logic(payload);
        
        // Top wall should be split: Wall -> Window -> Wall.
        // Plus Right, Bottom, Left (3 walls).
        // Total elements = 3 + 3 = 6.
        
        assert_eq!(project.elements.len(), 6);
        
        let windows: Vec<_> = project.elements.iter().filter(|e| e.element_type == "window").collect();
        assert_eq!(windows.len(), 1);
        assert_eq!(windows[0].thickness, 10.0);
    }

    #[test]
    fn test_interpret_metric_vs_imperial() {
        // Metric: 1 unit = 164.0 px
        let payload_metric = SemanticProject {
            unit: "metric".to_string(),
            rooms: vec![SemanticRoom {
                name: "Metric Room".to_string(),
                width: 1.0,
                length: 1.0,
                walls: vec![],
            }],
        };
        let project_metric = interpret_semantic_logic(payload_metric);
        // Room width should be 164.0
        // Calculate width from points: top-left to top-right
        let r_metric = &project_metric.rooms[0];
        let width_metric = r_metric.points[1].x - r_metric.points[0].x;
        assert!((width_metric - 164.0).abs() < 0.001);

        // Imperial: 1 unit = 50.0 px
        let payload_imperial = SemanticProject {
            unit: "imperial".to_string(),
            rooms: vec![SemanticRoom {
                name: "Imperial Room".to_string(),
                width: 1.0,
                length: 1.0,
                walls: vec![],
            }],
        };
        let project_imperial = interpret_semantic_logic(payload_imperial);
        let r_imperial = &project_imperial.rooms[0];
        let width_imperial = r_imperial.points[1].x - r_imperial.points[0].x;
        assert!((width_imperial - 50.0).abs() < 0.001);
    }

    #[test]
    fn test_wall_connectivity() {
        let payload = SemanticProject {
            unit: "imperial".to_string(),
            rooms: vec![SemanticRoom {
                name: "Connected Room".to_string(),
                width: 10.0,
                length: 10.0,
                walls: vec![],
            }],
        };
        let project = interpret_semantic_logic(payload);
        
        // We expect 4 walls.
        // Wall 0 End should == Wall 1 Start
        // Wall 1 End should == Wall 2 Start
        // Wall 2 End should == Wall 3 Start
        // Wall 3 End should == Wall 0 Start (Closed loop)
        
        // Note: The `interpret_semantic_logic` function pushes elements to `project.elements`.
        // The order of insertion in the loop is Top, Right, Bottom, Left.
        
        let elements = &project.elements;
        assert_eq!(elements.len(), 4);

        // Allow small float error
        let epsilon = 0.001;

        // Top -> Right
        assert!((elements[0].end.x - elements[1].start.x).abs() < epsilon);
        assert!((elements[0].end.y - elements[1].start.y).abs() < epsilon);

        // Right -> Bottom
        assert!((elements[1].end.x - elements[2].start.x).abs() < epsilon);
        assert!((elements[1].end.y - elements[2].start.y).abs() < epsilon);

        // Bottom -> Left
        assert!((elements[2].end.x - elements[3].start.x).abs() < epsilon);
        assert!((elements[2].end.y - elements[3].start.y).abs() < epsilon);

        // Left -> Top
        assert!((elements[3].end.x - elements[0].start.x).abs() < epsilon);
        assert!((elements[3].end.y - elements[0].start.y).abs() < epsilon);
    }
}
