/**
 * ================================================================================
 * QGas - Reconnect Infrastructure Tool
 * ================================================================================
 * 
 * Allows users to change the node connection of infrastructure elements
 * (storages, LNG terminals, power plants, compressors) by selecting a new
 * connection node.
 * 
 * Key Features:
 * - Interactive infrastructure element selection
 * - Visual node selection
 * - Connection reassignment
 * - Property update automation
 * - Layer visibility management
 * 
 * Workflow:
 * 1. User selects infrastructure element to reconnect
 * 2. Other layers temporarily hidden for clarity
 * 3. User clicks new target node
 * 4. Connection updated in properties
 * 5. Visual feedback confirms change
 * 
 * Technical Details:
 * - Updates node reference properties
 * - Maintains element geometry
 * - Preserves all other attributes
 * - Restores layer visibility after completion
 * - Supports all infrastructure types
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Node and infrastructure selections.
 * - Map layers for connection updates.
 *
 * Public API:
 * - activateReconnectInfrastructureTool(): Start reconnection workflow.
 * 
 * ================================================================================
 */

(function () {
  let reconnectMode = false;
  let selectedInfrastructureElement = null;
  let originalLayerVisibility = {};
  let originalInfrastructureStyles = new Map();

  function getInfrastructureLayers() {
    return [storageLayer, lngLayer, powerplantsLayer, compressorsLayer].filter(Boolean);
  }

  function captureInfrastructureState() {
    originalInfrastructureStyles = new Map();
    getInfrastructureLayers().forEach(layerGroup => {
      layerGroup.eachLayer(layer => {
        if (!layer || !layer.options) return;
        originalInfrastructureStyles.set(layer, {
          color: layer.options.color,
          fillColor: layer.options.fillColor,
          weight: layer.options.weight,
          opacity: layer.options.opacity,
          fillOpacity: layer.options.fillOpacity,
          radius: layer.options.radius
        });
      });
    });
  }
  
  function startReconnectInfrastructure() {
    reconnectMode = true;
    selectedInfrastructureElement = null;
    
    /*
     * Capture layer visibility so we can restore it after reconnection.
     */
    originalLayerVisibility = {
      powerplants: powerplantsLayer && map.hasLayer(powerplantsLayer),
      compressors: compressorsLayer && map.hasLayer(compressorsLayer),
      storages: storageLayer && map.hasLayer(storageLayer),
      lng: lngLayer && map.hasLayer(lngLayer),
      consumption: consumptionLayer && map.hasLayer(consumptionLayer),
      shortPipe: shortPipeLayer && map.hasLayer(shortPipeLayer)
    };
    captureInfrastructureState();
    
    /*
     * Activate click handlers for infrastructure elements.
     */
    setupInfrastructureClickHandlers();
    
    showCustomPopup(
      '🔌 Reconnect Infrastructure - Step 1',
      '<p style="text-align: center; margin: 15px 0;">Click on a Storage, LNG Terminal, Powerplant, or Compressor to reconnect it to a different node.</p>',
      [
        {
          text: 'Start Selection',
          type: 'primary',
          onClick: () => {
            closeCustomPopup();
          }
        },
        {
          text: 'Cancel',
          type: 'secondary',
          onClick: () => {
            exitReconnectMode();
          }
        }
      ]
    );
  }
  
  function setupInfrastructureClickHandlers() {
    /* Storage layer selection handlers. */
    if (storageLayer) {
      storageLayer.eachLayer(layer => {
        layer.off('click');
        if (layer.unbindPopup) layer.unbindPopup();
        layer.on('click', function(e) {
          if (reconnectMode && !selectedInfrastructureElement) {
            selectInfrastructureForReconnect(layer);
            e.stopPropagation();
          }
        });
      });
    }
    
    /* LNG layer selection handlers. */
    if (lngLayer) {
      lngLayer.eachLayer(layer => {
        layer.off('click');
        if (layer.unbindPopup) layer.unbindPopup();
        layer.on('click', function(e) {
          if (reconnectMode && !selectedInfrastructureElement) {
            selectInfrastructureForReconnect(layer);
            e.stopPropagation();
          }
        });
      });
    }
    
    /* Powerplants layer selection handlers. */
    if (powerplantsLayer) {
      powerplantsLayer.eachLayer(layer => {
        layer.off('click');
        if (layer.unbindPopup) layer.unbindPopup();
        layer.on('click', function(e) {
          if (reconnectMode && !selectedInfrastructureElement) {
            selectInfrastructureForReconnect(layer);
            e.stopPropagation();
          }
        });
      });
    }
    
    /* Compressors layer selection handlers. */
    if (compressorsLayer) {
      compressorsLayer.eachLayer(layer => {
        layer.off('click');
        if (layer.unbindPopup) layer.unbindPopup();
        layer.on('click', function(e) {
          if (reconnectMode && !selectedInfrastructureElement) {
            selectInfrastructureForReconnect(layer);
            e.stopPropagation();
          }
        });
      });
    }
  }
  
  function selectInfrastructureForReconnect(infrastructureLayer) {
    selectedInfrastructureElement = infrastructureLayer;
    
    /* Highlight the selected infrastructure element. */
    if (infrastructureLayer.setStyle) {
      infrastructureLayer.setStyle({
        fillColor: '#ffff00',
        color: '#ff0000',
        weight: 3,
        fillOpacity: 0.7
      });
    }
    
    /* Hide other infrastructure elements to focus the selection. */
    hideOtherInfrastructureElements();
    
    /* Ensure nodes render above pipelines for precise selection. */
    if (nodeLayer && pipelineLayer) {
      if (map.hasLayer(nodeLayer)) map.removeLayer(nodeLayer);
      if (map.hasLayer(pipelineLayer)) map.removeLayer(pipelineLayer);
      
      /* Add pipelines first, then nodes so nodes appear on top. */
      pipelineLayer.addTo(map);
      nodeLayer.addTo(map);
    }
    
    /* Activate node click handlers for reconnection. */
    setupNodeClickHandlers();
    
    const infrastructureName = getInfrastructureName(infrastructureLayer);
    const currentNode = infrastructureLayer.feature.properties.node || 'No node assigned';
    
    showCustomPopup(
      '🔌 Reconnect Infrastructure - Step 2',
      `<p style="text-align: center; margin: 15px 0;"><strong>Selected:</strong> ${infrastructureName}<br><strong>Current Node:</strong> ${currentNode}<br><br>Now click on a node to reconnect this infrastructure element.</p>`,
      [
        {
          text: 'Continue Selection',
          type: 'primary',
          onClick: () => {
            closeCustomPopup();
          }
        },
        {
          text: 'Cancel',
          type: 'secondary',
          onClick: () => {
            exitReconnectMode();
          }
        }
      ]
    );
  }
  
  function hideOtherInfrastructureElements() {
    /* Hide all infrastructure elements except the selected one. */
    if (storageLayer) {
      storageLayer.eachLayer(layer => {
        if (layer !== selectedInfrastructureElement) {
          if (layer.setStyle) {
            layer.setStyle({opacity: 0, fillOpacity: 0});
          }
        }
      });
    }
    
    if (lngLayer) {
      lngLayer.eachLayer(layer => {
        if (layer !== selectedInfrastructureElement) {
          if (layer.setStyle) {
            layer.setStyle({opacity: 0, fillOpacity: 0});
          }
        }
      });
    }
    
    if (powerplantsLayer) {
      powerplantsLayer.eachLayer(layer => {
        if (layer !== selectedInfrastructureElement) {
          if (layer.setStyle) {
            layer.setStyle({opacity: 0, fillOpacity: 0});
          }
        }
      });
    }
    
    if (compressorsLayer) {
      compressorsLayer.eachLayer(layer => {
        if (layer !== selectedInfrastructureElement) {
          if (layer.setStyle) {
            layer.setStyle({opacity: 0, fillOpacity: 0});
          }
        }
      });
    }
    
    /* Hide non-target layers entirely during reconnection. */
    if (consumptionLayer && map.hasLayer(consumptionLayer)) {
      map.removeLayer(consumptionLayer);
    }
    if (shortPipeLayer && map.hasLayer(shortPipeLayer)) {
      map.removeLayer(shortPipeLayer);
    }
  }
  
  function setupNodeClickHandlers() {
    if (!nodeLayer) {
      return;
    }
  
    forEachNodeMarker(layer => {
      layer.off('click');
      if (layer.unbindPopup) layer.unbindPopup();
      layer.on('click', function(e) {
        if (reconnectMode && selectedInfrastructureElement) {
          reconnectToNode(layer);
          if (e) {
            L.DomEvent.stopPropagation(e);
          }
        }
      });
    });
  }
  
  function reconnectToNode(nodeLayer) {
    const nodeId = nodeLayer.feature.properties.id;
    const nodeName = nodeLayer.feature.properties.Name || nodeId;
    const infrastructureName = getInfrastructureName(selectedInfrastructureElement);
    
    /* Update the node reference in the infrastructure element. */
    selectedInfrastructureElement.feature.properties.node = nodeId;
    markLayerChanged(selectedInfrastructureElement);
    
    /* Show a confirmation popup for the reconnection. */
    showCustomPopup(
      '✅ Reconnection Successful',
      `<p style="text-align: center; margin: 15px 0;"><strong>${infrastructureName}</strong> has been reconnected to node <strong>${nodeName}</strong> (ID: ${nodeId})</p>`,
      [
        {
          text: 'Continue Reconnecting',
          type: 'primary',
          onClick: () => {
            /* Return to the first step to reconnect another element. */
            restoreInfrastructureVisibility();
            selectedInfrastructureElement = null;
            setupInfrastructureClickHandlers();
            
            showCustomPopup(
              '🔌 Reconnect Infrastructure - Step 1',
              '<p style="text-align: center; margin: 15px 0;">Click on another Storage, LNG Terminal, Powerplant, or Compressor to reconnect it to a different node.</p>',
              [
                {
                  text: 'Continue Selection',
                  type: 'primary',
                  onClick: () => {
                    closeCustomPopup();
                  }
                },
                {
                  text: 'Finish',
                  type: 'secondary',
                  onClick: () => {
                    exitReconnectMode();
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Finish',
          type: 'secondary',
          onClick: () => {
            exitReconnectMode();
          }
        }
      ]
    );
  }
  
  function getInfrastructureName(infrastructureLayer) {
    const props = infrastructureLayer.feature.properties;
    return props.name || props.id || 'Unknown Infrastructure';
  }
  
  function restoreInfrastructureVisibility() {
    originalInfrastructureStyles.forEach((style, layer) => {
      if (!layer) return;
      if (typeof layer.setStyle === 'function') {
        const pathStyle = {};
        ['color', 'fillColor', 'weight', 'opacity', 'fillOpacity'].forEach(key => {
          if (style[key] !== undefined) pathStyle[key] = style[key];
        });
        layer.setStyle(pathStyle);
      }
      if (typeof layer.setRadius === 'function' && style.radius !== undefined) {
        layer.setRadius(style.radius);
      }
    });
  }
  
  function exitReconnectMode(activateInfo = true) {
    if (!reconnectMode && originalInfrastructureStyles.size === 0) return;
    reconnectMode = false;

    /* Restore visibility for all infrastructure elements. */
    restoreInfrastructureVisibility();
    selectedInfrastructureElement = null;
    
    /* Restore original layer visibility. */
    if (originalLayerVisibility.consumption && consumptionLayer) {
      consumptionLayer.addTo(map);
    }
    if (originalLayerVisibility.shortPipe && shortPipeLayer) {
      shortPipeLayer.addTo(map);
    }
    
    /* Reset click handlers to default behavior. */
    resetInfrastructureClickHandlers();
    resetNodeClickHandlers();
    closeCustomPopup();
    originalInfrastructureStyles.clear();

    if (activateInfo) {
      currentMode = 'info';
      activateInfoMode(true);
    }
  }
  
  function resetInfrastructureClickHandlers() {
    if (storageLayer) {
      storageLayer.eachLayer(layer => {
        layer.off('click');
      });
    }
    if (lngLayer) {
      lngLayer.eachLayer(layer => {
        layer.off('click');
      });
    }
    if (powerplantsLayer) {
      powerplantsLayer.eachLayer(layer => {
        layer.off('click');
      });
    }
    if (compressorsLayer) {
      compressorsLayer.eachLayer(layer => {
        layer.off('click');
      });
    }
  }
  
  function resetNodeClickHandlers() {
    forEachNodeMarker(layer => {
      layer.off('click');
    });
  }
  

  /**
   * Activate the Reconnect Infrastructure tool.
   *
   * Deactivates any currently active editing mode, sets the application mode
   * to {@code 'reconnect-infrastructure'}, and initiates the two-step
   * reconnection workflow. In the first step the user selects an existing
   * infrastructure element (storage, LNG terminal, power plant, or
   * compressor); in the second step the user clicks a target node, and the
   * element's node-reference property is updated accordingly. Layer
   * visibility is temporarily adjusted during the workflow and restored upon
   * completion or cancellation.
   *
   * @returns {void}
   */
  window.activateReconnectInfrastructureTool = function activateReconnectInfrastructureTool() {
    deactivateAllModes();
    currentMode = 'reconnect-infrastructure';
    startReconnectInfrastructure();
  };

  window.deactivateReconnectInfrastructureTool = function deactivateReconnectInfrastructureTool() {
    exitReconnectMode(false);
  };
})();
