use crate::models::SemanticProject;
use reqwest::Client;
use serde_json::{json, Value};
use std::env;

pub async fn generate_semantic_project(prompt: String) -> Result<SemanticProject, String> {
    let api_key = env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY not set".to_string())?;
    let client = Client::new();

    let system_prompt = r#"#;
    You are a layout architect AI. Your goal is to convert natural language requests into a strict Semantic JSON structure that a geometry engine can render.

    ### The Protocol
    You must output JSON that matches this structure EXACTLY:
    {
      "unit": "imperial" | "metric",
      "rooms": [
        {
          "name": "string", // e.g., "Master Bedroom"
          "width": number,  // e.g., 15
          "length": number, // e.g., 20
          "walls": [
            {
              "side": "top" | "right" | "bottom" | "left",
              "features": [
                {
                  "type": "window" | "door" | "opening",
                  "width": number,
                  "position": "center" | number // "center" is preferred. number is offset from start of wall.
                }
              ]
            }
          ]
        }
      ]
    }

    ### Rules
    1. **Defaults:** If unit is unspecified, use "imperial". If dimensions are vague, assume a standard 12x12 room.
    2. **Wall Sides:**
       - "top": The North wall (Left to Right).
       - "right": The East wall (Top to Bottom).
       - "bottom": The South wall (Right to Left).
       - "left": The West wall (Bottom to Top).
    3. **Positioning:** If the user says "window on the left", place it in the `left` wall's feature array.
    4. **Output:** Return ONLY the raw JSON. No markdown, no preambles.
    "#;

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&json!({
            "model": "gpt-4o",
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": prompt }
            ],
            "temperature": 0.2, // Low temperature for deterministic JSON
            "response_format": { "type": "json_object" }
        }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API Error {}: {}", status, text));
    }

    let body: Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    
    let content = body["choices"][0]["message"]["content"]
        .as_str()
        .ok_or("No content in response")?;

    // Validate against our struct
    let semantic_project: SemanticProject = serde_json::from_str(content)
        .map_err(|e| format!("JSON Validation Error: {} \nRaw Content: {}", e, content))?;

    Ok(semantic_project)
}
