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
 * - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - User selections (click or box selection).
 * - Layer registries and deletion identity tracker.
 *
 * Public API:
 * - activateDeleteMode(): Enter delete workflow.
 * - finalizeDeletion(): Confirm and apply deletions.
 * 
 * ================================================================================
 */

/**
 * Show the save/confirm delete button in the UI.
 * Creates a button that executes batch deletion of all marked elements.
 * @internal
 */
function showSaveDeleteButton() {
    /* Avoid creating duplicate delete buttons. */
    if (document.getElementById('save-delete-btn')) return;

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
          if (item.layer.feature) {
            deletedCustomElements.push(item.layer.feature);
            const elementType = (typeof determineElementType === 'function') ? determineElementType(item.layer) : null;
            recordDeletedFeatureIdentity(item.layer.feature, elementType);
            if (elementType) {
              removeFeatureFromElementLayers(item.layer.feature, elementType, item.layer);
            }
            removeFeatureFromAllMapLayers(item.layer.feature);
          } else {
            deletedCustomElements.push({ type: 'CustomElement' });
          }
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
            const elementType = (typeof determineElementType === 'function') ? determineElementType(item.layer) : null;
            recordDeletedFeatureIdentity(item.layer.feature, elementType);
            if (elementType) {
              removeFeatureFromElementLayers(item.layer.feature, elementType, item.layer);
            }
            removeFeatureFromAllMapLayers(item.layer.feature);
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
      /* Return to Info mode after deletion. */
      deactivateAllModes();
      activateInfoMode();
    };

    const toolsSection = document.getElementById('tools-section');
    toolsSection.appendChild(btn);
    updateDeleteModeButtonsState();
  }

  /* Discard button for Delete mode. */
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
        
        /* Remove action buttons. */
        const discardBtn = document.getElementById('discard-delete-btn');
        const saveBtn = document.getElementById('save-delete-btn');
        if (discardBtn) discardBtn.remove();
        if (saveBtn) saveBtn.remove();
        
        /* Switch back to Info mode and restore click handlers. */
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

const deleteBoxSelectionState = {
  enabled: false,
  active: false,
  moved: false,
  startLatLng: null,
  startPoint: null,
  rect: null,
  draggingWasEnabled: false
};

function enableDeleteBoxSelection() {
  if (!map || deleteBoxSelectionState.enabled) return;
  deleteBoxSelectionState.enabled = true;
  map.on('mousedown', handleDeleteBoxMouseDown);
}

function cleanupDeleteBoxSelection() {
  if (!map) return;
  map.off('mousedown', handleDeleteBoxMouseDown);
  map.off('mousemove', handleDeleteBoxMouseMove);
  map.off('mouseup', handleDeleteBoxMouseUp);
  if (deleteBoxSelectionState.rect) {
    map.removeLayer(deleteBoxSelectionState.rect);
    deleteBoxSelectionState.rect = null;
  }
  if (deleteBoxSelectionState.draggingWasEnabled && map.dragging && !map.dragging.enabled()) {
    map.dragging.enable();
  }
  deleteBoxSelectionState.enabled = false;
  deleteBoxSelectionState.active = false;
  deleteBoxSelectionState.moved = false;
  deleteBoxSelectionState.startLatLng = null;
  deleteBoxSelectionState.startPoint = null;
  deleteBoxSelectionState.draggingWasEnabled = false;
}

function handleDeleteBoxMouseDown(e) {
  if (currentMode !== 'delete') return;
  if (!e || !e.originalEvent || e.originalEvent.button !== 0) return;

  deleteBoxSelectionState.active = true;
  deleteBoxSelectionState.moved = false;
  deleteBoxSelectionState.startLatLng = e.latlng;
  deleteBoxSelectionState.startPoint = e.containerPoint;
  deleteBoxSelectionState.draggingWasEnabled = map.dragging && map.dragging.enabled();

  if (deleteBoxSelectionState.draggingWasEnabled && map.dragging) {
    map.dragging.disable();
  }

  if (deleteBoxSelectionState.rect) {
    map.removeLayer(deleteBoxSelectionState.rect);
  }
  deleteBoxSelectionState.rect = L.rectangle(
    L.latLngBounds(e.latlng, e.latlng),
    { color: '#dc3545', weight: 1, dashArray: '4 4', fillOpacity: 0.08, interactive: false }
  ).addTo(map);

  map.on('mousemove', handleDeleteBoxMouseMove);
  map.on('mouseup', handleDeleteBoxMouseUp);
}

function handleDeleteBoxMouseMove(e) {
  if (!deleteBoxSelectionState.active || !deleteBoxSelectionState.rect) return;
  const bounds = L.latLngBounds(deleteBoxSelectionState.startLatLng, e.latlng);
  deleteBoxSelectionState.rect.setBounds(bounds);

  const deltaX = Math.abs(e.containerPoint.x - deleteBoxSelectionState.startPoint.x);
  const deltaY = Math.abs(e.containerPoint.y - deleteBoxSelectionState.startPoint.y);
  if (deltaX > 4 || deltaY > 4) {
    deleteBoxSelectionState.moved = true;
  }
}

function handleDeleteBoxMouseUp(e) {
  if (!deleteBoxSelectionState.active) return;

  map.off('mousemove', handleDeleteBoxMouseMove);
  map.off('mouseup', handleDeleteBoxMouseUp);

  if (deleteBoxSelectionState.rect) {
    map.removeLayer(deleteBoxSelectionState.rect);
    deleteBoxSelectionState.rect = null;
  }

  if (deleteBoxSelectionState.draggingWasEnabled && map.dragging) {
    map.dragging.enable();
  }

  const moved = deleteBoxSelectionState.moved;
  const startLatLng = deleteBoxSelectionState.startLatLng;
  const startPoint = deleteBoxSelectionState.startPoint;
  deleteBoxSelectionState.active = false;
  deleteBoxSelectionState.moved = false;
  deleteBoxSelectionState.startLatLng = null;
  deleteBoxSelectionState.startPoint = null;

  if (!moved || !startLatLng || !e?.latlng || !startPoint) return;

  const bounds = L.latLngBounds(startLatLng, e.latlng);
  const endPoint = e.containerPoint;
  const rectPixels = {
    minX: Math.min(startPoint.x, endPoint.x),
    maxX: Math.max(startPoint.x, endPoint.x),
    minY: Math.min(startPoint.y, endPoint.y),
    maxY: Math.max(startPoint.y, endPoint.y)
  };

  selectLayersInDeleteBounds(bounds, rectPixels);
  updateDeleteModeButtonsState();
  L.DomEvent.stop(e);
}

function selectLayersInDeleteBounds(bounds, rectPixels) {
  if (!bounds) return;

  [pipelineLayer, shortPipeLayer].forEach(elementLayer => {
    if (!elementLayer) return;
    elementLayer.eachLayer(layer => {
      if (!layer || layer._markedForDeletion) return;
      if (polylineIntersectsDeleteBox(layer, bounds, rectPixels)) {
        markPipelineLayerForDeletion(layer, elementLayer);
      }
    });
  });

  forEachNodeMarker(marker => {
    if (!marker || marker._markedForDeletion) return;
    if (bounds.contains(marker.getLatLng())) {
      const owningLayer = findOwningLayerGroup(marker) || marker._parentNodeLayer || resolveNodeLayer();
      markPointForDeletion(marker, pendingNodeDeletions, owningLayer);
    }
  });

  [powerplantsLayer, compressorsLayer, lngLayer, storageLayer].forEach(elementLayer => {
    if (!elementLayer) return;
    let pendingList = pendingPowerplantDeletions;
    if (elementLayer === compressorsLayer) {
      pendingList = pendingCompressorDeletions;
    } else if (elementLayer === lngLayer) {
      pendingList = pendingLNGDeletions;
    } else if (elementLayer === storageLayer) {
      pendingList = pendingStorageDeletions;
    }
    elementLayer.eachLayer(layer => {
      if (!layer || layer._markedForDeletion) return;
      if (layer.getLatLng && bounds.contains(layer.getLatLng())) {
        markPointForDeletion(layer, pendingList, elementLayer);
      }
    });
  });

  if (window.customLayers) {
    Object.values(window.customLayers).forEach(customLayer => {
      if (!customLayer) return;
      customLayer.eachLayer(layer => {
        if (!layer || layer._markedForDeletion) return;
        if (layer.getLatLng && bounds.contains(layer.getLatLng())) {
          markGenericLayerForDeletion(layer, pendingCustomDeletions, customLayer);
        } else if (layer.getBounds && layer.getBounds().intersects(bounds)) {
          markGenericLayerForDeletion(layer, pendingCustomDeletions, customLayer);
        }
      });
    });
  }

  if (drawnItems) {
    drawnItems.eachLayer(layer => {
      if (!layer || layer._markedForDeletion) return;
      if (layer.getLatLng && bounds.contains(layer.getLatLng())) {
        markGenericLayerForDeletion(layer, pendingDrawnItemDeletions, drawnItems);
      } else if (layer.getBounds && layer.getBounds().intersects(bounds)) {
        markGenericLayerForDeletion(layer, pendingDrawnItemDeletions, drawnItems);
      }
    });
  }

  getExtraDeletableLayerGroups().forEach(extraLayer => {
    extraLayer.eachLayer(layer => {
      if (!layer || layer._markedForDeletion) return;
      if (layer.getLatLng && bounds.contains(layer.getLatLng())) {
        markGenericLayerForDeletion(layer, pendingCustomDeletions, extraLayer);
      } else if (layer.getBounds && layer.getBounds().intersects(bounds)) {
        markGenericLayerForDeletion(layer, pendingCustomDeletions, extraLayer);
      } else if (polylineIntersectsDeleteBox(layer, bounds, rectPixels)) {
        markGenericLayerForDeletion(layer, pendingCustomDeletions, extraLayer);
      }
    });
  });
}

function getExtraDeletableLayerGroups() {
  if (!Array.isArray(layerConfig)) return [];
  const excluded = new Set([
    pipelineLayer,
    shortPipeLayer,
    nodeLayer,
    powerplantsLayer,
    compressorsLayer,
    lngLayer,
    storageLayer,
    drawnItems
  ]);
  if (typeof getAllNodeLayers === 'function') {
    getAllNodeLayers().forEach(layer => excluded.add(layer));
  }
  if (window.customLayers) {
    Object.values(window.customLayers).forEach(layer => excluded.add(layer));
  }

  const extras = new Set();
  layerConfig.forEach(config => {
    if (!config || !config.filename) return;
    const layerName = config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
    const layer = dynamicLayers ? dynamicLayers[layerName] : null;
    if (!layer || excluded.has(layer)) return;
    extras.add(layer);
  });
  return Array.from(extras);
}

function markPointForDeletion(marker, pendingList, parentLayer) {
  if (!marker || !Array.isArray(pendingList) || marker._markedForDeletion) return;
  applyMarkerDeletionStyle(marker);
  const exists = pendingList.some(item => item.layer === marker);
  if (!exists) {
    pendingList.push({ layer: marker, parentLayer: parentLayer || null, feature: marker.feature });
  }
}

function markGenericLayerForDeletion(layer, pendingList, parentLayer) {
  if (!layer || !Array.isArray(pendingList) || layer._markedForDeletion) return;
  applyGenericDeletionStyle(layer);
  const exists = pendingList.some(item => item.layer === layer);
  if (!exists) {
    pendingList.push({ layer, parentLayer: parentLayer || null });
  }
}

function polylineIntersectsDeleteBox(layer, bounds, rectPixels) {
  if (!layer || !layer.getLatLngs) return false;
  const latlngs = flattenLatLngs(layer.getLatLngs());
  if (!latlngs.length) return false;

  const startLatLng = latlngs[0];
  const endLatLng = latlngs[latlngs.length - 1];
  if (bounds.contains(startLatLng) || bounds.contains(endLatLng)) return true;

  for (let i = 0; i < latlngs.length; i += 1) {
    if (bounds.contains(latlngs[i])) return true;
  }

  if (!rectPixels) return false;
  for (let i = 1; i < latlngs.length; i += 1) {
    const p1 = map.latLngToContainerPoint(latlngs[i - 1]);
    const p2 = map.latLngToContainerPoint(latlngs[i]);
    if (segmentIntersectsRect(p1, p2, rectPixels)) return true;
  }

  return false;
}

function flattenLatLngs(latlngs) {
  if (!Array.isArray(latlngs)) return [];
  if (!Array.isArray(latlngs[0])) return latlngs;
  return latlngs.flatMap(item => flattenLatLngs(item));
}

function segmentIntersectsRect(p1, p2, rect) {
  if (!p1 || !p2 || !rect) return false;
  if (pointInsideRect(p1, rect) || pointInsideRect(p2, rect)) return true;

  const topLeft = { x: rect.minX, y: rect.minY };
  const topRight = { x: rect.maxX, y: rect.minY };
  const bottomRight = { x: rect.maxX, y: rect.maxY };
  const bottomLeft = { x: rect.minX, y: rect.maxY };

  return (
    segmentsIntersect(p1, p2, topLeft, topRight) ||
    segmentsIntersect(p1, p2, topRight, bottomRight) ||
    segmentsIntersect(p1, p2, bottomRight, bottomLeft) ||
    segmentsIntersect(p1, p2, bottomLeft, topLeft)
  );
}

function pointInsideRect(point, rect) {
  return (
    point.x >= rect.minX &&
    point.x <= rect.maxX &&
    point.y >= rect.minY &&
    point.y <= rect.maxY
  );
}

function segmentsIntersect(p1, p2, p3, p4) {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  return false;
}

function orientation(p, q, r) {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (val === 0) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p, q, r) {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
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

/**
 * Clear all pending deletion selections without committing any deletions.
 *
 * Iterates every pending-deletion list (pipelines, nodes, compressors,
 * storages, LNG terminals, power-plants, custom elements, drawn items) and
 * restores the original visual style of each marked element. All pending
 * lists are emptied and the toolbar button state is refreshed. Useful for
 * resetting the selection before exiting delete mode.
 *
 * @returns {void}
 */
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

/**
 * Activate the element deletion mode.
 *
 * Disables any active drawing tools, captures a snapshot of the current
 * map state for undo support, and attaches click handlers to every
 * deletable element (pipelines, nodes, compressors, storages, LNG
 * terminals, power-plants, custom layers). Clicking an element marks it
 * for deletion (visual cue: red overlay) without immediately removing it.
 * A Save/Discard toolbar strip is shown; confirming commits all pending
 * deletions to the soft-delete registry.
 *
 * @returns {void}
 */
function activateDeleteMode() {
  try {
    /* Disable all modes without button highlighting. */
    if (window.polylineDrawer && window.polylineDrawer._enabled) window.polylineDrawer.disable();
    if (window.markerDrawer && window.markerDrawer._enabled) window.markerDrawer.disable();
    map.closePopup();
    if (editingLayer && editingLayer.editing) {
      editingLayer.editing.disable();
      editingLayer = null;
    }
    
    /* Reset pipeline highlights. */
    resetAllPipelineHighlights();
    
    /* Capture state before entering delete mode. */
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
    
    /* Setup delete handlers for pipeline layers. */
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
    
    /* Setup delete handlers for node layers (CircleMarkers). */
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
    
    /* Setup delete handlers for infrastructure layers. */
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
    
    /* Setup delete handlers for custom layers. */
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

    /* Setup delete handlers for remaining layerConfig-based layers. */
    getExtraDeletableLayerGroups().forEach(extraLayer => {
      if (!extraLayer) return;
      extraLayer.eachLayer(layer => {
        layer.off();
        layer.unbindPopup();
        layer.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          try {
            toggleGenericLayerDeletion(layer, pendingCustomDeletions, extraLayer);
          } catch (error) {
            console.error('Error in extra layer deletion toggle:', error);
          }
        });
      });
    });
    
    /* Drawn-items delete interactions. */
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

    enableDeleteBoxSelection();
  } catch (error) {
    console.error('Error in activateDeleteMode:', error);
  }
}

