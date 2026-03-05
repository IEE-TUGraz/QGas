/**
 * ================================================================================
 * QGas - Add Infrastructure Plans Tool
 * ================================================================================
 * 
 * Enables georeferencing and overlay of infrastructure plan images (JPG/PNG)
 * onto the interactive map. Users can align scanned plans with geographic
 * coordinates through control point matching.
 * 
 * Key Features:
 * - Image file upload (JPG/PNG)
 * - Interactive georeferencing with control points
 * - Visual overlay on map
 * - Opacity control
 * - Plan metadata management
 * - Multiple plan support
 * - Control point validation
 * 
 * Workflow:
 * 1. User uploads infrastructure plan image
 * 2. Selects matching points on image and map
 * 3. System calculates transformation matrix
 * 4. Image is georeferenced and overlaid on map
 * 5. Plan can be toggled, adjusted, or removed
 * 
 * Technical Details:
 * - Requires minimum 3 control points
 * - Uses affine transformation for georeferencing
 * - Stores plan data in infrastructure_plans layer
 * - Supports interactive opacity adjustment
 * - Maintains plan metadata (name, bounds, control points)
 * 
 * Note: Functions exposed in global scope for cross-module compatibility
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Image files (JPG/PNG) and control point pairs.
 * - Map instance for georeferenced overlays.
 *
 * Public API:
 * - activateAddPlanTool(): Start the infrastructure plan workflow.
 * 
 * ================================================================================
 */

function startAddInfrastructurePlan() {
  initializePlanGeorefUI();
  const fileInput = document.getElementById('plan-file-input');
  if (!fileInput) {
    showInfoPopup('File input element not available.', 'Add Infrastructure Plan');
    return;
  }
  fileInput.value = '';
  fileInput.click();
}

function handlePlanFileSelection(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!/\.(jpe?g|png)$/i.test(file.name)) {
    showInfoPopup('Please select a JPG or PNG image.', 'Add Infrastructure Plan');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(loadEvent) {
    planGeorefState.imageDataUrl = loadEvent.target.result;
    planGeorefState.imageName = file.name;
    planGeorefState.legendName = file.name.replace(/\.[^.]+$/, '');
    planGeorefState.controlPairs = [];
    planGeorefState.pendingImagePoint = null;
    planGeorefState.awaitingMapPoint = false;
    planGeorefState.mapClickHandler = null;
    planGeorefState.imageReady = false;
    planGeorefState.viewportDragMoved = false;
    planGeorefState.viewportDragging = false;
    planGeorefState.viewportPointerId = null;
    clearAllPlanMarkers();

    showCustomPopup(
      '🗺️ Add Infrastructure Plan',
      '<p style="text-align:center; margin: 15px 0;">Now start georeferencing the image by selecting common points in the picture and on the map.</p>' +
      '<p style="text-align:center; margin: 0 0 10px 0; font-size: 0.9rem; color: #c0392b;">Select at least three matching control points before adding the plan.</p>',
      [{ text: 'Start', type: 'primary', onClick: () => { openPlanGeorefOverlay(); } }]
    );
  };
  reader.onerror = () => {
    showInfoPopup('Could not read the selected file.', 'Add Infrastructure Plan');
  };
  reader.readAsDataURL(file);
}

function openPlanGeorefOverlay() {
  const overlay = document.getElementById('plan-georef-overlay');
  const subtitle = document.getElementById('plan-georef-subtitle');
  const imageEl = document.getElementById('plan-georef-image');
  const resumeBtn = document.getElementById('plan-georef-resume-btn');
  const pointsList = document.getElementById('plan-points-list');
  const legendNameInput = document.getElementById('plan-legend-name');
  if (!overlay || !imageEl) return;

  overlay.style.display = 'flex';
  if (resumeBtn) resumeBtn.style.display = 'none';
  if (subtitle) subtitle.textContent = planGeorefState.imageName || 'Plan image';
  if (legendNameInput) legendNameInput.value = planGeorefState.legendName || '';
  if (pointsList) {
    pointsList.innerHTML = '<p style="color:#666; text-align:center; margin:40px 0;">No control points yet.</p>';
  }
  updatePlanFinishState();

  imageEl.onload = () => {
    planGeorefState.imageNaturalWidth = imageEl.naturalWidth;
    planGeorefState.imageNaturalHeight = imageEl.naturalHeight;
    planGeorefState.imageReady = true;
    resetPlanImageSizing();
  };
  imageEl.src = planGeorefState.imageDataUrl;
}

function closePlanGeorefOverlay() {
  const overlay = document.getElementById('plan-georef-overlay');
  if (overlay) overlay.style.display = 'none';
}

function cancelPlanGeorefWorkflow() {
  cancelPlanMapSelection();
  closePlanGeorefOverlay();
  planGeorefState.imageDataUrl = null;
  planGeorefState.imageName = '';
  planGeorefState.controlPairs = [];
  planGeorefState.pendingImagePoint = null;
  clearAllPlanMarkers();
  planGeorefState.activePlanId = null;
  planGeorefState.imageReady = false;
  resetPlanPointsUI();
}

function clearAllPlanMarkers() {
  const markerLayer = document.getElementById('plan-marker-layer');
  if (markerLayer) {
    markerLayer.innerHTML = '';
  }
  planGeorefState.markers = new Map();
  planGeorefState.pendingMarkerEl = null;
}

function resetPlanPointsUI() {
  const pointsList = document.getElementById('plan-points-list');
  if (pointsList) {
    pointsList.innerHTML = '<p style="color:#666; text-align:center; margin:40px 0;">No control points yet.</p>';
  }
  const selectBtn = document.getElementById('plan-select-map-point');
  const clearBtn = document.getElementById('plan-clear-pending');
  if (selectBtn) selectBtn.disabled = true;
  if (clearBtn) clearBtn.disabled = true;
  updatePlanFinishState();
}

function resetPlanImageSizing() {
  const imageEl = document.getElementById('plan-georef-image');
  const stage = document.getElementById('plan-image-stage');
  const markerLayer = document.getElementById('plan-marker-layer');
  const zoomSlider = document.getElementById('plan-zoom-slider');
  if (!imageEl || !stage) return;

  const naturalWidth = planGeorefState.imageNaturalWidth || imageEl.naturalWidth || 1;
  const naturalHeight = planGeorefState.imageNaturalHeight || imageEl.naturalHeight || 1;
  const viewport = document.getElementById('plan-image-viewport');
  let initialScale = 1;
  if (viewport) {
    const fitScaleX = (viewport.clientWidth - 40) / naturalWidth;
    const fitScaleY = (viewport.clientHeight - 40) / naturalHeight;
    initialScale = Math.min(1, Math.max(0.1, Math.min(fitScaleX, fitScaleY)));
  }
  planGeorefState.zoom = initialScale;
  if (zoomSlider) {
    zoomSlider.value = Math.round(initialScale * 100);
  }
  const displayWidth = naturalWidth * planGeorefState.zoom;
  const displayHeight = naturalHeight * planGeorefState.zoom;
  imageEl.style.width = `${displayWidth}px`;
  imageEl.style.height = `${displayHeight}px`;
  stage.style.width = `${displayWidth}px`;
  stage.style.height = `${displayHeight}px`;
  if (markerLayer) {
    markerLayer.style.width = `${displayWidth}px`;
    markerLayer.style.height = `${displayHeight}px`;
  }
  if (viewport) {
    viewport.scrollLeft = Math.max(0, (displayWidth - viewport.clientWidth) / 2);
    viewport.scrollTop = Math.max(0, (displayHeight - viewport.clientHeight) / 2);
  }
  updatePlanMarkers();
}

function handlePlanZoomChange(event) {
  const slider = event.target;
  const scale = Math.max(0.1, parseInt(slider.value, 10) / 100);
  planGeorefState.zoom = scale;
  const imageEl = document.getElementById('plan-georef-image');
  const stage = document.getElementById('plan-image-stage');
  const markerLayer = document.getElementById('plan-marker-layer');
  if (!imageEl || !stage || !markerLayer) return;
  const displayWidth = planGeorefState.imageNaturalWidth * scale;
  const displayHeight = planGeorefState.imageNaturalHeight * scale;
  imageEl.style.width = `${displayWidth}px`;
  imageEl.style.height = `${displayHeight}px`;
  stage.style.width = `${displayWidth}px`;
  stage.style.height = `${displayHeight}px`;
  markerLayer.style.width = `${displayWidth}px`;
  markerLayer.style.height = `${displayHeight}px`;
  updatePlanMarkers();
}

function handlePlanImageClick(event) {
  if (planGeorefState.awaitingMapPoint || !planGeorefState.imageReady) return;
  if (planGeorefState.viewportDragging) return;
  if (planGeorefState.viewportDragMoved) {
    planGeorefState.viewportDragMoved = false;
    return;
  }
  const imageEl = document.getElementById('plan-georef-image');
  const markerLayer = document.getElementById('plan-marker-layer');
  if (!imageEl || !markerLayer) return;
  const rect = imageEl.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;
  if (!displayWidth || !displayHeight) return;
  const relativeX = event.clientX - rect.left;
  const relativeY = event.clientY - rect.top;
  if (relativeX < 0 || relativeY < 0 || relativeX > displayWidth || relativeY > displayHeight) return;
  const normalizedX = relativeX / displayWidth;
  const normalizedY = relativeY / displayHeight;

  const imageX = normalizedX * planGeorefState.imageNaturalWidth;
  const imageY = normalizedY * planGeorefState.imageNaturalHeight;
  planGeorefState.pendingImagePoint = { x: imageX, y: imageY };
  const selectBtn = document.getElementById('plan-select-map-point');
  const clearBtn = document.getElementById('plan-clear-pending');
  if (selectBtn) selectBtn.disabled = false;
  if (clearBtn) clearBtn.disabled = false;
  drawPendingPlanMarker(normalizedX, normalizedY);
  planGeorefState.viewportDragMoved = false;
}

function drawPendingPlanMarker(normX, normY) {
  const markerLayer = document.getElementById('plan-marker-layer');
  if (!markerLayer) return;
  const displayWidth = planGeorefState.imageNaturalWidth * planGeorefState.zoom;
  const displayHeight = planGeorefState.imageNaturalHeight * planGeorefState.zoom;
  const x = normX * displayWidth;
  const y = normY * displayHeight;
  if (!planGeorefState.pendingMarkerEl) {
    const marker = document.createElement('div');
    marker.className = 'plan-image-marker plan-image-marker--pending';
    markerLayer.appendChild(marker);
    planGeorefState.pendingMarkerEl = marker;
  }
  planGeorefState.pendingMarkerEl.style.left = `${x}px`;
  planGeorefState.pendingMarkerEl.style.top = `${y}px`;
  planGeorefState.pendingMarkerEl.textContent = '+';
}

function clearPendingPlanPoint() {
  planGeorefState.pendingImagePoint = null;
  const selectBtn = document.getElementById('plan-select-map-point');
  const clearBtn = document.getElementById('plan-clear-pending');
  if (selectBtn) selectBtn.disabled = true;
  if (clearBtn) clearBtn.disabled = true;
  if (planGeorefState.pendingMarkerEl) {
    planGeorefState.pendingMarkerEl.remove();
    planGeorefState.pendingMarkerEl = null;
  }
}

function requestPlanMapPoint() {
  if (!planGeorefState.pendingImagePoint || planGeorefState.awaitingMapPoint) return;
  planGeorefState.awaitingMapPoint = true;
  const overlay = document.getElementById('plan-georef-overlay');
  const resumeBtn = document.getElementById('plan-georef-resume-btn');
  if (overlay) overlay.style.display = 'none';
  if (resumeBtn) resumeBtn.style.display = 'block';
  planGeorefState.mapClickHandler = function(e) {
    completePlanMapSelection(e.latlng);
  };
  if (map && planGeorefState.mapClickHandler) {
    map.once('click', planGeorefState.mapClickHandler);
    map.getContainer().style.cursor = 'crosshair';
  }
  showTransientMessage('Click the matching location on the map.');
}

function resumePlanOverlayFromMap() {
  const resumeBtn = document.getElementById('plan-georef-resume-btn');
  if (resumeBtn) resumeBtn.style.display = 'none';
  const overlay = document.getElementById('plan-georef-overlay');
  if (overlay) overlay.style.display = 'flex';
  if (planGeorefState.awaitingMapPoint) {
    cancelPlanMapSelection();
  }
}

function cancelPlanMapSelection() {
  if (map) {
    map.off('click', planGeorefState.mapClickHandler);
    map.getContainer().style.cursor = '';
  }
  planGeorefState.awaitingMapPoint = false;
  planGeorefState.mapClickHandler = null;
  const resumeBtn = document.getElementById('plan-georef-resume-btn');
  if (resumeBtn) resumeBtn.style.display = 'none';
}

function completePlanMapSelection(latlng) {
  cancelPlanMapSelection();
  if (!planGeorefState.pendingImagePoint) return;
  const overlay = document.getElementById('plan-georef-overlay');
  if (overlay) overlay.style.display = 'flex';
  const pairId = `plan-pt-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const newPair = {
    id: pairId,
    image: { ...planGeorefState.pendingImagePoint },
    latlng: L.latLng(latlng)
  };
  planGeorefState.controlPairs.push(newPair);
  addPlanMarkerForPair(newPair);
  updatePlanPointsList();
  clearPendingPlanPoint();
  updatePlanFinishState();
}

function addPlanMarkerForPair(pair) {
  const markerLayer = document.getElementById('plan-marker-layer');
  if (!markerLayer) return;
  const marker = document.createElement('div');
  marker.className = 'plan-image-marker';
  marker.dataset.pairId = pair.id;
  markerLayer.appendChild(marker);
  planGeorefState.markers.set(pair.id, marker);
  updatePlanMarkerPosition(pair.id);
}

function updatePlanMarkers() {
  planGeorefState.controlPairs.forEach(pair => {
    updatePlanMarkerPosition(pair.id);
  });
  if (planGeorefState.pendingMarkerEl && planGeorefState.pendingImagePoint) {
    const normX = planGeorefState.pendingImagePoint.x / planGeorefState.imageNaturalWidth;
    const normY = planGeorefState.pendingImagePoint.y / planGeorefState.imageNaturalHeight;
    drawPendingPlanMarker(normX, normY);
  }
}

function updatePlanMarkerPosition(pairId) {
  const marker = planGeorefState.markers.get(pairId);
  const pair = planGeorefState.controlPairs.find(p => p.id === pairId);
  if (!marker || !pair) return;
  const displayWidth = planGeorefState.imageNaturalWidth * planGeorefState.zoom;
  const displayHeight = planGeorefState.imageNaturalHeight * planGeorefState.zoom;
  const x = (pair.image.x / planGeorefState.imageNaturalWidth) * displayWidth;
  const y = (pair.image.y / planGeorefState.imageNaturalHeight) * displayHeight;
  marker.style.left = `${x}px`;
  marker.style.top = `${y}px`;
  marker.textContent = planGeorefState.controlPairs.indexOf(pair) + 1;
}

function updatePlanPointsList() {
  const list = document.getElementById('plan-points-list');
  if (!list) return;
  if (!planGeorefState.controlPairs.length) {
    list.innerHTML = '<p style="color:#666; text-align:center; margin:40px 0;">No control points yet.</p>';
    return;
  }
  list.innerHTML = '';
  planGeorefState.controlPairs.forEach((pair, index) => {
    const item = document.createElement('div');
    item.className = 'plan-point-item';
    item.innerHTML = `
      <div>
        <div style="font-weight:600;">Point ${index + 1}</div>
        <div style="font-size:0.85rem; color:#555;">Image: (${pair.image.x.toFixed(1)}, ${pair.image.y.toFixed(1)})</div>
        <div style="font-size:0.85rem; color:#555;">Map: (${pair.latlng.lat.toFixed(5)}, ${pair.latlng.lng.toFixed(5)})</div>
      </div>
      <button type="button" onclick="removePlanControlPoint('${pair.id}')">Remove</button>
    `;
    list.appendChild(item);
  });
}

function removePlanControlPoint(pairId) {
  const idx = planGeorefState.controlPairs.findIndex(p => p.id === pairId);
  if (idx === -1) return;
  planGeorefState.controlPairs.splice(idx, 1);
  const marker = planGeorefState.markers.get(pairId);
  if (marker) marker.remove();
  planGeorefState.markers.delete(pairId);
  updatePlanPointsList();
  updatePlanMarkers();
  updatePlanFinishState();
}

function updatePlanFinishState() {
  const finishBtn = document.getElementById('plan-finish-btn');
  const finishHint = document.getElementById('plan-finish-hint');
  const totalPoints = Array.isArray(planGeorefState.controlPairs) ? planGeorefState.controlPairs.length : 0;
  const remaining = Math.max(0, 3 - totalPoints);
  const requirementMet = remaining === 0;

  if (finishBtn) {
    finishBtn.classList.toggle('plan-finish-btn--inactive', !requirementMet);
    finishBtn.setAttribute('aria-disabled', (!requirementMet).toString());
    finishBtn.dataset.pointsReady = requirementMet ? 'true' : 'false';
  }

  if (finishHint) {
    if (requirementMet) {
      finishHint.textContent = 'Ready to add the plan to the map.';
      finishHint.classList.add('plan-finish-hint--ready');
    } else {
      const plural = remaining === 1 ? '' : 's';
      finishHint.textContent = `Select ${remaining} more control point${plural} before finishing.`;
      finishHint.classList.remove('plan-finish-hint--ready');
    }
  }
}

function finalizePlanGeoref() {
  if (planGeorefState.controlPairs.length < 3) {
    return;
  }
  const transform = computePlanAffineTransform(planGeorefState.controlPairs, map);
  if (!transform) {
    showInfoPopup('Unable to compute a stable transformation. Try selecting non-collinear points.', 'Add Infrastructure Plan');
    return;
  }
  const planConfig = {
    id: `plan-${Date.now()}`,
    name: (planGeorefState.legendName || planGeorefState.imageName || 'Plan layer'),
    imageDataUrl: planGeorefState.imageDataUrl,
    imageWidth: planGeorefState.imageNaturalWidth,
    imageHeight: planGeorefState.imageNaturalHeight,
    controlPairs: planGeorefState.controlPairs.map(pair => ({
      id: pair.id,
      image: { ...pair.image },
      latlng: L.latLng(pair.latlng)
    }))
  };
  const overlay = addPlanOverlayFromConfig(planConfig);
  if (overlay) {
    showInfoPopup(`Plan "${planConfig.name}" added to the map. Use the legend to toggle visibility.`, 'Add Infrastructure Plan');
  }
  cancelPlanGeorefWorkflow();
}

function computePlanAffineTransform(pairs, mapInstance = map) {
  if (!pairs || pairs.length < 3) return null;
  const xTargets = [];
  const yTargets = [];
  const A = [];
  pairs.forEach((pair, idx) => {
    const latlng = pair.latlng;
    const layerPoint = mapInstance.latLngToLayerPoint(latlng);
    xTargets[idx] = layerPoint.x;
    yTargets[idx] = layerPoint.y;
    A[idx] = [pair.image.x, pair.image.y, 1];
  });
  const coeffsX = solveAffineCoefficients(A, xTargets);
  const coeffsY = solveAffineCoefficients(A, yTargets);
  if (!coeffsX || !coeffsY) return null;
  return {
    a: coeffsX[0],
    b: coeffsX[1],
    c: coeffsX[2],
    d: coeffsY[0],
    e: coeffsY[1],
    f: coeffsY[2]
  };
}

function solveAffineCoefficients(A, target) {
  if (!A.length) return null;
  let sXX = 0, sXY = 0, sYY = 0, sX = 0, sY = 0, sXTarget = 0, sYTarget = 0, sTarget = 0;
  const n = A.length;
  for (let i = 0; i < n; i++) {
    const x = A[i][0];
    const y = A[i][1];
    const value = target[i];
    sXX += x * x;
    sXY += x * y;
    sYY += y * y;
    sX += x;
    sY += y;
    sXTarget += x * value;
    sYTarget += y * value;
    sTarget += value;
  }
  const matrix = [
    [sXX, sXY, sX],
    [sXY, sYY, sY],
    [sX,  sY,  n ]
  ];
  const vector = [sXTarget, sYTarget, sTarget];
  return solve3x3(matrix, vector);
}

function solve3x3(matrix, vector) {
  const m = [
    [matrix[0][0], matrix[0][1], matrix[0][2], vector[0]],
    [matrix[1][0], matrix[1][1], matrix[1][2], vector[1]],
    [matrix[2][0], matrix[2][1], matrix[2][2], vector[2]]
  ];
  for (let i = 0; i < 3; i++) {
    let pivotRow = i;
    for (let r = i + 1; r < 3; r++) {
      if (Math.abs(m[r][i]) > Math.abs(m[pivotRow][i])) {
        pivotRow = r;
      }
    }
    if (Math.abs(m[pivotRow][i]) < 1e-8) return null;
    if (pivotRow !== i) {
      const temp = m[i];
      m[i] = m[pivotRow];
      m[pivotRow] = temp;
    }
    const pivot = m[i][i];
    for (let c = i; c < 4; c++) {
      m[i][c] /= pivot;
    }
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const factor = m[r][i];
      for (let c = i; c < 4; c++) {
        m[r][c] -= factor * m[i][c];
      }
    }
  }
  return [m[0][3], m[1][3], m[2][3]];
}


function showTransientMessage(message) {
  const existing = document.getElementById('plan-transient-message');
  if (existing) existing.remove();
  const msg = document.createElement('div');
  msg.id = 'plan-transient-message';
  msg.textContent = message;
  msg.style.position = 'fixed';
  msg.style.top = '20px';
  msg.style.left = '50%';
  msg.style.transform = 'translateX(-50%)';
  msg.style.background = 'rgba(13,110,253,0.9)';
  msg.style.color = '#fff';
  msg.style.padding = '10px 20px';
  msg.style.borderRadius = '999px';
  msg.style.zIndex = '16000';
  document.body.appendChild(msg);
  setTimeout(() => {
    msg.style.opacity = '0';
    msg.style.transition = 'opacity 0.4s ease';
    setTimeout(() => msg.remove(), 400);
  }, 2000);
}

const PlanImageLayer = L.Layer.extend({
  initialize(config, options = {}) {
    L.setOptions(this, options);
    this._config = config;
    this._image = new Image();
    this._image.src = config.imageDataUrl;
    this._imageLoaded = false;
    this._image.onload = () => {
      this._imageLoaded = true;
      this._config.imageWidth = config.imageWidth || this._image.naturalWidth;
      this._config.imageHeight = config.imageHeight || this._image.naturalHeight;
      this._reset();
    };
  },
  onAdd(mapInstance) {
    this._map = mapInstance;
    const paneName = this.options.pane || 'planOverlayPane';
    const panes = this._map.getPanes();
    const targetPane = panes[paneName] || panes.overlayPane;
    this._pane = targetPane;
    this._canvas = L.DomUtil.create('canvas', 'plan-overlay-canvas', targetPane);
    this._canvas.style.pointerEvents = 'none';
    this._ctx = this._canvas.getContext('2d');
    this._map.on('zoom viewreset move resize', this._reset, this);
    if (this._imageLoaded) {
      this._reset();
    }
  },
  onRemove(mapInstance) {
    mapInstance.off('zoom viewreset move resize', this._reset, this);
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
    this._pane = null;
  },
  setOpacity(opacity) {
    this.options.opacity = opacity;
    this._reset();
  },
  _reset() {
    if (!this._map || !this._imageLoaded || !this._config.controlPairs.length || !this._canvas || !this._ctx) return;
    const transform = computePlanAffineTransform(this._config.controlPairs, this._map);
    if (!transform) {
      this._ctx.clearRect(0, 0, this._canvas.width || 0, this._canvas.height || 0);
      return;
    }
    const width = this._config.imageWidth;
    const height = this._config.imageHeight;
    const corners = [
      applyAffine(transform, 0, 0),
      applyAffine(transform, width, 0),
      applyAffine(transform, 0, height),
      applyAffine(transform, width, height)
    ];
    const xs = corners.map(c => c.x);
    const ys = corners.map(c => c.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const canvasWidth = Math.max(1, Math.ceil(maxX - minX));
    const canvasHeight = Math.max(1, Math.ceil(maxY - minY));
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    L.DomUtil.setPosition(this._canvas, L.point(minX, minY));
    const ctx = this._ctx;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();
    ctx.globalAlpha = this.options.opacity ?? 0.75;
    ctx.setTransform(
      transform.a,
      transform.d,
      transform.b,
      transform.e,
      transform.c - minX,
      transform.f - minY
    );
    ctx.drawImage(this._image, 0, 0, width, height);
    ctx.restore();
  }
});

function applyAffine(transform, x, y) {
  return {
    x: transform.a * x + transform.b * y + transform.c,
    y: transform.d * x + transform.e * y + transform.f
  };
}

function addPlanOverlayFromConfig(planConfig, options = {}) {
  if (!planConfig || !Array.isArray(planConfig.controlPairs) || planConfig.controlPairs.length < 3) {
    console.warn('Cannot add plan overlay without at least three control pairs.');
    return null;
  }
  const existing = planLayers.find(entry => entry.id === planConfig.id);
  if (existing) {
    return existing.layer;
  }
  const overlay = new PlanImageLayer(planConfig, {
    opacity: options.opacity ?? 0.75,
    pane: 'planOverlayPane'
  });
  overlay.addTo(map);
  planLayers.push({ id: planConfig.id, name: planConfig.name, layer: overlay, config: planConfig });
  addPlanLayerToLegend(planConfig, overlay);
  loadedPlanIds.add(planConfig.id);
  console.log(`Infrastructure plan "${planConfig.name}" loaded.`);
  return overlay;
}

async function fetchJsonAtProjectPath(relativePath) {
  try {
    const sanitized = sanitizeRelativePath(relativePath);
    if (!sanitized) return null;
    const { response } = await fetchProjectResource(sanitized);
    if (!response) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch JSON at', relativePath, error);
    return null;
  }
}

async function fetchPlanImageDataUrl(relativePath) {
  try {
    const sanitized = sanitizeRelativePath(relativePath);
    if (!sanitized) return null;
    const { response } = await fetchProjectResource(sanitized);
    if (!response) return null;
    const blob = await response.blob();
    return await blobToDataURL(blob);
  } catch (error) {
    console.warn('Failed to fetch plan image at', relativePath, error);
    return null;
  }
}

async function fetchPlanManifestEntries() {
  const manifestFiles = [
    'Infrastructure_Plans/plans_manifest.json',
    'Infrastructure_Plans/manifest.json',
    'Infrastructure_Plans/index.json'
  ];
  for (const candidate of manifestFiles) {
    const data = await fetchJsonAtProjectPath(candidate);
    if (!data) continue;
    if (Array.isArray(data.plans) && data.plans.length) {
      return data.plans;
    }
    if (Array.isArray(data) && data.length) {
      return data;
    }
  }
  const fallbackMetadata = await fetchJsonAtProjectPath('Infrastructure_Plans/metadata.json');
  if (fallbackMetadata) {
    return [{
      folder: '',
      metadataFile: 'metadata.json',
      imageFile: fallbackMetadata.imageName || fallbackMetadata.imageFile || null,
      id: fallbackMetadata.id,
      name: fallbackMetadata.name
    }];
  }
  const discovered = await discoverPlanFoldersFromListing();
  if (discovered && discovered.length) {
    return discovered;
  }
  return null;
}

async function fetchFolderListing(relativeFolder) {
  const sanitized = sanitizeRelativePath(relativeFolder).replace(/\/+$/, '') + '/';
  try {
    const { response } = await fetchProjectResource(sanitized);
    if (!response || !response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text')) return null;
    const text = await response.text();
    const matches = [...text.matchAll(/href\s*=\s*"([^"#?]+)"/gi)];
    const folders = new Set();
    const files = new Set();
    matches.forEach(match => {
      const hrefRaw = match[1];
      if (!hrefRaw) return;
      if (hrefRaw === '../' || hrefRaw.startsWith('?')) return;
      const clean = hrefRaw.replace(/^\.\//, '');
      if (!clean) return;
      if (clean.endsWith('/')) {
        const name = clean.replace(/\/+$/, '');
        if (!name || name === '.' || name === '..') return;
        folders.add(name);
      } else {
        const fileName = clean.split(/[?#]/)[0];
        if (fileName && fileName !== '.' && fileName !== '..') {
          files.add(fileName);
        }
      }
    });
    return {
      folders: Array.from(folders),
      files: Array.from(files)
    };
  } catch (error) {
    console.warn('Failed to fetch directory listing for', relativeFolder, error);
    return null;
  }
}

async function discoverPlanFoldersFromListing() {
  const listing = await fetchFolderListing('Infrastructure_Plans');
  const folders = listing?.folders;
  if (!folders || !folders.length) return null;
  return folders.map(name => ({
    folder: name,
    metadataFile: 'metadata.json',
    imageFile: null,
    name: name,
    id: null
  }));
}

async function resolvePlanImageAsset(basePath, descriptor = {}, metadata = {}) {
  const candidates = [];
  const pushCandidate = (value) => {
    if (!value || typeof value !== 'string') return;
    const normalized = value.replace(/^\.\/+/, '').replace(/^\/+/, '');
    if (normalized) {
      candidates.push(normalized);
    }
  };

  pushCandidate(descriptor.imagePath);
  pushCandidate(descriptor.imageFile);
  pushCandidate(metadata.imageFile);
  pushCandidate(metadata.imageName);

  const tested = new Set();
  const tryLoad = async (fileName) => {
    if (!fileName || tested.has(fileName)) return null;
    tested.add(fileName);
    const imagePath = `${basePath}/${fileName}`.replace(/\\/g, '/');
    const dataUrl = await fetchPlanImageDataUrl(imagePath);
    if (dataUrl) {
      return { imageDataUrl: dataUrl, resolvedFileName: fileName };
    }
    return null;
  };

  for (const candidate of candidates) {
    const result = await tryLoad(candidate);
    if (result) {
      return result;
    }
  }

  const listing = await fetchFolderListing(basePath);
  const files = listing?.files || [];
  const allowedExt = ['.png', '.jpg', '.jpeg', '.webp'];
  for (const file of files) {
    const lower = file.toLowerCase();
    if (!allowedExt.some(ext => lower.endsWith(ext))) continue;
    const result = await tryLoad(file);
    if (result) {
      return result;
    }
  }

  return { imageDataUrl: null, resolvedFileName: null };
}

async function loadPlanEntryFromDescriptor(descriptor, index) {
  if (!descriptor) return;
  const folderSegment = sanitizePlanFolderSegment(descriptor.folder || descriptor.path || '');
  const basePath = folderSegment ? `Infrastructure_Plans/${folderSegment}` : 'Infrastructure_Plans';
  const metadataFile = descriptor.metadataFile || descriptor.metadataPath || descriptor.metadata || 'metadata.json';
  const metadataPath = `${basePath}/${metadataFile}`;
  const metadata = await fetchJsonAtProjectPath(metadataPath);
  if (!metadata) {
    console.warn('Skipping plan entry because metadata could not be loaded:', metadataPath);
    return;
  }
  const controlPairs = normalizePlanControlPairs(metadata.controlPoints || metadata.controlPairs);
  if (controlPairs.length < 3) {
    console.warn('Skipping plan entry with insufficient control points:', metadataPath);
    return;
  }
  const { imageDataUrl, resolvedFileName } = await resolvePlanImageAsset(basePath, descriptor, metadata);
  if (!imageDataUrl) {
    console.warn('Skipping plan entry because image could not be loaded:', descriptor);
    return;
  }
  const planConfig = {
    id: descriptor.id || metadata.id || `${folderSegment || 'plan'}_${index}`,
    name: descriptor.name || metadata.name || `Plan ${index + 1}`,
    imageDataUrl,
    imageName: metadata.imageName || resolvedFileName,
    imageWidth: metadata.imageWidth || metadata.width || null,
    imageHeight: metadata.imageHeight || metadata.height || null,
    controlPairs
  };
  if (loadedPlanIds.has(planConfig.id)) {
    return;
  }
  addPlanOverlayFromConfig(planConfig, { opacity: descriptor.opacity });
}

let planManifestLoadPromise = null;
async function loadPersistedInfrastructurePlans() {
  if (planManifestLoadPromise) return planManifestLoadPromise;
  planManifestLoadPromise = (async () => {
    const descriptors = await fetchPlanManifestEntries();
    if (!descriptors || !descriptors.length) {
      console.log('No Infrastructure_Plans manifest or metadata found – skipping automatic plan loading.');
      return;
    }
    for (let i = 0; i < descriptors.length; i++) {
      try {
        await loadPlanEntryFromDescriptor(descriptors[i], i);
      } catch (error) {
        console.error('Failed to load infrastructure plan entry:', descriptors[i], error);
      }
    }
  })()
    .catch(error => {
      console.error('Failed to load persisted infrastructure plans:', error);
    })
    .finally(() => {
      planManifestLoadPromise = null;
    });
  return planManifestLoadPromise;
}


// Expose helpers used by core / other UI blocks (as window properties too)
window.loadPersistedInfrastructurePlans = loadPersistedInfrastructurePlans;
window.handlePlanFileSelection = handlePlanFileSelection;

window.activateAddPlanTool = function activateAddPlanTool() {
  if (!checkContributorName()) return;
  deactivateAllModes();
  currentMode = 'add-plan';
  startAddInfrastructurePlan();
};
