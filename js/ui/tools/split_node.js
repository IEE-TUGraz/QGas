/**
 * ================================================================================
 * QGas - Split Node Tool
 * ================================================================================
 * 
 * Enables splitting a single node into multiple subnodes while maintaining
 * pipeline connectivity. Useful for representing multiple parallel connections
 * or separating infrastructure at complex junction points.
 * 
 * Key Features:
 * - Interactive node selection for splitting
 * - Visual subnode creation with offset positioning
 * - Automatic pipeline reassignment to subnodes
 * - Maintains network topology
 * - Generates unique IDs for subnodes (e.g., N_01A, N_01B)
 * - Preserves node attributes on subnodes
 * - Interactive pipeline selection for reassignment
 * 
 * Workflow:
 * 1. User selects parent node to split
 * 2. Creates subnodes with visual offset
 * 3. Assigns connected pipelines to appropriate subnodes
 * 4. Original node can be kept or deleted
 * 5. Network topology is automatically updated
 * 
 * Technical Details:
 * - Subnodes positioned with pixel offsets from parent
 * - Offsets maintained during map zoom/pan
 * - Start_Node/End_Node references updated in pipeline properties
 * - Supports multiple subnode creation from single parent
 * - Interactive highlighting for pipeline selection
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Selected node and connected pipelines.
 * - Map interactions for split confirmation.
 *
 * Public API:
 * - activateSplitNodeTool(): Begin node split workflow.
 * 
 * ================================================================================
 */

/*
 * ================================================================================
 * Split Node Tool
 * ================================================================================
 * Extracted from core.js to keep tool logic modular.
 */

/*
 * Activate the split node tool.
 * Deactivates other modes and initiates the splitting workflow.
 */
function activateSplitNodeTool() {
  deactivateAllModes();
  currentMode = 'split-node';
  startSplitNode();
}

let splitNodeHighlightedLayers = [];
let splitNodeSelectionHandlers = [];
let splitNodeConnectedNodeId = null;
let activeSplitSubnodeMarker = null;
const splitNodeSuppressedLayers = new Set();

function suppressSplitNodeInfoHandlers(layer) {
  if (!layer || splitNodeSuppressedLayers.has(layer)) return;
  if (layer._events && layer._events.click) {
    layer._splitOriginalClickHandlers = layer._events.click.map(evt => ({ fn: evt.fn, ctx: evt.ctx }));
  } else {
    layer._splitOriginalClickHandlers = [];
  }
  layer.off('click');
  if (typeof layer.closePopup === 'function') {
    layer.closePopup();
  }
  splitNodeSuppressedLayers.add(layer);
}

function restoreSplitNodeInfoHandlers() {
  splitNodeSuppressedLayers.forEach(layer => {
    if (!layer) return;
    layer.off('click');
    const handlers = Array.isArray(layer._splitOriginalClickHandlers) ? layer._splitOriginalClickHandlers : [];
    handlers.forEach(({ fn, ctx }) => {
      if (typeof fn === 'function') {
        layer.on('click', fn, ctx);
      }
    });
    delete layer._splitOriginalClickHandlers;
  });
  splitNodeSuppressedLayers.clear();
}

function replaceNodeReferenceValue(props, keys, fromId, toId) {
  if (!props || !keys || !keys.length) return false;
  const normalizedSource = normalizeNodeId(fromId);
  let changed = false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
    const currentValue = props[key];
    if (normalizeNodeId(currentValue) === normalizedSource) {
      props[key] = toId;
      changed = true;
    }
  }
  if (changed) {
    props.modified = true;
    window.hasUnsavedChanges = true;
  }
  return changed;
}

function updateLineNodeReferences(layer, fromId, toId) {
  if (!layer || !layer.feature || !layer.feature.properties) return null;
  const props = layer.feature.properties;
  const startChanged = replaceNodeReferenceValue(props, START_NODE_KEYS, fromId, toId);
  const endChanged = replaceNodeReferenceValue(props, END_NODE_KEYS, fromId, toId);
  const result = {
    updated: startChanged || endChanged,
    startChanged,
    endChanged
  };
  if (result.updated) {
    const baseStyle = layer._splitHighlightBaseStyle || getPathStyleSnapshot(layer);
    if (baseStyle) {
      layer.setStyle(baseStyle);
      syncPathStyle(layer, baseStyle);
    }
  }
  return result;
}

function updateSplitLineFeatureGeometry(feature, endpoint, latlng) {
  if (!feature || !feature.geometry || !latlng) {
    return;
  }
  const targetCoord = [latlng.lng, latlng.lat];
  if (feature.geometry.type === 'LineString' && Array.isArray(feature.geometry.coordinates)) {
    const coords = feature.geometry.coordinates;
    const index = endpoint === 'start' ? 0 : coords.length - 1;
    coords[index] = targetCoord;
  } else if (feature.geometry.type === 'MultiLineString' && Array.isArray(feature.geometry.coordinates)) {
    const coords = feature.geometry.coordinates;
    if (!coords.length) return;
    const segmentIndex = endpoint === 'start' ? 0 : coords.length - 1;
    const segment = coords[segmentIndex];
    if (!Array.isArray(segment) || !segment.length) return;
    const pointIndex = endpoint === 'start' ? 0 : segment.length - 1;
    segment[pointIndex] = targetCoord;
  }
}

function updateSplitLineGeometryEndpoint(layer, endpoint, latlng) {
  if (!layer || typeof layer.getLatLngs !== 'function' || !latlng) {
    return;
  }
  const targetLatLng = L.latLng(latlng.lat, latlng.lng);
  const latlngs = layer.getLatLngs();

  const assignEndpoint = (points, position) => {
    if (!Array.isArray(points) || !points.length) return;
    const targetIndex = position === 'start' ? 0 : points.length - 1;
    const candidate = points[targetIndex];
    if (Array.isArray(candidate)) {
      assignEndpoint(candidate, position);
    } else {
      points[targetIndex] = targetLatLng;
    }
  };

  assignEndpoint(latlngs, endpoint);
  layer.setLatLngs(latlngs);
  if (typeof layer.redraw === 'function') {
    layer.redraw();
  }
  updateSplitLineFeatureGeometry(layer.feature, endpoint, targetLatLng);
  if (layer.feature && layer.feature.properties) {
    layer.feature.properties.modified = true;
  }
  window.hasUnsavedChanges = true;
}

function applySplitNodeConnectionGeometry(layer, latlng, changeInfo = {}) {
  if (!layer || !latlng || !changeInfo.updated) {
    return;
  }
  if (changeInfo.startChanged) {
    updateSplitLineGeometryEndpoint(layer, 'start', latlng);
  }
  if (changeInfo.endChanged) {
    updateSplitLineGeometryEndpoint(layer, 'end', latlng);
  }
}

function setSplitSubnodeActiveState(marker, isActive) {
  if (!marker) return;
  if (!marker._splitBaseCircleStyle) {
    marker._splitBaseCircleStyle = {
      color: marker.options.color,
      weight: marker.options.weight,
      fillColor: marker.options.fillColor,
      fillOpacity: marker.options.fillOpacity
    };
  }
  if (isActive) {
    marker.setStyle({
      color: '#1b5e20',
      fillColor: '#4caf50',
      fillOpacity: 0.95,
      weight: (marker.options.weight || 1) + 1
    });
  } else {
    marker.setStyle(marker._splitBaseCircleStyle);
  }
}

function setActiveSplitSubnodeMarker(marker) {
  if (activeSplitSubnodeMarker && activeSplitSubnodeMarker !== marker) {
    setSplitSubnodeActiveState(activeSplitSubnodeMarker, false);
  }
  activeSplitSubnodeMarker = marker || null;
  if (activeSplitSubnodeMarker) {
    setSplitSubnodeActiveState(activeSplitSubnodeMarker, true);
  }
}

function normalizeNodeId(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim().toLowerCase();
}

function getPropertyValueCaseInsensitive(props, keys) {
  if (!props) return '';
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(props, key)) {
      const value = props[key];
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }
  }
  return '';
}

function doesLineReferenceNode(layer, nodeId) {
  if (!layer || !layer.feature || !layer.feature.properties) return false;
  const props = layer.feature.properties;
  const target = normalizeNodeId(nodeId);
  if (!target) return false;
  const startValue = normalizeNodeId(getPropertyValueCaseInsensitive(props, START_NODE_KEYS));
  const endValue = normalizeNodeId(getPropertyValueCaseInsensitive(props, END_NODE_KEYS));
  return startValue === target || endValue === target;
}

function collectLinesReferencingNode(nodeId) {
  if (!nodeId) return [];
  const matches = [];
  const seen = new Set();
  const groups = getLineLayerGroupsForDirectionMode();
  groups.forEach(group => {
    forEachPolylineFeature(group, layer => {
      const stamp = L.stamp(layer);
      if (seen.has(stamp)) return;
      if (doesLineReferenceNode(layer, nodeId)) {
        seen.add(stamp);
        matches.push({ layer });
      }
    });
  });
  return matches;
}

function clearSplitNodeHighlights() {
  if (!splitNodeHighlightedLayers.length) return;
  splitNodeHighlightedLayers.forEach(layer => {
    const baseStyle = layer._splitHighlightBaseStyle || getPathStyleSnapshot(layer);
    if (baseStyle) {
      layer.setStyle(baseStyle);
      syncPathStyle(layer, baseStyle);
    }
    delete layer._splitHighlightBaseStyle;
    delete layer._splitHighlightStyle;
    delete layer._splitSelectedForSubnode;
  });
  splitNodeHighlightedLayers = [];
}

function highlightSplitNodeConnections(nodeId) {
  clearSplitNodeHighlights();
  const matches = collectLinesReferencingNode(nodeId);
  matches.forEach(entry => {
    const layer = entry.layer;
    const baseStyle = getPathStyleSnapshot(layer);
    layer._splitHighlightBaseStyle = baseStyle;
    const highlightStyle = {
      color: '#ffa726',
      weight: (baseStyle.weight || 3) + 2,
      dashArray: '6 3',
      opacity: 1
    };
    layer._splitHighlightStyle = highlightStyle;
    layer.setStyle(highlightStyle);
    syncPathStyle(layer, highlightStyle);
  });
  splitNodeHighlightedLayers = matches.map(entry => entry.layer);
  return matches;
}

function applySplitNodeDefaultStyle(layer) {
  if (!layer) return;
  const style = layer._splitHighlightStyle || layer._splitHighlightBaseStyle || getPathStyleSnapshot(layer);
  if (style) {
    layer.setStyle(style);
    syncPathStyle(layer, style);
  }
  layer._splitSelectedForSubnode = false;
}

function applySplitNodeSelectedStyle(layer) {
  if (!layer) return;
  const baseStyle = layer._splitHighlightBaseStyle || getPathStyleSnapshot(layer);
  const selectedStyle = {
    color: '#ff1744',
    weight: (baseStyle.weight || 3) + 3,
    dashArray: null,
    opacity: 1
  };
  layer.setStyle(selectedStyle);
  syncPathStyle(layer, selectedStyle);
  layer._splitSelectedForSubnode = true;
}

function toggleSplitNodeLineSelection(layer, selectionSet) {
  if (!layer || !selectionSet) return;
  if (selectionSet.has(layer)) {
    selectionSet.delete(layer);
    applySplitNodeDefaultStyle(layer);
  } else {
    selectionSet.add(layer);
    applySplitNodeSelectedStyle(layer);
  }
}

function disableSplitNodeLineSelection() {
  splitNodeSelectionHandlers.forEach(({ layer, handler }) => {
    if (layer && handler) {
      layer.off('click', handler);
    }
  });
  splitNodeSelectionHandlers = [];
}

function enableSplitNodeLineSelection(lineEntries, selectionSet) {
  disableSplitNodeLineSelection();
  lineEntries.forEach(entry => {
    suppressSplitNodeInfoHandlers(entry.layer);
    const handler = (e) => {
      if (e && e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
        e.originalEvent.stopPropagation();
      }
      toggleSplitNodeLineSelection(entry.layer, selectionSet);
    };
    entry.layer.on('click', handler);
    splitNodeSelectionHandlers.push({ layer: entry.layer, handler });
  });
}

function cleanupSplitNodeState(showMessage) {
  disableSplitNodeLineSelection();
  clearSplitNodeHighlights();
  removeSplitOkBtn();
  setActiveSplitSubnodeMarker(null);
  restoreSplitNodeInfoHandlers();
  restoreSplitNodePointerEvents();
  if (typeof setupPipelineInteractions === 'function') {
    setupPipelineInteractions();
  }
  splitNodeConnectedNodeId = null;
  splitNodeActive = false;
  currentMode = 'info';
  activateInfoMode(true);
  if (showMessage) {
    showInfoPopup(showMessage, '🔀 Split Node');
  }
}

/*
 * Split node entry point.
 */
function startSplitNode() {
  splitNodeActive = true;
  showInfoPopup('Click on a node you want to split.', '🔀 Split Node');
  const nodeLayers = getAllNodeLayers();
  if (!nodeLayers.length) return;
  forEachNodeMarker(layer => {
    layer.off('click');
    layer.on('click', function () {
      splitNode(this);
    });
  });
}

function splitNode(nodeLayerObj) {
  if (!nodeLayerObj || !nodeLayerObj.feature || !nodeLayerObj.feature.properties) {
    return;
  }
  const origId = nodeLayerObj.feature.properties.ID;
  const latlng = nodeLayerObj.getLatLng();
  showInputPrompt({
    title: '🔀 Split Node',
    message: 'How many sub-nodes should this node be split into? (2-9)',
    defaultValue: '2',
    inputType: 'number',
    min: 2,
    max: 9,
    confirmText: 'Split',
    validator: (value) => {
      const parsed = parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed < 2 || parsed > 9) {
        return 'Please enter a number between 2 and 9.';
      }
      return '';
    },
    onConfirm: (value) => {
      const count = parseInt(value, 10);
      performSplitNode(nodeLayerObj, latlng, origId, count);
    },
    onCancel: () => {
      cleanupSplitNodeState('Split node cancelled.');
      resetNodeClicks();
    }
  });
}

function computeSplitSubnodeLatLng(baseLatLng, offset = { x: 0, y: 0 }) {
  if (!map || !baseLatLng) {
    return baseLatLng;
  }
  const basePoint = map.latLngToLayerPoint(baseLatLng);
  const offsetPoint = L.point(
    basePoint.x + (offset.x || 0),
    basePoint.y + (offset.y || 0)
  );
  return map.layerPointToLatLng(offsetPoint);
}

function performSplitNode(nodeLayerObj, latlng, origId, count) {
  const subnodes = [];
  const owningLayer = findOwningLayerGroup(nodeLayerObj) || nodeLayer || getActivePipelineNodeLayer();
  if (!owningLayer) {
    console.warn('No node layer available to store split nodes.');
    return;
  }
  const baseNodeStyle = getDefaultNodeStyleOptions(owningLayer);
  const markerRadius = typeof baseNodeStyle.radius === 'number' ? baseNodeStyle.radius : 5;
  const pxOffset = markerRadius * 1.5;
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const suffix = String.fromCharCode(97 + i);
    const newId = `${origId}_${suffix}`;
    const newProps = { ...nodeLayerObj.feature.properties, ID: newId, Type: 'Node', modified: true };
    const offsetVector = {
      x: Math.cos(angle) * pxOffset,
      y: Math.sin(angle) * pxOffset
    };
    const offsetLatLng = computeSplitSubnodeLatLng(latlng, offsetVector);
    const marker = L.circleMarker([offsetLatLng.lat, offsetLatLng.lng], { ...baseNodeStyle });
    captureOriginalMarkerStyle(marker, 'default');
    marker.feature = {
      type: 'Feature',
      properties: newProps,
      geometry: { type: 'Point', coordinates: [offsetLatLng.lng, offsetLatLng.lat] }
    };
    owningLayer.addLayer(marker);
    subnodes.push(marker);
  }
  subnodes.forEach(marker => {
    if (marker._path) marker._path.style.pointerEvents = 'none';
  });
  owningLayer.removeLayer(nodeLayerObj);
  splitNodeConnectedNodeId = origId;
  const initialEntries = highlightSplitNodeConnections(origId);
  assignPipelinesToSubnodes(subnodes, origId, initialEntries);
}

/*
 * Tools popup management.
 */

/*
 * Custom popup system.
 */
function resetCustomPopupDocking() {
  const popup = document.getElementById('custom-popup');
  const overlay = document.getElementById('custom-popup-overlay');
  if (popup) popup.classList.remove('custom-popup--bottom-right');
  if (overlay) {
    overlay.classList.remove('custom-popup-overlay--nonmodal');
    overlay.style.pointerEvents = 'auto';
  }
}

function dockCustomPopupBottomRight() {
  const popup = document.getElementById('custom-popup');
  const overlay = document.getElementById('custom-popup-overlay');
  if (popup) popup.classList.add('custom-popup--bottom-right');
  if (overlay) {
    overlay.classList.add('custom-popup-overlay--nonmodal');
    overlay.style.pointerEvents = 'none';
  }
}

/*
 * Custom popup system.
 */
function showCustomPopup(title, content, buttons, extraElement = null) {
  console.log('showCustomPopup called with title:', title);
  const overlay = document.getElementById('custom-popup-overlay');
  const popup = document.getElementById('custom-popup');
  const titleEl = document.getElementById('custom-popup-title');
  const contentEl = document.getElementById('custom-popup-content');
  const buttonsEl = document.getElementById('custom-popup-buttons');

  if (!overlay || !popup || !titleEl || !contentEl || !buttonsEl) {
    console.error('Custom popup elements not found');
    return;
  }

  /* Ensure the popup stays clickable above Leaflet panes. */
  overlay.style.zIndex = '999999';
  popup.style.zIndex = '1000000';
  overlay.style.pointerEvents = 'auto';
  popup.style.pointerEvents = 'auto';

  resetCustomPopupDocking();

  titleEl.textContent = title;
  contentEl.innerHTML = content;

  if (extraElement) {
    contentEl.appendChild(extraElement);
  }

  buttonsEl.innerHTML = '';

  buttons.forEach(btn => {
    const button = document.createElement('button');
    button.className = `custom-popup-btn ${btn.type || 'secondary'}`;
    button.textContent = btn.text;
    button.onclick = (evt) => {
      if (evt) {
        try { evt.stopPropagation(); } catch (e) {}
        try { evt.preventDefault(); } catch (e) {}
      }

      const shouldClose = btn.keepOpen !== true;
      let okToClose = true;

      if (btn.onClick) {
        try {
          btn.onClick();
        } catch (err) {
          okToClose = false;
          console.error('Popup button handler failed:', err);
          /* Show a small error popup and keep the current popup open. */
          try {
            showErrorPopup(err && err.message ? err.message : String(err), '⚠️ Error');
          } catch (e) {}
        }
      }

      if (shouldClose && okToClose) {
        closeCustomPopup();
      }
    };
    buttonsEl.appendChild(button);
  });

  overlay.style.display = 'block';
  popup.style.display = 'block';
}

function closeCustomPopup() {
  resetCustomPopupDocking();
  document.getElementById('custom-popup-overlay').style.display = 'none';
  document.getElementById('custom-popup').style.display = 'none';
}

function formatPopupMessage(message) {
  if (message === null || typeof message === 'undefined') {
    return '';
  }
  return String(message).replace(/\r?\n/g, '<br>');
}

function showInfoPopup(message, title = 'ℹ️ Notice', buttonText = 'OK') {
  showCustomPopup(
    title,
    `<p class="popup-message" style="text-align:center; margin: 12px 0;">${formatPopupMessage(message)}</p>`,
    [{ text: buttonText, type: 'primary', onClick: () => {} }]
  );
}

function showErrorPopup(message, title = '⚠️ Error', buttonText = 'OK') {
  showCustomPopup(
    title,
    `<p class="popup-message" style="text-align:center; margin: 12px 0; color: #b91c1c;">${formatPopupMessage(message)}</p>`,
    [{ text: buttonText, type: 'primary', onClick: () => {} }]
  );
}

function showConfirmationPopup(options = {}) {
  const {
    title = 'Confirm',
    message = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm,
    onCancel
  } = options;

  showCustomPopup(
    title,
    `<p class="popup-message" style="text-align:center; margin: 12px 0;">${formatPopupMessage(message)}</p>`,
    [
      { text: cancelText, type: 'secondary', onClick: () => { if (typeof onCancel === 'function') onCancel(); } },
      { text: confirmText, type: 'primary', onClick: () => { if (typeof onConfirm === 'function') onConfirm(); } }
    ]
  );
}

function showInputPrompt(options = {}) {
  const {
    title = 'Input Required',
    message = '',
    defaultValue = '',
    placeholder = '',
    inputType = 'text',
    confirmText = 'OK',
    cancelText = 'Cancel',
    min = null,
    max = null,
    step = null,
    validator = null,
    required = true,
    onConfirm,
    onCancel
  } = options;

  const wrapper = document.createElement('div');
  wrapper.style.marginTop = '12px';

  const input = document.createElement('input');
  input.type = inputType;
  input.value = defaultValue ?? '';
  input.placeholder = placeholder || '';
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  input.style.padding = '10px';
  input.style.border = '1px solid #ccc';
  input.style.borderRadius = '6px';
  input.style.fontSize = '15px';
  if (min !== null) input.min = min;
  if (max !== null) input.max = max;
  if (step !== null) input.step = step;

  const errorEl = document.createElement('div');
  errorEl.style.color = '#d32f2f';
  errorEl.style.fontSize = '12px';
  errorEl.style.marginTop = '6px';
  errorEl.style.minHeight = '16px';

  wrapper.appendChild(input);
  wrapper.appendChild(errorEl);

  const validate = () => {
    const value = input.value.trim();
    if (required && !value) {
      errorEl.textContent = 'This field is required.';
      input.style.borderColor = '#d32f2f';
      return false;
    }
    if (typeof validator === 'function') {
      const validationMessage = validator(value);
      if (validationMessage) {
        errorEl.textContent = validationMessage;
        input.style.borderColor = '#d32f2f';
        return false;
      }
    }
    errorEl.textContent = '';
    input.style.borderColor = '#ccc';
    return true;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    if (typeof onConfirm === 'function') {
      onConfirm(input.value.trim());
    }
    closeCustomPopup();
  };

  input.addEventListener('input', validate);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  });

  showCustomPopup(
    title,
    `<p class="popup-message" style="text-align:center; margin: 12px 0;">${formatPopupMessage(message)}</p>`,
    [
      { text: cancelText, type: 'secondary', onClick: () => { if (typeof onCancel === 'function') onCancel(); } },
      { text: confirmText, type: 'primary', keepOpen: true, onClick: handleConfirm }
    ],
    wrapper
  );

  setTimeout(() => input.focus(), 50);
}

if (typeof window !== 'undefined') {
  window.alert = function(message, title) {
    const normalizedTitle = title || (String(message || '').toLowerCase().includes('error') ? '⚠️ Error' : 'ℹ️ Notice');
    showInfoPopup(message, normalizedTitle);
  };
}

/*
 * Export dialog and screenshot mode hooks (reserved for shared UI features).
 */


function assignPipelinesToSubnodes(subnodes, origId, highlightedEntries = []) {
  if (!Array.isArray(subnodes) || !subnodes.length) {
    cleanupSplitNodeState();
    resetNodeClicks();
    return;
  }

  let currentIndex = 0;

  const handleCancel = () => {
    cleanupSplitNodeState('Split node cancelled.');
    resetNodeClicks();
  };

  const handleCompletion = (message = 'Split completed!') => {
    cleanupSplitNodeState(message);
    setActiveSplitSubnodeMarker(null);
    resetNodeClicks();
    activateInfoMode();
  };

  const assignSelectionToSubnode = (subnodeMarker, selectionSet) => {
    if (!selectionSet || !selectionSet.size || !subnodeMarker) return;
    const subnodeId = subnodeMarker?.feature?.properties?.ID;
    const subnodeLatLng = subnodeMarker.getLatLng?.();
    selectionSet.forEach(layer => {
      const changeInfo = updateLineNodeReferences(layer, origId, subnodeId);
      if (changeInfo && changeInfo.updated && subnodeLatLng) {
        applySplitNodeConnectionGeometry(layer, subnodeLatLng, changeInfo);
      }
    });
  };

  const proceedToNextSubnode = () => {
    if (currentIndex >= subnodes.length) {
      handleCompletion();
      return;
    }

    const remainingEntries = (currentIndex === 0 && Array.isArray(highlightedEntries) && highlightedEntries.length)
      ? highlightedEntries
      : highlightSplitNodeConnections(origId);

    if (!remainingEntries || !remainingEntries.length) {
      handleCompletion('No remaining pipelines reference the original node. Split finalized.');
      return;
    }

    const subnode = subnodes[currentIndex];
    if (!subnode || !subnode.feature || !subnode.feature.properties) {
      currentIndex += 1;
      proceedToNextSubnode();
      return;
    }

    const subnodeId = subnode.feature.properties.ID;
    const selectionSet = new Set();

    setActiveSplitSubnodeMarker(subnode);
    enableSplitNodeLineSelection(remainingEntries, selectionSet);
    showSplitOkBtn(subnodeId, {
      instructions: `Select pipelines that should now connect to ${subnodeId}. Click lines to toggle them, then confirm.`,
      onConfirm: () => {
        assignSelectionToSubnode(subnode, selectionSet);
        currentIndex += 1;
        proceedToNextSubnode();
      },
      onCancel: handleCancel
    });
  };

  proceedToNextSubnode();
}

function resetNodeClicks() {
  /* Restore info handlers for node clicks. */
  if (!getAllNodeLayers().length) return;
  forEachNodeMarker(layer => {
    layer.off('click');
    layer.on('click', function () {
      openInfoOverlay(layer);
    });
  });
}

function restoreSplitNodePointerEvents() {
  forEachNodeMarker(marker => {
    if (marker && marker._path) {
      marker._path.style.pointerEvents = '';
    }
  });
}

function showSplitOkBtn(subnodeId, options = {}) {
  const {
    instructions = `Select pipelines for ${subnodeId} and confirm when finished.`,
    confirmText = `Done with ${subnodeId}`,
    cancelText = 'Cancel Split',
    onConfirm,
    onCancel
  } = options;

  removeSplitOkBtn();

  const container = document.createElement('div');
  container.id = 'split-ok-container';
  container.style.position = 'absolute';
  container.style.top = '110px';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.right = 'auto';
  container.style.bottom = 'auto';
  container.style.zIndex = 1300;
  container.style.minWidth = '260px';
  container.style.maxWidth = '420px';
  container.style.width = 'calc(100% - 40px)';
  container.style.padding = '14px 20px';
  container.style.background = 'rgba(18, 18, 18, 0.92)';
  container.style.color = '#fff';
  container.style.borderRadius = '10px';
  container.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
  container.style.fontFamily = 'inherit';

  const title = document.createElement('div');
  title.style.fontWeight = '600';
  title.style.marginBottom = '6px';
  title.textContent = `Assign pipelines to ${subnodeId}`;

  const text = document.createElement('div');
  text.style.fontSize = '14px';
  text.style.lineHeight = '1.4';
  text.style.marginBottom = '12px';
  text.textContent = instructions;

  const buttonRow = document.createElement('div');
  buttonRow.style.display = 'flex';
  buttonRow.style.gap = '8px';

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = confirmText;
  confirmBtn.style.flex = '1';
  confirmBtn.style.padding = '10px 12px';
  confirmBtn.style.border = 'none';
  confirmBtn.style.borderRadius = '6px';
  confirmBtn.style.cursor = 'pointer';
  confirmBtn.style.background = '#2e7d32';
  confirmBtn.style.color = '#fff';
  confirmBtn.style.fontSize = '14px';
  confirmBtn.onclick = () => {
    removeSplitOkBtn();
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
  };

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = cancelText;
  cancelBtn.style.flex = '1';
  cancelBtn.style.padding = '10px 12px';
  cancelBtn.style.border = '1px solid rgba(255,255,255,0.4)';
  cancelBtn.style.borderRadius = '6px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.background = 'transparent';
  cancelBtn.style.color = '#fff';
  cancelBtn.style.fontSize = '14px';
  cancelBtn.onclick = () => {
    removeSplitOkBtn();
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  buttonRow.appendChild(confirmBtn);
  buttonRow.appendChild(cancelBtn);

  container.appendChild(title);
  container.appendChild(text);
  container.appendChild(buttonRow);

  document.body.appendChild(container);
}

function removeSplitOkBtn() {
  const container = document.getElementById('split-ok-container');
  if (container) {
    container.remove();
  }
}

