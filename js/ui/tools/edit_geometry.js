/**
 * ================================================================================
 * QGas - Edit Geometry Tool
 * ================================================================================
 * 
 * Provides interactive geometry editing capabilities for infrastructure elements.
 * Allows users to modify positions of nodes and reshape pipeline routes.
 * 
 * Key Features:
 * - Node position editing with drag-and-drop
 * - Pipeline route editing (vertex manipulation)
 * - Endpoint locking to preserve connections
 * - Visual feedback during editing
 * - Split node support with offset tracking
 * - Save and discard actions
 * - Automatic geometry updates
 * - Contributor tracking
 * 
 * Editing Modes:
 * - Node Editing: Drag nodes to new positions
 * - Pipeline Editing: Add, move, and remove vertices
 * - Locked Endpoints: Pipeline start/end points remain connected to nodes
 * 
 * Technical Details:
 * - Uses Leaflet.Editable for geometry manipulation
 * - Tracks original geometry for discard functionality
 * - Updates all connected elements when nodes move
 * - Maintains split node offsets during zoom/pan
 * - Prevents simultaneous editing of multiple elements
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin
 * - Institution: Institute of Electricity Economics and Energy Innovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Map interactions for geometry edits.
 * - Target layers for nodes and pipelines.
 *
 * Public API:
 * - activateEditMode(): Enter geometry editing mode.
 * - updateAllElementInteractions(): Refresh info handlers.
 * 
 * ================================================================================
 */

/**
 * Activate edit mode for existing drawn items
 * Binds click handlers to enable editing on selected features
 */
function activateEditModeForExisting() {
  drawnItems.eachLayer(layer => {
    if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === "LineString") {
      /* Ensure only one layer is edited at a time. */
      layer.on('click', function () {
        if (window.editingLayer && window.editingLayer !== layer) {
          window.editingLayer.editing.disable();
          const btn = document.getElementById('save-edit-btn');
          if (btn) btn.remove();
        }
        window.editingLayer = layer;
        if (layer.editing) {
          layer.editing.enable();
          restorePipelineEditStyle(layer);
          bindPipelineEditStyleHandlers(layer);
          /* Lock pipeline endpoints to preserve connections. */
          lockPipelineEndpoints(layer);
          showSaveButton(layer);
          showDiscardButton(layer);
        }
      });
    }
  });
}

/* Initialize Info mode after map load. */
currentMode = 'info';
resetNodeClicks();
function updateSplitNodeOffsets() {
  forEachNodeMarker(marker => {
    if (marker._splitOffset) {
      const map = marker._map;
      if (!map) return;
      const latlng = L.latLng(marker.feature.geometry.coordinates[1], marker.feature.geometry.coordinates[0]);
      const basePoint = map.latLngToLayerPoint(latlng);
      const offset = marker._splitOffset;
      const newPoint = L.point(basePoint.x + offset.x, basePoint.y + offset.y);
      const newLatLng = map.layerPointToLatLng(newPoint);
      marker.setLatLng(newLatLng);
      /* Configure pointer events while split-node mode is active. */
      if (splitNodeActive && marker._path) {
        marker._path.style.pointerEvents = 'none';
      } else if (marker._path) {
        marker._path.style.pointerEvents = '';
      }
    }
  });
}
map.on('zoomend moveend', updateSplitNodeOffsets);

/*
 * Mode system with simplified error handling.
 */
function activateInfoMode(force = false) {
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
}


function updateAllElementInteractions() {
  try {
    const handledLayers = new Set();
    const nodeLayerSet = new Set(getAllNodeLayers());
    const staticLayers = [powerplantsLayer, compressorsLayer, lngLayer, storageLayer, consumptionLayer, borderpointsLayer, demandsLayer, productionsLayer, hydrogenPipeLayer, electrolyzersLayer].filter(Boolean);
    const layersToHandle = [...nodeLayerSet.values(), ...staticLayers];

    layersToHandle.forEach(elementLayer => {
      if (!elementLayer || handledLayers.has(elementLayer) || typeof elementLayer.eachLayer !== 'function') {
        return;
      }
      handledLayers.add(elementLayer);
      elementLayer.eachLayer(layer => {
        if (layer instanceof L.LayerGroup) {
          return;
        }

        layer.off('click');
        layer.unbindPopup();
        if (currentMode === 'info' && layer.feature && layer.feature.properties) {
          layer.on('click', function (e) {
            if (currentMode !== 'info') {
              return;
            }

            let elementType = 'Element';
            if (nodeLayerSet.has(elementLayer)) {
              elementType = 'Node';
            } else if (elementLayer === powerplantsLayer) {
              elementType = 'Power plant';
            } else if (elementLayer === compressorsLayer) {
              elementType = 'Compressor';
            } else if (elementLayer === lngLayer) {
              elementType = 'LNG Terminal';
            } else if (elementLayer === storageLayer) {
              elementType = 'Storage';
            } else if (elementLayer === consumptionLayer) {
              elementType = 'Consumption Point';
            }

            if (elementType === 'Element' && layer.feature.properties.ID) {
              if (layer.feature.properties.ID.includes('_N_')) elementType = 'Node';
              else if (layer.feature.properties.ID.includes('_P_')) elementType = 'Power plant';
              else if (layer.feature.properties.ID.includes('_L_')) elementType = 'LNG Terminal';
              else if (layer.feature.properties.ID.includes('_S_')) elementType = 'Storage';
            }

            highlightElement(layer);

            let content, title;
            if (elementLayer === consumptionLayer) {
              content = createConsumptionModalPopupContent(layer.feature.properties, layer);
              title = `${elementType}: ${layer.feature.properties.NUTS_ID || layer.feature.properties.NUTS3_ID || layer.feature.properties.NUTS_CODE || 'Unnamed'}`;
            } else {
              content = createModalPopupContent(layer.feature.properties, layer);
              title = `${elementType}: ${layer.feature.properties.ID || layer.feature.properties.Name || 'Unnamed'}`;
            }
            showElementModal(title, content, layer);

            setTimeout(() => rebindModalAttributeControls(layer), 100);
          });
        }
      });
    });

    attachInfoHandlersForAdditionalPointLayers(handledLayers);
  } catch (error) {
    console.error('Error in updateAllElementInteractions:', error);
  }
}

/* Activate pipeline route edit mode. */
function activatePipelineRouteEdit() {
  currentMode = 'edit-pipeline-route';

  const bindRouteEditHandler = (layer) => {
    if (!layer) return;
    layer.off('click');
    if (typeof layer.unbindPopup === 'function') {
      layer.unbindPopup();
    }
    layer.on('click', function () {
      try {
        if (window.editingLayer && window.editingLayer !== layer) {
          releasePipelineEndpointLocks(window.editingLayer);
          if (window.editingLayer.editing) {
            window.editingLayer.editing.disable();
          }
          const btn = document.getElementById('save-edit-btn');
          if (btn) btn.remove();
        }
        window.editingLayer = layer;
        if (layer.editing) {
          captureLayerEditSnapshot(layer);
          refreshEditableLayerCache(layer);
          layer.editing.enable();
          restorePipelineEditStyle(layer);
          bindPipelineEditStyleHandlers(layer);
          lockPipelineEndpoints(layer);
          showSaveButton(layer);
          showDiscardButton(layer);
        }
      } catch (error) {
        console.error('Error in pipeline edit click:', error);
      }
    });
  };

  const lineGroups = getLineLayerGroupsForDirectionMode();
  if (!lineGroups.length) {
    showCustomPopup(
      '✏️ Change Pipeline Route',
      '<p style="text-align: center; margin: 15px 0;">No line layers are available for editing.</p>',
      [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => {} }]
    );
    return;
  }

  lineGroups.forEach(group => {
    forEachPolylineFeature(group, polyline => bindRouteEditHandler(polyline));
  });

  showCustomPopup(
    '✏️ Change Pipeline Route',
    '<p style="text-align: center; margin: 15px 0;"><strong>How to use:</strong><br>1. Click on a pipeline to select it<br>2. Drag the support points (white circles) to change the route<br>3. Click "Save Changes" when done</p>',
    [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
  );
}

/* Activate node-position edit mode. */
function isNodeLayerCandidate(layer, layerName = '') {
    if (!layer) return false;
  if (layer._customLayerSettings) {
    if (layer._customLayerSettings.typeKey === 'Node') return true;
    if (layer._customLayerSettings.isNodeLayer) return true;
    if (layer._customLayerSettings.elementKey === 'nodes') return true;
  }
    const metadata = resolveLayerMetadata(layer) || (layerName && layerMetadataRegistry ? layerMetadataRegistry[layerName] : null);
    if (metadata) {
      if (metadata.elementKey === 'nodes') return true;
      if (metadata.isNodeLayer) return true;
      if ((metadata.typeHint || '').toLowerCase() === 'node') return true;
      if ((metadata.legendName || '').toLowerCase().includes('node')) return true;
    }
    if (layerName && layerName.toLowerCase().includes('node')) {
      return true;
    }
    let containsNodeFeatures = false;
    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(candidate => {
        if (containsNodeFeatures || !candidate || !candidate.feature || !candidate.feature.properties) return;
        const props = candidate.feature.properties;
        const typeValue = String(props.Type || '').toLowerCase();
        if (typeValue.includes('node')) {
          containsNodeFeatures = true;
        }
      });
    }
    return containsNodeFeatures;
  }

  function getNodeLayerEntries() {
    const entries = [];
    const seen = new Set();
    const registerEntry = (layer, key, metadata) => {
      if (!layer || seen.has(layer)) return;
      seen.add(layer);
      entries.push({
        id: key || `node-${entries.length}`,
        layer,
        name: (metadata?.legendName || key || 'Nodes'),
        metadata: metadata || null
      });
    };

    if (nodeLayer) {
      registerEntry(nodeLayer, 'core:nodes', resolveLayerMetadata(nodeLayer));
    }

    if (dynamicLayers && typeof dynamicLayers === 'object') {
      Object.entries(dynamicLayers).forEach(([layerName, layer]) => {
        if (!layer) return;
        if (isNodeLayerCandidate(layer, layerName)) {
          registerEntry(layer, layerName, resolveLayerMetadata(layer));
        }
      });
    }

    if (window.customLayers && typeof window.customLayers === 'object') {
      Object.entries(window.customLayers).forEach(([name, rawValue]) => {
        const layer = rawValue?.layer || rawValue;
        if (!layer) return;
        if (isNodeLayerCandidate(layer, name)) {
          registerEntry(layer, name, resolveLayerMetadata(layer) || { legendName: name });
        }
      });
    }

    return entries;
  }

  function getAllNodeLayers() {
    return getNodeLayerEntries().map(entry => entry.layer);
  }

  function getActivePipelineNodeLayer() {
    const selectedEntry = window.selectedNodeLayerForPipeline;
    if (selectedEntry && selectedEntry.layer) {
      return selectedEntry.layer;
    }
    const entries = getNodeLayerEntries();
    if (entries.length) {
      return entries[0].layer;
    }
    return resolveNodeLayer({ createIfMissing: true });
  }

  function findNodeLayerForNodeId(nodeId) {
    if (!nodeId) return null;
    const layers = getAllNodeLayers();
    for (const layerGroup of layers) {
      if (!layerGroup || typeof layerGroup.eachLayer !== 'function') continue;
      let found = null;
      layerGroup.eachLayer(marker => {
        if (found || !marker || !marker.feature || !marker.feature.properties) return;
        if (marker.feature.properties.ID === nodeId) {
          found = layerGroup;
        }
      });
      if (found) {
        return found;
      }
    }
    return null;
  }

  function getAllInlineLayers() {
    const layers = [];
    Object.values(dynamicLayers).forEach(layer => {
      if (!layer) return;
      const meta = resolveLayerMetadata(layer) || layer._customLayerSettings;
      if (meta && meta.geometryClass === 'inline') {
        layers.push(layer);
      }
    });
    return layers;
  }

  function linkInlineElementsToNearbyNodes(toleranceMeters = 50) {
    if (!map) return;
    const inlineLayers = getAllInlineLayers();
    const nodeLayers = getAllNodeLayers();
    if (!inlineLayers.length || !nodeLayers.length) return;

    const nodeIndex = [];
    nodeLayers.forEach(layerGroup => {
      if (!layerGroup) return;
      layerGroup.eachLayer(marker => {
        const id = marker.feature?.properties?.ID;
        const ll = marker.getLatLng?.();
        if (!id || !ll) return;
        nodeIndex.push({ id, latlng: ll });
      });
    });

    const findClosestNodes = (latlng) => {
      if (!latlng) return [];
      return nodeIndex
        .map(entry => ({
          id: entry.id,
          dist: map.distance(latlng, entry.latlng)
        }))
        .filter(n => n.dist <= toleranceMeters)
        .sort((a, b) => a.dist - b.dist);
    };

    inlineLayers.forEach(layerGroup => {
      layerGroup.eachLayer(marker => {
        const props = marker.feature?.properties || {};
        if (props.Start_Node || props.End_Node || props.Node) return;
        const latlng = marker.getLatLng?.();
        const nearby = findClosestNodes(latlng);
        if (nearby.length >= 2) {
          props.Start_Node = nearby[0].id;
          props.End_Node = nearby[1].id;
          props.Node = '';
        } else if (nearby.length === 1) {
          props.Node = nearby[0].id;
          props.Start_Node = '';
          props.End_Node = '';
        }
      });
    });
  }

  function setInlineEditingElevation(enabled) {
    getAllInlineLayers().forEach(layerGroup => {
      if (!layerGroup) return;
      layerGroup.eachLayer(marker => {
        if (!marker || !marker._icon) return;
        if (enabled) {
          if (marker._inlinePrevZ === undefined) {
            marker._inlinePrevZ = marker.options?.zIndexOffset;
          }
          marker.setZIndexOffset(1000);
          if (typeof marker.bringToFront === 'function') {
            marker.bringToFront();
          }
        } else {
          if (marker._inlinePrevZ !== undefined) {
            marker.setZIndexOffset(marker._inlinePrevZ);
            marker._inlinePrevZ = undefined;
          }
        }
      });
    });
  }

  function collectNodePositionSnapshots(nodeIds) {
    const idList = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    const idSet = new Set(idList.filter(Boolean));
    const snapshots = [];
    getAllNodeLayers().forEach(layerGroup => {
      if (!layerGroup) return;
      layerGroup.eachLayer(marker => {
        const markerId = marker.feature?.properties?.ID;
        if (markerId && idSet.has(markerId)) {
          const latlng = marker.getLatLng();
          snapshots.push({
            marker,
            markerId,
            originalLatLng: latlng ? { lat: latlng.lat, lng: latlng.lng } : null,
            originalGeometry: marker.feature?.geometry ? JSON.parse(JSON.stringify(marker.feature.geometry)) : null
          });
        }
      });
    });
    return snapshots;
  }

  function initializeNodePositionEditBuffer() {
    nodePositionEditBuffer = {
      nodeSnapshots: new Map(),
      pipelineSnapshots: new Map(),
      dirtyNodeKeys: new Set(),
      dirtyPipelineKeys: new Set()
    };
  }

  function ensureNodePositionEditBuffer() {
    if (!nodePositionEditBuffer) {
      initializeNodePositionEditBuffer();
    }
    return nodePositionEditBuffer;
  }

  function getNodeSnapshotKey(marker, markerId) {
    if (markerId) {
      return `node-${markerId}`;
    }
    if (marker && typeof L !== 'undefined' && typeof L.stamp === 'function') {
      return `marker-${L.stamp(marker)}`;
    }
    return `marker-${Math.random().toString(36).slice(2)}`;
  }

  function rememberNodePositionSnapshots(entries = []) {
    if (!Array.isArray(entries) || !entries.length) return;
    ensureNodePositionEditBuffer();
    entries.forEach(entry => {
      if (!entry || !entry.marker) return;
      const key = getNodeSnapshotKey(entry.marker, entry.markerId);
      if (!nodePositionEditBuffer.nodeSnapshots.has(key)) {
        nodePositionEditBuffer.nodeSnapshots.set(key, {
          marker: entry.marker,
          markerId: entry.markerId || null,
          originalLatLng: entry.originalLatLng ? { ...entry.originalLatLng } : null,
          originalGeometry: entry.originalGeometry ? JSON.parse(JSON.stringify(entry.originalGeometry)) : null
        });
      }
    });
  }

  function rememberPipelineSnapshot(layer) {
    if (!layer) return null;
    ensureNodePositionEditBuffer();
    const key = typeof L !== 'undefined' && typeof L.stamp === 'function'
      ? L.stamp(layer)
      : `pipeline-${Math.random().toString(36).slice(2)}`;
    if (!nodePositionEditBuffer.pipelineSnapshots.has(key)) {
      nodePositionEditBuffer.pipelineSnapshots.set(key, {
        layer,
        latlngs: cloneLatLngStructure(layer.getLatLngs()),
        geometry: layer.feature?.geometry ? JSON.parse(JSON.stringify(layer.feature.geometry)) : null
      });
    }
    return key;
  }

  function markNodePositionDirty(nodeId) {
    if (!nodeId) return;
    ensureNodePositionEditBuffer();
    nodePositionEditBuffer.dirtyNodeKeys.add(`node-${nodeId}`);
  }

  function markInlineMarkerDirty(marker) {
    if (!marker) return;
    ensureNodePositionEditBuffer();
    const markerId = marker.feature?.properties?.ID || null;
    const key = getNodeSnapshotKey(marker, markerId);
    nodePositionEditBuffer.dirtyNodeKeys.add(key);
  }

  function markPipelineDirty(layer) {
    if (!layer) return;
    const key = rememberPipelineSnapshot(layer);
    ensureNodePositionEditBuffer();
    nodePositionEditBuffer.dirtyPipelineKeys.add(key);
  }

  function commitPendingNodePositionEdits() {
    if (!nodePositionEditBuffer) {
      return { nodes: 0, pipelines: 0 };
    }

    const nodeKeys = nodePositionEditBuffer.dirtyNodeKeys.size
      ? Array.from(nodePositionEditBuffer.dirtyNodeKeys)
      : Array.from(nodePositionEditBuffer.nodeSnapshots.keys());
    const pipelineKeys = nodePositionEditBuffer.dirtyPipelineKeys.size
      ? Array.from(nodePositionEditBuffer.dirtyPipelineKeys)
      : Array.from(nodePositionEditBuffer.pipelineSnapshots.keys());

    let nodesUpdated = 0;
    nodeKeys.forEach(key => {
      const snapshot = nodePositionEditBuffer.nodeSnapshots.get(key);
      if (!snapshot || !snapshot.marker) return;
      const marker = snapshot.marker;
      const currentLatLng = marker.getLatLng();
      if (!currentLatLng) return;
      const coords = [currentLatLng.lng, currentLatLng.lat];
      if (marker.feature?.geometry) {
        marker.feature.geometry.coordinates = coords;
        if (marker.feature.properties) {
          marker.feature.properties.modified = true;
        }
      }
      if (snapshot.markerId) {
        getAllNodeLayers().forEach(layerGroup => {
          if (!layerGroup) return;
          layerGroup.eachLayer(otherMarker => {
            if (otherMarker.feature?.properties?.ID === snapshot.markerId) {
              otherMarker.setLatLng(currentLatLng);
              if (otherMarker.feature?.geometry) {
                otherMarker.feature.geometry.coordinates = coords;
                if (otherMarker.feature.properties) {
                  otherMarker.feature.properties.modified = true;
                }
              }
            }
          });
        });
      }
      nodesUpdated += 1;
    });

    let pipelinesUpdated = 0;
    pipelineKeys.forEach(key => {
      const snapshot = nodePositionEditBuffer.pipelineSnapshots.get(key);
      if (!snapshot || !snapshot.layer) return;
      const layer = snapshot.layer;
      if (layer.feature?.properties) {
        layer.feature.properties.modified = true;
      }
      const lengthKm = calculatePipelineLength(layer);
      if (layer.feature?.properties && Number.isFinite(lengthKm)) {
        layer.feature.properties.Length_km = lengthKm;
      }
      syncLayerFeatureGeometry(layer);
      pipelinesUpdated += 1;
    });

    nodePositionEditBuffer.nodeSnapshots.clear();
    nodePositionEditBuffer.pipelineSnapshots.clear();
    nodePositionEditBuffer.dirtyNodeKeys.clear();
    nodePositionEditBuffer.dirtyPipelineKeys.clear();
    nodePositionEditBuffer = null;

    return { nodes: nodesUpdated, pipelines: pipelinesUpdated };
  }

  function discardPendingNodePositionEdits() {
    if (!nodePositionEditBuffer) {
      return { nodes: 0, pipelines: 0 };
    }

    const nodeKeys = Array.from(nodePositionEditBuffer.nodeSnapshots.keys());
    const pipelineKeys = Array.from(nodePositionEditBuffer.pipelineSnapshots.keys());

    nodeKeys.forEach(key => {
      const snapshot = nodePositionEditBuffer.nodeSnapshots.get(key);
      if (!snapshot || !snapshot.originalLatLng) return;
      const targetLatLng = L.latLng(snapshot.originalLatLng.lat, snapshot.originalLatLng.lng);
      if (snapshot.marker) {
        snapshot.marker.setLatLng(targetLatLng);
        if (snapshot.marker.feature?.geometry) {
          snapshot.marker.feature.geometry.coordinates = [snapshot.originalLatLng.lng, snapshot.originalLatLng.lat];
          if (snapshot.originalGeometry) {
            snapshot.marker.feature.geometry = JSON.parse(JSON.stringify(snapshot.originalGeometry));
          }
        }
      }
      if (snapshot.markerId) {
        getAllNodeLayers().forEach(layerGroup => {
          if (!layerGroup) return;
          layerGroup.eachLayer(otherMarker => {
            if (otherMarker.feature?.properties?.ID === snapshot.markerId) {
              otherMarker.setLatLng(targetLatLng);
              if (otherMarker.feature?.geometry) {
                otherMarker.feature.geometry.coordinates = [snapshot.originalLatLng.lng, snapshot.originalLatLng.lat];
                if (snapshot.originalGeometry) {
                  otherMarker.feature.geometry = JSON.parse(JSON.stringify(snapshot.originalGeometry));
                }
              }
            }
          });
        });
      }
    });

    pipelineKeys.forEach(key => {
      const snapshot = nodePositionEditBuffer.pipelineSnapshots.get(key);
      if (!snapshot || !snapshot.layer) return;
      const layer = snapshot.layer;
      if (snapshot.latlngs) {
        const restoredLatlngs = cloneLatLngStructure(snapshot.latlngs);
        layer.setLatLngs(restoredLatlngs);
        if (layer._clickLayer && typeof layer._clickLayer.eachLayer === 'function') {
          layer._clickLayer.eachLayer(clickLayer => {
            if (clickLayer && typeof clickLayer.setLatLngs === 'function') {
              clickLayer.setLatLngs(restoredLatlngs);
            }
          });
        }
        if (typeof layer.redraw === 'function') {
          layer.redraw();
        }
      }
      if (snapshot.geometry && layer.feature) {
        layer.feature.geometry = JSON.parse(JSON.stringify(snapshot.geometry));
      }
      syncLayerFeatureGeometry(layer);
      refreshEditableLayerCache(layer);
      resetPipelineStyle(layer);
    });

    nodePositionEditBuffer.nodeSnapshots.clear();
    nodePositionEditBuffer.pipelineSnapshots.clear();
    nodePositionEditBuffer.dirtyNodeKeys.clear();
    nodePositionEditBuffer.dirtyPipelineKeys.clear();
    const reverted = { nodes: nodeKeys.length, pipelines: pipelineKeys.length };
    nodePositionEditBuffer = null;
    return reverted;
  }

  function storeOriginalNodeClickHandlers(marker) {
    if (!marker || marker._nodePositionOriginalClicks) return;
    if (marker._events && marker._events.click && marker._events.click.length) {
      marker._nodePositionOriginalClicks = marker._events.click.map(evt => ({ fn: evt.fn, ctx: evt.ctx }));
    } else {
      marker._nodePositionOriginalClicks = [];
    }
  }

  function restoreOriginalNodeClickHandlers(marker) {
    if (!marker || !marker._nodePositionOriginalClicks) return;
    marker.off('click');
    marker._nodePositionOriginalClicks.forEach(handler => {
      marker.on('click', handler.fn, handler.ctx);
    });
    marker._nodePositionOriginalClicks = null;
  }

  function restoreNodePositionInteractions() {
    [...getAllNodeLayers(), ...getAllInlineLayers()].forEach(layerGroup => {
      if (!layerGroup) return;
      layerGroup.eachLayer(marker => {
        restoreOriginalNodeClickHandlers(marker);
      });
    });
  }

  function activateNodePositionEdit() {
    currentMode = 'edit-node-position';
  nodePositionEditActive = true;
  initializeNodePositionEditBuffer();
  setInlineEditingElevation(true);
  
  // Deaktiviere Pipeline-Klicks um Node-Klicks zu ermöglichen
  [pipelineLayer, drawnItems].forEach(layerGroup => {
    if (layerGroup) {
      layerGroup.eachLayer(layer => {
        if (layer.feature && layer.feature.geometry.type === "LineString") {
          layer.off('click');
        }
      });
    }
  });
  
  // Aktiviere Node-Click-Handler für alle Node-Layer (legacy und dynamic)
  const nodeLayers = getAllNodeLayers();
  const inlineLayers = getAllInlineLayers();
  const positionEditableLayers = [...nodeLayers, ...inlineLayers];
  
  positionEditableLayers.forEach(nLayer => {
    if (nLayer) {
      nLayer.eachLayer(marker => {
        storeOriginalNodeClickHandlers(marker);
        marker.off('click');
        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          selectNodeForPositionEdit(marker);
        });
      });
    }
  });
  
  showCustomPopup(
    '📍 Change Node Position',
    '<p style="text-align: center; margin: 15px 0;"><strong>How to use:</strong><br>1. Click on a node (small red circle) or an in-line element to select it<br>2. The selected item and connected pipelines turn green<br>3. Drag to move it; colocated sub-nodes and their pipelines follow<br>4. Release to confirm the new position</p>',
    [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
  );
}

/* Select a node for position editing. */
function selectNodeForPositionEdit(nodeMarker) {
  function isInlineMarker(marker) {
    if (!marker) return false;
    const meta = resolveLayerMetadata(marker.layer || marker._layer || null) || resolveLayerMetadata(marker);
    if (meta && meta.geometryClass === 'inline') return true;
    if (marker.feature?.properties?.Type) {
      const typeVal = String(marker.feature.properties.Type).toLowerCase();
      if (typeVal.includes('in-line') || typeVal.includes('inline')) return true;
    }
    const inlineFlag = marker._customLayerSettings?.geometryClass === 'inline';
    return !!inlineFlag;
  }

  function findNodesAtLatLng(latlng, toleranceMeters = 1) {
    if (!latlng || !map) return [];
    const matches = [];
    getAllNodeLayers().forEach(layerGroup => {
      if (!layerGroup) return;
      layerGroup.eachLayer(marker => {
        const markerLatLng = marker.getLatLng?.();
        if (markerLatLng) {
          const distance = map.distance(latlng, markerLatLng);
          if (distance <= toleranceMeters) {
            matches.push(marker);
          }
        }
      });
    });
    return matches;
  }

  const isInline = isInlineMarker(nodeMarker);
  const primaryNodeId = nodeMarker.feature?.properties?.ID || null;
  const linkedNodeIds = new Set();

  if (!isInline && primaryNodeId) {
    linkedNodeIds.add(primaryNodeId);
  }

  const inlineNodeRef = nodeMarker.feature?.properties?.Node;
  if (isInline && inlineNodeRef) {
    linkedNodeIds.add(inlineNodeRef);
  }

  if (isInline) {
    const colocatedNodes = findNodesAtLatLng(nodeMarker.getLatLng(), 1);
    colocatedNodes.forEach(marker => {
      const id = marker.feature?.properties?.ID;
      if (id) linkedNodeIds.add(id);
    });
  }

  const nodeIdsForEdit = Array.from(linkedNodeIds.size ? linkedNodeIds : (primaryNodeId ? [primaryNodeId] : []));
  const displayLabel = isInline ? (primaryNodeId || 'Inline element') : (primaryNodeId || 'Node');
  console.log('Node selected for position edit:', displayLabel, 'nodes to move:', nodeIdsForEdit);

  /* Clear previous highlights. */
  resetAllPipelineHighlights();
  if (window.selectedNodeMarker) {
    resetElementStyle(window.selectedNodeMarker);
  }

  /* Restore pipeline interaction from a previous selection. */
  if (window.selectedNodeConnectedPipelines && window.selectedNodeConnectedPipelines.length) {
    window.selectedNodeConnectedPipelines.forEach(prevLayer => {
      try {
        resetPipelineStyle(prevLayer);
        if (prevLayer.getElement()) {
          prevLayer.getElement().style.pointerEvents = '';
        }
      } catch (err) {
        console.warn('Could not restore previous pipeline interaction:', err);
      }
    });
    window.selectedNodeConnectedPipelines = [];
  }
  
  /* Store original positions for discard (nodes and inline markers). */
  const nodePositionSnapshots = collectNodePositionSnapshots(nodeIdsForEdit);
  const inlineSnapshots = isInline ? [{
    marker: nodeMarker,
    markerId: nodeMarker.feature?.properties?.ID,
    originalLatLng: { ...nodeMarker.getLatLng() },
    originalGeometry: nodeMarker.feature?.geometry ? JSON.parse(JSON.stringify(nodeMarker.feature.geometry)) : null
  }] : [];
  const allPositionSnapshots = [...nodePositionSnapshots, ...inlineSnapshots];
  rememberNodePositionSnapshots(allPositionSnapshots);
  
  /* Highlight the selected node/inline marker. */
  captureOriginalMarkerStyle(nodeMarker, 'highlight');
  highlightNodeMarkerForEdit(nodeMarker);
  window.selectedNodeMarker = nodeMarker;
  window.selectedNodeConnectedPipelines = [];
  
  /* Find and mark all connected pipelines without duplicates. */
  const connectedPipelines = [];
  const seenIds = new Set();
  const nodeIdSet = new Set(nodeIdsForEdit);
  
  const lineGroupsForNodeEdit = getLineLayerGroupsForDirectionMode();
  lineGroupsForNodeEdit.forEach(layerGroup => {
    if (!layerGroup) return;
    forEachPolylineFeature(layerGroup, layer => {
      const props = layer.feature?.properties || {};
      if (!nodeIdSet.has(props.Start_Node) && !nodeIdSet.has(props.End_Node)) return;
      const uniqueKey = props.ID ?? L.stamp(layer);
      if (seenIds.has(uniqueKey)) return;
      seenIds.add(uniqueKey);
      rememberPipelineSnapshot(layer);
      layer.setStyle({color: '#00ff00', weight: 8});
      if (layer.getElement()) {
        layer.getElement().style.pointerEvents = 'none';
      }
      connectedPipelines.push(layer);
      window.selectedNodeConnectedPipelines.push(layer);
    });
  });
  
  console.log('Found', connectedPipelines.length, 'connected pipelines');
  
  /* Show Save/Discard buttons. */
  showNodeEditButtons(nodeMarker, displayLabel);
  
  /* Enable dragging for the selected node(s). */
  enableNodeDragging(nodeMarker, nodeIdsForEdit, isInline ? [nodeMarker] : [], connectedPipelines);
}

/* Show Save/Discard buttons for node position edit. */
function showNodeEditButtons(nodeMarker, nodeIdLabel) {
  /* Remove existing buttons if present. */
  document.getElementById('save-edit-btn')?.remove();
  document.getElementById('discard-edit-btn')?.remove();
  
  const toolsSection = document.getElementById('tools-section');
  if (!toolsSection) return;
  
  /* Save button. */
  const saveBtn = document.createElement('button');
  saveBtn.id = 'save-edit-btn';
  saveBtn.textContent = '✔️ Save Changes';
  saveBtn.className = 'main-menu-btn edit-action-btn';
  saveBtn.style.display = 'block';
  saveBtn.style.margin = '0 auto';
  saveBtn.style.background = '#28a745';
  saveBtn.onclick = () => {
    const { nodes: nodesUpdated, pipelines: pipelinesUpdated } = commitPendingNodePositionEdits();
    cleanupNodeEdit(nodeMarker);
    resetAllPipelineHighlights();
    saveBtn.remove();
    document.getElementById('discard-edit-btn')?.remove();
    activateInfoMode();

    const nodeLabel = nodesUpdated === 1 ? 'node' : 'nodes';
    const pipelineLabel = pipelinesUpdated === 1 ? 'pipeline' : 'pipelines';
    const summaryMessage = (nodesUpdated || pipelinesUpdated)
      ? `${nodesUpdated} ${nodeLabel} and ${pipelinesUpdated} ${pipelineLabel} updated successfully.`
      : 'No pending node position changes were detected.';

    showCustomPopup(
      '✅ Changes Saved',
      `<p style="text-align: center; margin: 15px 0;">${summaryMessage}</p>`,
      [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
    );
  };
  
  /* Discard button. */
  const discardBtn = document.createElement('button');
  discardBtn.id = 'discard-edit-btn';
  discardBtn.textContent = '❌ Discard Changes';
  discardBtn.className = 'main-menu-btn edit-action-btn';
  discardBtn.style.display = 'block';
  discardBtn.style.margin = '0 auto';
  discardBtn.style.background = '#dc3545';
  discardBtn.onclick = () => {
    const revertedCounts = discardPendingNodePositionEdits();
    try {
      cleanupNodeEdit(nodeMarker);
      resetAllPipelineHighlights();
      if (window.selectedNodeMarker) {
        resetElementStyle(window.selectedNodeMarker);
      }
    } finally {
      discardBtn.remove();
      document.getElementById('save-edit-btn')?.remove();
      activateInfoMode();
      const nodeLabel = revertedCounts.nodes === 1 ? 'node' : 'nodes';
      const pipelineLabel = revertedCounts.pipelines === 1 ? 'pipeline' : 'pipelines';
      const summaryMessage = (revertedCounts.nodes || revertedCounts.pipelines)
        ? `${revertedCounts.nodes} ${nodeLabel} and ${revertedCounts.pipelines} ${pipelineLabel} reverted.`
        : 'No pending node position changes were reverted.';
      showCustomPopup(
        '↩️ Changes Discarded',
        `<p style="text-align: center; margin: 15px 0;">${summaryMessage}</p>`,
        [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
      );
    }
  };
  
  toolsSection.appendChild(saveBtn);
  toolsSection.appendChild(discardBtn);
}

/* Apply a green highlight to a node marker regardless of type.
 * CircleMarker (native point) → setStyle; DivIcon Marker (shaped) → CSS filter. */
function highlightNodeMarkerForEdit(marker) {
  if (!marker) return;
  if (marker instanceof L.CircleMarker) {
    marker.setStyle({ fillColor: '#00ff00', color: '#00aa00', radius: 10, weight: 3 });
  } else if (marker._icon) {
    marker._icon.style.filter = 'sepia(1) saturate(10) hue-rotate(80deg) brightness(1.3)';
    marker._icon.style.outline = '2px solid #00aa00';
  }
}

/* Cleanup for node edit mode. */
function cleanupNodeEdit(nodeMarker) {
  const marker = nodeMarker || window.selectedNodeMarker;
  if (marker) {
    resetElementStyle(marker);
    marker.off('mousedown');
  }
  window.selectedNodeMarker = null;
  
  /* Restore connected pipelines and re-enable interactions. */
  if (window.selectedNodeConnectedPipelines) {
    window.selectedNodeConnectedPipelines.forEach(layer => {
      resetPipelineStyle(layer);
      if (layer.getElement()) {
        layer.getElement().style.pointerEvents = '';
      }
    });
    window.selectedNodeConnectedPipelines = [];
  }
  
  /* Remove drag event listeners. */
  map.off('mousemove');
  map.off('mouseup');
  map.dragging.enable();
  
  restoreNodePositionInteractions();
  setInlineEditingElevation(false);
  nodePositionEditActive = false;
  nodePositionEditBuffer = null;
}

/* Enable dragging for nodes/inline elements and sync connected pipelines. */
function enableNodeDragging(nodeMarker, nodeIds, inlineMarkers, connectedPipelines) {
  const nodeIdSet = new Set(Array.isArray(nodeIds) ? nodeIds : [nodeIds].filter(Boolean));
  console.log('enableNodeDragging called for:', Array.from(nodeIdSet));
  
  let isDragging = false;
  let dragHandler = null;
  let moveHandler = null;
  let upHandler = null;
  
  /* Drag-start handler. */
  dragHandler = function(e) {
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    isDragging = true;
    map.dragging.disable();
    console.log('Drag started for node(s):', Array.from(nodeIdSet));
  };
  
  /* Drag-move handler. */
  moveHandler = function(e) {
    if (!isDragging) return;
    L.DomEvent.stopPropagation(e);
    
    const newLatLng = e.latlng;
    
    /* Move all markers for these nodes (legacy and dynamic layers). */
    const allNodeLayers = getAllNodeLayers();
    
    allNodeLayers.forEach(nLayer => {
      if (nLayer) {
        nLayer.eachLayer(marker => {
          const markerId = marker.feature?.properties?.ID;
          if (markerId && nodeIdSet.has(markerId)) {
            marker.setLatLng(newLatLng);
            markNodePositionDirty(markerId);
          }
        });
      }
    });

    /* Move inline markers as well. */
    inlineMarkers.forEach(marker => {
      if (marker && marker.setLatLng) {
        marker.setLatLng(newLatLng);
        markInlineMarkerDirty(marker);
      }
    });
    
    /* Update connected pipeline endpoints. */
    connectedPipelines.forEach(pipelineLayer => {
      const props = pipelineLayer.feature.properties;
      const latlngs = pipelineLayer.getLatLngs();

      if (nodeIdSet.has(props.Start_Node)) {
        latlngs[0] = newLatLng;
        pipelineLayer.setLatLngs(latlngs);
        markPipelineDirty(pipelineLayer);
      }

      if (nodeIdSet.has(props.End_Node)) {
        latlngs[latlngs.length - 1] = newLatLng;
        pipelineLayer.setLatLngs(latlngs);
        markPipelineDirty(pipelineLayer);
      }
    });
  };
  
  /* Drag-end handler. */
  upHandler = function(e) {
    if (!isDragging) return;
    isDragging = false;
    map.dragging.enable();
    console.log('Drag ended for node(s):', Array.from(nodeIdSet));
    // Benutzer kann jetzt Save oder Discard wählen
  };
  
  /* Register drag event listeners. */
  nodeMarker.on('mousedown', dragHandler);
  map.on('mousemove', moveHandler);
  map.on('mouseup', upHandler);
  
  console.log('Drag handlers registered for node(s):', Array.from(nodeIdSet));
}

/* Move a node and update connected pipeline endpoints. */
function moveNodeAndConnectedPipelines(nodeId, newLatLng, excludeLayer) {
  console.log('Moving node and connected pipelines:', nodeId, newLatLng);
  
  /* Find and move nodes (legacy and dynamic layers). */
  let nodeFound = false;
  const allNodeLayers = getAllNodeLayers();
  
  allNodeLayers.forEach(nLayer => {
    if (nLayer) {
      nLayer.eachLayer(marker => {
        if (marker.feature && marker.feature.properties.ID === nodeId) {
          marker.setLatLng(newLatLng);
          marker.feature.geometry.coordinates = [newLatLng.lng, newLatLng.lat];
          console.log('Node moved:', nodeId);
          nodeFound = true;
        }
      });
    }
  });
  
  if (!nodeFound) console.log('Node not found:', nodeId);
  
  const layersToCheck = getLineLayerGroupsForDirectionMode();
  layersToCheck.forEach(layerGroup => {
    if (!layerGroup) return;
    forEachPolylineFeature(layerGroup, layer => {
      if (excludeLayer && layer === excludeLayer) return;
      const props = layer.feature?.properties || {};
      let updated = false;

      if (props.Start_Node === nodeId) {
        const latlngs = layer.getLatLngs();
        latlngs[0] = newLatLng;
        layer.setLatLngs(latlngs);

        if (layer.editing && layer.editing._markers && layer.editing._markers[0]) {
          layer.editing._markers[0].setLatLng(newLatLng);
        }
        updated = true;
      }

      if (props.End_Node === nodeId) {
        const latlngs = layer.getLatLngs();
        latlngs[latlngs.length - 1] = newLatLng;
        layer.setLatLngs(latlngs);

        if (layer.editing && layer.editing._markers) {
          const lastIndex = layer.editing._markers.length - 1;
          if (layer.editing._markers[lastIndex]) {
            layer.editing._markers[lastIndex].setLatLng(newLatLng);
          }
        }
        updated = true;
      }

      if (updated) {
        refreshEditableLayerCache(layer);
      }
    });
  });
}

function activateEditMode() {
  try {
    // Erst alle Modi deaktivieren (ohne Button-Highlighting)
    if (window.polylineDrawer && window.polylineDrawer._enabled) window.polylineDrawer.disable();
    if (window.markerDrawer && window.markerDrawer._enabled) window.markerDrawer.disable();
    map.closePopup();
    if (editingLayer && editingLayer.editing) {
      releasePipelineEndpointLocks(editingLayer);
      editingLayer.editing.disable();
      editingLayer = null;
    }
    
    /* Reset pipeline highlights. */
    resetAllPipelineHighlights();
    
    /* Reset element highlights. */
    resetAllElementHighlights();
    
    currentMode = 'edit';
    console.log('Edit Mode aktiviert');
    applyEditGeometryVisibility(true);
    
    /* Show selection dialog. */
    showCustomPopup(
      '✏️ Edit Geometry',
      '<p style="text-align: center; margin: 15px 0;">What would you like to edit?</p>',
      [
        {
          text: 'Change Pipeline Route',
          type: 'primary',
          keepOpen: false,
          onClick: () => {
            activatePipelineRouteEdit();
          }
        },
        {
          text: 'Change Node Position',
          type: 'primary',
          keepOpen: false,
          onClick: () => {
            activateNodePositionEdit();
          }
        },
        {
          text: 'Cancel',
          type: 'secondary',
          keepOpen: false,
          onClick: () => {
            activateInfoMode();
          }
        }
      ]
    );
  } catch (error) {
    console.error('Error in activateEditMode:', error);
  }
}

/* Helper to extract features from a layer. */
