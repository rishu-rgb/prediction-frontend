import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Rectangle, Polyline, Popup, useMap, Circle, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ========================================
// SYSTEM CONFIGURATION
// ========================================

const SYSTEM_NAME = "GEO-RISK AI";
const SYSTEM_FULL_NAME = "Disaster Intelligence & Safety Hub for AI-powered India";

// Geographic center coordinates for map navigation
const MAP_VIEWS = {
  world: { center: [20, 0], zoom: 2 },
  india: { center: [22.5, 79], zoom: 5 },
  manipur: { center: [24.8, 93.95], zoom: 9 }
};

// Manipur districts with precise coordinates
const MANIPUR_DISTRICTS = {
  'Bishnupur': { center: [24.6167, 93.7667], zoom: 11 },
  'Chandel': { center: [24.3167, 94.0167], zoom: 10 },
  'Churachandpur': { center: [24.3333, 93.6667], zoom: 10 },
  'ImphalEast': { center: [24.7667, 93.9667], zoom: 11 },
  'ImphalWest': { center: [24.8167, 93.9167], zoom: 11 },
  'Jiribam': { center: [24.8083, 93.1167], zoom: 11 },
  'Kakching': { center: [24.4833, 93.9833], zoom: 11 },
  'Kamjong': { center: [24.8333, 94.4167], zoom: 10 },
  'Kangpokpi': { center: [25.2167, 93.9833], zoom: 10 },
  'Noney': { center: [24.9500, 93.6833], zoom: 10 },
  'Pherzawl': { center: [24.1667, 93.1167], zoom: 10 },
  'Senapati': { center: [25.2667, 94.0167], zoom: 10 },
  'Tamenglong': { center: [24.9833, 93.4833], zoom: 10 },
  'Tengnoupal': { center: [24.3167, 94.1333], zoom: 10 },
  'Thoubal': { center: [24.6333, 94.0000], zoom: 11 },
  'Ukhrul': { center: [25.0500, 94.3667], zoom: 10 }
};

// Calamity types
const CALAMITY_TYPES = {
  LANDSLIDE: 'landslide',
  FLOOD: 'flood'
};

// ========================================
// MAP VIEW CONTROLLER COMPONENT
// ========================================
// Handles smooth zoom transitions when user navigates through hierarchy

function MapViewController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, {
        duration: 1.5, // Smooth animation
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);
  
  return null;
}

// ========================================
// ROAD INTERSECTION DETECTION
// ========================================
// Detects which roads pass through high-risk zones

function detectRoadIntersections(riskCells, calamityType) {
  /**
   * In a production system, this would:
   * 1. Query OSM Overpass API for actual roads within bounds
   * 2. Perform geometric intersection tests
   * 3. Return specific road segments with names
   * 
   * For now, we simulate realistic road alerts based on:
   * - Risk cell locations
   * - Calamity type
   * - Known major roads in Manipur
   */
  
  const alerts = [];
  
  // Filter high-risk cells (moderate + high)
  const highRiskCells = riskCells.filter(cell => cell.risk_percentage >= 30);
  
  if (highRiskCells.length === 0) return [];
  
  // Simulate road detection based on geographic clustering
  const northernRisk = highRiskCells.filter(c => c.bounds.minLat > 24.85);
  const centralRisk = highRiskCells.filter(c => c.bounds.minLat >= 24.7 && c.bounds.minLat <= 24.85);
  const southernRisk = highRiskCells.filter(c => c.bounds.minLat < 24.7);
  
  // Generate contextual alerts
  if (calamityType === CALAMITY_TYPES.LANDSLIDE) {
    if (northernRisk.length > 0) {
      alerts.push({
        id: 'nh2-north',
        road: 'NH-2 (Imphal-Senapati Highway)',
        severity: Math.max(...northernRisk.map(c => c.risk_percentage)),
        cells: northernRisk,
        message: 'Hill road section may experience landslide blockage',
        recommendation: 'Avoid travel on hill sections. Use alternative valley routes if available.'
      });
    }
    
    if (centralRisk.length > 0) {
      alerts.push({
        id: 'imphal-central',
        road: 'Imphal City Ring Road',
        severity: Math.max(...centralRisk.map(c => c.risk_percentage)),
        cells: centralRisk,
        message: 'Slope-adjacent road sections at risk',
        recommendation: 'Monitor conditions. Debris clearance may be required.'
      });
    }
  } else if (calamityType === CALAMITY_TYPES.FLOOD) {
    if (centralRisk.length > 0) {
      alerts.push({
        id: 'imphal-valley',
        road: 'Imphal Valley Low-lying Roads',
        severity: Math.max(...centralRisk.map(c => c.risk_percentage)),
        cells: centralRisk,
        message: 'Low-lying areas may experience flooding',
        recommendation: 'Seek higher elevation. Avoid crossing flooded sections.'
      });
    }
    
    if (southernRisk.length > 0) {
      alerts.push({
        id: 'loktak-roads',
        road: 'Roads near Loktak Lake',
        severity: Math.max(...southernRisk.map(c => c.risk_percentage)),
        cells: southernRisk,
        message: 'Waterlogging expected in lakeside areas',
        recommendation: 'Use elevated bypass routes. Monitor water levels.'
      });
    }
  }
  
  return alerts;
}

// ========================================
// MAIN COMPONENT
// ========================================

function DisasterWarningSystem() {
  // Navigation state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  // Data state
  const [riskCells, setRiskCells] = useState([]);
  const [roadAlerts, setRoadAlerts] = useState([]);
  const [calamityMode, setCalamityMode] = useState(CALAMITY_TYPES.LANDSLIDE);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(MAP_VIEWS.world.center);
  const [mapZoom, setMapZoom] = useState(MAP_VIEWS.world.zoom);
  const [selectedRoadAlert, setSelectedRoadAlert] = useState(null);

  // ========================================
  // MAP NAVIGATION LOGIC
  // ========================================
  
  // Handle country selection
  useEffect(() => {
    if (selectedCountry === 'India') {
      setMapCenter(MAP_VIEWS.india.center);
      setMapZoom(MAP_VIEWS.india.zoom);
    } else if (selectedCountry === '') {
      setMapCenter(MAP_VIEWS.world.center);
      setMapZoom(MAP_VIEWS.world.zoom);
      setSelectedState('');
      setSelectedDistrict('');
      setRiskCells([]);
      setRoadAlerts([]);
    }
  }, [selectedCountry]);
  
  // Handle state selection
  useEffect(() => {
    if (selectedState === 'Manipur') {
      setMapCenter(MAP_VIEWS.manipur.center);
      setMapZoom(MAP_VIEWS.manipur.zoom);
    } else if (selectedState === '' && selectedCountry === 'India') {
      setMapCenter(MAP_VIEWS.india.center);
      setMapZoom(MAP_VIEWS.india.zoom);
      setSelectedDistrict('');
      setRiskCells([]);
      setRoadAlerts([]);
    }
  }, [selectedState, selectedCountry]);

  // ========================================
  // API DATA FETCHING
  // ========================================
  
  const fetchDisasterData = async (district) => {
    setLoading(true);
    setError(null);
    setRiskCells([]);
    setRoadAlerts([]);
    
    try {
      const districtParam = district.replace(/\s+/g, '');
      const response = await fetch(`/api/v1/status/info?area=${districtParam}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const rawCells = data.status || data || [];
      
      // Transform new payload structure:
      // Each cell now has: { bounds, flood: {...}, landslide: {...} }
      // We flatten this into separate cells for flood and landslide
      const transformedCells = [];
      
      rawCells.forEach(cell => {
        // Add flood cell
        if (cell.flood) {
          transformedCells.push({
            bounds: cell.bounds,
            cal_type: cell.flood.cal_type,
            risk_percentage: cell.flood.risk_percentage,
            updated_at: cell.flood.updated_at
          });
        }
        
        // Add landslide cell
        if (cell.landslide) {
          transformedCells.push({
            bounds: cell.bounds,
            cal_type: cell.landslide.cal_type,
            risk_percentage: cell.landslide.risk_percentage,
            updated_at: cell.landslide.updated_at
          });
        }
      });
      
      setRiskCells(transformedCells);
      setLastUpdated(new Date());
      
      // Update map view to district
      if (MANIPUR_DISTRICTS[districtParam]) {
        setMapCenter(MANIPUR_DISTRICTS[districtParam].center);
        setMapZoom(MANIPUR_DISTRICTS[districtParam].zoom);
      }
    } catch (err) {
      setError(`Failed to fetch prediction data: ${err.message}`);
      console.error('Error fetching disaster data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle district selection
  const handleDistrictChange = (e) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    
    if (district) {
      fetchDisasterData(district);
    } else {
      setRiskCells([]);
      setRoadAlerts([]);
      setMapCenter(MAP_VIEWS.manipur.center);
      setMapZoom(MAP_VIEWS.manipur.zoom);
    }
  };

  // ========================================
  // CALAMITY MODE LOGIC
  // ========================================
  
  // Filter cells based on current calamity mode
  const filteredCells = riskCells.filter(cell => cell.cal_type === calamityMode);
  
  // Regenerate road alerts when calamity mode changes or cells update
  useEffect(() => {
    if (filteredCells.length > 0) {
      const alerts = detectRoadIntersections(filteredCells, calamityMode);
      setRoadAlerts(alerts);
    } else {
      setRoadAlerts([]);
    }
  }, [filteredCells.length, calamityMode]);

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  
  const getRiskColor = (riskPercentage) => {
    if (riskPercentage < 30) return '#22c55e';
    if (riskPercentage < 60) return '#f97316';
    return '#ef4444';
  };
  
  const getRiskLevel = (riskPercentage) => {
    if (riskPercentage < 30) return 'Low Risk';
    if (riskPercentage < 60) return 'Moderate Risk';
    return 'High Risk';
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };
  
  const getCalamityIcon = (type) => {
    return type === CALAMITY_TYPES.LANDSLIDE ? '⛰️' : '🌊';
  };
  
  // Calculate statistics
  const stats = {
    total: filteredCells.length,
    highRisk: filteredCells.filter(c => c.risk_percentage >= 60).length,
    moderateRisk: filteredCells.filter(c => c.risk_percentage >= 30 && c.risk_percentage < 60).length,
    lowRisk: filteredCells.filter(c => c.risk_percentage < 30).length
  };
  
  // Handle road alert click
  const handleRoadAlertClick = (alert) => {
    setSelectedRoadAlert(alert);
    // Center map on first affected cell
    if (alert.cells && alert.cells.length > 0) {
      const cell = alert.cells[0];
      const centerLat = (cell.bounds.minLat + cell.bounds.maxLat) / 2;
      const centerLon = (cell.bounds.minLon + cell.bounds.maxLon) / 2;
      setMapCenter([centerLat, centerLon]);
      setMapZoom(12);
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f1f5f9'
    }}>
      {/* ========================================
          HEADER
          ======================================== */}
      <header style={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #f97316 100%)',
        color: 'white',
        padding: '1rem 2rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderBottom: '3px solid #ff9933'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.5rem' }}>🇮🇳</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              {SYSTEM_NAME}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.95 }}>
              {SYSTEM_FULL_NAME}
            </p>
          </div>
          {lastUpdated && (
            <div style={{ 
              marginLeft: 'auto', 
              textAlign: 'right',
              fontSize: '0.85rem',
              opacity: 0.9
            }}>
              <div style={{ fontWeight: 600 }}>Last Updated</div>
              <div>{formatTimestamp(lastUpdated)}</div>
            </div>
          )}
        </div>
      </header>

      {/* ========================================
          NAVIGATION CONTROLS
          ======================================== */}
      <div style={{ 
        padding: '1rem 2rem',
        background: 'white',
        borderBottom: '2px solid #e2e8f0',
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Country:</label>
          <select 
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '2px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.9rem',
              background: 'white',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <option value="">🌍 Select Country</option>
            <option value="India">🇮🇳 India</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>State:</label>
          <select 
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            disabled={!selectedCountry}
            style={{
              padding: '0.5rem 1rem',
              border: '2px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.9rem',
              background: selectedCountry ? 'white' : '#f1f5f9',
              cursor: selectedCountry ? 'pointer' : 'not-allowed',
              fontWeight: 500
            }}
          >
            <option value="">Select State</option>
            <option value="Manipur">Manipur</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>District:</label>
          <select 
            value={selectedDistrict}
            onChange={handleDistrictChange}
            disabled={!selectedState}
            style={{
              padding: '0.5rem 1rem',
              border: '2px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.9rem',
              background: selectedState ? 'white' : '#f1f5f9',
              cursor: selectedState ? 'pointer' : 'not-allowed',
              fontWeight: 500,
              minWidth: '180px'
            }}
          >
            <option value="">Select District</option>
            {Object.keys(MANIPUR_DISTRICTS).sort().map(district => (
              <option key={district} value={district}>
                {district.replace(/([A-Z])/g, ' $1').trim()}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div style={{ 
            color: '#3b82f6', 
            fontSize: '0.9rem', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span className="spinner">⏳</span>
            Loading prediction data...
          </div>
        )}
      </div>

      {/* ========================================
          CALAMITY MODE SELECTOR
          ======================================== */}
      {selectedDistrict && (
        <div style={{
          padding: '1rem 2rem',
          background: 'white',
          borderBottom: '2px solid #e2e8f0',
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setCalamityMode(CALAMITY_TYPES.LANDSLIDE)}
              style={{
                padding: '0.75rem 1.5rem',
                border: calamityMode === CALAMITY_TYPES.LANDSLIDE ? '2px solid #f97316' : '2px solid #cbd5e1',
                borderRadius: '8px',
                background: calamityMode === CALAMITY_TYPES.LANDSLIDE ? '#fff7ed' : 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: calamityMode === CALAMITY_TYPES.LANDSLIDE ? '#c2410c' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              ⛰️ Landslide Prediction
            </button>
            
            <button
              onClick={() => setCalamityMode(CALAMITY_TYPES.FLOOD)}
              style={{
                padding: '0.75rem 1.5rem',
                border: calamityMode === CALAMITY_TYPES.FLOOD ? '2px solid #3b82f6' : '2px solid #cbd5e1',
                borderRadius: '8px',
                background: calamityMode === CALAMITY_TYPES.FLOOD ? '#eff6ff' : 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: calamityMode === CALAMITY_TYPES.FLOOD ? '#1e40af' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              🌊 Flood Prediction
            </button>
          </div>

          {stats.total > 0 && (
            <div style={{ 
              display: 'flex',
              gap: '1rem',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <span style={{ color: '#64748b' }}>Analyzed: {stats.total} cells</span>
              <span style={{ color: '#ef4444' }}>High: {stats.highRisk}</span>
              <span style={{ color: '#f97316' }}>Moderate: {stats.moderateRisk}</span>
              <span style={{ color: '#22c55e' }}>Low: {stats.lowRisk}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================
          ERROR MESSAGE
          ======================================== */}
      {error && (
        <div style={{
          margin: '1rem 2rem 0 2rem',
          padding: '1rem',
          background: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          color: '#991b1b',
          fontWeight: 500
        }}>
          ❌ {error}
        </div>
      )}

      {/* ========================================
          MAIN CONTENT AREA
          ======================================== */}
      <div style={{ flex: 1, display: 'flex', gap: '1rem', padding: '1rem 2rem 2rem 2rem', minHeight: 0 }}>
        
        {/* ========================================
            ROAD ALERTS PANEL
            ======================================== */}
        {roadAlerts.length > 0 && (
          <div style={{
            width: '350px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem',
              background: '#fef3c7',
              borderBottom: '2px solid #fbbf24',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ⚠️ Road Safety Alerts
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {roadAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => handleRoadAlertClick(alert)}
                  style={{
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    background: alert.severity >= 60 ? '#fee2e2' : '#fff7ed',
                    border: `2px solid ${alert.severity >= 60 ? '#ef4444' : '#f97316'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{ 
                    fontWeight: 700, 
                    marginBottom: '0.5rem',
                    color: alert.severity >= 60 ? '#991b1b' : '#c2410c',
                    fontSize: '0.95rem'
                  }}>
                    {alert.road}
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: '#78350f',
                    marginBottom: '0.5rem',
                    fontWeight: 500
                  }}>
                    {getCalamityIcon(calamityMode)} {alert.message}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#78350f',
                    background: 'rgba(255,255,255,0.5)',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    marginTop: '0.5rem'
                  }}>
                    💡 {alert.recommendation}
                  </div>
                  <div style={{ 
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#92400e',
                    fontWeight: 600
                  }}>
                    Risk Level: {alert.severity}% | Affected Cells: {alert.cells.length}
                  </div>
                </div>
              ))}
              
              {/* General Advisory */}
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: calamityMode === CALAMITY_TYPES.LANDSLIDE ? '#fef3c7' : '#dbeafe',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#1e40af'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                  {calamityMode === CALAMITY_TYPES.LANDSLIDE ? '⛰️ Landslide Safety' : '🌊 Flood Safety'}
                </div>
                {calamityMode === CALAMITY_TYPES.LANDSLIDE ? (
                  <div>
                    • Avoid hilly roads in red zones<br/>
                    • Watch for falling debris<br/>
                    • Use valley routes when possible
                  </div>
                ) : (
                  <div>
                    • Move to higher ground immediately<br/>
                    • Avoid crossing flooded areas<br/>
                    • Green zones indicate safer elevation
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {
            // MAP CONTAINER
            }
        <div style={{ 
          flex: 1, 
          position: 'relative', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          background: 'white'
        }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}

            
          >
            {/* OpenStreetMap Base Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Map View Controller */}
            <MapViewController center={mapCenter} zoom={mapZoom} />
            
            {/* Render Risk Rectangles */}
            {filteredCells.map((cell, index) => {
              const bounds = [
                [cell.bounds.minLat, cell.bounds.minLon],
                [cell.bounds.maxLat, cell.bounds.maxLon]
              ];
              const color = getRiskColor(cell.risk_percentage);
              
              // Highlight cells that are part of selected road alert
              const isHighlighted = selectedRoadAlert && 
                selectedRoadAlert.cells.some(c => 
                  c.bounds.minLat === cell.bounds.minLat && 
                  c.bounds.minLon === cell.bounds.minLon
                );
              
              return (
                <Rectangle
                  key={index}
                  bounds={bounds}
                  pathOptions={{
                    color: isHighlighted ? '#fbbf24' : color,
                    fillColor: color,
                    fillOpacity: isHighlighted ? 0.7 : 0.4,
                    weight: isHighlighted ? 3 : 2
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '0.9rem', minWidth: '200px' }}>
                      <div style={{ 
                        fontWeight: 700, 
                        color: color,
                        marginBottom: '0.5rem',
                        fontSize: '1rem'
                      }}>
                        {getCalamityIcon(cell.cal_type)} {getRiskLevel(cell.risk_percentage)}
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Risk:</strong> {cell.risk_percentage}%
                      </div>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Type:</strong> {cell.cal_type.charAt(0).toUpperCase() + cell.cal_type.slice(1)}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                        <strong>Updated:</strong><br/>{formatTimestamp(cell.updated_at)}
                      </div>
                      
                      {cell.risk_percentage >= 60 && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.5rem', 
                          background: '#fee2e2', 
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          color: '#991b1b'
                        }}>
                          <strong>⚠️ HIGH RISK</strong><br/>
                          {cell.cal_type === CALAMITY_TYPES.LANDSLIDE 
                            ? 'Road blockages likely. Avoid area.'
                            : 'Flooding expected. Evacuate to higher ground.'}
                        </div>
                      )}
                      
                      {cell.risk_percentage >= 30 && cell.risk_percentage < 60 && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          padding: '0.5rem', 
                          background: '#fef3c7', 
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          color: '#92400e'
                        }}>
                          <strong>⚡ MODERATE RISK</strong><br/>
                          Stay alert. Monitor conditions closely.
                        </div>
                      )}
                    </div>
                  </Popup>
                </Rectangle>
              );
            })}
          </MapContainer>

          {/* Legend */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: '200px'
          }}>
            <div style={{ 
              fontWeight: 700, 
              marginBottom: '0.75rem', 
              fontSize: '0.95rem',
              color: '#1e293b',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.5rem'
            }}>
              {getCalamityIcon(calamityMode)} {calamityMode === CALAMITY_TYPES.LANDSLIDE ? 'Landslide' : 'Flood'} Risk Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: '#22c55e', 
                  border: '2px solid #16a34a', 
                  borderRadius: '4px' 
                }}></div>
                <span><strong>Low Risk</strong> (&lt;30%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: '#f97316', 
                  border: '2px solid #ea580c', 
                  borderRadius: '4px' 
                }}></div>
                <span><strong>Moderate Risk</strong> (30-59%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: '#ef4444', 
                  border: '2px solid #dc2626', 
                  borderRadius: '4px' 
                }}></div>
                <span><strong>High Risk</strong> (≥60%)</span>
              </div>
            </div>
          </div>

          {/* No Data Message */}
          {!selectedDistrict && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              textAlign: 'center',
              zIndex: 1000,
              maxWidth: '400px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                Welcome to Geo-Risk AI
              </div>
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Navigate through <strong>Country → State → District</strong> to view disaster predictions
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DisasterWarningSystem;
