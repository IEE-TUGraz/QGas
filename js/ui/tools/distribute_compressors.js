/**
 * ================================================================================
 * QGas - Distribute Compressors Tool
 * ================================================================================
 * 
 * Distributes a single compressor into multiple sub-compressors along pipelines.
 * Useful for representing distributed compression infrastructure.
 * 
 * Key Features:
 * - Interactive compressor selection
 * - Automatic distribution count input
 * - Visual connection lines
 * - Sub-compressor auto-placement
 * - Pipeline splitting at placement points
 * - Node generation for connections
 * 
 * Workflow:
 * 1. User selects compressor to distribute
 * 2. Enters number of sub-compressors
 * 3. Clicks pipeline locations for placement
 * 4. Visual connection lines show relationships
 * 5. Original compressor replaced with distributed units
 * 
 * Technical Details:
 * - Creates sub-nodes at compressor positions
 * - Splits pipelines at insertion points
 * - Generates unique IDs for sub-compressors (e.g., C_01A, C_01B)
 * - Maintains visual connection to original location
 * - Updates topology automatically
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Selected compressor feature and target pipeline locations.
 * - User-entered distribution counts.
 *
 * Public API:
 * - activateDistributeCompressors(): Start compressor distribution workflow.
 * 
 * ================================================================================
 */

(function () {
let distributeMode = false;
let selectedCompressor = null;
let distributionCount = 0;
let subCompressors = [];
let connectionLines = [];
let mapClickHandler = null;
let originalCompressorStyle = {};
let originalPipelineVisibility = {};
let cachedCompressorMarkerStyle = null;

function _getPipelineGroupsForDistribute() {
  const out = [];
  const seen = new Set();

  function add(group) {
    if (!group) return;
    if (seen.has(group)) return;
    seen.add(group);
    out.push(group);
  }

  /* Prefer the currently selected pipeline layer, if available. */
  try { add(window.selectedPipelineLayer); } catch (e) {}

  /* Legacy global fallback. */
  try { add(pipelineLayer); } catch (e) {}

  /* Dynamically loaded pipeline-like layers (PL_*.geojson). */
  try {
    if (typeof dynamicLayers === 'object' && dynamicLayers) {
      Object.keys(dynamicLayers).forEach(k => {
        if (!k) return;
        if (/^PL_/i.test(k) && dynamicLayers[k]) add(dynamicLayers[k]);
      });
    }
  } catch (e) {}

  return out;
}

function _findOwningPipelineGroup(featureLayer) {
  const groups = _getPipelineGroupsForDistribute();
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    try {
      if (g && typeof g.hasLayer === 'function' && g.hasLayer(featureLayer)) return g;
    } catch (e) {}
  }
  return null;
}


function getCompressorMarkerStyle() {
  const fallback = {
    radius: 6,
    fillColor: '#009',
    color: '#000',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.85,
    pane: 'overlayPane'
  };

  let sample = null;
  if (compressorsLayer) {
    compressorsLayer.eachLayer(layer => {
      if (!sample && layer && layer.options) {
        sample = layer;
      }
    });
  }

  if (!sample) return { ...fallback };

  return {
    radius: sample.options.radius ?? fallback.radius,
    fillColor: sample.options.fillColor ?? sample.options.color ?? fallback.fillColor,
    color: sample.options.color ?? fallback.color,
    weight: sample.options.weight ?? fallback.weight,
    opacity: sample.options.opacity ?? fallback.opacity,
    fillOpacity: sample.options.fillOpacity ?? fallback.fillOpacity,
    pane: sample.options.pane ?? fallback.pane
  };
}

/**
 * Start the compressor distribution workflow.
 *
 * Initialises distribution state, hides all map layers except pipelines
 * and compressors to reduce visual clutter, and activates click handlers
 * on every compressor marker. The user selects a source compressor, then
 * specifies how many sub-compressors to place along pipeline segments.
 * Sub-compressor positions are computed geometrically on the selected
 * pipeline and persisted via the standard layer write-back mechanism.
 *
 * @returns {void}
 */
function startDistributeCompressors() {
  distributeMode = true;
  selectedCompressor = null;
  distributionCount = 0;
  subCompressors = [];
  connectionLines = [];
  
  /* Hide all layers except pipelines and compressors. */
  hideLayersForDistribution();
  
  /* Enable compressor click handlers. */
  setupCompressorClickHandlers();
  
  showCustomPopup(
    '🔄 Distribute Compressors - Step 1',
    '<p style="text-align: center; margin: 15px 0;">Click on a compressor to distribute it across multiple pipeline segments.</p>',
    [
      {
        text: 'Start Selection',
        type: 'primary',
        onClick: () => {
          closeCustomPopup();
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {
          exitDistributeMode();
        }
      }
    ]
  );
}

function hideLayersForDistribution() {
  /* Store visibility for all layers. */
  originalPipelineVisibility = {
    powerplants: powerplantsLayer && map.hasLayer(powerplantsLayer),
    storages: storageLayer && map.hasLayer(storageLayer),
    lng: lngLayer && map.hasLayer(lngLayer),
    nodes: nodeLayer && map.hasLayer(nodeLayer),
    consumption: consumptionLayer && map.hasLayer(consumptionLayer),
    shortPipe: shortPipeLayer && map.hasLayer(shortPipeLayer)
  };
  
  /* Hide all layers except pipelines and compressors. */
  if (powerplantsLayer && map.hasLayer(powerplantsLayer)) map.removeLayer(powerplantsLayer);
  if (storageLayer && map.hasLayer(storageLayer)) map.removeLayer(storageLayer);
  if (lngLayer && map.hasLayer(lngLayer)) map.removeLayer(lngLayer);
  if (nodeLayer && map.hasLayer(nodeLayer)) map.removeLayer(nodeLayer);
  if (consumptionLayer && map.hasLayer(consumptionLayer)) map.removeLayer(consumptionLayer);
  if (shortPipeLayer && map.hasLayer(shortPipeLayer)) map.removeLayer(shortPipeLayer);
  
  /* Ensure pipelines and compressors remain visible. */
  if (pipelineLayer && !map.hasLayer(pipelineLayer)) pipelineLayer.addTo(map);
  if (compressorsLayer && !map.hasLayer(compressorsLayer)) compressorsLayer.addTo(map);
}

function setupCompressorClickHandlers() {
  if (compressorsLayer) {
    compressorsLayer.eachLayer(layer => {
      layer.off('click');
      layer.on('click', function(e) {
        if (distributeMode && !selectedCompressor) {
          selectCompressorForDistribution(layer);
          if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
          } else if (e && e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
            e.originalEvent.stopPropagation();
          }
        }
      });
    });
  }
}

function selectCompressorForDistribution(compressorLayer) {
  selectedCompressor = compressorLayer;
  
  /* Store original style and highlight the compressor. */
  if (compressorLayer.setStyle) {
    originalCompressorStyle = {
      color: compressorLayer.options.color || '#009',
      fillColor: compressorLayer.options.fillColor || '#009',
      weight: compressorLayer.options.weight || 2,
      fillOpacity: compressorLayer.options.fillOpacity || 0.6,
      opacity: compressorLayer.options.opacity || 0.8
    };
    
    compressorLayer.setStyle({
      fillColor: '#ffff00',
      color: '#ff0000',
      weight: 3,
      fillOpacity: 0.8,
      opacity: 1
    });
  }
  
  const compressorName = getCompressorName(compressorLayer);
  const currentPower = compressorLayer.feature.properties.Rated_Power_MW || 'Not specified';
  
  showCustomPopup(
    '🔄 Distribute Compressors - Step 2',
    `<div style="text-align: center; margin: 15px 0;">
      <p><strong>Selected:</strong> ${compressorName}</p>
      <p><strong>Current Power:</strong> ${currentPower} MW</p>
      <p><strong>How many sub-compressors should this be distributed into?</strong></p>
      <input type="number" id="distribution-count" min="2" max="10" value="2" style="width: 80px; padding: 5px; margin: 10px 0; text-align: center; font-size: 16px;">
    </div>`,
    [
      {
        text: 'Continue',
        type: 'primary',
        onClick: () => {
          const count = parseInt(document.getElementById('distribution-count').value);
          if (count >= 2 && count <= 10) {
            startDistributionPlacement(count);
          } else {
            showInfoPopup('Please enter a number between 2 and 10.', '🔄 Distribute Compressors');
          }
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {
          exitDistributeMode();
        }
      }
    ]
  );
}

function startDistributionPlacement(count) {
  console.log('Starting distribution placement with count:', count);
  distributionCount = count;
  cachedCompressorMarkerStyle = getCompressorMarkerStyle();
  
  /* Store original compressor properties. */
  const originalPower = selectedCompressor.feature.properties.Rated_Power_MW || 0;
  const distributedPower = originalPower / distributionCount;
  const originalProps = {...selectedCompressor.feature.properties};
  const originalLatLng = selectedCompressor.getLatLng();
  
  console.log('Original power:', originalPower, 'Distributed power:', distributedPower);
  
  /* Remove the original compressor marker. */
  if (compressorsLayer && compressorsLayer.hasLayer(selectedCompressor)) {
    compressorsLayer.removeLayer(selectedCompressor);
  }
  
  /* Create the first sub-compressor (replaces the original). */
  const firstSubCompressor = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [originalLatLng.lng, originalLatLng.lat]
    },
    properties: {
      ...originalProps,
      ID: originalProps.ID + '_a',
      Rated_Power_MW: distributedPower,
      modified: true,
      Distribution_Group: originalProps.ID,
      Last_Change: new Date().toISOString().split('T')[0],
      Contributor: document.getElementById('contributor-input').value
    }
  };
  
  /* Add the first sub-compressor to the compressors layer. */
  const firstCompressorLayer = L.geoJSON(firstSubCompressor, {
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, {
        pane: (cachedCompressorMarkerStyle || {}).pane,
        radius: (cachedCompressorMarkerStyle || {}).radius,
        fillColor: (cachedCompressorMarkerStyle || {}).fillColor,
        color: (cachedCompressorMarkerStyle || {}).color,
        weight: (cachedCompressorMarkerStyle || {}).weight,
        opacity: (cachedCompressorMarkerStyle || {}).opacity,
        fillOpacity: (cachedCompressorMarkerStyle || {}).fillOpacity
      });
    }
  });
  
  if (compressorsLayer) {
    firstCompressorLayer.eachLayer(layer => {
      compressorsLayer.addLayer(layer);
    });
  }
  
  /* Initialize sub-compressor array with the first entry. */
  subCompressors = [firstCompressorLayer.getLayers()[0]];
  selectedCompressor = firstCompressorLayer.getLayers()[0];
  
  console.log('Sub-compressors initialized:', subCompressors.length);
  console.log('Distribution count:', distributionCount);
  console.log('Distribute mode:', distributeMode);
  
  /* Enable pipeline click handlers for placement. */
  setupPipelineClickHandlersForPlacement();
  
  showCustomPopup(
    '🔄 Distribute Compressors - Step 3',
    `<div style="text-align: center; margin: 15px 0;">
      <p><strong>Power per sub-compressor:</strong> ${distributedPower.toFixed(2)} MW</p>
      <p><strong>Remaining placements needed:</strong> ${distributionCount - 1}</p>
      <p>Click on pipeline segments to place the remaining sub-compressors at their support points.</p>
      <p><em>Click "Continue Placement" below and then click on pipelines.</em></p>
    </div>`,
    [
      {
        text: 'Continue Placement',
        type: 'primary',
        onClick: () => {
          console.log('Continue Placement clicked, closing popup');
          closeCustomPopup();
          console.log('Popup closed, ready for pipeline clicks');
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {
          exitDistributeMode();
        }
      }
    ]
  );
}



function _ensurePipelineInteractive(layer) {
  try {
    if (layer && layer.options) layer.options.interactive = true;
    // SVG path (default renderer)
    const path = layer && layer._path;
    if (path && path.style) {
      path.style.pointerEvents = 'auto';
      path.style.cursor = 'crosshair';
    }
    // Leaflet provides getElement() on some layer types
    if (layer && typeof layer.getElement === 'function') {
      const el = layer.getElement();
      if (el && el.style) {
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'crosshair';
      }
    }
    if (layer && typeof layer.bringToFront === 'function') layer.bringToFront();
  } catch (e) {}
}

function _distancePointToSegmentMeters(p, a, b) {
  // project to pixels at current zoom, compute nearest point on segment
  const zoom = (map && map.getZoom) ? map.getZoom() : 10;
  const pp = map.project(p, zoom);
  const pa = map.project(a, zoom);
  const pb = map.project(b, zoom);
  const vx = pb.x - pa.x;
  const vy = pb.y - pa.y;
  const wx = pp.x - pa.x;
  const wy = pp.y - pa.y;
  const c1 = vx * wx + vy * wy;
  let t = 0;
  if (c1 > 0) {
    const c2 = vx * vx + vy * vy;
    t = c2 > 0 ? (c1 / c2) : 0;
  }
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const proj = L.point(pa.x + t * vx, pa.y + t * vy);
  const ll = map.unproject(proj, zoom);
  return map.distance(p, ll);
}

function _findNearestPipelineLayer(clickLatLng, thresholdMeters = 45) {
  const groups = _getPipelineGroupsForDistribute();
  let best = null;
  let bestDist = Infinity;

  groups.forEach(group => {
    try {
      group.eachLayer(layer => {
        try {
          if (!layer || typeof layer.getLatLngs !== 'function') return;
          const latlngs = layer.getLatLngs();
          if (!latlngs || latlngs.length < 2) return;
          const flat = Array.isArray(latlngs[0]) ? latlngs.flat(2) : latlngs;
          for (let i = 0; i < flat.length - 1; i++) {
            const d = _distancePointToSegmentMeters(clickLatLng, flat[i], flat[i + 1]);
            if (d < bestDist) {
              bestDist = d;
              best = layer;
            }
          }
        } catch (e) {}
      });
    } catch (e) {}
  });

  return (best && bestDist <= thresholdMeters) ? best : null;
}
function setupPipelineClickHandlersForPlacement() {
  console.log('Setting up pipeline click handlers for placement');

  /* Ensure map panes accept pointer events. */
  try {
    if (map && map.getPanes) {
      const panes = map.getPanes();
      if (panes && panes.overlayPane && panes.overlayPane.style) panes.overlayPane.style.pointerEvents = 'auto';
      if (panes && panes.markerPane && panes.markerPane.style) panes.markerPane.style.pointerEvents = 'auto';
      if (panes && panes.shadowPane && panes.shadowPane.style) panes.shadowPane.style.pointerEvents = 'auto';
    }
    if (map && map.getContainer && map.getContainer().style) {
      map.getContainer().style.pointerEvents = 'auto';
    }
  } catch (e) {}

  /* Force map panes to accept clicks if pointer-events were altered. */
  try {
    if (map && map.getPanes) {
      const panes = map.getPanes();
      if (panes && panes.overlayPane && panes.overlayPane.style) {
        panes.overlayPane.style.pointerEvents = 'auto';
      }
      if (panes && panes.mapPane && panes.mapPane.style) {
        panes.mapPane.style.pointerEvents = 'auto';
      }
    }
    if (map && map.getContainer && map.getContainer().style) {
      map.getContainer().style.pointerEvents = 'auto';
    }
  } catch (e) {}

  const pipelineGroups = _getPipelineGroupsForDistribute();

  /* Clean previous handlers on all pipeline groups. */
  pipelineGroups.forEach(group => {
    try {
      group.eachLayer(layer => {
        try { layer.off('click'); } catch (e) {}
        _ensurePipelineInteractive(layer);
      });
    } catch (e) {}
  });

  /* Remove previous map fallback handler. */
  if (mapClickHandler) {
    try { map.off('click', mapClickHandler); } catch (e) {}
    mapClickHandler = null;
  }

  if (!pipelineGroups.length) {
    console.log('No pipeline layers available for distribution placement');
    return;
  }

  /* Direct polyline clicks (preferred). */
  pipelineGroups.forEach(group => {
    try {
      group.eachLayer(layer => {
        _ensurePipelineInteractive(layer);
        layer.on('click', function (event) {
          console.log('Pipeline clicked (direct handler)');
          if (distributeMode && selectedCompressor && subCompressors.length < distributionCount) {
            try {
              placeSubCompressorOnPipeline(layer, event.latlng);
              if (event && event.originalEvent && typeof event.originalEvent.stopPropagation === 'function') {
                event.originalEvent.stopPropagation();
              }
            } catch (error) {
              console.error('Error placing sub-compressor:', error);
            }
          }
        });
      });
    } catch (e) {}
  });

  /* Fallback: resolve nearest pipeline on map click. */
  mapClickHandler = function (e) {
    if (!distributeMode || !selectedCompressor) return;
    if (subCompressors.length >= distributionCount) return;
    const nearest = _findNearestPipelineLayer(e.latlng);
    if (nearest) {
      console.log('Pipeline resolved via map-click fallback');
      try { placeSubCompressorOnPipeline(nearest, e.latlng); } catch (err) { console.error('Error placing via map fallback:', err); }
    }
  };
  try {
    /* Use capturing click as a last resort if Leaflet events are swallowed. */
    map.on('click', mapClickHandler);
    const container = map.getContainer();
    if (container && !container._qgasDistributeClickCapture) {
      container._qgasDistributeClickCapture = true;
      container.addEventListener('click', function(ev) {
        // Only assist when tool is active.
        if (!distributeMode || !selectedCompressor) return;
        try {
          const latlng = map.mouseEventToLatLng(ev);
          mapClickHandler({ latlng });
        } catch (err) {}
      }, true);
    }
  } catch (e) {}
}


function placeSubCompressorOnPipeline(clickedPipelineFeature, clickLatLng) {
  console.log('=== placeSubCompressorOnPipeline called ===');
  console.log('clickedPipelineFeature:', clickedPipelineFeature);
  console.log('clickLatLng:', clickLatLng);
  console.log('subCompressors.length:', subCompressors.length);
  
  const currentIndex = subCompressors.length;
  const suffix = String.fromCharCode(97 + currentIndex); // a, b, c, d...
  
  /* Use last placed compressor as reference. */
  const lastCompressorLatLng = subCompressors[subCompressors.length - 1].getLatLng();
  console.log('lastCompressorLatLng:', lastCompressorLatLng);
  
  /* Find the closest point on the pipeline (not just support points). */
  const coords = clickedPipelineFeature.feature.geometry.coordinates;
  let closestPoint = null;
  let closestSegmentIndex = -1;
  let minDistance = Infinity;
  
  /* Iterate through pipeline segments to find the nearest point. */
  for (let i = 0; i < coords.length - 1; i++) {
    const segmentStart = {lat: coords[i][1], lng: coords[i][0]};
    const segmentEnd = {lat: coords[i + 1][1], lng: coords[i + 1][0]};
    
    /* Compute nearest point on this segment to the last compressor. */
    const nearestPointOnSegment = getNearestPointOnSegment(lastCompressorLatLng, segmentStart, segmentEnd);
    const distance = getDistance(lastCompressorLatLng, nearestPointOnSegment);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = nearestPointOnSegment;
      closestSegmentIndex = i;
    }
  }
  
  if (!closestPoint || closestSegmentIndex === -1) {
    console.log('Could not find closest point on pipeline');
    return;
  }
  
  console.log('Placing sub-compressor at closest point:', closestPoint, 'Distance:', minDistance);
  
  /* Split the pipeline at the nearest point. */
  const originalPipelineProps = clickedPipelineFeature.feature.properties;
  const originalProps = selectedCompressor.feature.properties;
  const compressorBaseID = originalProps.ID.replace('_a', '');
  
  /* Build sub-node IDs (format: C_122_a_a and C_122_a_b). */
  const subNodeA_ID = `${compressorBaseID}_${suffix}_a`;
  const subNodeB_ID = `${compressorBaseID}_${suffix}_b`;
  
  /* Create new pipeline coordinate sets with the split point. */
  const firstPipelineCoords = coords.slice(0, closestSegmentIndex + 1);
  firstPipelineCoords.push([closestPoint.lng, closestPoint.lat]); // Teilungspunkt hinzufügen
  
  const secondPipelineCoords = [[closestPoint.lng, closestPoint.lat]]; // Start mit Teilungspunkt
  secondPipelineCoords.push(...coords.slice(closestSegmentIndex + 1));
  
  const firstPipeline = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: firstPipelineCoords
    },
    properties: {
      ...originalPipelineProps,
      ID: originalPipelineProps.ID + '_a',
      End_Node: subNodeA_ID,
      Length_km: calculatePipelineLength(firstPipelineCoords),
      modified: true,
      Last_Change: new Date().toISOString().split('T')[0],
      Contributor: document.getElementById('contributor-input').value
    }
  };
  
  const secondPipeline = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: secondPipelineCoords
    },
    properties: {
      ...originalPipelineProps,
      ID: originalPipelineProps.ID + '_b',
      Start_Node: subNodeB_ID,
      Length_km: calculatePipelineLength(secondPipelineCoords),
      modified: true,
      new: true,
      Last_Change: new Date().toISOString().split('T')[0],
      Contributor: document.getElementById('contributor-input').value
    }
  };
  
  /* Remove original pipeline from its owning group (supports multiple layers). */
  const targetPipelineGroup = _findOwningPipelineGroup(clickedPipelineFeature) || (typeof pipelineLayer !== 'undefined' ? pipelineLayer : null);
  console.log('Removing original pipeline from layer');
  if (targetPipelineGroup && typeof targetPipelineGroup.hasLayer === 'function' && targetPipelineGroup.hasLayer(clickedPipelineFeature)) {
    targetPipelineGroup.removeLayer(clickedPipelineFeature);
    console.log('Original pipeline removed from pipeline group');
  }

  
  /* Mark original as deleted for export. */
  clickedPipelineFeature.feature.properties.modified = true;
  clickedPipelineFeature.feature.properties.deleted = true;
  
  /* Add new pipeline segments back to the same pipeline group. */
  const firstPipelineLayer = L.geoJSON(firstPipeline, {
    style: function(feature) {
      return {
        color: '#0066CC',
        weight: 2,
        opacity: 0.8
      };
    },
    tolerance: 40
  });
  const secondPipelineLayer = L.geoJSON(secondPipeline, {
    style: function(feature) {
      return {
        color: '#0066CC', 
        weight: 2,
        opacity: 0.8
      };
    },
    tolerance: 40
  });
  
  /* Add new pipeline segments back to the same pipeline group. */
  if (targetPipelineGroup) {
    firstPipelineLayer.eachLayer(layer => {
      targetPipelineGroup.addLayer(layer);
    });
    secondPipelineLayer.eachLayer(layer => {
      targetPipelineGroup.addLayer(layer);
    });
  }
  
  const compressorStyle = cachedCompressorMarkerStyle || getCompressorMarkerStyle();

  /* Create sub-nodes with standard node attributes. */
  const subNodeA = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [closestPoint.lng, closestPoint.lat]
    },
    properties: {
      ID: subNodeA_ID,
      Name: `Node ${subNodeA_ID}`,
      Type: 'Node',
      Country: originalPipelineProps.Country || '',
      Operator: originalPipelineProps.Operator || '',
      Status: 'Active',
      Created_By_Compressor_Split: `${compressorBaseID}_${suffix}`,
      new: true,
      Last_Change: new Date().toISOString().split('T')[0],
      Contributor: document.getElementById('contributor-input').value
    }
  };
  
  const subNodeB = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [closestPoint.lng, closestPoint.lat]
    },
    properties: {
      ID: subNodeB_ID,
      Name: `Node ${subNodeB_ID}`,
      Type: 'Node',
      Country: originalPipelineProps.Country || '',
      Operator: originalPipelineProps.Operator || '',
      Status: 'Active',
      Created_By_Compressor_Split: `${compressorBaseID}_${suffix}`,
      new: true,
      Last_Change: new Date().toISOString().split('T')[0],
      Contributor: document.getElementById('contributor-input').value
    }
  };
  
  /* Add sub-nodes to the node layer (standard node appearance). */
  if (nodeLayer) {
    const subNodeALayer = L.geoJSON(subNodeA, {
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 3,
          fillColor: '#666',
          color: '#000',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.8
        });
      }
    });
    const subNodeBLayer = L.geoJSON(subNodeB, {
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 3,
          fillColor: '#666',
          color: '#000',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.8
        });
      }
    });
    
    // Direkt zu nodeLayer hinzufügen
    subNodeALayer.eachLayer(layer => nodeLayer.addLayer(layer));
    subNodeBLayer.eachLayer(layer => nodeLayer.addLayer(layer));
  }
  
  /* Create a new sub-compressor with sub-node links. */
  const newCompressor = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [closestPoint.lng, closestPoint.lat]
    },
    properties: {
      ...originalProps,
      ID: originalProps.ID.replace('_a', '') + '_' + suffix,
      Rated_Power_MW: originalProps.Rated_Power_MW, // Bereits angepasste Leistung
      SubNode_A: subNodeA_ID,
      SubNode_B: subNodeB_ID,
      Pipeline_Split: originalPipelineProps.ID,
      modified: true,
      new: true,
      Distribution_Group: originalProps.Distribution_Group,
      Last_Change: new Date().toISOString().split('T')[0],
      Contributor: document.getElementById('contributor-input').value
    }
  };
  
  /* Add the sub-compressor to the compressors layer. */
  if (compressorsLayer) {
    const newLayer = L.geoJSON(newCompressor, {
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          pane: (cachedCompressorMarkerStyle || {}).pane,
          radius: (cachedCompressorMarkerStyle || {}).radius,
          fillColor: (cachedCompressorMarkerStyle || {}).fillColor,
          color: (cachedCompressorMarkerStyle || {}).color,
          weight: (cachedCompressorMarkerStyle || {}).weight,
          opacity: (cachedCompressorMarkerStyle || {}).opacity,
          fillOpacity: (cachedCompressorMarkerStyle || {}).fillOpacity
        });
      }
    });
    
    // Direkt zu compressorsLayer hinzufügen
    newLayer.eachLayer(layer => {
      compressorsLayer.addLayer(layer);
      subCompressors.push(layer);
    });
  }
  
  /* Create a connection line to the previous compressor (a->b->c...). */
  const previousCompressor = subCompressors[subCompressors.length - 2]; // Vorheriger Compressor
  const previousLatLng = previousCompressor.getLatLng();
  const connectionLine = L.polyline([previousLatLng, closestPoint], {
    color: '#000000',
    weight: 1,
    opacity: 0.7,
    dashArray: '5, 5'
  }).addTo(map);
  
  connectionLines.push(connectionLine);

  /* Newly created pipeline segments need click handlers during placement. */
  if (distributeMode && subCompressors.length < distributionCount) {
    setupPipelineClickHandlersForPlacement(); // rebind for newly created segments
  }
  
  /* Update placement status. */
  const remaining = distributionCount - subCompressors.length;
  
  if (remaining > 0) {
    showCustomPopup(
      '🔄 Distribute Compressors - Step 3',
      `<div style="text-align: center; margin: 15px 0;">
        <p><strong>Placed:</strong> ${newCompressor.properties.ID}</p>
        <p><strong>Sub-Nodes:</strong> ${subNodeA_ID}, ${subNodeB_ID}</p>
        <p><strong>Pipeline split:</strong> ${originalPipelineProps.ID}</p>
        <p><strong>Remaining placements needed:</strong> ${remaining}</p>
        <p>Click on more pipeline segments to place the remaining sub-compressors.</p>
      </div>`,
      [
        {
          text: 'Continue Placement',
          type: 'primary',
          onClick: () => {
            closeCustomPopup();
          }
        },
        {
          text: 'Cancel',
          type: 'secondary',
          onClick: () => {
            exitDistributeMode();
          }
        }
      ]
    );
  } else {
    completeDistribution();
  }
}

function completeDistribution() {
  const compressorNames = subCompressors.map(comp => comp.feature.properties.ID).join(', ');
  const power = selectedCompressor.feature.properties.Rated_Power_MW;
  
  showCustomPopup(
    '✅ Distribution Complete',
    `<div style="text-align: center; margin: 15px 0;">
      <p><strong>Successfully distributed compressor into ${distributionCount} sub-compressors:</strong></p>
      <p>${compressorNames}</p>
      <p><strong>Power per sub-compressor:</strong> ${power.toFixed(2)} MW</p>
      <p>Sequential dashed lines show the connection chain between distributed compressors.</p>
    </div>`,
    [
      {
        text: 'Distribute Another',
        type: 'primary',
        onClick: () => {
          /* Reset for a new distribution. */
          resetForNewDistribution();
          startDistributeCompressors();
        }
      },
      {
        text: 'Finish & Switch to Info Mode',
        type: 'secondary',
        onClick: () => {
          exitDistributeMode();
          /* Return to Info mode after finishing. */
          currentMode = 'info';
          activateInfoMode();
          selectTool('info');
        }
      }
    ]
  );
}

function resetForNewDistribution() {
  selectedCompressor = null;
  distributionCount = 0;
  subCompressors = [];
  originalCompressorStyle = {};
  
  /* Reset click handlers. */
  if (targetPipelineGroup) {
    pipelineLayer.eachLayer(layer => {
      layer.off('click');
    });
  }
  if (mapClickHandler) {
    try { map.off('click', mapClickHandler); } catch(e) {}
    mapClickHandler = null;
  }
}

function getCompressorName(compressorLayer) {
  const props = compressorLayer.feature.properties;
  return props.Name || props.Station_name || props.ID || 'Unknown Compressor';
}

function getDistance(latlng1, latlng2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = latlng1.lat * Math.PI/180;
  const φ2 = latlng2.lat * Math.PI/180;
  const Δφ = (latlng2.lat-latlng1.lat) * Math.PI/180;
  const Δλ = (latlng2.lng-latlng1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function getNearestPointOnSegment(point, segmentStart, segmentEnd) {
  /* Vector from segment start to point. */
  const dx = point.lng - segmentStart.lng;
  const dy = point.lat - segmentStart.lat;
  
  /* Segment vector. */
  const segmentDx = segmentEnd.lng - segmentStart.lng;
  const segmentDy = segmentEnd.lat - segmentStart.lat;
  
  /* Segment length squared. */
  const segmentLengthSq = segmentDx * segmentDx + segmentDy * segmentDy;
  
  if (segmentLengthSq === 0) {
    /* Degenerate segment: return start point. */
    return segmentStart;
  }
  
  /* Projection of point onto the segment (0=start, 1=end). */
  let t = (dx * segmentDx + dy * segmentDy) / segmentLengthSq;
  
  /* Clamp t to the segment. */
  t = Math.max(0, Math.min(1, t));
  
  /* Compute nearest point on the segment. */
  const nearestPoint = {
    lat: segmentStart.lat + t * segmentDy,
    lng: segmentStart.lng + t * segmentDx
  };
  
  return nearestPoint;
}

function calculatePipelineLength(coordinates) {
  let totalLength = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const point1 = { lat: coordinates[i][1], lng: coordinates[i][0] };
    const point2 = { lat: coordinates[i + 1][1], lng: coordinates[i + 1][0] };
    totalLength += getDistance(point1, point2);
  }
  return totalLength / 1000; // Convert to kilometers
}

/**
 * Exit distribute-compressor mode and restore normal map state.
 *
 * Re-adds any layers that were hidden during distribution (power-plants,
 * storages, nodes, etc.), removes all temporary connection-line polylines
 * and sub-compressor markers from the map, and resets all internal
 * distribution state variables. Safe to call both after a completed
 * distribution and after an explicit cancellation.
 *
 * @returns {void}
 */
function exitDistributeMode() {
  distributeMode = false;
  
  /* Restore original layer visibility. */
  if (originalPipelineVisibility.powerplants && powerplantsLayer) {
    powerplantsLayer.addTo(map);
  }
  if (originalPipelineVisibility.storages && storageLayer) {
    storageLayer.addTo(map);
  }
  if (originalPipelineVisibility.lng && lngLayer) {
    lngLayer.addTo(map);
  }
  if (originalPipelineVisibility.nodes && nodeLayer) {
    nodeLayer.addTo(map);
  }
  if (originalPipelineVisibility.consumption && consumptionLayer) {
    consumptionLayer.addTo(map);
  }
  if (originalPipelineVisibility.shortPipe && shortPipeLayer) {
    shortPipeLayer.addTo(map);
  }
  
  /* Restore compressor styles. */
  if (selectedCompressor && originalCompressorStyle && selectedCompressor.setStyle) {
    selectedCompressor.setStyle(originalCompressorStyle);
  }
  
  /* Reset click handlers. */
  resetDistributeClickHandlers();
  
  /* Reset state. */
  selectedCompressor = null;
  distributionCount = 0;
  subCompressors = [];
  originalCompressorStyle = {};
  originalPipelineVisibility = {};
  
  closeCustomPopup();
}

function resetDistributeClickHandlers() {
  if (mapClickHandler) { try { map.off('click', mapClickHandler); } catch(e) {} mapClickHandler = null; }
  if (compressorsLayer) {
    compressorsLayer.eachLayer(layer => {
      layer.off('click');
    });
  }
  if (targetPipelineGroup) {
    pipelineLayer.eachLayer(layer => {
      layer.off('click');
    });
  }
  if (mapClickHandler) {
    try { map.off('click', mapClickHandler); } catch(e) {}
    mapClickHandler = null;
  }
}


  /* Public entry used by Tools UI. */
  window.activateDistributeCompressorsTool = function activateDistributeCompressorsTool() {
    deactivateAllModes();
    currentMode = 'distribute-compressors';
    startDistributeCompressors();
  };
})();
