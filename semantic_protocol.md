# Semantic Room Protocol (LLM Interface)

The LLM should output JSON conforming to this structure. The Backend will calculate all (x,y) coordinates.

## JSON Structure

```json
{
  "unit": "imperial", // "imperial" (feet) or "metric" (meters)
  "rooms": [
    {
      "name": "Living Room",
      "width": 20,      // Dimension X
      "length": 15,     // Dimension Y
      "walls": [
        { 
          "side": "top", // top, right, bottom, left
          "features": [
            { 
              "type": "window", 
              "width": 4, 
              "position": "center" // "center" OR numeric offset from start of wall
            }
          ]
        },
        {
          "side": "right",
          "features": [
            { "type": "door", "width": 3, "position": 2 } // 2 units from the top-right corner moving down
          ]
        }
      ]
    }
  ]
}
```

## Logic
1. The builder assumes a rectangular starting point centered at (0,0) or arranged in a grid if multiple rooms.
2. **Sides:**
   - `top`: Moves Left -> Right
   - `right`: Moves Top -> Bottom
   - `bottom`: Moves Right -> Left
   - `left`: Moves Bottom -> Top
3. **Features:**
   - `window`, `door`, `opening`
   - `position`: If "center", it is placed at `wall_length / 2`. If number, it is distance from the wall's start vertex.
