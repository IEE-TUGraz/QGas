/**
 * ================================================================================
 * QGas - Short Pipe Tool
 * ================================================================================
 * 
 * Converts standard pipeline segments into short-pipe elements with distinct
 * styling and layer assignment. Used for creating simplified connection segments.
 * 
 * Key Features:
 * - Interactive pipeline selection
 * - Visual selection feedback
 * - Layer reassignment (from pipeline to short-pipe layer)
 * - Batch selection support
 * - Confirmation before applying changes
 * 
 * Workflow:
 * 1. User activates tool
 * 2. Clicks pipeline segments to mark as short pipes
 * 3. Selected segments show highlighted styling
 * 4. Confirmation moves segments to short-pipe layer
 * 5. Properties and styling updated automatically
 * 
 * Technical Details:
 * - Maintains original geometry
 * - Updates layer membership
 * - Preserves all attributes except layer assignment
 * - Uses distinct visual style for identification
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Map clicks for short pipe placement.
 * - Node selection and layer context.
 *
 * Public API:
 * - activateShortPipeMode(): Start short pipe workflow.
 * 
 * ================================================================================
 */

/* ================================================================================
 * STATE MANAGEMENT
 * ================================================================================
 */
let shortPipeSelectionActive = false;
let selectedShortPipes = [];

function captureShortPipeBaseStyle(layer) {
  if (!layer || layer._shortPipeBaseStyle) return;
  const options = layer.options || {};
  layer._shortPipeBaseStyle = {
    color: options.color || layer._originalColor || '#3388ff',
    weight: typeof options.weight === 'number' ? options.weight : (layer._originalWeight ?? 3),
    dashArray: Object.prototype.hasOwnProperty.call(options, 'dashArray') ? options.dashArray : (layer._originalDashArray ?? null),
    opacity: typeof options.opacity === 'number' ? options.opacity : (layer._originalOpacity ?? 1)
  };
}

function restoreShortPipeBaseStyle(layer) {
  if (!layer || !layer._shortPipeBaseStyle) return;
  layer.setStyle(layer._shortPipeBaseStyle);
  syncPathStyle(layer, layer._shortPipeBaseStyle);
  delete layer._shortPipeBaseStyle;
}

function applyShortPipeSelectionStyle(layer) {
  if (!layer) return;
  captureShortPipeBaseStyle(layer);
  const selectionStyle = getShortPipeSelectionStyle();
  layer.setStyle(selectionStyle);
  syncPathStyle(layer, selectionStyle);
  if (typeof layer.bringToFront === 'function') {
    layer.bringToFront();
  }
}

function resetLayerAfterShortPipeInteraction(layer) {
  if (!layer) return;
  restoreShortPipeBaseStyle(layer);
  layer.off('click');
  setPipelineInteraction(layer, 'info');
}

function resetPipelineLayersAfterShortPipeMode() {
  const lineLayers = (typeof getAllLineLayers === 'function' ? getAllLineLayers() : (typeof pipelineLayer !== 'undefined' && pipelineLayer ? [pipelineLayer] : []));
  lineLayers.forEach(group => {
    if (!group) return;
    forEachPolylineFeature(group, layer => {
      resetLayerAfterShortPipeInteraction(layer);
    });
  });
}

/**
 * Start the short-pipe selection workflow.
 *
 * Activates short-pipe selection mode and attaches click handlers to all
 * polyline features in every active line layer. Clicking a pipeline
 * segment toggles its short-pipe status (visual cue: orange dashed
 * stroke). A save button at the top of the map commits the selection as
 * short-pipe entries in the dataset; a discard button resets all styles
 * and exits the mode without saving.
 *
 * @returns {void}
 */
function startShortPipeSelection() {
  shortPipeSelectionActive = true;
  selectedShortPipes = [];
  
  showCustomPopup(
    '📏 Short-Pipe Mode',
    '<p style="text-align: center; margin: 15px 0;">Click on pipeline segments to mark as Short-Pipe. Then click \'Save Short-Pipe\' at the top center.</p>',
    [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
  );

  const lineLayers = (typeof getAllLineLayers === 'function' ? getAllLineLayers() : (typeof pipelineLayer !== 'undefined' && pipelineLayer ? [pipelineLayer] : []));
  lineLayers.forEach(group => {
    if (!group) return;
    forEachPolylineFeature(group, layer => {
      layer.off('click');
      captureShortPipeBaseStyle(layer);
      layer.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        if (!selectedShortPipes.includes(layer)) {
          selectedShortPipes.push(layer);
          applyShortPipeSelectionStyle(layer);
        } else {
          selectedShortPipes = selectedShortPipes.filter(l => l !== layer);
          restoreShortPipeBaseStyle(layer);
        }
      });
    });
  });

  showShortPipeSaveBtn();
}

function showShortPipeSaveBtn() {
  removeShortPipeSaveBtn();
  
  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.id = 'shortpipe-save-btn';
  saveBtn.textContent = 'Save Changes';
  saveBtn.className = 'main-menu-btn edit-action-btn';
  saveBtn.style.display = 'block';
  saveBtn.style.width = 'var(--menu-btn-width)';
  saveBtn.style.margin = '0 auto';
  saveBtn.style.background = '#28a745';

  saveBtn.onclick = function () {
    /* Move selected pipelines into the short-pipe layer. */
    selectedShortPipes.forEach(layer => {
      const owning = (typeof findOwningLayerGroup === 'function' ? findOwningLayerGroup(layer) : null) || (typeof pipelineLayer !== 'undefined' ? pipelineLayer : null);
      if (owning && typeof owning.removeLayer === 'function') owning.removeLayer(layer);
      shortPipeLayer.addLayer(layer);
      /* Set short-pipe attributes (handle uppercase and lowercase). */
      if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        /* Set Diameter (handle Diameter_mm and diameter_mm). */
        if ('Diameter_mm' in props) {
          props.Diameter_mm = 9999;
        } else if ('diameter_mm' in props) {
          props.diameter_mm = 9999;
        }
        /* Set Length (handle Length_km and length_km). */
        if ('Length_km' in props) {
          props.Length_km = 0;
        } else if ('length_km' in props) {
          props.length_km = 0;
        }
        props.modified = true;
      }
      
      /* Load short-pipe style from layerConfig. */
      const shortPipeConfig = Array.isArray(layerConfig) ? layerConfig.find(cfg => 
        cfg && (cfg.legendName === 'Short Pipes' || cfg.layerName === 'Short Pipes' || (cfg.filename || '').includes('Short_Pipe'))
      ) : null;
      
      const shortPipeStyle = {
        color: shortPipeConfig?.color || shortPipeLayer?._customLineColor || '#ff8800',
        weight: shortPipeConfig?.size || shortPipeLayer?._customLineWeight || 4,
        opacity: 0.8,
        dashArray: null
      };
      
      layer.setStyle(shortPipeStyle);
      /* Persist original style values. */
      layer._originalColor = shortPipeStyle.color;
      layer._originalWeight = shortPipeStyle.weight;
      layer._originalOpacity = shortPipeStyle.opacity;
      layer._originalDashArray = null;
      
      layer.off('click');
      delete layer._shortPipeBaseStyle;
    });
    /* Reset styles and info handlers for remaining pipelines. */
    resetPipelineLayersAfterShortPipeMode();
    shortPipeSelectionActive = false;
    selectedShortPipes = [];
    removeShortPipeSaveBtn();
    
    /* Switch back to Info mode. */
    currentMode = 'info';
    activateInfoMode();
    selectTool('info');
  };

  // Discard button
  const discardBtn = document.createElement('button');
  discardBtn.id = 'shortpipe-discard-btn';
  discardBtn.textContent = 'Discard Changes';
  discardBtn.className = 'main-menu-btn edit-action-btn';
  discardBtn.style.display = 'block';
  discardBtn.style.width = 'var(--menu-btn-width)';
  discardBtn.style.margin = '0 auto';
  discardBtn.style.background = '#dc3545';

  discardBtn.onclick = function () {
    /* Reset styles and selection. */
    resetPipelineLayersAfterShortPipeMode();
    selectedShortPipes = [];
    shortPipeSelectionActive = false;
    removeShortPipeSaveBtn();
    
    currentMode = 'info';
    activateInfoMode();
    selectTool('info');
  };
  
  /* Add buttons to tools section. */
  const toolsSection = document.getElementById('tools-section');
  toolsSection.appendChild(saveBtn);
  toolsSection.appendChild(discardBtn);
}

function removeShortPipeSaveBtn() {
  const saveBtn = document.getElementById('shortpipe-save-btn');
  if (saveBtn) saveBtn.remove();
  const discardBtn = document.getElementById('shortpipe-discard-btn');
  if (discardBtn) discardBtn.remove();
}

