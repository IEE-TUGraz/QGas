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
 * - Primary Author: Marco Quantschnig, BSc.
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE),
 *                Graz University of Technology (TU Graz)
 * - Created: August 2025
 * - License: See LICENSE file
 * 
 * ================================================================================
 */

// Info Mode tool module
(function(){
  /**
   * Activate info tool (wrapper with contributor check)
   */
  window.activateInfoTool = function activateInfoTool(){
    if (!checkContributorName()) return;
    deactivateAllModes();
    currentMode = 'info';
    activateInfoMode();
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
      // Edit-Buttons entfernen, falls vorhanden
      const saveBtn = document.getElementById('save-edit-btn');
      if (saveBtn) saveBtn.remove();
      const discardBtn = document.getElementById('discard-edit-btn');
      if (discardBtn) discardBtn.remove();
      
      // Node-Edit Cleanup
      if (window.selectedNodeMarker) {
        cleanupNodeEdit(window.selectedNodeMarker);
      }
      
      console.log('Info Mode aktiviert');
      applyEditGeometryVisibility(false);
      
      // Toolbox-Buttons aktualisieren
      currentActiveTool = 'info';
      document.querySelectorAll('.tool-tile').forEach(tile => {
        tile.classList.remove('active');
      });
      const activeTile = document.querySelector('.tool-tile[data-mode="info"]');
      if (activeTile) activeTile.classList.add('active');
      
      // Aktives Tool Display aktualisieren
      updateActiveToolDisplay('info');
      
      // Alle Pipeline-Highlights zurücksetzen
      resetAllPipelineHighlights();

      // Pending Delete-Auswahlen zurücksetzen
      clearPendingDeletionSelections();
      pendingPipelineDeletions.length = 0;
      pendingNodeDeletions.length = 0;
      pendingPowerplantDeletions.length = 0;
      pendingCompressorDeletions.length = 0;
      pendingLNGDeletions.length = 0;
      pendingStorageDeletions.length = 0;
      pendingCustomDeletions.length = 0;
      pendingDrawnItemDeletions.length = 0;
      
      // Alle Element-Highlights zurücksetzen
      resetAllElementHighlights();
      
      // Pipeline-Interaktionen für Info Mode
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
              
              // Highlighte die angeklickte Pipeline
              highlightPipeline(layer);
              
              // Modal mit Pipeline-Details anzeigen
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
      
      // Drawn Items Pipeline-Interaktionen
      drawnItems.eachLayer(layer => {
        if (layer.feature && layer.feature.geometry.type === "LineString") {
          layer.off('click');
          layer.unbindPopup();
          layer.on('click', function (e) {
            if (currentMode !== 'info') {
              return;
            }
            try {
              // Drawn Pipeline geklickt in Info Mode
              
              // Highlighte die angeklickte Pipeline
              highlightPipeline(layer);
              
              // Modal mit Pipeline-Details anzeigen
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
      
      // Short-Pipe-Interaktionen für Info Mode
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
              
              // Highlighte die angeklickte Short-Pipe
              highlightPipeline(layer);
              
              // Modal mit Short-Pipe-Details anzeigen
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
      
      // Node-Interaktionen für Info Mode
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
      
      // Element-Interaktionen für Info Mode
      updateAllElementInteractions();
    } catch (error) {
      console.error('Error in activateInfoMode:', error);
    }
  };
})();
