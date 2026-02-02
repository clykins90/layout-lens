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

pub async fn generate_wall_image(diagram_data_url: String, prompt: Option<String>) -> Result<String, String> {
    let api_key = env::var("GEMINI_API_KEY").map_err(|_| "GEMINI_API_KEY not set".to_string())?;
    let model = env::var("GEMINI_MODEL")
        .unwrap_or_else(|_| "gemini-2.0-flash-exp-image-generation".to_string());
    let client = Client::new();

    let (mime_type, image_data) = parse_data_url(&diagram_data_url)?;
    let prompt = match prompt {
        Some(value) if !value.trim().is_empty() => value,
        _ => default_wall_image_prompt().to_string(),
    };

    let response = client
        .post(format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, api_key
        ))
        .json(&json!({
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        { "text": prompt },
                        { "inlineData": { "mimeType": mime_type, "data": image_data } }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "responseModalities": ["IMAGE"]
            }
        }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API Error {}: {}", status, text));
    }

    let body: Value = response.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let (result_data, result_mime) = extract_inline_image(&body)?;
    Ok(format!("data:{};base64,{}", result_mime, result_data))
}

fn default_wall_image_prompt() -> &'static str {
    "Create a photorealistic interior wall rendering from this elevation diagram. Keep wall size, openings, and item positions accurate. Use a clean modern style, neutral materials, and soft daylight. Straight-on camera view."
}

fn parse_data_url(input: &str) -> Result<(String, String), String> {
    if let Some((prefix, data)) = input.split_once(',') {
        if let Some(mime_segment) = prefix.strip_prefix("data:") {
            let mime_type = mime_segment
                .split(';')
                .next()
                .filter(|value| !value.is_empty())
                .unwrap_or("image/png")
                .to_string();
            if data.is_empty() {
                return Err("Empty image data".to_string());
            }
            return Ok((mime_type, data.to_string()));
        }
    }

    if input.is_empty() {
        return Err("Empty image data".to_string());
    }

    Ok(("image/png".to_string(), input.to_string()))
}

fn extract_inline_image(body: &Value) -> Result<(String, String), String> {
    let candidates = body["candidates"]
        .as_array()
        .ok_or("No candidates in Gemini response")?;

    for candidate in candidates {
        let parts = match candidate.get("content").and_then(|content| content.get("parts")).and_then(|value| value.as_array()) {
            Some(parts) => parts,
            None => continue,
        };

        for part in parts {
            let inline_data = part.get("inlineData").or_else(|| part.get("inline_data"));
            let inline_data = match inline_data {
                Some(data) => data,
                None => continue,
            };

            let data = inline_data.get("data").and_then(Value::as_str);
            if let Some(data) = data {
                let mime_type = inline_data
                    .get("mimeType")
                    .or_else(|| inline_data.get("mime_type"))
                    .and_then(Value::as_str)
                    .unwrap_or("image/png");
                return Ok((data.to_string(), mime_type.to_string()));
            }
        }
    }

    Err("No image data returned by Gemini".to_string())
}
