/**
 * ================================================================================
 * QGas - Info Mode Tool
 * ================================================================================
 * 
 * Default interaction mode for viewing element information without editing.
 * Displays element attributes, metadata, and allows navigation between features.
 * 
 * Key Features:
 * - View element properties in info overlays
 * - Click elements to see detailed information
 * - Non-destructive interaction (read-only)
 * - Automatic cleanup of edit mode artifacts
 * - Reset all temporary highlights and selections
 * - Restore normal layer visibility
 * 
 * Functionality:
 * - Deactivates all editing tools
 * - Removes edit-mode UI elements (save/discard buttons)
 * - Resets pipeline and node highlights
 * - Clears pending deletion selections
 * - Restores standard info popup handlers
 * - Shows full layer visibility (no edit-mode hiding)
 * 
 * This is the safe default mode that users return to after completing
 * editing operations.
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Map click events and feature properties.
 * - Modal UI helpers for info display.
 *
 * Public API:
 * - activateInfoTool(): Activate info tool with contributor checks.
 * - activateInfoMode(force): Bind info handlers for the map.
 * 
 * ================================================================================
 */

/*
 * Info Mode tool module.
 */
(function(){
  /**
   * Activate info tool (wrapper with contributor check)
   */
  window.activateInfoTool = function activateInfoTool(){
    if (!checkContributorName()) return;
    deactivateAllModes();
    currentMode = 'info';
    activateInfoMode(true);
  };

  /**
   * Activate info mode
   * @param {boolean} force - Force reactivation even if already in info mode
   */
  window.activateInfoMode = function activateInfoMode(force = false) {
    try {
      if (!force && currentMode === 'info') {
        return;
      }
      currentMode = 'info';
      /* Remove edit buttons if present. */
      const saveBtn = document.getElementById('save-edit-btn');
      if (saveBtn) saveBtn.remove();
      const discardBtn = document.getElementById('discard-edit-btn');
      if (discardBtn) discardBtn.remove();
      
      /* Cleanup any node-edit state. */
      if (window.selectedNodeMarker) {
        cleanupNodeEdit(window.selectedNodeMarker);
      }
      
      console.log('Info Mode aktiviert');
      applyEditGeometryVisibility(false);
      
      /* Update toolbox button highlights. */
      currentActiveTool = 'info';
      document.querySelectorAll('.tool-tile').forEach(tile => {
        tile.classList.remove('active');
      });
      const activeTile = document.querySelector('.tool-tile[data-mode="info"]');
      if (activeTile) activeTile.classList.add('active');
      
      /* Update the active tool display. */
      updateActiveToolDisplay('info');
      
      /* Reset pipeline highlights. */
      resetAllPipelineHighlights();

      /* Reset pending delete selections. */
      clearPendingDeletionSelections();
      pendingPipelineDeletions.length = 0;
      pendingNodeDeletions.length = 0;
      pendingPowerplantDeletions.length = 0;
      pendingCompressorDeletions.length = 0;
      pendingLNGDeletions.length = 0;
      pendingStorageDeletions.length = 0;
      pendingCustomDeletions.length = 0;
      pendingDrawnItemDeletions.length = 0;
      
      /* Reset element highlights. */
      resetAllElementHighlights();
      
      /* Pipeline interactions for Info mode. */
      if (pipelineLayer) {
        pipelineLayer.eachLayer(layer => {
          layer.off('click');
          layer.unbindPopup();
          layer.on('click', function (e) {
            if (currentMode !== 'info') {
              return;
            }
            try {
              console.log('Pipeline geklickt in Info Mode:', layer);
              
              /* Highlight the selected pipeline. */
              highlightPipeline(layer);
              
              /* Show modal with pipeline details. */
              const content = createModalPopupContent(layer.feature.properties, layer);
              const title = `Pipeline: ${layer.feature.properties.ID || 'Unnamed'}`;
              showElementModal(title, content, layer);
              
              setTimeout(() => rebindModalAttributeControls(layer), 100);
            } catch (error) {
              console.error('Error in pipeline click:', error);
            }
          });
        });
      }
      
      /* Drawn-item pipeline interactions. */
      drawnItems.eachLayer(layer => {
        if (layer.feature && layer.feature.geometry.type === "LineString") {
          layer.off('click');
          layer.unbindPopup();
          layer.on('click', function (e) {
            if (currentMode !== 'info') {
              return;
            }
            try {
              /* Highlight the selected drawn pipeline. */
              highlightPipeline(layer);
              
              /* Show modal with pipeline details. */
              const content = createModalPopupContent(layer.feature.properties, layer);
              const title = `Pipeline: ${layer.feature.properties.ID || 'Unnamed'}`;
              showElementModal(title, content, layer);
              
              setTimeout(() => rebindModalAttributeControls(layer), 100);
            } catch (error) {
              console.error('Error in drawn pipeline click:', error);
            }
          });
        }
      });
      
      /* Short-pipe interactions for Info mode. */
      if (shortPipeLayer) {
        shortPipeLayer.eachLayer(layer => {
          layer.off('click');
          layer.unbindPopup();
          layer.on('click', function (e) {
            if (currentMode !== 'info') {
              return;
            }
            try {
              console.log('Short-Pipe geklickt in Info Mode:', layer);
              
              /* Highlight the selected short pipe. */
              highlightPipeline(layer);
              
              /* Show modal with short-pipe details. */
              const content = createModalPopupContent(layer.feature.properties, layer);
              const title = `Short-Pipe: ${layer.feature.properties.ID || 'Unnamed'}`;
              showElementModal(title, content, layer);
              
              setTimeout(() => rebindModalAttributeControls(layer), 100);
            } catch (error) {
              console.error('Error in short-pipe click:', error);
            }
          });
        });
      }
      
      /* Node interactions for Info mode. */
      forEachNodeMarker(marker => {
        marker.off('click');
        marker.on('click', function (e) {
          if (currentMode !== 'info') {
            return;
          }
          try {
            L.DomEvent.stopPropagation(e);
            console.log('Node geklickt in Info Mode:', marker.feature.properties.ID);
            highlightElement(marker);
            const content = createModalPopupContent(marker.feature.properties, marker);
            const title = `Node: ${marker.feature.properties.ID || marker.feature.properties.Name || 'Unnamed'}`;
            showElementModal(title, content, marker);
            setTimeout(() => rebindModalAttributeControls(marker), 100);
          } catch (error) {
            console.error('Error in node click:', error);
          }
        });
      });
      
      /* Element interactions for Info mode. */
      updateAllElementInteractions();
    } catch (error) {
      console.error('Error in activateInfoMode:', error);
    }
  };
})();
