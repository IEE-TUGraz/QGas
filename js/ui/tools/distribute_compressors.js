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
 * - Generates case-insensitively unique numeric IDs (e.g., C_01_1, C_01_2)
 * - Creates standard A/B terminal nodes and inherits endpoint pressure limits
 * - Uses dashed nearest-neighbour lines as visual aids only
 * - Synchronizes active/original layers for filtering and export
 * - Restores legend-controlled visibility when the workflow ends
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
const processedDistributionClicks = new WeakSet();
let originalCompressorStyle = {};
let originalPipelineVisibility = {};
let hiddenLayersForDistribution = [];
let cachedCompressorMarkerStyle = null;

function _readFirstProperty(properties, keys, fallback = '') {
  if (!properties) return fallback;
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function _assignFeatureId(properties, id) {
  delete properties.ID;
  properties.id = id;
  return properties;
}

function _assignRatedPower(properties, power) {
  /* The configured compressor schema uses rated_power_MW. Keep legacy
   * variants synchronized only when they are already present. */
  properties.rated_power_MW = power;
  if (Object.prototype.hasOwnProperty.call(properties, 'Rated_Power_MW')) properties.Rated_Power_MW = power;
  if (Object.prototype.hasOwnProperty.call(properties, 'rated_power_mw')) properties.rated_power_mw = power;
  return properties;
}

function _getUniqueDistributedCompressorId(baseId, preferredIndex) {
  const existingIds = new Set();
  const visit = layer => {
    if (!layer) return;
    const properties = layer.feature?.properties;
    if (properties) {
      const id = String(_readFirstProperty(properties, ['ID', 'id'], '')).trim().toLowerCase();
      if (id) existingIds.add(id);
    }
    if (typeof layer.eachLayer === 'function') layer.eachLayer(visit);
  };
  try { visit(compressorsLayer); } catch (e) {}

  let index = Math.max(0, Number(preferredIndex) || 0) + 1;
  let candidate = '';
  do {
    candidate = `${baseId}_${index}`;
    index += 1;
  } while (existingIds.has(candidate.toLowerCase()));
  return candidate;
}

function _getCompressorToggleForDistribute() {
  const config = Array.isArray(layerConfig)
    ? layerConfig.find(entry => /compressor/i.test(`${entry?.filename || ''} ${entry?.legendName || ''}`))
    : null;
  if (config?.filename) {
    const toggleId = 'toggle-' + config.filename.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const configuredToggle = document.getElementById(toggleId);
    if (configuredToggle) return configuredToggle;
  }
  return document.getElementById('toggle-compressors');
}

function _getPipelineGroupsForDistribute() {
  const out = [];
  const seen = new Set();

  function add(group) {
    if (!group) return;
    if (seen.has(group)) return;
    seen.add(group);
    out.push(group);
  }

  /* Resolve configured pipeline files explicitly. The legacy pipelineLayer
   * reference can be overwritten by a later configured line layer (for
   * example valves.geojson), so it must only be a last-resort fallback. */
  try {
    if (Array.isArray(layerConfig) && typeof dynamicLayers === 'object' && dynamicLayers) {
      layerConfig.forEach(config => {
        const filename = String(config && config.filename || '');
        const layerName = String(config && (config.layerName || config.LayerName) || '');
        const isPipeline = /pipeline/i.test(filename) || /^PL_/i.test(filename) || /pipeline/i.test(layerName);
        const isShortPipe = /short.?pipe/i.test(filename) || /short.?pipe/i.test(layerName);
        if (!isPipeline || isShortPipe) return;
        add(dynamicLayers[layerName]);
        add(dynamicLayers[filename]);
      });
    }
  } catch (e) {}

  /* Configuration-free projects may expose pipeline-like dynamic keys. */
  try {
    if (!out.length && typeof dynamicLayers === 'object' && dynamicLayers) {
      Object.keys(dynamicLayers).forEach(key => {
        if ((/^PL_/i.test(key) || /pipeline/i.test(key)) && !/short.?pipe/i.test(key)) {
          add(dynamicLayers[key]);
        }
      });
    }
  } catch (e) {}

  /* Legacy fallbacks only when no configured pipeline group was found. */
  if (!out.length) {
    try { add(window.selectedPipelineLayer); } catch (e) {}
    try { add(pipelineLayer); } catch (e) {}
  }

  return out;
}

function _findOwningPipelineGroup(featureLayer) {
  const groups = _getPipelineGroupsForDistribute();

  function findDirectOwner(group) {
    if (!group || typeof group.eachLayer !== 'function') return null;
    let owner = null;
    try {
      group.eachLayer(child => {
        if (owner) return;
        if (child === featureLayer) {
          owner = group;
          return;
        }
        owner = findDirectOwner(child);
      });
    } catch (e) {}
    return owner;
  }

  for (let i = 0; i < groups.length; i++) {
    const owner = findDirectOwner(groups[i]);
    if (owner) return owner;
  }
  return null;
}

/* Return the actual clickable line features, including lines nested in a
 * FeatureGroup/GeoJSON layer.  Some imported pipeline layers have an extra
 * group level, so binding only to group.eachLayer() misses the polylines. */
function _getPipelineFeatureLayersForDistribute() {
  const out = [];
  const seen = new Set();

  function visit(layer) {
    if (!layer || seen.has(layer)) return;
    seen.add(layer);

    const geometryType = layer.feature && layer.feature.geometry && layer.feature.geometry.type;
    if (typeof layer.getLatLngs === 'function' && geometryType === 'LineString') {
      out.push(layer);
      return;
    }

    if (typeof layer.eachLayer === 'function') {
      try { layer.eachLayer(visit); } catch (e) {}
    }
  }

  _getPipelineGroupsForDistribute().forEach(visit);
  return out;
}

function _getConfiguredNodeGroupForDistribute() {
  try {
    if (typeof getAllNodeLayers === 'function') {
      const groups = getAllNodeLayers();
      if (Array.isArray(groups) && groups.length) return groups[0];
    }
  } catch (e) {}
  try { return nodeLayer || null; } catch (e) { return null; }
}

function _findNodePropertiesForDistribute(nodeId) {
  const expectedId = String(nodeId || '').trim();
  if (!expectedId) return null;
  const visited = new Set();
  let result = null;

  function visit(layer) {
    if (!layer || result || visited.has(layer)) return;
    visited.add(layer);
    const properties = layer.feature && layer.feature.properties;
    if (properties) {
      const candidateId = String(_readFirstProperty(properties, ['ID', 'id'], '')).trim();
      if (candidateId === expectedId) {
        result = properties;
        return;
      }
    }
    if (typeof layer.eachLayer === 'function') {
      try { layer.eachLayer(visit); } catch (e) {}
    }
  }

  try {
    if (typeof getAllNodeLayers === 'function') getAllNodeLayers().forEach(visit);
  } catch (e) {}
  try { visit(originalNodeLayer); } catch (e) {}
  try { visit(nodeLayer); } catch (e) {}
  return result;
}

function _getEndpointPressureProperties(nodeId) {
  const source = _findNodePropertiesForDistribute(nodeId);
  if (!source) return {};
  const result = {};
  const missing = Symbol('missing-pressure');
  const maxPressure = _readFirstProperty(source, [
    'pressure_max', 'max_pressure', 'maximum_pressure', 'Pressure_Max', 'Maximum_Pressure'
  ], missing);
  const minPressure = _readFirstProperty(source, [
    'pressure_min', 'min_pressure', 'minimum_pressure', 'Pressure_Min', 'Minimum_Pressure'
  ], missing);
  if (maxPressure !== missing) result.pressure_max = maxPressure;
  if (minPressure !== missing) result.pressure_min = minPressure;
  return result;
}

function _getOriginalNodeGroupForDistribute(activeGroup) {
  try {
    if (originalNodeLayer && originalNodeLayer !== activeGroup) return originalNodeLayer;
  } catch (e) {}
  return null;
}

function _getOriginalCompressorGroupForDistribute(activeGroup) {
  try {
    if (originalCompressorsLayer && originalCompressorsLayer !== activeGroup) return originalCompressorsLayer;
  } catch (e) {}
  return null;
}

function _getOriginalPipelineGroupForDistribute(activeGroup, featureLayer) {
  try {
    if (typeof configuredCountryFilterLayers !== 'undefined' && configuredCountryFilterLayers) {
      for (const entry of configuredCountryFilterLayers.values()) {
        if (!entry || !entry.original) continue;
        if (entry.filtered === activeGroup || (typeof entry.original.hasLayer === 'function' && entry.original.hasLayer(featureLayer))) {
          return entry.original;
        }
      }
    }
  } catch (e) {}
  try {
    if (originalPipelineLayer && originalPipelineLayer !== activeGroup && originalPipelineLayer.hasLayer(featureLayer)) {
      return originalPipelineLayer;
    }
  } catch (e) {}
  return null;
}

function _createDistributionNode(nodeId, latlng, properties, targetNodeGroup) {
  const extraProperties = { ...properties };
  const usesType = Object.prototype.hasOwnProperty.call(properties, 'Type');
  delete extraProperties.ID;
  extraProperties.id = nodeId;
  if (typeof createNewNode === 'function') {
    const marker = createNewNode(L.latLng(latlng.lat, latlng.lng), nodeId, {
      targetLayer: targetNodeGroup,
      properties: extraProperties,
      tool: 'Distribute Compressors'
    });
    if (marker?.feature?.properties) {
      delete marker.feature.properties.ID;
      marker.feature.properties.id = nodeId;
    }
    if (marker?.feature?.properties && !usesType) delete marker.feature.properties.Type;
    const originalGroup = _getOriginalNodeGroupForDistribute(targetNodeGroup);
    if (marker && originalGroup && typeof originalGroup.addLayer === 'function' && !originalGroup.hasLayer(marker)) {
      originalGroup.addLayer(marker);
    }
    return marker;
  }
  const style = (typeof getDefaultNodeStyleOptions === 'function')
    ? getDefaultNodeStyleOptions(targetNodeGroup)
    : { pane: 'nodePane', radius: 6, fillColor: '#ff7800', color: '#000', weight: 1, opacity: 1, fillOpacity: 0.85 };
  const marker = L.circleMarker(latlng, style);
  marker.feature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] },
    properties: extraProperties
  };
  if (targetNodeGroup && typeof targetNodeGroup.addLayer === 'function') targetNodeGroup.addLayer(marker);
  else marker.addTo(map);
  const originalGroup = _getOriginalNodeGroupForDistribute(targetNodeGroup);
  if (originalGroup && typeof originalGroup.addLayer === 'function' && !originalGroup.hasLayer(marker)) originalGroup.addLayer(marker);
  marker._parentNodeLayer = targetNodeGroup || null;
  return marker;
}

function _createDistributionPipelineLayer(feature, sourceLayer, targetGroup, originalGroup = null) {
  const sourceOptions = sourceLayer && sourceLayer.options ? sourceLayer.options : {};
  const sourceMeta = sourceLayer && sourceLayer._qgasMeta
    ? sourceLayer._qgasMeta
    : (targetGroup && targetGroup._qgasMeta ? targetGroup._qgasMeta : null);
  const style = {
    pane: sourceOptions.pane || (targetGroup && targetGroup.options && targetGroup.options.pane) || 'pipelinePane',
    color: sourceOptions.color || sourceLayer?._originalColor || '#0070F3',
    weight: sourceOptions.weight ?? sourceLayer?._originalWeight ?? 3,
    opacity: sourceOptions.opacity ?? sourceLayer?._originalOpacity ?? 0.8,
    dashArray: Object.prototype.hasOwnProperty.call(sourceOptions, 'dashArray') ? sourceOptions.dashArray : null,
    lineCap: sourceOptions.lineCap || 'round',
    lineJoin: sourceOptions.lineJoin || 'round'
  };
  const wrapper = L.geoJSON(feature, {
    pane: style.pane,
    style,
    onEachFeature: function (childFeature, layer) {
      layer._originalColor = style.color;
      layer._originalWeight = style.weight;
      layer._originalOpacity = style.opacity;
      layer._originalDashArray = style.dashArray;
      if (sourceMeta) {
        layer._qgasMeta = sourceMeta;
        try { if (typeof assignMetadataToLayer === 'function') assignMetadataToLayer(layer, sourceMeta); } catch (e) {}
      }
      try {
        if (typeof handleFeature === 'function') handleFeature(childFeature, layer);
        else if (typeof setPipelineInteraction === 'function') setPipelineInteraction(layer, 'info');
      } catch (e) {
        console.error('Could not initialize distributed pipeline interaction:', e);
      }
    }
  });
  wrapper.eachLayer(layer => {
    if (targetGroup && typeof targetGroup.addLayer === 'function') targetGroup.addLayer(layer);
    if (originalGroup && originalGroup !== targetGroup && typeof originalGroup.addLayer === 'function') originalGroup.addLayer(layer);
  });
  return wrapper;
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
  hiddenLayersForDistribution = [];

  /* Store visibility for all layers. */
  originalPipelineVisibility = {
    powerplants: powerplantsLayer && map.hasLayer(powerplantsLayer),
    storages: storageLayer && map.hasLayer(storageLayer),
    lng: lngLayer && map.hasLayer(lngLayer),
    nodes: nodeLayer && map.hasLayer(nodeLayer),
    consumption: consumptionLayer && map.hasLayer(consumptionLayer),
    shortPipe: shortPipeLayer && map.hasLayer(shortPipeLayer),
    compressors: compressorsLayer && map.hasLayer(compressorsLayer),
    compressorToggleChecked: _getCompressorToggleForDistribute()?.checked
  };
  
  /* Hide every configured infrastructure layer except the current pipeline
   * and compressor groups. This also covers project-specific layers such as
   * Valves, which otherwise sit above pipelines and intercept their clicks. */
  const allowedLayers = new Set(_getPipelineGroupsForDistribute());
  if (compressorsLayer) allowedLayers.add(compressorsLayer);

  const candidates = new Set();
  [
    powerplantsLayer, storageLayer, lngLayer, nodeLayer, consumptionLayer,
    shortPipeLayer, compressorsLayer, pipelineLayer
  ].forEach(layer => { if (layer) candidates.add(layer); });

  try {
    if (typeof dynamicLayers === 'object' && dynamicLayers) {
      Object.values(dynamicLayers).forEach(layer => { if (layer) candidates.add(layer); });
    }
  } catch (e) {}

  candidates.forEach(layer => {
    if (allowedLayers.has(layer)) return;
    try {
      if (map.hasLayer(layer)) {
        hiddenLayersForDistribution.push(layer);
        map.removeLayer(layer);
      }
    } catch (e) {}
  });
  
  /* Ensure the explicitly configured pipeline groups (not the legacy
   * pipelineLayer, which may point to Valves) and compressors remain visible. */
  _getPipelineGroupsForDistribute().forEach(group => {
    try { if (group && !map.hasLayer(group)) group.addTo(map); } catch (e) {}
  });
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
  const currentPower = _readFirstProperty(
    compressorLayer.feature.properties,
    ['rated_power_MW', 'Rated_Power_MW', 'rated_power_mw'],
    'Not specified'
  );
  
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
        keepOpen: true,
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
  const originalPower = Number(_readFirstProperty(
    selectedCompressor.feature.properties,
    ['rated_power_MW', 'Rated_Power_MW', 'rated_power_mw'],
    0
  )) || 0;
  const distributedPower = originalPower / distributionCount;
  const originalProps = {...selectedCompressor.feature.properties};
  const originalCompressorId = String(
    _readFirstProperty(selectedCompressor.feature.properties, ['ID', 'id'], 'Compressor')
  );
  const originalLatLng = selectedCompressor.getLatLng();
  const originalCompressorGroup = _getOriginalCompressorGroupForDistribute(compressorsLayer);
  
  console.log('Original power:', originalPower, 'Distributed power:', distributedPower);
  
  /* Remove the original compressor marker. */
  if (compressorsLayer && compressorsLayer.hasLayer(selectedCompressor)) {
    compressorsLayer.removeLayer(selectedCompressor);
  }
  if (originalCompressorGroup?.hasLayer?.(selectedCompressor)) {
    originalCompressorGroup.removeLayer(selectedCompressor);
  }
  
  /* Create the first sub-compressor (replaces the original). */
  const firstSubCompressorProperties = _assignRatedPower(_assignFeatureId({
      ...originalProps,
      Distribution_Group: originalCompressorId
    }, _getUniqueDistributedCompressorId(originalCompressorId, 0)), distributedPower);
  const firstSubCompressor = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [originalLatLng.lng, originalLatLng.lat]
    },
    properties: firstSubCompressorProperties
  };
  markFeatureChanged(firstSubCompressor);
  
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
      if (originalCompressorGroup?.addLayer && !originalCompressorGroup.hasLayer(layer)) {
        originalCompressorGroup.addLayer(layer);
      }
    });
  }

  subCompressors = [firstCompressorLayer.getLayers()[0]];
  selectedCompressor = firstCompressorLayer.getLayers()[0];

  setupPipelineClickHandlersForPlacement();

  showCustomPopup(
    '🔄 Distribute Compressors - Step 3',
    `<div style="text-align:center; margin:15px 0;">
      <p><strong>Power per sub-compressor:</strong> ${distributedPower.toFixed(2)} MW</p>
      <p><strong>Remaining placements needed:</strong> ${distributionCount - 1}</p>
      <p>Click on pipeline segments to place the remaining sub-compressors.</p>
    </div>`,
    [
      { text: 'Continue Placement', type: 'primary', onClick: () => closeCustomPopup() },
      { text: 'Cancel', type: 'secondary', onClick: () => exitDistributeMode() }
    ]
  );
}

function _ensurePipelineInteractive(layer) {
  try {
    if (layer?.options) layer.options.interactive = true;
    const element = typeof layer?.getElement === 'function' ? layer.getElement() : layer?._path;
    if (element?.style) {
      element.style.pointerEvents = 'auto';
      element.style.cursor = 'crosshair';
    }
    if (typeof layer?.bringToFront === 'function') layer.bringToFront();
  } catch (e) {}
}

function _distancePointToSegmentMeters(point, start, end) {
  const zoom = map?.getZoom ? map.getZoom() : 10;
  const p = map.project(point, zoom);
  const a = map.project(start, zoom);
  const b = map.project(end, zoom);
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const denominator = vx * vx + vy * vy;
  const factor = denominator > 0
    ? Math.max(0, Math.min(1, (vx * (p.x - a.x) + vy * (p.y - a.y)) / denominator))
    : 0;
  const projected = L.point(a.x + factor * vx, a.y + factor * vy);
  return map.distance(point, map.unproject(projected, zoom));
}

function _findNearestPipelineLayer(clickLatLng, thresholdMeters = 45) {
  let best = null;
  let bestDistance = Infinity;
  _getPipelineFeatureLayersForDistribute().forEach(layer => {
    try {
      const latlngs = layer.getLatLngs();
      const flat = Array.isArray(latlngs?.[0]) ? latlngs.flat(2) : latlngs;
      if (!flat || flat.length < 2) return;
      for (let index = 0; index < flat.length - 1; index += 1) {
        const distance = _distancePointToSegmentMeters(clickLatLng, flat[index], flat[index + 1]);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = layer;
        }
      }
    } catch (e) {}
  });
  return best && bestDistance <= thresholdMeters ? best : null;
}

function setupPipelineClickHandlersForPlacement() {
  const pipelineFeatures = _getPipelineFeatureLayersForDistribute();
  pipelineFeatures.forEach(layer => {
    try { layer.off('click'); } catch (e) {}
    _ensurePipelineInteractive(layer);
  });

  if (mapClickHandler) {
    try { map.off('click', mapClickHandler); } catch (e) {}
    mapClickHandler = null;
  }
  if (!pipelineFeatures.length) return;

  pipelineFeatures.forEach(layer => {
    layer.on('click', function (event) {
      if (distributeMode && selectedCompressor && subCompressors.length < distributionCount) {
        const originalEvent = event && event.originalEvent;
        if (originalEvent && processedDistributionClicks.has(originalEvent)) return;
        if (originalEvent) {
          processedDistributionClicks.add(originalEvent);
          try { L.DomEvent.stopPropagation(originalEvent); } catch (e) {}
        }
        try {
          placeSubCompressorOnPipeline(layer, event.latlng);
        } catch (error) {
          console.error('Error placing sub-compressor:', error);
        }
      }
    });
  });

  /* Fallback: resolve nearest pipeline on map click. */
  mapClickHandler = function (e) {
    if (!distributeMode || !selectedCompressor) return;
    if (subCompressors.length >= distributionCount) return;
    const originalEvent = e && e.originalEvent;
    if (originalEvent && processedDistributionClicks.has(originalEvent)) return;
    const nearest = _findNearestPipelineLayer(e.latlng);
    if (nearest) {
      if (originalEvent) processedDistributionClicks.add(originalEvent);
      console.log('Pipeline resolved via map-click fallback');
      try { placeSubCompressorOnPipeline(nearest, e.latlng); } catch (err) { console.error('Error placing via map fallback:', err); }
    }
  };
  try {
    map.on('click', mapClickHandler);
  } catch (e) {}
}


function placeSubCompressorOnPipeline(clickedPipelineFeature, clickLatLng) {
  console.log('=== placeSubCompressorOnPipeline called ===');
  console.log('clickedPipelineFeature:', clickedPipelineFeature);
  console.log('clickLatLng:', clickLatLng);
  console.log('subCompressors.length:', subCompressors.length);
  
  const currentIndex = subCompressors.length;
  
  /* Keep the previous compressor for the visual connection line. */
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
    
    /* Compute the point on this segment nearest to the user's click. */
    const nearestPointOnSegment = getNearestPointOnSegment(clickLatLng, segmentStart, segmentEnd);
    const distance = getDistance(clickLatLng, nearestPointOnSegment);
    
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
  const compressorBaseID = String(_readFirstProperty(
    originalProps,
    ['Distribution_Group', 'ID', 'id'],
    'Compressor'
  ));
  const originalPipelineId = String(
    _readFirstProperty(originalPipelineProps, ['ID', 'id'], 'Pipeline')
  );
  const originalStartNodeId = String(_readFirstProperty(
    originalPipelineProps,
    ['node_start', 'Start_Node', 'start_node', 'StartNode'],
    ''
  ));
  const originalEndNodeId = String(_readFirstProperty(
    originalPipelineProps,
    ['node_end', 'End_Node', 'end_node', 'EndNode'],
    ''
  ));
  
  const newCompressorId = _getUniqueDistributedCompressorId(compressorBaseID, currentIndex);
  /* Compressor terminal-node convention: <compressor id>_A / _B. */
  const subNodeA_ID = `${newCompressorId}_A`;
  const subNodeB_ID = `${newCompressorId}_B`;
  
  /* Create new pipeline coordinate sets with the split point. */
  const firstPipelineCoords = coords.slice(0, closestSegmentIndex + 1);
  firstPipelineCoords.push([closestPoint.lng, closestPoint.lat]); // Teilungspunkt hinzufÃ¼gen
  
  const secondPipelineCoords = [[closestPoint.lng, closestPoint.lat]]; // Start mit Teilungspunkt
  secondPipelineCoords.push(...coords.slice(closestSegmentIndex + 1));
  
  const firstPipelineProperties = _assignFeatureId({
      ...originalPipelineProps,
      node_start: originalStartNodeId,
      node_end: subNodeA_ID,
      Length_km: calculatePipelineLength(firstPipelineCoords),
      length_km: calculatePipelineLength(firstPipelineCoords)
    }, `${originalPipelineId}_a`);
  const firstPipeline = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: firstPipelineCoords
    },
    properties: firstPipelineProperties
  };

  const secondPipelineProperties = _assignFeatureId({
      ...originalPipelineProps,
      node_start: subNodeB_ID,
      node_end: originalEndNodeId,
      Length_km: calculatePipelineLength(secondPipelineCoords),
      length_km: calculatePipelineLength(secondPipelineCoords)
    }, `${originalPipelineId}_b`);
  const secondPipeline = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: secondPipelineCoords
    },
    properties: secondPipelineProperties
  };
  
  /* Remove original pipeline from its owning group (supports multiple layers). */
  const originalUndoContexts = window.QGasUndo?.captureContexts(clickedPipelineFeature.feature);
  const targetPipelineGroup = _findOwningPipelineGroup(clickedPipelineFeature) || (typeof pipelineLayer !== 'undefined' ? pipelineLayer : null);
  console.log('Removing original pipeline from layer');
  if (targetPipelineGroup && typeof targetPipelineGroup.hasLayer === 'function' && targetPipelineGroup.hasLayer(clickedPipelineFeature)) {
    targetPipelineGroup.removeLayer(clickedPipelineFeature);
    console.log('Original pipeline removed from pipeline group');
  }

  
  /* Mark original as deleted for export. */
  markFeatureChanged(firstPipeline);
  markFeatureChanged(secondPipeline);
  markLayerChanged(clickedPipelineFeature, {
    changeType: 'Topology Change',
    tool: 'Distribute Compressors',
    description: `Original pipeline replaced by ${firstPipeline.properties.id} and ${secondPipeline.properties.id}`,
    undoOperation: 'delete',
    undoContexts: originalUndoContexts
  });
  clickedPipelineFeature.feature.properties.deleted = true;
  
  /* Add new pipeline segments back to the same pipeline group. */
  const firstPipelineLayer = _createDistributionPipelineLayer(firstPipeline, clickedPipelineFeature, targetPipelineGroup);
  const secondPipelineLayer = _createDistributionPipelineLayer(secondPipeline, clickedPipelineFeature, targetPipelineGroup);
  
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
      id: subNodeA_ID,
      Name: `Node ${subNodeA_ID}`,
      Type: 'Node',
      Country: originalPipelineProps.Country || '',
      Operator: originalPipelineProps.Operator || '',
      Status: 'Active',
      Created_By_Compressor_Split: newCompressorId
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
      id: subNodeB_ID,
      Name: `Node ${subNodeB_ID}`,
      Type: 'Node',
      Country: originalPipelineProps.Country || '',
      Operator: originalPipelineProps.Operator || '',
      Status: 'Active',
      Created_By_Compressor_Split: newCompressorId
    }
  };
  
  /* Add sub-nodes to the node layer (standard node appearance). */
  if (false && nodeLayer) {
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
    
    // Direkt zu nodeLayer hinzufÃ¼gen
    subNodeALayer.eachLayer(layer => nodeLayer.addLayer(layer));
    subNodeBLayer.eachLayer(layer => nodeLayer.addLayer(layer));
  }
  
  /* Register both terminal nodes through the standard node factory. This
   * targets the configured Nodes layer used by topology checks and applies
   * the same visual style and metadata as existing nodes. */
  const targetNodeGroup = _getConfiguredNodeGroupForDistribute();
  const defaultNodeProperties = typeof getDefaultPointAttributes === 'function'
    ? (getDefaultPointAttributes('Node') || {})
    : {};
  const startEndpointProperties = _findNodePropertiesForDistribute(originalStartNodeId);
  const endEndpointProperties = _findNodePropertiesForDistribute(originalEndNodeId);
  const buildEndpointNodeProperties = (sourceProperties, nodeId) => {
    const properties = { ...(sourceProperties || defaultNodeProperties) };
    delete properties.ID;
    properties.id = nodeId;
    if (Object.prototype.hasOwnProperty.call(properties, 'Name')) properties.Name = `Node ${nodeId}`;
    if (Object.prototype.hasOwnProperty.call(properties, 'name')) properties.name = `Node ${nodeId}`;
    return properties;
  };
  const subNodeAProperties = buildEndpointNodeProperties(startEndpointProperties, subNodeA_ID);
  const subNodeBProperties = buildEndpointNodeProperties(endEndpointProperties, subNodeB_ID);
  subNodeA.properties = { ...subNodeAProperties };
  subNodeB.properties = { ...subNodeBProperties };
  const createdSubNodeA = _createDistributionNode(subNodeA_ID, closestPoint, subNodeAProperties, targetNodeGroup);
  const createdSubNodeB = _createDistributionNode(subNodeB_ID, closestPoint, subNodeBProperties, targetNodeGroup);

  /* Create a new sub-compressor with sub-node links. */
  const newCompressorProperties = _assignRatedPower(_assignFeatureId({
      ...originalProps,
      node_start: subNodeA_ID,
      node_end: subNodeB_ID,
      SubNode_A: subNodeA_ID,
      SubNode_B: subNodeB_ID,
      Pipeline_Split: originalPipelineId,
      Distribution_Group: originalProps.Distribution_Group
    }, newCompressorId), _readFirstProperty(originalProps, ['rated_power_MW', 'Rated_Power_MW', 'rated_power_mw'], 0));
  const newCompressor = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [closestPoint.lng, closestPoint.lat]
    },
    properties: newCompressorProperties
  };
  if (createdSubNodeA?.feature) markFeatureChanged(createdSubNodeA.feature);
  if (createdSubNodeB?.feature) markFeatureChanged(createdSubNodeB.feature);
  markFeatureChanged(newCompressor);
  
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
    
    // Direkt zu compressorsLayer hinzufÃ¼gen
    newLayer.eachLayer(layer => {
      compressorsLayer.addLayer(layer);
      const originalCompressorGroup = _getOriginalCompressorGroupForDistribute(compressorsLayer);
      if (originalCompressorGroup?.addLayer && !originalCompressorGroup.hasLayer(layer)) {
        originalCompressorGroup.addLayer(layer);
      }
      subCompressors.push(layer);
    });
  }
  
  /* Connect to the geographically nearest existing sub-compressor. The newly
   * placed compressor is the final array entry and must not select itself. */
  const connectionCandidates = subCompressors.slice(0, -1);
  const nearestCompressor = connectionCandidates.reduce((nearest, candidate) => {
    if (!candidate?.getLatLng) return nearest;
    if (!nearest) return candidate;
    return map.distance(candidate.getLatLng(), closestPoint) < map.distance(nearest.getLatLng(), closestPoint)
      ? candidate
      : nearest;
  }, null);
  const nearestLatLng = nearestCompressor?.getLatLng?.();
  if (nearestLatLng) {
    const connectionLine = L.polyline([nearestLatLng, closestPoint], {
      color: '#000000',
      weight: 1,
      opacity: 0.7,
      dashArray: '5, 5'
    });
    if (compressorsLayer?.addLayer) compressorsLayer.addLayer(connectionLine);
    else connectionLine.addTo(map);
    connectionLines.push(connectionLine);
  }

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
        <p><strong>Placed:</strong> ${newCompressor.properties.id}</p>
        <p><strong>Sub-Nodes:</strong> ${subNodeA_ID}, ${subNodeB_ID}</p>
        <p><strong>Pipeline split:</strong> ${originalPipelineId}</p>
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
  const compressorNames = subCompressors
    .map(comp => _readFirstProperty(comp.feature.properties, ['ID', 'id'], 'Unknown'))
    .join(', ');
  const power = Number(_readFirstProperty(selectedCompressor.feature.properties, ['rated_power_MW', 'Rated_Power_MW', 'rated_power_mw'], 0)) || 0;
  
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
  _getPipelineGroupsForDistribute().forEach(group => {
    group.eachLayer(layer => {
      layer.off('click');
    });
  });
  if (mapClickHandler) {
    try { map.off('click', mapClickHandler); } catch(e) {}
    mapClickHandler = null;
  }
}

function synchronizeDistributionLayerVisibilityWithLegend() {
  try {
    if (typeof legendToggleRegistry === 'undefined' || !legendToggleRegistry) return;
    legendToggleRegistry.forEach(entry => {
      if (entry && typeof entry.handler === 'function') entry.handler();
    });
  } catch (error) {
    console.warn('Could not synchronize layer visibility after compressor distribution.', error);
  }
}

function getCompressorName(compressorLayer) {
  const props = compressorLayer.feature.properties;
  return props.Name || props.name || props.Station_name || props.ID || props.id || 'Unknown Compressor';
}

function getDistance(latlng1, latlng2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = latlng1.lat * Math.PI/180;
  const phi2 = latlng2.lat * Math.PI/180;
  const deltaPhi = (latlng2.lat-latlng1.lat) * Math.PI/180;
  const deltaLambda = (latlng2.lng-latlng1.lng) * Math.PI/180;

  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
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

  /* Restore all configured layers hidden specifically for this workflow,
   * including dynamically configured project layers. */
  hiddenLayersForDistribution.forEach(layer => {
    try { if (layer && !map.hasLayer(layer)) layer.addTo(map); } catch (e) {}
  });
  hiddenLayersForDistribution = [];
  
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
  const compressorToggle = _getCompressorToggleForDistribute();
  if (compressorToggle && originalPipelineVisibility.compressorToggleChecked !== undefined) {
    compressorToggle.checked = originalPipelineVisibility.compressorToggleChecked;
  }
  if (!originalPipelineVisibility.compressors && compressorsLayer && map.hasLayer(compressorsLayer)) {
    map.removeLayer(compressorsLayer);
  }

  /* Layer references can change while a country filter or an editing tool is
   * active. Reapply every legend toggle to its current resolved layer so a
   * checked entry cannot remain visually hidden after this tool exits. */
  synchronizeDistributionLayerVisibilityWithLegend();
  
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
  hiddenLayersForDistribution = [];
  
  closeCustomPopup();
}

function resetDistributeClickHandlers() {
  if (mapClickHandler) { try { map.off('click', mapClickHandler); } catch(e) {} mapClickHandler = null; }
  if (compressorsLayer) {
    compressorsLayer.eachLayer(layer => {
      layer.off('click');
    });
  }
  _getPipelineGroupsForDistribute().forEach(group => {
    group.eachLayer(layer => {
      layer.off('click');
    });
  });
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
