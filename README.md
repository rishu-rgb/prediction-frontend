# AI-based Natural Disaster Early Warning System - India

## 🎯 Overview

A production-ready frontend for visualizing AI-driven natural disaster predictions on an interactive map. Currently supports Manipur state with 16 districts, designed for nationwide scalability.

## 🏗️ Architecture

### Technology Stack
- **Framework**: React 18
- **Mapping**: Leaflet + React-Leaflet (OpenStreetMap-based)
- **Build Tool**: Vite
- **Styling**: Inline CSS (no external dependencies)

### Why This Stack?
- **Leaflet**: Open-source, no API keys required, excellent OSM integration
- **React**: Component-based, maintainable, scalable
- **Vite**: Fast development, optimized production builds

## 📊 Data Flow

```
User Selects District
    ↓
Frontend removes spaces from district name (ImphalWest → ImphalWest)
    ↓
GET /api/v1/status?district=ImphalWest
    ↓
Backend returns array of risk cells (40-50 objects)
    ↓
Frontend processes and renders on map
```

## 🗺️ Map Visualization Logic

### Risk Cell Rendering

Each backend response object:
```javascript
{
  "bounds": {
    "minLat": 24.78515625,
    "minLon": 93.9111328125,
    "maxLat": 24.8291015625,
    "maxLon": 93.955078125
  },
  "risk_percentage": 72,
  "updated_at": "2026-01-28T14:24:18.983Z"
}
```

**Rendering Process:**
1. Extract bounds: Southwest corner `(minLat, minLon)`, Northeast corner `(maxLat, maxLon)`
2. Create Rectangle overlay using Leaflet
3. Apply color based on risk:
   - `risk < 30` → Green (#22c55e)
   - `30 ≤ risk < 60` → Orange (#f97316)
   - `risk ≥ 60` → Red (#ef4444)
4. Set semi-transparency (fillOpacity: 0.4) to see roads underneath
5. Add border (weight: 2) for cell visibility

### Interactive Features

**Hover Tooltips (Popup on Click):**
- Risk percentage
- Risk level (Low/Moderate/High)
- Last updated timestamp (formatted in IST)
- Contextual warnings for moderate/high risk zones

**Auto-Centering:**
- Map automatically pans and zooms to selected district
- Each district has pre-configured optimal zoom levels
- Maintains full context of surrounding areas

## 🚨 Road Safety & Warning System

### Road Visualization
- **Base Layer**: OpenStreetMap tiles show all roads, rivers, terrain
- Roads are visible through semi-transparent risk overlays
- Natural map detail preserved for navigation context

### Road Intersection Logic

**Current Implementation (Smart Simulation):**
```javascript
// Analyzes high-risk cells (risk ≥ 30%)
// Generates contextual warnings based on risk distribution
// Displays banner alerts above map
```

**Warning Types:**
1. **Landslide Zones (Red cells, risk ≥ 60%)**
   - Message: "Road sections may be blocked"
   - Implication: Physical obstruction likely
   - Recommendation: Use alternative routes

2. **Flood Zones (Orange cells, 30% ≤ risk < 60%)**
   - Message: "Move to higher elevation areas"
   - Visual Guide: Green cells indicate safer zones
   - Strategy: Vertical evacuation

### Real-World Enhancement Path

For production deployment, implement actual road intersection detection:

```javascript
// Query OSM Overpass API for roads within bounds
const query = `
  [out:json];
  (
    way["highway"](${minLat},${minLon},${maxLat},${maxLon});
  );
  out geom;
`;

// Check if road geometries intersect with high-risk rectangles
// Highlight affected road segments
// Display specific road names in warnings
```

**Why Not Included Now:**
- Requires external API calls (rate-limited)
- Adds complexity for initial deployment
- Current simulation provides equivalent UX for demo/testing

## 🎨 UI/UX Design

### Layout Hierarchy
1. **Header** (Fixed)
   - Professional gradient background
   - Clear system title and tagline

2. **Control Panel** (Sticky)
   - State dropdown (scalable for future states)
   - District dropdown (alphabetically sorted)
   - Live statistics (total cells, risk breakdown)
   - Loading indicator

3. **Alert Banner** (Conditional)
   - Yellow warning for road safety alerts
   - Clear recommendations and affected area count

4. **Map Canvas** (Flex-grow)
   - Full interactivity
   - OpenStreetMap base layer
   - Risk overlays with hover effects
   - Bottom-right legend (floating)

### Color Psychology
- **Blue header**: Trust, authority (government system)
- **Green/Orange/Red risks**: Universal traffic light metaphor
- **Yellow warnings**: Caution, attention-grabbing

## 📱 Responsive Design Considerations

While the current implementation is desktop-first, the flex-based layout adapts reasonably to tablets. For mobile optimization:

```css
/* Add media queries for mobile */
@media (max-width: 768px) {
  /* Stack controls vertically */
  /* Enlarge touch targets */
  /* Simplify statistics display */
}
```

## 🔧 Setup & Installation

### Prerequisites
- Node.js 16+ and npm
- Backend API running (default: localhost:8000)

### Steps

```bash
# Install dependencies
npm install

# Update backend URL in vite.config.js if needed
# Edit the proxy target to match your backend

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Configuration

In `vite.config.js`:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend-url:8000',
      changeOrigin: true,
    }
  }
}
```

## 🚀 Scalability Features

### State Expansion
```javascript
// Add new state in component
const STATES = ['Manipur', 'Assam', 'Meghalaya', ...];

// Add district data
const ASSAM_DISTRICTS = {
  'Kamrup': { center: [26.1844, 91.7458], zoom: 11 },
  // ... more districts
};
```

### District Data Structure
```javascript
// Pre-configured for each district:
{
  center: [lat, lon],  // Optimal map center
  zoom: 10-12          // Appropriate zoom level
}
```

## 📊 Statistics & Monitoring

**Real-time Metrics Displayed:**
- Total cells analyzed
- High-risk zones count (≥60%)
- Moderate-risk zones (30-59%)
- Low-risk zones (<30%)

**Future Enhancements:**
- Historical trend graphs
- Time-series predictions
- Downloadable reports

## 🔒 Error Handling

### Current Implementation
- **API Failures**: Displays user-friendly error banner
- **Network Issues**: Shows loading state, catches fetch errors
- **Invalid Districts**: Prevented by dropdown validation
- **Empty Responses**: Gracefully handles zero cells

### Production Recommendations
```javascript
// Add retry logic
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

// Add request timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
```

## 🎯 Key Technical Decisions

### 1. Rectangle vs Polygon
**Choice**: Rectangles
**Reason**: Geohash cells are inherently rectangular; simpler, faster rendering

### 2. Popup vs Tooltip
**Choice**: Popup (click-to-view)
**Reason**: Cleaner UI, prevents tooltip clutter on dense areas

### 3. Client-side vs Server-side Road Detection
**Choice**: Client-side simulation initially
**Reason**: Faster initial deployment, no external dependencies, equivalent UX for testing

### 4. Inline CSS vs CSS Modules
**Choice**: Inline styles
**Reason**: Zero configuration, component encapsulation, no build complexity

## 📈 Performance Optimization

### Current Optimizations
- Lazy rendering (only visible map tiles loaded)
- Efficient React re-renders (proper state management)
- Lightweight dependencies (no heavy UI frameworks)

### For Large Datasets (1000+ cells)
```javascript
// Implement clustering
import MarkerClusterGroup from 'react-leaflet-cluster';

// Or: Server-side tile generation
// Backend pre-renders risk tiles at different zoom levels
// Frontend fetches tiles instead of individual cells
```

## 🧪 Testing Recommendations

### Unit Tests
```javascript
// Test risk color calculation
test('getRiskColor returns correct colors', () => {
  expect(getRiskColor(20)).toBe('#22c55e');
  expect(getRiskColor(45)).toBe('#f97316');
  expect(getRiskColor(80)).toBe('#ef4444');
});

// Test district name formatting
test('removes spaces from district names', () => {
  expect('Imphal West'.replace(/\s+/g, '')).toBe('ImphalWest');
});
```

### Integration Tests
- Mock API responses
- Test map rendering with sample data
- Verify proper zoom/pan behavior

##  Future Enhancements

1. **Real Road Intersection Detection**
   - OSM Overpass API integration
   - Highlight specific road segments
   - Display road names and IDs

2. **Multi-Hazard Support**
   - Different visualizations for floods vs landslides vs earthquakes
   - Layered risk overlays
   - Toggle between hazard types

3. **Evacuation Routes**
   - Calculate safe paths to low-risk zones
   - Display turn-by-turn directions
   - Identify evacuation centers

4. **Historical Data**
   - Playback prediction timeline
   - Compare current vs past predictions
   - Accuracy metrics

5. **Mobile App**
   - React Native version
   - Offline map caching
   - Push notifications for high-risk alerts

##  Code Structure

```
disaster-warning-system/
├── index.html                      # Entry HTML
├── main.jsx                        # React root
├── disaster-warning-system.jsx     # Main component
├── package.json                    # Dependencies
├── vite.config.js                  # Build config
└── README.md                       # This file
```

### Component Breakdown

**Main Component (`DisasterWarningSystem`)**
- State management (district, cells, warnings, map view)
- API integration (fetch disaster data)
- Conditional rendering (loading, errors, warnings)

**Sub-Components**
- `MapViewController`: Handles map pan/zoom on district change
- `RiskCellsLayer`: Analyzes cells, generates road warnings

**Utility Functions**
- `getRiskColor()`: Maps risk % to color
- `getRiskLevel()`: Returns text description
- `formatTimestamp()`: Converts UTC to IST

## 📞 Support & Contribution

### Common Issues

**Map not loading?**
- Check browser console for CORS errors
- Verify internet connection (OSM tiles load from external server)
- Ensure Leaflet CSS is imported

**API errors?**
- Verify backend is running
- Check proxy configuration in `vite.config.js`
- Inspect network tab for exact error response

**Cells not rendering?**
- Confirm API returns valid lat/lon bounds
- Check if bounds are within Manipur (lat: 24-25.5, lon: 93-94.5)
- Verify `risk_percentage` field exists

### Extending for New States

1. Add state to dropdown options
2. Create district configuration object with center coordinates
3. Update district selection logic to handle multiple states
4. Ensure backend supports new state districts

---

**Built with love for disaster resilience in India**
