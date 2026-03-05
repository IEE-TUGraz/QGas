/**
 * QGas - Pipeline Groups Module
 *
 * Module Description:
 * Supports visualizing and highlighting pipeline groups created in the UI.
 *
 * Author: Dipl.-Ing. Marco Quantschnig
 * Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Pipeline group definitions and layer registries.
 * - Map instance for pan/zoom and style updates.
 *
 * Public API:
 * - highlightGroup(index): Highlight a saved pipeline group.
 * - unhighlightAllGroups(): Clear group highlights.
 */
/*
 * Extracted groups panel logic from core.js (v5).
 */

window.highlightGroup = function highlightGroup(index) {
  const group = pipelineGroups[index];
  if (!group) return;

  dockCustomPopupBottomRight();

  /* Reset all pipeline highlights before applying group highlight. */
  unhighlightAllGroups();

  if (!map) return;

  const targetedIds = Array.isArray(group.pipelines) ? new Set(group.pipelines) : new Set();
  const bounds = L.latLngBounds();

  /* Search in all line layers (pipelineLayer, drawnItems, shortPipeLayer, customLayers). */
  const lineLayers = [];
  if (typeof pipelineLayer !== 'undefined' && pipelineLayer) lineLayers.push(pipelineLayer);
  if (typeof drawnItems !== 'undefined' && drawnItems) lineLayers.push(drawnItems);
  if (typeof shortPipeLayer !== 'undefined' && shortPipeLayer) lineLayers.push(shortPipeLayer);
  if (typeof window.customLayers !== 'undefined' && window.customLayers) {
    Object.values(window.customLayers).forEach(layer => {
      if (layer && layer._customLineLayer) lineLayers.push(layer);
    });
  }

  lineLayers.forEach(layerGroup => {
    if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
    
    layerGroup.eachLayer(layer => {
      /* Skip non-polyline features. */
      if (!layer.feature || layer.feature.geometry.type !== 'LineString') return;
      
      const featureId = layer?.feature?.properties?.ID;
      if (!targetedIds.has(featureId)) return;

      layer.setStyle({ color: '#ff2b2b', weight: 6 });
      if (layer._path) {
        layer._path.style.stroke = '#ff2b2b';
        layer._path.style.strokeWidth = '6';
      }
      if (typeof layer.bringToFront === 'function') {
        layer.bringToFront();
      }
      if (typeof layer.getBounds === 'function') {
        const layerBounds = layer.getBounds();
        if (layerBounds && layerBounds.isValid()) {
          bounds.extend(layerBounds);
        }
      }
    });
  });

  if (typeof bounds.isValid === 'function' && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [80, 80] });
  }
};

function openGroupsPanel() {
  if (pipelineGroups.length === 0) {
    showCustomPopup(
      '📦 Pipeline Groups',
      '<p style="text-align: center; margin: 15px 0;">No pipeline groups created yet.<br>Use the "Group Pipelines" tool to create groups.</p>',
      [{text: 'OK', type: 'primary', onClick: () => {}}]
    );
    return;
  }
  
  /* Build the group list for display. */
  let groupsHTML = '<div style="max-height: 400px; overflow-y: auto;">';
  pipelineGroups.forEach((group, index) => {
    groupsHTML += `
      <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; cursor: pointer; transition: background 0.3s;" 
           onmouseover="this.style.background='#e0e0e0'" 
           onmouseout="this.style.background='#f5f5f5'"
           onclick="highlightGroup(${index})">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">📦 ${group.name}</div>
        <div style="color: #666; font-size: 14px;">
          Elements: ${group.numElements} pipelines<br>
          Total Length: ${group.totalLength} km
        </div>
      </div>
    `;
  });
  groupsHTML += '</div>';
  
  showCustomPopup(
    '📦 Pipeline Groups',
    groupsHTML,
    [{text: 'Close', type: 'secondary', onClick: () => {unhighlightAllGroups();}}]
  );
}

function unhighlightAllGroups() {
  /* Search in all line layers. */
  const lineLayers = [];
  if (typeof pipelineLayer !== 'undefined' && pipelineLayer) lineLayers.push(pipelineLayer);
  if (typeof drawnItems !== 'undefined' && drawnItems) lineLayers.push(drawnItems);
  if (typeof shortPipeLayer !== 'undefined' && shortPipeLayer) lineLayers.push(shortPipeLayer);
  if (typeof window.customLayers !== 'undefined' && window.customLayers) {
    Object.values(window.customLayers).forEach(layer => {
      if (layer && layer._customLineLayer) lineLayers.push(layer);
    });
  }

  lineLayers.forEach(layerGroup => {
    if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
    
    layerGroup.eachLayer(layer => {
      /* Skip non-LineString features (nodes/points). */
      if (!layer.feature || !layer.feature.geometry || layer.feature.geometry.type !== 'LineString') return;
      
      /* Restore original styles instead of hardcoded defaults. */
      const originalColor = layer._originalColor || '#3388ff';
      const originalWeight = layer._originalWeight || 3;
      const originalOpacity = layer._originalOpacity || 0.8;
      const originalDashArray = layer._originalDashArray || null;
      
      layer.setStyle({
        color: originalColor,
        weight: originalWeight,
        opacity: originalOpacity,
        dashArray: originalDashArray
      });
      if (layer._path) {
        layer._path.style.stroke = originalColor;
        layer._path.style.strokeWidth = String(originalWeight);
      }
    });
  });
}

/* ================================================================================
 * Sublayer Switch Tool
 * ================================================================================
 */

