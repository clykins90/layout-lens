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
