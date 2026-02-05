/**
 * ================================================================================
 * QGas - Delete Tool
 * ================================================================================
 * 
 * Manages element deletion functionality with visual feedback and undo support.
 * Allows users to mark elements for deletion and batch-delete them with confirmation.
 * 
 * Key Features:
 * - Visual marking of elements pending deletion
 * - Batch deletion with single confirmation
 * - Automatic orphaned node cleanup
 * - Undo functionality (elements stored in deleted registries)
 * - Support for all element types (pipelines, nodes, infrastructure)
 * - Parent layer tracking for proper removal
 * 
 * Deletion Process:
 * 1. User activates delete mode
 * 2. Clicks elements to mark for deletion (visual feedback)
 * 3. Clicks "Delete Elements" button to confirm
 * 4. Elements are removed from map and stored in deletion registries
 * 5. Orphaned nodes are automatically cleaned up
 * 
 * Supported Element Types:
 * - Pipelines (including short pipes, hydrogen pipes)
 * - Nodes
 * - Compressors
 * - Storages
 * - LNG terminals
 * - Power plants
 * - Custom elements
 * - Drawn items
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

/**
 * Show the save/confirm delete button in the UI
 * Creates a button that executes batch deletion of all marked elements
 */
function showSaveDeleteButton() {
    if (document.getElementById('save-delete-btn')) return; // Nur einen Button zulassen

    const btn = document.createElement('button');
    btn.id = 'save-delete-btn';
    btn.textContent = 'Delete Elements';
    btn.className = 'main-menu-btn edit-action-btn';
    btn.style.display = 'block';
    btn.style.margin = '0 auto';
    btn.style.background = '#c82333';
    btn.style.border = 'none';

    btn.onclick = function () {
      if (!hasPendingDeletions()) {
        showInfoPopup('Select elements to delete before confirming.', '🗑️ Delete Mode');
        return;
      }

      try {
        pendingPipelineDeletions.forEach(item => {
          if (!item.layer) return;
          if (item.parentLayer && typeof item.parentLayer.removeLayer === 'function' && item.parentLayer.hasLayer && item.parentLayer.hasLayer(item.layer)) {
            item.parentLayer.removeLayer(item.layer);
          } else if (item.parentLayer && typeof item.parentLayer.removeLayer === 'function') {
            item.parentLayer.removeLayer(item.layer);
          } else if (map.hasLayer(item.layer)) {
            map.removeLayer(item.layer);
          }
          if (item.feature) {
            deletedPipelines.push(item.feature);
            recordDeletedFeatureIdentity(item.feature, 'pipelines');
            recordDeletedFeatureIdentity(item.feature, 'shortPipes'); // Auch für shortPipes registrieren
            removeFeatureFromElementLayers(item.feature, 'pipelines', item.layer);
            removeFeatureFromElementLayers(item.feature, 'shortPipes', item.layer); // Auch aus shortPipes entfernen
            // WICHTIG: Auch aus ALLEN Layern auf der Karte entfernen
            removeFeatureFromAllMapLayers(item.feature);
          }
          stashLayerInDeletedGroup(item.layer, 'pipelines');
          removeLayerCompletely(item.layer);
          if (item.startNodeId || item.endNodeId) {
            checkAndDeleteOrphanedNodes([item.startNodeId, item.endNodeId]);
          }
          delete item.layer?._markedForDeletion;
        });

        pendingNodeDeletions.forEach(item => {
          if (item.layer) {
            let removed = false;
            const nodeLayers = getAllNodeLayers();
            nodeLayers.forEach(layerGroup => {
              if (removed || !layerGroup) return;
              try {
                if (typeof layerGroup.hasLayer === 'function' && layerGroup.hasLayer(item.layer)) {
                  layerGroup.removeLayer(item.layer);
                  removed = true;
                } else if (typeof layerGroup.removeLayer === 'function') {
                  layerGroup.removeLayer(item.layer);
                  removed = true;
                }
              } catch (err) {
                console.warn('Could not remove node layer entry:', err);
              }
            });
            if (!removed && map.hasLayer(item.layer)) {
              map.removeLayer(item.layer);
            }
          }
          if (item.feature) {
            deletedNodes.push(item.feature);
            recordDeletedFeatureIdentity(item.feature, 'nodes');
            removeFeatureFromElementLayers(item.feature, 'nodes', item.layer);
            removeFeatureFromAllMapLayers(item.feature);
          }
          stashLayerInDeletedGroup(item.layer, 'nodes');
          removeLayerCompletely(item.layer);
          delete item.layer?._markedForDeletion;
        });

        pendingPowerplantDeletions.forEach(item => {
          if (item.layer && powerplantsLayer && typeof powerplantsLayer.removeLayer === 'function') {
            powerplantsLayer.removeLayer(item.layer);
          } else if (map.hasLayer(item.layer)) {
            map.removeLayer(item.layer);
          }
          if (item.feature) {
            deletedPowerplants.push(item.feature);
            recordDeletedFeatureIdentity(item.feature, 'powerplants');
            removeFeatureFromElementLayers(item.feature, 'powerplants', item.layer);
            removeFeatureFromAllMapLayers(item.feature);
          }
          stashLayerInDeletedGroup(item.layer, 'powerplants');
          removeLayerCompletely(item.layer);
          delete item.layer?._markedForDeletion;
        });

        pendingCompressorDeletions.forEach(item => {
          if (item.layer && compressorsLayer && typeof compressorsLayer.removeLayer === 'function') {
            compressorsLayer.removeLayer(item.layer);
          } else if (map.hasLayer(item.layer)) {
            map.removeLayer(item.layer);
          }
          if (item.feature) {
            deletedCompressors.push(item.feature);
            recordDeletedFeatureIdentity(item.feature, 'compressors');
            removeFeatureFromElementLayers(item.feature, 'compressors', item.layer);
            removeFeatureFromAllMapLayers(item.feature);
          }
          stashLayerInDeletedGroup(item.layer, 'compressors');
          removeLayerCompletely(item.layer);
          delete item.layer?._markedForDeletion;
        });

        pendingLNGDeletions.forEach(item => {
          if (item.layer && lngLayer && typeof lngLayer.removeLayer === 'function') {
            lngLayer.removeLayer(item.layer);
          } else if (map.hasLayer(item.layer)) {
            map.removeLayer(item.layer);
          }
          if (item.feature) {
            deletedLNGs.push(item.feature);
            recordDeletedFeatureIdentity(item.feature, 'lng');
            removeFeatureFromElementLayers(item.feature, 'lng', item.layer);
            removeFeatureFromAllMapLayers(item.feature);
          }
          stashLayerInDeletedGroup(item.layer, 'lng');
          removeLayerCompletely(item.layer);
          delete item.layer?._markedForDeletion;
        });

        pendingStorageDeletions.forEach(item => {
          if (item.layer && storageLayer && typeof storageLayer.removeLayer === 'function') {
            storageLayer.removeLayer(item.layer);
          } else if (map.hasLayer(item.layer)) {
            map.removeLayer(item.layer);
          }
          if (item.feature) {
            deletedStorages.push(item.feature);
            recordDeletedFeatureIdentity(item.feature, 'storages');
            removeFeatureFromElementLayers(item.feature, 'storages', item.layer);
            removeFeatureFromAllMapLayers(item.feature);
          }
          stashLayerInDeletedGroup(item.layer, 'storages');
          removeLayerCompletely(item.layer);
          delete item.layer?._markedForDeletion;
        });

        pendingCustomDeletions.forEach(item => {
          if (!item || !item.layer) return;
          const parent = item.parentLayer;
          if (parent && typeof parent.removeLayer === 'function' && parent.hasLayer && parent.hasLayer(item.layer)) {
            parent.removeLayer(item.layer);
          } else if (parent && typeof parent.removeLayer === 'function') {
            parent.removeLayer(item.layer);
          } else if (map.hasLayer(item.layer)) {
            map.removeLayer(item.layer);
          }
          deletedCustomElements.push(item.layer.feature || { type: 'CustomElement' });
          delete item.layer?._markedForDeletion;
        });

        pendingDrawnItemDeletions.forEach(item => {
          if (!item || !item.layer) return;
          if (drawnItems && typeof drawnItems.removeLayer === 'function') {
            drawnItems.removeLayer(item.layer);
          } else if (item.parentLayer && typeof item.parentLayer.removeLayer === 'function') {
            item.parentLayer.removeLayer(item.layer);
          } else if (map.hasLayer(item.layer)) {
            map.removeLayer(item.layer);
          }
          if (item.layer && item.layer.feature) {
            deletedDrawnItems.push(item.layer.feature);
          }
          delete item.layer?._markedForDeletion;
        });

        pendingPipelineDeletions.length = 0;
        pendingNodeDeletions.length = 0;
        pendingPowerplantDeletions.length = 0;
        pendingCompressorDeletions.length = 0;
        pendingLNGDeletions.length = 0;
        pendingStorageDeletions.length = 0;
        pendingCustomDeletions.length = 0;
        pendingDrawnItemDeletions.length = 0;
        updateDeleteModeButtonsState();
        window.hasUnsavedChanges = true;
      } catch (error) {
        console.error('Error confirming deletions:', error);
        showErrorPopup('Could not delete selected elements. Please try again.');
        return;
      }

      deleteModeBackup = null;

      btn.remove();
      document.getElementById('discard-delete-btn')?.remove();
      // Nach dem Löschen: Zurück zum Info-Modus
      deactivateAllModes();
      activateInfoMode();
    };

    const toolsSection = document.getElementById('tools-section');
    toolsSection.appendChild(btn);
    updateDeleteModeButtonsState();
  }

  // Discard Button für Delete Mode
  function showDiscardDeleteButton() {
    console.log('showDiscardDeleteButton called');
    if (document.getElementById('discard-delete-btn')) {
      console.log('Discard button already exists');
      return; // Nur einen Button zulassen
    }

    console.log('Creating discard delete button');
    const btn = document.createElement('button');
    btn.id = 'discard-delete-btn';
    btn.textContent = 'Discard Changes';
    btn.className = 'main-menu-btn edit-action-btn';
    btn.style.display = 'block';
    btn.style.margin = '0 auto';
    btn.style.background = '#dc3545';

    btn.onclick = function () {
      console.log('=== DISCARD DELETE BUTTON CLICKED ===');
      
      try {
        clearPendingDeletionSelections();
        pendingPipelineDeletions.length = 0;
        pendingNodeDeletions.length = 0;
        pendingPowerplantDeletions.length = 0;
        pendingCompressorDeletions.length = 0;
        pendingLNGDeletions.length = 0;
        pendingStorageDeletions.length = 0;
        pendingCustomDeletions.length = 0;
        pendingDrawnItemDeletions.length = 0;
        deleteModeBackup = null;
        
        // Remove buttons
        const discardBtn = document.getElementById('discard-delete-btn');
        const saveBtn = document.getElementById('save-delete-btn');
        if (discardBtn) discardBtn.remove();
        if (saveBtn) saveBtn.remove();
        
        // Switch back to Info Mode (this will restore all click handlers)
        deactivateAllModes();
        activateInfoMode();
      } catch (error) {
        console.error('❌ Error restoring deleted items:', error);
        showErrorPopup('Error restoring items: ' + error.message);
      }
    };

    console.log('Appending discard button to tools section');
    const toolsSection = document.getElementById('tools-section');
    toolsSection.appendChild(btn);
  }

function getLayerFeatures(layerGroup) {
  const features = [];
  layerGroup.eachLayer(layer => {
    if (layer.feature) {
      features.push(JSON.parse(JSON.stringify(layer.feature))); // Deep copy
    }
  });
  return features;
}

function getPathStyleSnapshot(layer) {
  if (!layer) {
    return { color: '#3388ff', weight: 3, opacity: 0.8, dashArray: null };
  }
  const options = layer.options || {};
  return {
    color: options.color || layer._originalColor || '#3388ff',
    weight: typeof options.weight === 'number' ? options.weight : (layer._originalWeight ?? 3),
    opacity: typeof options.opacity === 'number' ? options.opacity : (layer._originalOpacity ?? 0.8),
    dashArray: Object.prototype.hasOwnProperty.call(options, 'dashArray') ? options.dashArray : (layer._originalDashArray ?? null)
  };
}

function removeFromPendingList(list, layer) {
  if (!Array.isArray(list)) return;
  const index = list.findIndex(item => item.layer === layer);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

function hasPendingDeletions() {
  return (
    pendingPipelineDeletions.length ||
    pendingNodeDeletions.length ||
    pendingCompressorDeletions.length ||
    pendingStorageDeletions.length ||
    pendingLNGDeletions.length ||
    pendingPowerplantDeletions.length ||
    pendingCustomDeletions.length ||
    pendingDrawnItemDeletions.length
  );
}

function updateDeleteModeButtonsState() {
  const deleteBtn = document.getElementById('save-delete-btn');
  if (deleteBtn) {
    const disabled = !hasPendingDeletions();
    deleteBtn.disabled = disabled;
    deleteBtn.style.opacity = disabled ? '0.6' : '1';
    deleteBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }
}

function markPipelineLayerForDeletion(layer, parentLayer) {
  if (!layer || layer._markedForDeletion) return;
  if (!layer._deleteBackupStyle) {
    layer._deleteBackupStyle = getPathStyleSnapshot(layer);
  }
  const highlightStyle = {
    color: '#ff1744',
    weight: (layer._deleteBackupStyle.weight || 3) + 3,
    opacity: 1,
    dashArray: '8 4'
  };
  layer.setStyle(highlightStyle);
  syncPathStyle(layer, highlightStyle);
  const exists = pendingPipelineDeletions.some(item => item.layer === layer);
  if (!exists) {
    pendingPipelineDeletions.push({
    layer,
    parentLayer,
    feature: layer.feature,
    startNodeId: layer.feature?.properties?.Start_Node,
    endNodeId: layer.feature?.properties?.End_Node
    });
  }
  layer._markedForDeletion = true;
  updateDeleteModeButtonsState();
}

function unmarkPipelineLayerForDeletion(layer) {
  if (!layer || !layer._markedForDeletion) return;
  const baseStyle = layer._deleteBackupStyle || getPathStyleSnapshot(layer);
  layer.setStyle(baseStyle);
  syncPathStyle(layer, baseStyle);
  layer._markedForDeletion = false;
  removeFromPendingList(pendingPipelineDeletions, layer);
  updateDeleteModeButtonsState();
}

function togglePipelineDeletion(layer, parentLayer) {
  if (!layer) return;
  if (layer._markedForDeletion) {
    unmarkPipelineLayerForDeletion(layer);
  } else {
    markPipelineLayerForDeletion(layer, parentLayer);
  }
}

function getMarkerBaseStyle(marker) {
  return marker?._deleteBackupMarkerStyle || marker?._defaultMarkerStyle || {
    color: marker?.options?.color || '#000',
    weight: marker?.options?.weight ?? 1,
    fillColor: marker?.options?.fillColor || '#ff7800',
    fillOpacity: marker?.options?.fillOpacity ?? 0.85,
    radius: marker?.options?.radius ?? 6
  };
}

function applyMarkerDeletionStyle(marker) {
  if (!marker) return;
  if (!marker._deleteBackupMarkerStyle) {
    marker._deleteBackupMarkerStyle = {
      color: marker.options?.color,
      weight: marker.options?.weight,
      fillColor: marker.options?.fillColor,
      fillOpacity: marker.options?.fillOpacity,
      radius: marker.options?.radius
    };
  }
  marker.setStyle({
    color: '#ff1744',
    weight: 3,
    fillColor: '#ffe2e2',
    fillOpacity: 0.95
  });
  if (typeof marker.setRadius === 'function') {
    const baseRadius = marker._deleteBackupMarkerStyle.radius ?? marker.options?.radius ?? 6;
    marker.setRadius(baseRadius + 1);
  }
  marker._markedForDeletion = true;
}

function restoreMarkerDeletionStyle(marker) {
  if (!marker) return;
  const baseStyle = getMarkerBaseStyle(marker);
  marker.setStyle({
    color: baseStyle.color || '#000',
    weight: baseStyle.weight ?? 1,
    fillColor: baseStyle.fillColor || '#ff7800',
    fillOpacity: typeof baseStyle.fillOpacity === 'number' ? baseStyle.fillOpacity : 0.85
  });
  if (typeof marker.setRadius === 'function' && baseStyle.radius !== undefined) {
    marker.setRadius(baseStyle.radius);
  }
  marker._markedForDeletion = false;
}

function togglePointDeletion(marker, pendingList, parentLayer) {
  if (!marker || !Array.isArray(pendingList)) return;
  if (marker._markedForDeletion) {
    restoreMarkerDeletionStyle(marker);
    removeFromPendingList(pendingList, marker);
  } else {
    applyMarkerDeletionStyle(marker);
    const exists = pendingList.some(item => item.layer === marker);
    if (!exists) {
      pendingList.push({ layer: marker, parentLayer: parentLayer || null, feature: marker.feature });
    }
  }
  updateDeleteModeButtonsState();
}

function applyGenericDeletionStyle(layer) {
  if (!layer) return;
  if (layer instanceof L.Path) {
    if (!layer._deleteBackupStyle) {
      layer._deleteBackupStyle = getPathStyleSnapshot(layer);
    }
    const style = {
      color: '#ff1744',
      weight: (layer._deleteBackupStyle.weight || 3) + 1,
      opacity: 1,
      dashArray: '8 4'
    };
    layer.setStyle(style);
    syncPathStyle(layer, style);
  } else if (typeof layer.setOpacity === 'function') {
    if (typeof layer._deleteBackupOpacity === 'undefined') {
      layer._deleteBackupOpacity = typeof layer.options?.opacity === 'number' ? layer.options.opacity : 1;
    }
    layer.setOpacity(0.4);
  } else if (layer.getElement && layer.getElement()) {
    const elem = layer.getElement();
    if (elem) {
      layer._deleteBackupFilter = elem.style.filter;
      elem.style.filter = 'grayscale(1) brightness(0.7)';
    }
  }
  layer._markedForDeletion = true;
}

function restoreGenericDeletionStyle(layer) {
  if (!layer) return;
  if (layer instanceof L.Path) {
    const backup = layer._deleteBackupStyle || getPathStyleSnapshot(layer);
    layer.setStyle(backup);
    syncPathStyle(layer, backup);
  } else if (typeof layer.setOpacity === 'function') {
    const baseOpacity = typeof layer._deleteBackupOpacity === 'number' ? layer._deleteBackupOpacity : 1;
    layer.setOpacity(baseOpacity);
  } else if (layer.getElement && layer.getElement()) {
    const elem = layer.getElement();
    if (elem) {
      elem.style.filter = layer._deleteBackupFilter || '';
    }
  }
  layer._markedForDeletion = false;
}

function toggleGenericLayerDeletion(layer, pendingList, parentLayer) {
  if (!layer || !Array.isArray(pendingList)) return;
  if (layer._markedForDeletion) {
    restoreGenericDeletionStyle(layer);
    removeFromPendingList(pendingList, layer);
  } else {
    applyGenericDeletionStyle(layer);
    const exists = pendingList.some(item => item.layer === layer);
    if (!exists) {
      pendingList.push({ layer, parentLayer: parentLayer || null });
    }
  }
  updateDeleteModeButtonsState();
}

function clearPendingDeletionSelections() {
  const pendingPipelines = [...pendingPipelineDeletions];
  pendingPipelines.forEach(item => {
    if (item && item.layer) {
      unmarkPipelineLayerForDeletion(item.layer);
    }
  });
  const pendingNodes = [...pendingNodeDeletions];
  pendingNodes.forEach(item => {
    if (!item || !item.layer) return;
    if (item.layer._markedForDeletion) {
      restoreMarkerDeletionStyle(item.layer);
    }
    removeFromPendingList(pendingNodeDeletions, item.layer);
  });
  const pendingCompressors = [...pendingCompressorDeletions];
  pendingCompressors.forEach(item => {
    if (!item || !item.layer) return;
    if (item.layer._markedForDeletion) {
      restoreMarkerDeletionStyle(item.layer);
    }
    removeFromPendingList(pendingCompressorDeletions, item.layer);
  });
  const pendingStorages = [...pendingStorageDeletions];
  pendingStorages.forEach(item => {
    if (!item || !item.layer) return;
    if (item.layer._markedForDeletion) {
      restoreMarkerDeletionStyle(item.layer);
    }
    removeFromPendingList(pendingStorageDeletions, item.layer);
  });
  const pendingLNGs = [...pendingLNGDeletions];
  pendingLNGs.forEach(item => {
    if (!item || !item.layer) return;
    if (item.layer._markedForDeletion) {
      restoreMarkerDeletionStyle(item.layer);
    }
    removeFromPendingList(pendingLNGDeletions, item.layer);
  });
  const pendingPowerplants = [...pendingPowerplantDeletions];
  pendingPowerplants.forEach(item => {
    if (!item || !item.layer) return;
    if (item.layer._markedForDeletion) {
      restoreMarkerDeletionStyle(item.layer);
    }
    removeFromPendingList(pendingPowerplantDeletions, item.layer);
  });
  const pendingCustom = [...pendingCustomDeletions];
  pendingCustom.forEach(item => {
    if (!item || !item.layer) return;
    if (item.layer._markedForDeletion) {
      restoreGenericDeletionStyle(item.layer);
    }
    removeFromPendingList(pendingCustomDeletions, item.layer);
  });
  const pendingDrawn = [...pendingDrawnItemDeletions];
  pendingDrawn.forEach(item => {
    if (!item || !item.layer) return;
    if (item.layer._markedForDeletion) {
      restoreGenericDeletionStyle(item.layer);
    }
    removeFromPendingList(pendingDrawnItemDeletions, item.layer);
  });
  updateDeleteModeButtonsState();
}

function activateDeleteMode() {
  try {
    // Erst alle Modi deaktivieren (ohne Button-Highlighting)
    if (window.polylineDrawer && window.polylineDrawer._enabled) window.polylineDrawer.disable();
    if (window.markerDrawer && window.markerDrawer._enabled) window.markerDrawer.disable();
    map.closePopup();
    if (editingLayer && editingLayer.editing) {
      editingLayer.editing.disable();
      editingLayer = null;
    }
    
    // Alle Pipeline-Highlights zurücksetzen
    resetAllPipelineHighlights();
    
    // SPEICHERE DEN AKTUELLEN ZUSTAND VOR DELETE MODE
    console.log('Speichere aktuellen Karten-Zustand vor Delete Mode');
    deleteModeBackup = {
      pipelines: pipelineLayer ? getLayerFeatures(pipelineLayer) : [],
      nodes: nodeLayer ? getLayerFeatures(nodeLayer) : [],
      powerplants: powerplantsLayer ? getLayerFeatures(powerplantsLayer) : [],
      compressors: compressorsLayer ? getLayerFeatures(compressorsLayer) : [],
      lngs: lngLayer ? getLayerFeatures(lngLayer) : [],
      storages: storageLayer ? getLayerFeatures(storageLayer) : []
    };
    deletedCustomElements = [];
    pendingPipelineDeletions.length = 0;
    pendingNodeDeletions.length = 0;
    pendingCompressorDeletions.length = 0;
    pendingStorageDeletions.length = 0;
    pendingLNGDeletions.length = 0;
    pendingPowerplantDeletions.length = 0;
    pendingCustomDeletions.length = 0;
    pendingDrawnItemDeletions.length = 0;
    console.log('Backup erstellt:', {
      pipelines: deleteModeBackup.pipelines.length,
      nodes: deleteModeBackup.nodes.length,
      powerplants: deleteModeBackup.powerplants.length,
      compressors: deleteModeBackup.compressors.length,
      lngs: deleteModeBackup.lngs.length,
      storages: deleteModeBackup.storages.length
    });
    
    currentMode = 'delete';
    updateActiveToolDisplay('delete');
    console.log('Delete Mode aktiviert');
    updateDeleteModeButtonsState();
    
    // Setup delete handlers for pipeline layers
    [pipelineLayer, shortPipeLayer].forEach(elementLayer => {
      if (elementLayer) {
        elementLayer.eachLayer(layer => {
          layer.off('click');
          layer.unbindPopup();
          layer.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            try {
              togglePipelineDeletion(layer, elementLayer);
            } catch (error) {
              console.error('Error in pipeline deletion toggle:', error);
            }
          });
        });
      }
    });
    
    // Setup delete handlers for node layers (CircleMarkers)
    forEachNodeMarker(marker => {
      marker.off('click');
      marker.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        try {
          const owningLayer = findOwningLayerGroup(marker) || marker._parentNodeLayer || resolveNodeLayer();
          togglePointDeletion(marker, pendingNodeDeletions, owningLayer);
        } catch (error) {
          console.error('Error in node deletion toggle:', error);
        }
      });
    });
    
    // Setup delete handlers for infrastructure layers
    [powerplantsLayer, compressorsLayer, lngLayer, storageLayer].forEach(elementLayer => {
      if (elementLayer) {
        let pendingList = pendingPowerplantDeletions;
        if (elementLayer === compressorsLayer) {
          pendingList = pendingCompressorDeletions;
        } else if (elementLayer === lngLayer) {
          pendingList = pendingLNGDeletions;
        } else if (elementLayer === storageLayer) {
          pendingList = pendingStorageDeletions;
        }
        elementLayer.eachLayer(layer => {
          layer.off();
          layer.unbindPopup();
          layer.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            try {
              togglePointDeletion(layer, pendingList, elementLayer);
            } catch (error) {
              console.error('Error in infrastructure deletion toggle:', error);
            }
          });
        });
      }
    });
    
    // Setup delete handlers for custom layers
    if (window.customLayers) {
      Object.values(window.customLayers).forEach(customLayer => {
        if (customLayer) {
          customLayer.eachLayer(layer => {
            layer.off();
            layer.unbindPopup();
            layer.on('click', function (e) {
              L.DomEvent.stopPropagation(e);
              try {
                toggleGenericLayerDeletion(layer, pendingCustomDeletions, customLayer);
              } catch (error) {
                console.error('Error in custom layer deletion toggle:', error);
              }
            });
          });
        }
      });
    }
    
    // Drawn Items Delete-Interaktionen
    drawnItems.eachLayer(layer => {
      layer.off('click');
      layer.unbindPopup();
      layer.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        try {
          toggleGenericLayerDeletion(layer, pendingDrawnItemDeletions, drawnItems);
        } catch (error) {
          console.error('Error toggling drawn item deletion:', error);
        }
      });
    });
  } catch (error) {
    console.error('Error in activateDeleteMode:', error);
  }
}

