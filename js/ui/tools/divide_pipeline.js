/**
 * ================================================================================
 * QGas - Divide Pipeline Tool
 * ================================================================================
 * 
 * Splits a single pipeline segment into multiple segments at specified points.
 * Creates new intermediate nodes and updates topology automatically.
 * 
 * Key Features:
 * - Interactive point selection for division
 * - Visual support point markers
 * - Automatic node creation at division points
 * - Geometry preservation
 * - Property inheritance for new segments
 * - Multi-point division support
 * 
 * Workflow:
 * 1. User selects pipeline to divide
 * 2. Clicks map to add division points
 * 3. Support markers appear at each point
 * 4. Confirmation creates new segments and nodes
 * 5. Original pipeline replaced with segmented version
 * 
 * Technical Details:
 * - Creates new node IDs for division points
 * - Splits coordinates at each division point
 * - Generates new pipeline segments with proper Start/End nodes
 * - Updates all layer references
 * - Maintains attribute consistency across segments
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Selected pipeline and user-defined division points.
 * - Node and pipeline layers for updates.
 *
 * Public API:
 * - activateDividePipelineTool(): Begin pipeline division workflow.
 * 
 * ================================================================================
 */

function activateDividePipelineTool() {
  /* startPipelineDivision already handles popups and cleanup. */
  startPipelineDivision();
}

/* ================================================================================
 * Pipeline Division Functions
 * ================================================================================
 */

let divisionMode = false;
let selectedPipelineForDivision = null;
let supportPointMarkers = [];
let divisionLineGroups = [];
let divisionAwaitingLocation = false;
let selectedDivisionParentLayer = null;

function inferDivisionParentLayer(layer) {
  if (!layer) return null;
  const meta = getLayerMetadataFromParents(layer);
  if (meta?.layerName && dynamicLayers[meta.layerName]) {
    return dynamicLayers[meta.layerName];
  }
  if (layer._originLayerName && dynamicLayers[layer._originLayerName]) {
    return dynamicLayers[layer._originLayerName];
  }
  const directParent = getLayerParentGroup(layer);
  if (directParent && directParent !== drawnItems) {
    return directParent;
  }
  if (layer._qgasMeta?.elementKey === 'pipelines' && pipelineLayer) {
    return pipelineLayer;
  }
  if (drawnItems && typeof drawnItems.hasLayer === 'function' && drawnItems.hasLayer(layer)) {
    return drawnItems;
  }
  return null;
}

function resolveDivisionParentLayer(layer) {
  const cached = selectedDivisionParentLayer;
  if (cached && cached !== drawnItems && typeof cached.addLayer === 'function') {
    return cached;
  }
  const inferred = inferDivisionParentLayer(layer);
  if (inferred) {
    if (inferred !== cached) {
      selectedDivisionParentLayer = inferred;
    }
    return inferred;
  }
  if (cached && typeof cached.addLayer === 'function') {
    return cached;
  }
  if (layer && drawnItems && typeof drawnItems.hasLayer === 'function' && drawnItems.hasLayer(layer)) {
    selectedDivisionParentLayer = drawnItems;
    return drawnItems;
  }
  const fallback = pipelineLayer || drawnItems || null;
  selectedDivisionParentLayer = fallback;
  return fallback;
}

function captureDivisionBaseStyle(layer) {
  if (!layer || layer._divisionBaseStyle) return;
  const options = layer.options || {};
  layer._divisionBaseStyle = {
    color: options.color || layer._originalColor || '#3388ff',
    weight: typeof options.weight === 'number' ? options.weight : (layer._originalWeight ?? 3),
    opacity: typeof options.opacity === 'number' ? options.opacity : (layer._originalOpacity ?? 0.8),
    dashArray: Object.prototype.hasOwnProperty.call(options, 'dashArray') ? options.dashArray : (layer._originalDashArray ?? null)
  };
}

function restoreDivisionBaseStyle(layer) {
  if (!layer || !layer._divisionBaseStyle) return;
  layer.setStyle(layer._divisionBaseStyle);
  syncPathStyle(layer, layer._divisionBaseStyle);
  delete layer._divisionBaseStyle;
}

function applyDivisionHighlight(layer) {
  if (!layer) return;
  captureDivisionBaseStyle(layer);
  const highlightStyle = {
    color: '#ff3300',
    weight: (layer._divisionBaseStyle?.weight || 3) + 3,
    opacity: 1,
    dashArray: null
  };
  layer.setStyle(highlightStyle);
  syncPathStyle(layer, highlightStyle);
  if (typeof layer.bringToFront === 'function') {
    layer.bringToFront();
  }
}

function getLayerParentGroup(layer) {
  if (!layer || !layer._eventParents) return null;
  for (const parentId in layer._eventParents) {
    if (!Object.prototype.hasOwnProperty.call(layer._eventParents, parentId)) continue;
    const parent = layer._eventParents[parentId];
    if (!parent || parent instanceof L.Map) continue;
    if (typeof parent.addLayer === 'function' && typeof parent.removeLayer === 'function') {
      return parent;
    }
  }
  return null;
}

function deriveLineStyleFromLayer(layer) {
  if (!layer) {
    return { color: '#3388ff', weight: 3, opacity: 0.8, dashArray: null };
  }
  const base = layer._divisionBaseStyle || {};
  const options = layer.options || {};
  return {
    color: base.color || layer._originalColor || options.color || '#3388ff',
    weight: base.weight || layer._originalWeight || options.weight || 3,
    opacity: base.opacity || layer._originalOpacity || options.opacity || 0.8,
    dashArray: Object.prototype.hasOwnProperty.call(base, 'dashArray') ? base.dashArray : (Object.prototype.hasOwnProperty.call(options, 'dashArray') ? options.dashArray : (layer._originalDashArray ?? null))
  };
}

function createPolylineFromFeature(feature, sourceLayer) {
  if (!feature || !feature.geometry || feature.geometry.type !== 'LineString') {
    return null;
  }
  const coords = feature.geometry.coordinates || [];
  const latlngs = coords.map(coord => [coord[1], coord[0]]);
  const style = deriveLineStyleFromLayer(sourceLayer);
  const pane = sourceLayer?.options?.pane || 'pipelinePane';
  const polyline = L.polyline(latlngs, { ...style, pane });
  polyline.feature = feature;
  polyline._originLayerName = sourceLayer?._originLayerName;
  polyline._customLayerSettings = sourceLayer?._customLayerSettings;
  polyline._qgasMeta = sourceLayer?._qgasMeta;
  polyline._originalColor = style.color;
  polyline._originalWeight = style.weight;
  polyline._originalOpacity = style.opacity;
  polyline._originalDashArray = style.dashArray || null;
  setPipelineInteraction(polyline, 'info');
  return polyline;
}

function coordsAlmostEqual(a, b, epsilon = 1e-9) {
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon;
}

function splitLineStringAtLatLng(coords, targetLatLng) {
  if (!Array.isArray(coords) || coords.length < 2 || !map) return null;
  const targetPoint = map.latLngToLayerPoint(targetLatLng);
  let bestMatch = null;

  for (let i = 0; i < coords.length - 1; i++) {
    const startLatLng = L.latLng(coords[i][1], coords[i][0]);
    const endLatLng = L.latLng(coords[i + 1][1], coords[i + 1][0]);
    const startPoint = map.latLngToLayerPoint(startLatLng);
    const endPoint = map.latLngToLayerPoint(endLatLng);
    const segment = endPoint.subtract(startPoint);
    const segLengthSq = segment.x * segment.x + segment.y * segment.y || 1e-9;
    let t = ((targetPoint.x - startPoint.x) * segment.x + (targetPoint.y - startPoint.y) * segment.y) / segLengthSq;
    t = Math.max(0, Math.min(1, t));
    const projection = new L.Point(startPoint.x + segment.x * t, startPoint.y + segment.y * t);
    const distance = projection.distanceTo(targetPoint);
    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { segmentIndex: i, projection, distance };
    }
  }

  if (!bestMatch) return null;
  const projectedLatLng = map.layerPointToLatLng(bestMatch.projection);
  const insertCoord = [projectedLatLng.lng, projectedLatLng.lat];

  const firstPart = coords.slice(0, bestMatch.segmentIndex + 1).map(coord => [...coord]);
  const secondPart = coords.slice(bestMatch.segmentIndex + 1).map(coord => [...coord]);

  if (!coordsAlmostEqual(firstPart[firstPart.length - 1], insertCoord)) {
    firstPart.push(insertCoord);
  }
  if (!coordsAlmostEqual(secondPart[0], insertCoord)) {
    secondPart.unshift(insertCoord);
  }

  if (firstPart.length < 2 || secondPart.length < 2) {
    return null;
  }

  return {
    firstCoordinates: firstPart,
    secondCoordinates: secondPart,
    divisionCoord: insertCoord
  };
}

function splitGeometryAtLatLng(geometry, targetLatLng) {
  if (!geometry || geometry.type !== 'LineString') {
    console.warn('Division currently supports LineString geometries only.');
    return null;
  }
  return splitLineStringAtLatLng(geometry.coordinates, targetLatLng);
}

function startPipelineDivision() {
  deactivateAllModes();
  divisionMode = true;
  divisionAwaitingLocation = false;
  selectedPipelineForDivision = null;
  selectedDivisionParentLayer = null;
  currentMode = 'divide-pipeline';
  updateActiveToolDisplay('divide-pipeline');

  divisionLineGroups = getLineLayerGroupsForDirectionMode();
  if (!divisionLineGroups.length) {
    showCustomPopup(
      '⚠️ No Line Layers',
      '<p style="text-align: center; margin: 15px 0;">No line-based layers are available for division.</p>',
      [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => { activateInfoMode(); } }]
    );
    divisionMode = false;
    currentMode = 'info';
    return;
  }

  showCustomPopup(
    '✂️ Divide Line',
    '<p style="text-align: center; margin: 15px 0;">Click a line to select it, then click again on the desired split location.<br>This works for all visible line layers.</p>',
    [{text: 'OK', type: 'primary', onClick: () => { closeCustomPopup(); }}]
  );

  divisionLineGroups.forEach(group => {
    forEachPolylineFeature(group, layer => setPipelineDivisionInteraction(layer));
  });
}

function showDivisionSelectionPopup() {
  showCustomPopup(
    '✂️ Line Selected',
    '<p style="text-align:center; margin: 15px 0;">Line highlighted. Click once more near the desired split location.<br>You can click another line to change the selection.</p>',
    [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => {} }]
  );
}

function setPipelineDivisionInteraction(layer) {
  layer.off('click');
  layer.unbindPopup();

  if (!divisionMode) return;

  layer.on('click', function(e) {
    if (!divisionMode) return;
    if (e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
      e.originalEvent.stopPropagation();
    }

    if (selectedPipelineForDivision !== layer) {
      if (selectedPipelineForDivision) {
        restoreDivisionBaseStyle(selectedPipelineForDivision);
      }
      selectedPipelineForDivision = layer;
      selectedDivisionParentLayer = getLayerParentGroup(layer);
      divisionAwaitingLocation = true;
      applyDivisionHighlight(layer);
      showDivisionSelectionPopup();
      return;
    }

    if (!divisionAwaitingLocation) {
      divisionAwaitingLocation = true;
      applyDivisionHighlight(layer);
      showDivisionSelectionPopup();
      return;
    }

    if (!e.latlng) {
      showErrorPopup('Could not determine the clicked location on the line. Please try again.', '✂️ Divide Pipeline');
      return;
    }
    dividePipelineAtLatLng(layer, e.latlng);
  });
}

function clearSupportPointMarkers() {
  supportPointMarkers.forEach(marker => {
    map.removeLayer(marker);
  });
  supportPointMarkers = [];
}

function dividePipelineAtLatLng(selectedPipelineLayer, clickLatLng) {
  try {
    const feature = selectedPipelineLayer?.feature;
    if (!feature || !feature.geometry) {
      throw new Error('Selected feature has no geometry.');
    }

    const splitResult = splitGeometryAtLatLng(feature.geometry, clickLatLng);
    if (!splitResult) {
      showErrorPopup('Unable to divide the line at the chosen location. Please click nearer to the line and try again.', '✂️ Divide Pipeline');
      return;
    }

    const { firstCoordinates, secondCoordinates, divisionCoord } = splitResult;
    const properties = { ...feature.properties };
    const contributor = getCurrentContributor();
    const originalId = properties.ID || 'PIPE';
    const originalName = properties.Name || originalId;
    const newNodeId = getNextNodeId();

    const firstProps = {
      ...properties,
      ID: `${originalId}_a`,
      Name: `${originalName}_a`,
      length_km: calculateLineLength(firstCoordinates),
      Contributor: contributor,
      modified: true
    };
    const secondProps = {
      ...properties,
      ID: `${originalId}_b`,
      Name: `${originalName}_b`,
      length_km: calculateLineLength(secondCoordinates),
      Contributor: contributor,
      modified: true
    };

    if ('End_Node' in firstProps) firstProps.End_Node = newNodeId;
    if ('Start_Node' in secondProps) secondProps.Start_Node = newNodeId;

    const firstPipeline = {
      type: 'Feature',
      properties: firstProps,
      geometry: { type: 'LineString', coordinates: firstCoordinates }
    };
    const secondPipeline = {
      type: 'Feature',
      properties: secondProps,
      geometry: { type: 'LineString', coordinates: secondCoordinates }
    };

    const parentGroup = resolveDivisionParentLayer(selectedPipelineLayer);
    if (parentGroup && typeof parentGroup.removeLayer === 'function') {
      if (!parentGroup.hasLayer || parentGroup.hasLayer(selectedPipelineLayer)) {
        parentGroup.removeLayer(selectedPipelineLayer);
      }
    }
    if (map.hasLayer(selectedPipelineLayer)) {
      map.removeLayer(selectedPipelineLayer);
    }
    if (drawnItems && typeof drawnItems.hasLayer === 'function' && drawnItems.hasLayer(selectedPipelineLayer)) {
      drawnItems.removeLayer(selectedPipelineLayer);
    }
    if (selectedPipelineLayer?.feature) {
      deletedPipelines.push(selectedPipelineLayer.feature);
    }

    restoreDivisionBaseStyle(selectedPipelineLayer);

    const firstLayer = createPolylineFromFeature(firstPipeline, selectedPipelineLayer);
    const secondLayer = createPolylineFromFeature(secondPipeline, selectedPipelineLayer);

    if (parentGroup && typeof parentGroup.addLayer === 'function') {
      if (firstLayer) parentGroup.addLayer(firstLayer);
      if (secondLayer) parentGroup.addLayer(secondLayer);
    } else {
      if (firstLayer) firstLayer.addTo(map);
      if (secondLayer) secondLayer.addTo(map);
    }

    if (drawnItems && typeof drawnItems.addLayer === 'function') {
      if (firstLayer && (!drawnItems.hasLayer || !drawnItems.hasLayer(firstLayer))) {
        drawnItems.addLayer(firstLayer);
      }
      if (secondLayer && (!drawnItems.hasLayer || !drawnItems.hasLayer(secondLayer))) {
        drawnItems.addLayer(secondLayer);
      }
    }

    const startNodeLayerRef = findNodeLayerForNodeId(properties.Start_Node);
    const endNodeLayerRef = findNodeLayerForNodeId(properties.End_Node);
    const targetNodeLayer = startNodeLayerRef || endNodeLayerRef || getActivePipelineNodeLayer();
    addDivisionNodeMarker(divisionCoord, newNodeId, properties, targetNodeLayer);

    window.hasUnsavedChanges = true;
    selectedPipelineForDivision = null;
    selectedDivisionParentLayer = null;
    divisionAwaitingLocation = false;

    showCustomPopup(
      '✅ Line Divided',
      `<p style="text-align: center; margin: 15px 0;">Line successfully divided!<br><br>
      <strong>New Node:</strong> ${newNodeId}<br>
      <strong>Segment 1:</strong> ${firstProps.ID} (${firstProps.length_km.toFixed(2)} km)<br>
      <strong>Segment 2:</strong> ${secondProps.ID} (${secondProps.length_km.toFixed(2)} km)</p>`,
      [{ text: 'OK', type: 'primary', onClick: () => { cancelPipelineDivision(); } }]
    );
  } catch (error) {
    console.error('Error dividing pipeline:', error);
    showErrorPopup('Error dividing pipeline: ' + error.message, '✂️ Divide Pipeline');
  }
}

function addDivisionNodeMarker(coordinates, nodeId, baseProperties = {}, targetLayer = null) {
  if (!Array.isArray(coordinates)) return;
  const destinationLayer = targetLayer || getActivePipelineNodeLayer();
  if (!destinationLayer) return;
  const latlng = [coordinates[1], coordinates[0]];
  const defaultAttrs = getDefaultPointAttributes('Node') || {};
  const nodeStyle = getDefaultNodeStyleOptions(destinationLayer);
  const newNode = {
    type: 'Feature',
    properties: {
      ...defaultAttrs,
      ID: nodeId,
      Type: 'Node',
      Name: nodeId,
      Country: baseProperties.Country || defaultAttrs.Country || '',
      Contributor: getCurrentContributor(),
      modified: true
    },
    geometry: {
      type: 'Point',
      coordinates
    }
  };

  const nodeMarker = L.circleMarker(latlng, nodeStyle);
  nodeMarker.feature = newNode;
  captureOriginalMarkerStyle(nodeMarker, 'default');
  destinationLayer.addLayer(nodeMarker);

  nodeMarker.on('click', function () {
    if (currentMode === 'info') {
      const content = createModalPopupContent(newNode.properties, nodeMarker);
      const title = `Node: ${newNode.properties.ID || 'Unnamed'}`;
      showElementModal(title, content, nodeMarker);
    }
  });
}

function getNextNodeId() {
  let maxId = 8999; // Start at 9000 baseline
  const layersToScan = typeof getAllNodeLayers === 'function' ? getAllNodeLayers() : [window.nodeLayer].filter(Boolean);

  layersToScan.forEach(layerGroup => {
    if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
    layerGroup.eachLayer(layer => {
      const id = layer?.feature?.properties?.ID;
      if (!id || !id.startsWith('N_')) return;
      const num = parseInt(id.substring(2));
      if (!Number.isNaN(num) && num > maxId) {
        maxId = num;
      }
    });
  });

  return `N_${maxId + 1}`;
}

function getCurrentContributor() {
  const contributorInput = document.getElementById('contributor-input');
  return contributorInput ? contributorInput.value.trim() || 'Unknown' : 'Unknown';
}

function calculateLineLength(coordinates) {
  let totalLength = 0;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const from = coordinates[i];
    const to = coordinates[i + 1];
    
    /* Haversine formula for distance calculation in km. */
    const R = 6371;
    const lat1 = from[1] * Math.PI / 180;
    const lat2 = to[1] * Math.PI / 180;
    const deltaLat = (to[1] - from[1]) * Math.PI / 180;
    const deltaLon = (to[0] - from[0]) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    totalLength += R * c;
  }
  
  return totalLength;
}

function cancelPipelineDivision() {
  divisionMode = false;
  divisionAwaitingLocation = false;
  if (selectedPipelineForDivision) {
    restoreDivisionBaseStyle(selectedPipelineForDivision);
  }
  selectedPipelineForDivision = null;
  selectedDivisionParentLayer = null;
  currentMode = 'info';
  
  clearSupportPointMarkers();
  
  if (divisionLineGroups.length) {
    divisionLineGroups.forEach(group => {
      forEachPolylineFeature(group, layer => {
        restoreDivisionBaseStyle(layer);
        layer.off('click');
        setPipelineInteraction(layer, 'info');
      });
    });
  } else if (pipelineLayer) {
    pipelineLayer.eachLayer(layer => {
      restoreDivisionBaseStyle(layer);
      setPipelineInteraction(layer, 'info');
    });
  }
  divisionLineGroups = [];
  
  closeCustomPopup();
  activateInfoMode();
}

/* ================================================================================
 * End of Pipeline Division Functions
 * ================================================================================
 */
