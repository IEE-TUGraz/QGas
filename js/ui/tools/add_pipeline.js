/**
 * ================================================================================
 * QGas - Add Pipeline Tool
 * ================================================================================
 * 
 * Provides functionality for adding new pipeline segments to the infrastructure
 * network. Supports interactive drawing, node snapping, and automatic ID generation.
 * 
 * Key Features:
 * - Interactive pipeline drawing with map clicks
 * - Automatic node detection and snapping
 * - Support for multiple pipeline layer types
 * - Contributor tracking and attribution
 * - Automatic ID generation with prefixes
 * - Length calculation
 * - Custom attribute support
 * 
 * Workflow:
 * 1. User selects target pipeline layer
 * 2. Clicks map to define start point (snaps to existing node or creates new)
 * 3. Clicks map to define end point
 * 4. Pipeline is created with auto-generated ID
 * 5. Pipeline is added to selected layer
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Map clicks for node and pipeline placement.
 * - Active node and line layer selections.
 * - Contributor initials for ID generation.
 *
 * Public API:
 * - promptPipelineLayerSelection(onComplete, onCancel): Choose a target line layer.
 * - proceedWithAddPipeline(): Start the add-pipeline workflow.
 * 
 * ================================================================================
 */

/**
 * Get all available pipeline layers from the system
 * Scans dynamic layers, legacy layers, and custom layers for line geometry
 * @returns {Array} Array of layer objects with name, layer reference, and metadata
 */
function getAvailablePipelineLayers() {
  const layers = [];
  const seen = new Set();

  const registerLayerOption = (layer, name, metadata) => {
    if (!layer || seen.has(layer)) return;
    seen.add(layer);
    layers.push({
      name: name || (metadata && metadata.legendName) || 'Line Layer',
      layer,
      metadata: metadata || null
    });
  };

  if (dynamicLayers) {
    Object.entries(dynamicLayers).forEach(([layerName, layer]) => {
      if (!layer) return;
      const metadata = layerMetadataRegistry[layerName];
      if (metadata && metadata.geometryClass === 'line') {
        registerLayerOption(layer, metadata.legendName || layerName, metadata);
      }
    });
  }

  const resolveLayer = (layerRef) => (typeof layerRef === 'undefined' ? null : layerRef);

  const legacyLineLayers = [
    { layer: resolveLayer(pipelineLayer), name: 'Pipelines' },
    { layer: resolveLayer(estimatedPipelinesLayer), name: 'Estimated Pipelines' },
    { layer: resolveLayer(shortPipeLayer), name: 'Short Pipes' },
    { layer: resolveLayer(hydrogenPipeLayer), name: 'Hydrogen Pipelines' }
  ];
  legacyLineLayers.forEach(entry => registerLayerOption(entry.layer, entry.name));

  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, rawValue]) => {
      const layer = rawValue?.layer || rawValue;
      if (!layer) return;
      let hasLineGeometry = !!layer._customLineLayer;
      if (!hasLineGeometry && typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => {
          if (hasLineGeometry) return;
          if (child instanceof L.Polyline || (child.feature && child.feature.geometry && child.feature.geometry.type === 'LineString')) {
            hasLineGeometry = true;
          }
        });
      }
      if (hasLineGeometry) {
        registerLayerOption(layer, layer._customLayerName || name, { elementKey: 'custom' });
      }
    });
  }

  console.log('Available pipeline layers:', layers);
  return layers;
}

function promptPipelineLayerSelection(onComplete, onCancel) {
  const pipelineLayers = getAvailablePipelineLayers();
  if (!pipelineLayers.length) {
    showInfoPopup('No line layers are available. Please load a line-type layer before adding pipelines.', '➕ Add Pipeline');
    return;
  }

  const currentLayer = window.selectedPipelineLayer;
  const options = pipelineLayers.map((entry, idx) => {
    const selectedAttr = currentLayer && entry.layer === currentLayer ? ' selected' : '';
    return `<option value="${idx}"${selectedAttr}>${entry.name}</option>`;
  }).join('');

  showCustomPopup(
    'Select Line Layer',
    '<p style="text-align: center; margin: 15px 0;">Choose the line layer that should store the new pipeline:</p>' +
      `<select id="pipeline-layer-select" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">${options}</select>`,
    [
      {
        text: 'Continue',
        type: 'primary',
        keepOpen: false,
        onClick: () => {
          const selectEl = document.getElementById('pipeline-layer-select');
          const selectedIndex = parseInt(selectEl.value, 10);
          const chosen = pipelineLayers[selectedIndex] || pipelineLayers[0];
          window.selectedPipelineLayer = chosen.layer;
          if (typeof onComplete === 'function') {
            onComplete(chosen);
          }
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        keepOpen: false,
        onClick: () => {
          if (typeof onCancel === 'function') {
            onCancel();
          }
        }
      }
    ]
  );
}

function getAvailableNodeLayers() {
  return getNodeLayerEntries().map(entry => ({
    id: entry.id,
    name: entry.name,
    layer: entry.layer,
    metadata: entry.metadata || null
  }));
}

function promptNodeLayerSelection(onComplete, onCancel, options = {}) {
  const nodeLayers = getAvailableNodeLayers();
  if (!nodeLayers.length) {
    showInfoPopup('No node layers are available. Please load a node-type layer before adding pipelines.', '➕ Add Pipeline');
    if (typeof onCancel === 'function') {
      onCancel();
    }
    return;
  }

  const currentSelection = window.selectedNodeLayerForPipeline;
  if (nodeLayers.length === 1 && options.forcePrompt !== true) {
    window.selectedNodeLayerForPipeline = nodeLayers[0];
    if (typeof onComplete === 'function') {
      onComplete(nodeLayers[0]);
    }
    return;
  }

  const optionsHtml = nodeLayers.map((entry, idx) => {
    const selected = currentSelection && currentSelection.layer === entry.layer ? ' selected' : '';
    return `<option value="${idx}"${selected}>${entry.name}</option>`;
  }).join('');

  showCustomPopup(
    'Select Node Layer',
    '<p style="text-align: center; margin: 15px 0;">Choose the node layer that should receive any newly created nodes.</p>' +
      `<select id="node-layer-select" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">${optionsHtml}</select>`,
    [
      {
        text: 'Continue',
        type: 'primary',
        keepOpen: false,
        onClick: () => {
          const selectEl = document.getElementById('node-layer-select');
          const selectedIndex = parseInt(selectEl.value, 10);
          const chosen = nodeLayers[selectedIndex] || nodeLayers[0];
          window.selectedNodeLayerForPipeline = chosen;
          if (typeof onComplete === 'function') {
            onComplete(chosen);
          }
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        keepOpen: false,
        onClick: () => {
          if (typeof onCancel === 'function') {
            onCancel();
          }
        }
      }
    ]
  );
}

function ensureNodeLayerSelection(onComplete, onCancel, options = {}) {
  const availableLayers = getAvailableNodeLayers();
  if (!availableLayers.length) {
    showInfoPopup('No node layers are available. Please load or enable a node-type layer before creating new nodes.', '➕ Add Pipeline');
    if (typeof onCancel === 'function') {
      onCancel();
    }
    return;
  }

  if (window.selectedNodeLayerForPipeline && window.selectedNodeLayerForPipeline.layer && options.forcePrompt !== true) {
    if (typeof onComplete === 'function') {
      onComplete(window.selectedNodeLayerForPipeline);
    }
    return;
  }

  promptNodeLayerSelection(onComplete, onCancel, options);
}

function detectExistingNodeLayer() {
  const entries = getNodeLayerEntries();
  return entries.length ? entries[0].layer : null;
}

function resolveNodeLayer(options = {}) {
  const { createIfMissing = false } = options;
  if (nodeLayer) {
    return nodeLayer;
  }
  if (originalNodeLayer) {
    nodeLayer = originalNodeLayer;
    return nodeLayer;
  }
  const detected = detectExistingNodeLayer();
  if (detected) {
    nodeLayer = detected;
    if (!originalNodeLayer) {
      originalNodeLayer = detected;
    }
    return nodeLayer;
  }
  if (createIfMissing && map) {
    nodeLayer = L.layerGroup().addTo(map);
    if (!originalNodeLayer) {
      originalNodeLayer = nodeLayer;
    }
    return nodeLayer;
  }
  return null;
}

function forEachNodeMarker(callback) {
  if (typeof callback !== 'function') {
    return;
  }
  const layerGroups = window.getAllNodeLayers();
  if (!layerGroups.length) {
    return;
  }

  const traverse = (layer) => {
    if (!layer) {
      return;
    }

    const isGroup = layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON;
    if (isGroup && typeof layer.eachLayer === 'function') {
      layer.eachLayer(child => traverse(child));
      return;
    }

    if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === 'Point') {
      callback(layer);
    }
  };

  layerGroups.forEach(layerGroup => traverse(layerGroup));
}

function setNodeSelectionHandlers(handler) {
  if (typeof handler !== 'function') {
    return;
  }

  forEachNodeMarker(marker => {
    marker.off('click');
    marker.on('click', function(e) {
      if (e) {
        L.DomEvent.stopPropagation(e);
      }
      handler(marker, e);
    });
  });
}

function clearNodeSelectionHandlers() {
  forEachNodeMarker(marker => marker.off('click'));
}

function getNodeLatLng(layer) {
  if (!layer) {
    return null;
  }
  if (typeof layer.getLatLng === 'function') {
    return layer.getLatLng();
  }
  if (typeof layer.getBounds === 'function') {
    return layer.getBounds().getCenter();
  }
  return null;
}

function proceedWithAddPipeline() {
  console.log('proceedWithAddPipeline called');
  /* Ensure the correct mode is set for the workflow. */
  currentMode = 'add-pipeline';
  if (!window.selectedPipelineLayer) {
    window.selectedPipelineLayer = pipelineLayer || drawnItems;
  }
  /* Prompt for start-node selection. */
  showCustomPopup(
    '➕ Add Pipeline',
    '<p style="text-align: center; margin: 15px 0;">Does the pipeline start at an existing node?</p>',
    [
      {
        text: 'Yes',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          handleStartNodeSelection(true);
        }
      },
      {
        text: 'No',
        type: 'secondary',
        keepOpen: true,
        onClick: () => {
          handleStartNodeSelection(false);
        }
      }
    ]
  );
  
  function handleStartNodeSelection(hasStartNode) {
    let startNodeId = null;
    let startLatLng = null;
    const nodePrefix = getFacilityPrefix('Node');
    
    function askForEndNode() {
      showCustomPopup(
        '➕ Add Pipeline',
        '<p style="text-align: center; margin: 15px 0;">Does the pipeline end on an existing node?</p>',
        [
          {
            text: 'Yes',
            type: 'primary',
            keepOpen: true,
            onClick: () => {
              handleEndNodeSelection(true);
            }
          },
          {
            text: 'No',
            type: 'secondary',
            keepOpen: true,
            onClick: () => {
              handleEndNodeSelection(false);
            }
          }
        ]
      );
    }
    
    function handleEndNodeSelection(hasEndNode) {
      let endNodeId = null;
      let endLatLng = null;
      
      if (hasEndNode) {
        const removeEndNodeSelectionHandlers = () => {
          clearNodeSelectionHandlers();
        };

        showCustomPopup(
          '🎯 Select End Node',
          '<p style="text-align: center; margin: 15px 0;">Click on a node to select it as the END node for the pipeline.</p>',
          [
            {
              text: 'OK',
              type: 'primary',
              keepOpen: false,
              onClick: () => {}
            },
            {
              text: 'Cancel',
              type: 'secondary',
              keepOpen: false,
              onClick: () => {
                currentMode = 'add-pipeline';
                removeEndNodeSelectionHandlers();
              }
            }
          ]
        );

        /* Activate end-node selection handlers. */
        currentMode = 'select-end-node';
        setNodeSelectionHandlers(marker => {
          endNodeId = marker.feature.properties.ID;
          endLatLng = getNodeLatLng(marker);
          console.log('End node selected:', endNodeId);

          removeEndNodeSelectionHandlers();
          closeCustomPopup();

          if (hasStartNode && startNodeId) {
            createDirectPipeline();
          } else {
            currentMode = 'create-start-node';
            showCustomPopup(
              '🎯 Place Start Node',
              '<p style="text-align: center; margin: 15px 0;">Click on the map to place the START node for the pipeline.</p>',
              [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
            );

            map.once('click', function(e) {
              startLatLng = e.latlng;
              console.log('Start position set:', startLatLng);
              closeCustomPopup();

              createDirectPipeline();
            });
          }
        });
      } else {
        /* No end node: proceed directly to drawing. */
        closeCustomPopup();
        hasEndNode = false;

        /* Start drawing; first click sets start node and begins the line. */
        startPipelineDrawing();
      }
      
      function createDirectPipeline() {
        const needsNewStartNode = !hasStartNode || !startNodeId;
        const needsNewEndNode = !hasEndNode || !endNodeId;

        const finalizeDirectCreation = () => {
          if (!startLatLng || !endLatLng) {
            showInfoPopup('Please provide both start and end positions before creating the pipeline.', '➕ Add Pipeline');
            return;
          }

          const targetLayerRef = needsNewStartNode || needsNewEndNode ? getActivePipelineNodeLayer() : null;
          if ((needsNewStartNode || needsNewEndNode) && !targetLayerRef) {
            showInfoPopup('Please select a node layer before creating new nodes.', '➕ Add Pipeline');
            return;
          }

          if (needsNewStartNode) {
            const nodeIdContext = getNodeIdContext(targetLayerRef);
            const newNodeId = formatElementId(
              nodeIdContext.prefix,
              contributorInitials,
              getNextIdNumber(nodeIdContext.typeKey, targetLayerRef)
            );
            createNewNode(startLatLng, newNodeId, { targetLayer: targetLayerRef });
            startNodeId = newNodeId;
            hasStartNode = true;
          }

          if (needsNewEndNode) {
            const nodeIdContext = getNodeIdContext(targetLayerRef);
            const newNodeId = formatElementId(
              nodeIdContext.prefix,
              contributorInitials,
              getNextIdNumber(nodeIdContext.typeKey, targetLayerRef)
            );
            createNewNode(endLatLng, newNodeId, { targetLayer: targetLayerRef });
            endNodeId = newNodeId;
            hasEndNode = true;
          }

          const latlngs = [startLatLng, endLatLng];
          const pipelineStyle = getPipelineStyleOptions();
          const targetLayer = window.selectedPipelineLayer || pipelineLayer || drawnItems;
          const destinationLayer = window.selectedPipelineLayer || drawnItems;
          const lineType = getLineStyleForLayer(targetLayer);
          const dashArray = getDashArrayForLineType(lineType);
          const polyline = L.polyline(latlngs, {
            pane: 'pipelinePane',
            color: pipelineStyle.color,
            weight: pipelineStyle.weight,
            opacity: pipelineStyle.opacity ?? 0.8,
            dashArray: dashArray || null
          }).addTo(destinationLayer);
          if (typeof polyline.bringToBack === 'function') {
            polyline.bringToBack();
          }
          polyline._originalColor = pipelineStyle.color;
          polyline._originalWeight = pipelineStyle.weight;
          polyline._originalOpacity = pipelineStyle.opacity ?? 0.8;
          polyline._originalDashArray = dashArray || null;
          const idContext = getLayerIdContext(targetLayer);
          const pipelineId = formatElementId(idContext.prefix, contributorInitials, getNextIdNumber(idContext.typeKey, targetLayer));
          const defaultAttrs = getDefaultPipelineAttributes(targetLayer);
          const lengthKm = calculatePipelineLength(polyline);
          const layerDisplayName = getLayerGroupDisplayName(targetLayer) || 'Pipeline';
          const properties = { ...defaultAttrs, ID: pipelineId, modified: true, Start_Node: startNodeId, End_Node: endNodeId, Layer_Name: layerDisplayName };
          assignPipelineLength(properties, lengthKm);
          polyline.feature = { type: "Feature", properties: properties, geometry: polyline.toGeoJSON().geometry };
          polyline.isNew = true;
          polyline._originLayerName = layerDisplayName;
          setPipelineInteraction(polyline, 'info');
          currentMode = 'info';
          activateInfoMode(true);
          selectTool('info');
        };

        if (needsNewStartNode || needsNewEndNode) {
          ensureNodeLayerSelection(() => {
            finalizeDirectCreation();
          }, () => {
            currentMode = 'info';
            activateInfoMode(true);
          });
        } else {
          finalizeDirectCreation();
        }
      }
      
      function startPipelineDrawing() {
        console.log('startPipelineDrawing startNodeId:', startNodeId);
        const requiresNewNodes = !hasStartNode || !hasEndNode;

        const initializeDrawing = () => {
          delete window.pipelineDrawContext;
          const contextNodeLayer = getActivePipelineNodeLayer();
          window.pipelineDrawContext = {
            hasStartNode,
            startNodeId,
            startLatLng,
            hasEndNode,
            finalized: false,
            nodeLayer: contextNodeLayer
          };

          if (window.polylineDrawer) {
            window.polylineDrawer.disable();
          }
          const pipelineStyle = getPipelineStyleOptions();
          window.polylineDrawer = new L.Draw.Polyline(map, { shapeOptions: { pane: 'pipelinePane', color: pipelineStyle.color, weight: pipelineStyle.weight } });
          currentMode = 'draw-pipeline';

          if (hasStartNode && startLatLng) {
            window.polylineDrawer.enable();
            setTimeout(() => {
              if (window.polylineDrawer._markers && window.polylineDrawer.addVertex) {
                window.polylineDrawer.addVertex(startLatLng);
                showCustomPopup(
                  '✏️ Draw Pipeline',
                  '<p style="text-align: center; margin: 15px 0;">Pipeline starts at node: ' + startNodeId + '<br>Continue drawing the route (click intermediate points, double-click to finish).</p>',
                  [{text: 'OK', type: 'primary', onClick: () => {}}]
                );
              }
            }, 100);
          } else {
            window.polylineDrawer.enable();
            console.log('Polyline drawer enabled for free drawing');
            showCustomPopup(
              '✏️ Draw Pipeline',
              '<p style="text-align: center; margin: 15px 0;">Draw the pipeline route (click points, double-click to finish).<br>Start and end nodes will be created automatically.</p>',
              [{text: 'OK', type: 'primary', onClick: () => {}}]
            );
            setTimeout(() => {
              if (document.getElementById('custom-popup').style.display !== 'none') {
                closeCustomPopup();
              }
            }, 2000);
          }
        };

        if (requiresNewNodes) {
          ensureNodeLayerSelection(() => {
            initializeDrawing();
          }, () => {
            currentMode = 'info';
            activateInfoMode(true);
          });
        } else {
          initializeDrawing();
        }
      }
    }
    
    if (hasStartNode) {
      showCustomPopup(
        '🎯 Select Start Node',
        '<p style="text-align: center; margin: 15px 0;">Click on a node to select it as the START node for the pipeline.</p>',
        [
          {
            text: 'OK',
            type: 'primary',
            keepOpen: false,
            onClick: () => {
              const availableNodeLayer = resolveNodeLayer();
              if (!availableNodeLayer) {
                showInfoPopup('Node layer is not available yet. Please load nodes before selecting one.', '🎯 Select Start Node');
                currentMode = 'info';
                activateInfoMode(true);
                return;
              }

              currentMode = 'select-start-node';
              setNodeSelectionHandlers(marker => {
                startNodeId = marker.feature.properties.ID;
                startLatLng = getNodeLatLng(marker);
                console.log('Start node selected:', startNodeId);
                
                clearNodeSelectionHandlers();
                askForEndNode();
              });
            }
          },
          {
            text: 'Cancel',
            type: 'secondary',
            keepOpen: false,
            onClick: () => {
              clearNodeSelectionHandlers();
              currentMode = 'info';
              activateInfoMode(true);
            }
          }
        ]
      );
    } else {
      /* If no start node is selected, ask for end node directly. */
      askForEndNode();
    }
  }
}

function selectElementType(type) {
  const typeNames = {
    'connected-to-node': 'Connected to 1 Node',
    'in-pipe': 'In Pipe',
    'pipeline': 'Pipeline'
  };
  
  showCustomPopup(
    `➕ Add ${typeNames[type]} Layer`,
    '<p style="text-align: center; margin: 15px 0;">Enter a name for this layer:</p><input type="text" id="layer-name-input" placeholder="Enter layer name" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px; font-size: 14px;">',
    [
      {
        text: 'Create',
        type: 'primary',
        keepOpen: false,
        onClick: () => {
          const layerName = document.getElementById('layer-name-input').value.trim();
          if (!layerName) {
            showInfoPopup('Please enter a layer name.', '➕ Add Layer');
            return;
          }
          createNewLayer(type, layerName);
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        keepOpen: false,
        onClick: () => {}
      }
    ]
  );
}

/* startAddNewElement moved to add_new_element.js module. */

function findSamplePipelineLayer(layerGroup) {
  let sample = null;
  if (!layerGroup) {
    return sample;
  }

  const traverse = (layer) => {
    if (sample || !layer) {
      return;
    }
    const isGroup = layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON;
    if (isGroup && typeof layer.eachLayer === 'function') {
      layer.eachLayer(child => traverse(child));
      return;
    }
    if (layer instanceof L.Polyline) {
      sample = layer;
    }
  };

  if (typeof layerGroup.eachLayer === 'function') {
    layerGroup.eachLayer(child => traverse(child));
  } else if (layerGroup instanceof L.Polyline) {
    sample = layerGroup;
  }

  return sample;
}

function getPipelineStyleOptions() {
  const fallback = { color: '#3388ff', weight: 3, opacity: 0.8 };
  const targetLayer = window.selectedPipelineLayer || pipelineLayer || drawnItems;
  const customStyle = targetLayer && targetLayer._customLineColor ? {
    color: targetLayer._customLineColor,
    weight: targetLayer._customLineWeight || fallback.weight
  } : null;
  const sample = findSamplePipelineLayer(targetLayer);

  if (sample && sample.options) {
    return {
      color: sample._originalColor || sample.options.color || customStyle?.color || fallback.color,
      weight: sample._originalWeight || sample.options.weight || customStyle?.weight || fallback.weight,
      opacity: fallback.opacity
    };
  }

  if (customStyle) {
    return {
      color: customStyle.color,
      weight: customStyle.weight,
      opacity: fallback.opacity
    };
  }

  if (Array.isArray(layerConfig)) {
    const pipelineConfig = layerConfig.find(cfg => cfg.type === 'Line' && (cfg.filename || '').toLowerCase().includes('pipeline'));
    if (pipelineConfig) {
      return {
        color: pipelineConfig.color || fallback.color,
        weight: pipelineConfig.size || fallback.weight,
        opacity: fallback.opacity
      };
    }
  }

  return { ...fallback };
}

function finalizeDrawnPipeline(polyline) {
  const context = window.pipelineDrawContext;
  if (!context) return;
  if (context.finalized) {
    console.log('Pipeline already finalized, skipping');
    return;
  }
  context.finalized = true;
  
  const latlngs = polyline.getLatLngs();
  let startNodeId = context.startNodeId;
  let endNodeId = null;
  let startLatLng = context.startLatLng;
  const contextNodeLayer = context.nodeLayer || getActivePipelineNodeLayer();
  const nodeIdContext = getNodeIdContext(contextNodeLayer);

  /* Start node: use existing or create a new one. */
  let startNodeIdLocal;
  if (context.startNodeId) {
    startNodeIdLocal = context.startNodeId;
    console.log('Using existing start node:', startNodeIdLocal);
  } else {
    console.log('Creating new start node');
    startLatLng = latlngs[0];
    startNodeIdLocal = formatElementId(
      nodeIdContext.prefix,
      contributorInitials,
      getNextIdNumber(nodeIdContext.typeKey, contextNodeLayer)
    );
    createNewNode(startLatLng, startNodeIdLocal, { targetLayer: contextNodeLayer });
  }

  /* End node: use existing or create a new one. */
  let endNodeIdLocal;
  if (context.endNodeId) {
    endNodeIdLocal = context.endNodeId;
    console.log('Using existing end node:', endNodeIdLocal);
  } else {
    console.log('Creating new end node');
    const endLatLng = latlngs[latlngs.length - 1];
    endNodeIdLocal = formatElementId(
      nodeIdContext.prefix,
      contributorInitials,
      getNextIdNumber(nodeIdContext.typeKey, contextNodeLayer)
    );
    createNewNode(endLatLng, endNodeIdLocal, { targetLayer: contextNodeLayer });
  }
  
  /* Set pipeline properties and metadata. */
  const targetLayer = window.selectedPipelineLayer || pipelineLayer || drawnItems;
  const idContext = getLayerIdContext(targetLayer);
  const pipelineId = formatElementId(idContext.prefix, contributorInitials, getNextIdNumber(idContext.typeKey, targetLayer));
  const defaultAttrs = getDefaultPipelineAttributes(targetLayer);
  const lengthKm = calculatePipelineLength(polyline);
  console.log('Setting pipeline properties - Start_Node:', startNodeIdLocal, 'End_Node:', endNodeIdLocal);
  const layerDisplayName = getLayerGroupDisplayName(targetLayer) || 'Pipeline';
  const properties = { ...defaultAttrs, ID: pipelineId, modified: true, Start_Node: startNodeIdLocal, End_Node: endNodeIdLocal, Layer_Name: layerDisplayName };
  assignPipelineLength(properties, lengthKm);
  polyline.feature = { type: "Feature", properties: properties, geometry: polyline.toGeoJSON().geometry };
  polyline._originLayerName = layerDisplayName;
  polyline.isNew = true;

  polyline.options = polyline.options || {};
  polyline.options.pane = 'pipelinePane';
  const pipelineStyle = getPipelineStyleOptions();
  const lineType = getLineStyleForLayer(targetLayer);
  const dashArray = getDashArrayForLineType(lineType);
  polyline.setStyle({
    color: pipelineStyle.color,
    weight: pipelineStyle.weight,
    opacity: pipelineStyle.opacity ?? 0.8,
    dashArray: dashArray || null
  });
  if (typeof polyline.bringToBack === 'function') {
    polyline.bringToBack();
  }
  polyline._originalColor = pipelineStyle.color;
  polyline._originalWeight = pipelineStyle.weight;
  polyline._originalOpacity = pipelineStyle.opacity ?? 0.8;
  polyline._originalDashArray = dashArray || null;
  
  setPipelineInteraction(polyline, 'info');
  currentMode = 'info';
  activateInfoMode(true);
  selectTool('info');
  
  /* Context is cleared later so both draw:created handlers can access it. */
}

/* createNewLayer and addToLegend moved to add_new_element.js module. */

function toggleFilterPanel() {
  openFilterModal();
}

/* ================================================================================
 * Pipeline Grouping Functions
 * ================================================================================
 */

function finalizeGrouping() {
  /* Finalize grouping without start/end node selection. */
  /* Calculate total length (handle Length_km and length_km). */
  let totalLength = 0;
  selectedPipelinesForGroup.forEach(p => {
    const length = p.layer.feature.properties.Length_km || p.layer.feature.properties.length_km || 0;
    totalLength += parseFloat(length);
  });
  
  /* Create group without start/end points. */
  const newGroup = {
    name: currentGroupName,
    pipelines: selectedPipelinesForGroup.map(p => p.id),
    totalLength: totalLength.toFixed(2),
    numElements: selectedPipelinesForGroup.length
  };
  
  pipelineGroups.push(newGroup);
  
  /* Reset colors to original layer styling. */
  selectedPipelinesForGroup.forEach(p => {
    const originalColor = p.layer._originalColor || '#3388ff';
    const originalWeight = p.layer._originalWeight || 3;
    const originalOpacity = p.layer._originalOpacity || 0.8;
    const originalDashArray = p.layer._originalDashArray || null;
    
    p.layer.setStyle({
      color: originalColor,
      weight: originalWeight,
      opacity: originalOpacity,
      dashArray: originalDashArray
    });
  });
  
  /* Reset grouping state. */
  groupingMode = false;
  selectedPipelinesForGroup = [];
  currentGroupName = '';
  
  showCustomPopup(
    '✅ Group Created',
    `<p style="text-align: center; margin: 15px 0;">Group "<strong>${newGroup.name}</strong>" created successfully!<br><br>Elements: ${newGroup.numElements}<br>Total Length: ${newGroup.totalLength} km</p>`,
    [{text: 'OK', type: 'primary', onClick: () => {
      /* Switch back to info mode. */
      currentMode = 'info';
      activateInfoMode(true);
      selectTool('info');
    }}]
  );
  
  console.log('Pipeline group created:', newGroup);
}

