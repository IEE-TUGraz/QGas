/**
 * ================================================================================
 * QGas - Change Direction Tool
 * ================================================================================
 * 
 * Enables users to reverse the flow direction of pipeline segments by swapping
 * their Start_Node and End_Node references.
 * 
 * Key Features:
 * - Visual direction indicators (arrows)
 * - Interactive pipeline selection
 * - Batch direction reversal
 * - Property-based direction tracking
 * - Confirmation before applying changes
 * 
 * Workflow:
 * 1. User activates tool
 * 2. Direction arrows appear on all pipelines
 * 3. User clicks pipelines to mark for reversal
 * 4. Selected pipelines show reversed arrows
 * 5. Confirmation dialog saves all changes
 * 
 * Technical Details:
 * - Uses Leaflet PolylineDecorator for arrow visualization
 * - Tracks state in directionChangeState Map
 * - Swaps Start_Node and End_Node properties
 * - Updates all connected references
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Selected pipeline features and their Start_Node/End_Node attributes.
 * - Map layer references for visual arrows.
 *
 * Public API:
 * - activateChangeDirectionMode(): Begin direction-change workflow.
 * 
 * ================================================================================
 */

/* ================================================================================
 * STATE MANAGEMENT
 * ================================================================================
 */
const directionChangeState = new Map();
const reversedDirectionLayers = new Set();

/**
 * Activate the change-direction editing mode.
 *
 * Resets all pipeline highlights, clears internal direction state, and
 * attaches click handlers to every polyline in all active line-layer groups.
 * Each click toggles the geometric direction of the selected pipeline
 * (reverses the coordinate array) and updates the directional arrow
 * decorator. A Save/Discard toolbar strip is shown for confirmation.
 * Exits automatically on Escape key or explicit user discard.
 *
 * @returns {void}
 */
function activateChangeDirectionMode() {
  resetAllPipelineHighlights();
  directionChangeState.clear();
  reversedDirectionLayers.clear();

  const lineGroups = getLineLayerGroupsForDirectionMode();
  if (!lineGroups.length) {
    showCustomPopup(
      '⚠️ No Line Layers',
      '<p style="text-align: center; margin: 15px 0;">There are no line-based layers available for Change Direction mode.</p>',
      [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => {} }]
    );
    return false;
  }

  let preparedAny = false;
  lineGroups.forEach(layerGroup => {
    forEachPolylineFeature(layerGroup, polyline => {
      preparedAny = true;
      prepareLineForDirectionMode(polyline);
    });
  });

  if (!preparedAny) {
    showCustomPopup(
      '⚠️ No Line Features',
      '<p style="text-align: center; margin: 15px 0;">No line features with Start/End nodes are available to reverse.</p>',
      [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => {} }]
    );
    directionChangeState.clear();
    return false;
  }

  return true;
}

function getLineLayerGroupsForDirectionMode() {
  const groups = [];
  const seen = new Set();
  const addLayer = (layer) => {
    if (!layer || typeof layer.eachLayer !== 'function') return;
    if (seen.has(layer)) return;
    seen.add(layer);
    groups.push(layer);
  };

  addLayer(pipelineLayer);
  addLayer(shortPipeLayer);
  addLayer(drawnItems);

  if (dynamicLayers && typeof dynamicLayers === 'object') {
    Object.values(dynamicLayers).forEach(layer => {
      if (!layer) return;
      const geometryClass = (getLayerGeometryClassHint(layer) || '').toLowerCase();
      if (geometryClass === 'line') {
        addLayer(layer);
      }
    });
  }

  if (window.customLayers) {
    Object.values(window.customLayers).forEach(layer => {
      if (!layer) return;
      const geometryClass = (getLayerGeometryClassHint(layer) || '').toLowerCase();
      if (geometryClass === 'line') {
        addLayer(layer);
      }
    });
  }

  return groups;
}

function forEachPolylineFeature(layerGroup, callback) {
  if (!layerGroup || typeof callback !== 'function') return;
  traverseLayerRecursively(layerGroup, candidate => {
    if (!candidate || typeof candidate.getLatLngs !== 'function') return;
    if (!candidate.feature || !candidate.feature.geometry) return;
    const geomType = candidate.feature.geometry.type;
    if (geomType !== 'LineString' && geomType !== 'MultiLineString') return;
    callback(candidate);
  });
}

function cloneLatLngStructure(latlngs) {
  try {
    return JSON.parse(JSON.stringify(latlngs));
  } catch (error) {
    console.warn('Unable to clone latlng structure:', error);
    return [];
  }
}

function reverseLatLngArray(latlngs) {
  if (!Array.isArray(latlngs)) return latlngs;
  if (latlngs.length === 0) return [];
  if (Array.isArray(latlngs[0])) {
    return latlngs.slice().reverse().map(segment => reverseLatLngArray(segment));
  }
  return latlngs.slice().reverse();
}

function reversePolylineLatLngs(layer) {
  if (!layer || typeof layer.getLatLngs !== 'function') return;
  const latlngs = layer.getLatLngs();
  const reversed = reverseLatLngArray(latlngs);
  if (reversed) {
    layer.setLatLngs(reversed);
  }
}

function applyDirectionLayerStyle(layer, color, weight, dashArray = null) {
  layer.setStyle({ color, weight, dashArray, opacity: 1 });
  if (layer._path) {
    layer._path.style.stroke = color;
    layer._path.style.strokeWidth = `${weight}px`;
    layer._path.style.opacity = '1';
    layer._path.style.strokeDasharray = dashArray ? dashArray : '';
  }
}

function refreshDirectionArrow(layer, color) {
  if (layer._arrowDecorator) {
    map.removeLayer(layer._arrowDecorator);
    delete layer._arrowDecorator;
  }
  addArrowDecorator(layer, color);
}

function prepareLineForDirectionMode(layer) {
  if (!layer || directionChangeState.has(layer)) return;
  const props = (layer.feature && layer.feature.properties) || {};
  const hasNodes = Boolean(props.Start_Node && props.End_Node);
  const originalStyle = {
    color: layer._originalColor || layer.options?.color || '#0070f3',
    weight: layer._originalWeight || layer.options?.weight || 3,
    dashArray: layer.options?.dashArray || null,
    opacity: typeof layer.options?.opacity === 'number' ? layer.options.opacity : 0.8
  };

  directionChangeState.set(layer, {
    originalLatLngs: cloneLatLngStructure(layer.getLatLngs()),
    originalStart: props.Start_Node,
    originalEnd: props.End_Node,
    originalStyle
  });

  layer.off('click');
  if (typeof layer.unbindPopup === 'function') {
    layer.unbindPopup();
  }
  if (typeof layer.closePopup === 'function') {
    layer.closePopup();
  }

  if (hasNodes) {
    applyDirectionLayerStyle(layer, '#00aa00', 5);
    refreshDirectionArrow(layer, '#00aa00');
    layer.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      toggleLineDirection(layer);
    });
  } else {
    applyDirectionLayerStyle(layer, '#999999', 3, '5, 5');
    layer.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      showInfoPopup('This element has no Start/End nodes defined.', '🔄 Change Direction');
    });
  }
}

function toggleLineDirection(layer) {
  if (!layer || !layer.feature || !layer.feature.properties) return;
  const props = layer.feature.properties;
  if (!props.Start_Node || !props.End_Node) {
    showInfoPopup('This element has no Start/End nodes defined.', '🔄 Change Direction');
    return;
  }

  const temp = props.Start_Node;
  props.Start_Node = props.End_Node;
  props.End_Node = temp;

  reversePolylineLatLngs(layer);

  if (reversedDirectionLayers.has(layer)) {
    reversedDirectionLayers.delete(layer);
  } else {
    reversedDirectionLayers.add(layer);
  }

  const color = reversedDirectionLayers.has(layer) ? '#ff0000' : '#00aa00';
  applyDirectionLayerStyle(layer, color, 5);
  refreshDirectionArrow(layer, color);
  console.log('Line direction toggled:', props.ID, 'Start:', props.Start_Node, 'End:', props.End_Node);
}

function clearDirectionModeArtifacts(restoreGeometry) {
  directionChangeState.forEach((state, layer) => {
    if (!layer) return;
    if (layer._arrowDecorator) {
      map.removeLayer(layer._arrowDecorator);
      delete layer._arrowDecorator;
    }
    const style = state.originalStyle || {};
    layer.setStyle({
      color: style.color,
      weight: style.weight,
      dashArray: style.dashArray,
      opacity: style.opacity
    });
    if (layer._path) {
      layer._path.style.stroke = style.color || '#0070f3';
      layer._path.style.strokeWidth = style.weight ? `${style.weight}px` : '3px';
      layer._path.style.opacity = typeof style.opacity === 'number' ? `${style.opacity}` : '0.8';
      layer._path.style.strokeDasharray = style.dashArray ? style.dashArray : '';
    }
    if (restoreGeometry) {
      const originalLatLngs = cloneLatLngStructure(state.originalLatLngs);
      if (originalLatLngs && layer.setLatLngs) {
        layer.setLatLngs(originalLatLngs);
      }
      if (layer.feature && layer.feature.properties) {
        layer.feature.properties.Start_Node = state.originalStart;
        layer.feature.properties.End_Node = state.originalEnd;
      }
    }
    layer.off('click');
  });

  directionChangeState.clear();
  reversedDirectionLayers.clear();
}

function addArrowDecorator(layer, color) {
  try {
    /* Check whether L.polylineDecorator is available. */
    if (typeof L.polylineDecorator === 'undefined') {
      console.error('L.polylineDecorator is not loaded. Using alternative arrow display.');
      return;
    }
    
    /* Place arrows along the pipeline at regular intervals. */
    const arrowDecorator = L.polylineDecorator(layer, {
      patterns: [
        {
          offset: '10%',
          repeat: '20%',
          symbol: L.Symbol.arrowHead({
            pixelSize: 12,
            polygon: true,
            pathOptions: { 
              color: color, 
              fillColor: color,
              weight: 2, 
              fillOpacity: 1,
              opacity: 1,
              interactive: false
            }
          })
        }
      ]
    }).addTo(map);
    
    /* Make decorator layers non-interactive so clicks reach the pipeline. */
    arrowDecorator.eachLayer(decoratorLayer => {
      if (decoratorLayer._path) {
        decoratorLayer._path.style.pointerEvents = 'none';
      }
    });
    
    layer._arrowDecorator = arrowDecorator;
    console.log('Arrow decorator added to layer');
  } catch (error) {
    console.error('Error adding arrow decorator:', error);
  }
}

function showSaveDirectionButton() {
  removeDirectionButtons();
  const btn = document.createElement('button');
  btn.id = 'save-direction-btn';
  btn.textContent = 'Save Changes';
  btn.className = 'main-menu-btn edit-action-btn';
  btn.style.display = 'block';
  btn.style.width = '140px';
  btn.style.margin = '0';
  btn.style.padding = '8px 16px';
  btn.style.boxSizing = 'border-box';
  btn.style.background = '#28a745';
  
  btn.onclick = function() {
    clearDirectionModeArtifacts(false);
    removeDirectionButtons();
    currentMode = 'info';
    activateInfoMode();
    selectTool('info');
    
    console.log('Saved', reversedDirectionLayers.size, 'direction changes');
  };
  
  // Add button to tools section
  const toolsSection = document.getElementById('tools-section');
  toolsSection.appendChild(btn);
}

function showDiscardDirectionButton() {
  const btn = document.createElement('button');
  btn.id = 'discard-direction-btn';
  btn.textContent = 'Discard Changes';
  btn.className = 'main-menu-btn edit-action-btn';
  btn.style.display = 'block';
  btn.style.width = '140px';
  btn.style.margin = '0';
  btn.style.padding = '8px 16px';
  btn.style.boxSizing = 'border-box';
  btn.style.background = '#dc3545';
  
  btn.onclick = function() {
    clearDirectionModeArtifacts(true);
    removeDirectionButtons();
    currentMode = 'info';
    activateInfoMode();
    selectTool('info');
  };
  
  // Add button to tools section
  const toolsSection = document.getElementById('tools-section');
  toolsSection.appendChild(btn);
}

function removeDirectionButtons() {
  ['save-direction-btn', 'discard-direction-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.remove();
  });
}

