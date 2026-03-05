/**
 * ================================================================================
 * QGas - Add New Element Tool
 * ================================================================================
 * 
 * Creates entirely new custom layer types for specialized infrastructure elements
 * not covered by standard layers.
 * 
 * Key Features:
 * - Custom layer creation
 * - Layer type selection (line/point/inline/node)
 * - User-defined layer names
 * - Automatic legend integration
 * - Layer metadata generation
 * - Drawing tool integration
 * 
 * Layer Types:
 * - Pipeline (Line Layer): For linear infrastructure
 * - Infrastructure (Point Layer): For point-based facilities
 * - In-Line Element Layer: For elements positioned along pipelines
 * - Node Layer: For standard node handling
 * 
 * Workflow:
 * 1. User selects layer type
 * 2. Enters layer name
 * 3. System creates empty layer
 * 4. Layer added to map and legend
 * 5. User can begin adding elements to new layer
 * 
 * Technical Details:
 * - Registers layer in customLayers registry
 * - Creates layer metadata
 * - Initializes with appropriate geometry type
 * - Sets up interaction handlers
 * - Configures default styling
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - User-selected layer type and name.
 * - Map instance and layer registries.
 *
 * Public API:
 * - activateAddNewElementTool(): Start the custom-layer creation flow.
 * 
 * ================================================================================
 */

(function () {
  window.activateAddNewElementTool = function activateAddNewElementTool() {
    deactivateAllModes();
    currentMode = 'add-new-element';
    startAddNewElement();
  };

  function startAddNewElement() {
    showCustomPopup(
      '➕ Add New Element',
      '<p style="text-align: center; margin: 15px 0;">Choose the type of element to create:</p><select id="element-type-select" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;"><option value="pipeline">Line Layer</option><option value="infrastructure">Point Layer</option><option value="inline">In-Line Element Layer</option><option value="node">Node Layer</option></select><br><br><label for="element-name-input" style="display: block; margin-bottom: 5px;">Layer Name:</label><input type="text" id="element-name-input" placeholder="Enter layer name" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">',
      [
        {
          text: 'Create',
          type: 'primary',
          keepOpen: false,
          onClick: () => {
            const type = document.getElementById('element-type-select').value;
            const name = document.getElementById('element-name-input').value.trim();
            
            if (!name) {
              showCustomPopup(
                '⚠️ Error',
                '<p style="text-align: center; margin: 15px 0;">Please enter a layer name</p>',
                [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
              );
              return;
            }
            
            /* Validate uniqueness of the layer name. */
            if (window.customLayers && window.customLayers[name]) {
              showCustomPopup(
                '⚠️ Error',
                '<p style="text-align: center; margin: 15px 0;">A layer with this name already exists</p>',
                [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
              );
              return;
            }
            
            createNewLayer(type, name);
          }
        },
        {
          text: 'Cancel',
          type: 'secondary',
          keepOpen: false,
          onClick: () => {
            currentMode = 'info';
            activateInfoMode();
            selectTool('info');
          }
        }
      ]
    );
  }

  function createNewLayer(type, name) {
    const displayName = (name || '').trim() || 'Custom Layer';
    const filename = generateUniqueCustomFilename(displayName);
    const baseConfig = {
      filename,
      legendName: displayName,
      enabled: true,
      parentFilename: ''
    };

    let layerGroup;
    let isInline = false;
    let configEntry = null;
    let metadata = null;
    
    if (type === 'pipeline') {
      /* Line layer. */
      layerGroup = L.layerGroup().addTo(map);
      const uniqueColor = getUniqueLineColor();
      registerLineColorUsage(uniqueColor);
      const defaultWeight = 4;
      /* Add to legend. */
      addToLegend(displayName, 'line', { color: uniqueColor });
      layerGroup._customLineLayer = true;
      layerGroup._customLayerName = displayName;
      layerGroup._customLineColor = uniqueColor;
      layerGroup._customLineWeight = defaultWeight;
      const idPrefix = deriveCustomLayerPrefix(displayName);
      const layerSettings = {
        name: displayName,
        geometryClass: 'line',
        defaultAttributes: { ID: '', Start_Node: '', End_Node: '' },
        idPrefix,
        typeKey: displayName,
        color: uniqueColor,
        size: defaultWeight,
        lineStyle: 'solid'
      };
      layerGroup._customLayerSettings = layerSettings;
      facilityTypeMap[displayName] = idPrefix;
      configEntry = {
        ...baseConfig,
        color: uniqueColor,
        markerType: 'line',
        size: defaultWeight,
        type: 'Line',
        lineStyle: 'solid',
        geometryClass: 'line',
        elementKey: displayName
      };
    } else if (type === 'node') {
      /* Node layer (treated like standard nodes). */
      layerGroup = L.layerGroup().addTo(map);
      const nodeStyle = getDefaultNodeStyleOptions(layerGroup);
      const defaultColor = nodeStyle.fillColor || '#ff7800';
      const defaultRadius = nodeStyle.radius ?? 6;
      addToLegend(displayName, 'point', { color: defaultColor });
      layerGroup._customLayerName = displayName;
      layerGroup._customLayerColor = defaultColor;
      const nodeIdPrefix = deriveCustomLayerPrefix(displayName);
      const nodeTypeKey = `Node:${displayName}`;
      facilityTypeMap[nodeTypeKey] = nodeIdPrefix;
      layerGroup._customLayerSettings = {
        name: displayName,
        geometryClass: 'point',
        defaultAttributes: getDefaultPointAttributes('Node'),
        idPrefix: nodeIdPrefix,
        typeKey: nodeTypeKey,
        elementKey: 'nodes',
        isNodeLayer: true,
        color: defaultColor,
        radius: defaultRadius,
        size: defaultRadius,
        shape: 'circle'
      };
      configEntry = {
        ...baseConfig,
        color: defaultColor,
        markerType: 'circle',
        size: defaultRadius,
        type: 'Node',
        geometryClass: 'point',
        elementKey: 'nodes'
      };
    } else if (type === 'inline') {
      /* Inline element layer (point layer with special handling). */
      layerGroup = L.layerGroup().addTo(map);
      const defaultColor = '#f03';
      /* Add to legend. */
      addToLegend(displayName, 'point', { color: defaultColor });
      isInline = true;
      const defaultRadius = 6;
      const idPrefix = deriveCustomLayerPrefix(displayName);
      layerGroup._customLayerName = displayName;
      layerGroup._customLayerColor = defaultColor;
      layerGroup._customLayerSettings = {
        name: displayName,
        geometryClass: 'inline',
        defaultAttributes: { ID: '', Type: displayName, Node: '', Start_Node: '', End_Node: '' },
        idPrefix,
        typeKey: displayName,
        color: defaultColor,
        radius: defaultRadius,
        size: defaultRadius,
        shape: 'circle'
      };
      facilityTypeMap[displayName] = idPrefix;
      configEntry = {
        ...baseConfig,
        color: defaultColor,
        markerType: 'circle',
        size: defaultRadius,
        type: 'In-Line',
        geometryClass: 'inline',
        elementKey: displayName
      };
    } else {
      /* Point layer (infrastructure). */
      layerGroup = L.layerGroup().addTo(map);
      const defaultColor = '#f03';
      /* Add to legend. */
      addToLegend(displayName, 'point', { color: defaultColor });
      const defaultRadius = 6;
      const idPrefix = deriveCustomLayerPrefix(displayName);
      layerGroup._customLayerName = displayName;
      layerGroup._customLayerColor = defaultColor;
      layerGroup._customLayerSettings = {
        name: displayName,
        geometryClass: 'point',
        defaultAttributes: { ID: '', Type: displayName, Node: '' },
        idPrefix,
        typeKey: displayName,
        color: defaultColor,
        radius: defaultRadius,
        size: defaultRadius,
        shape: 'circle'
      };
      facilityTypeMap[displayName] = idPrefix;
      configEntry = {
        ...baseConfig,
        color: defaultColor,
        markerType: 'circle',
        size: defaultRadius,
        type: 'Point',
        geometryClass: 'point',
        elementKey: displayName
      };
    }

    if (configEntry) {
      const layerName = getLayerNameFromConfig(configEntry);
      configEntry.layerName = layerName;
      if (layerGroup._customLayerSettings) {
        layerGroup._customLayerSettings.layerName = layerName;
        layerGroup._customLayerSettings.filename = configEntry.filename;
      }
      layerGroup._optionsKey = layerName;
      metadata = registerLayerMetadata(layerName, configEntry);
      assignMetadataToLayer(layerGroup, metadata);
      rememberLayerInstanceForElementKey(metadata.elementKey, layerGroup);
      dynamicLayers[layerName] = layerGroup;
      dynamicLayers[displayName] = layerGroup;
      configEntry.elementKey = metadata.elementKey;
      configEntry.geometryClass = metadata.geometryClass;
      upsertLayerConfigEntry(configEntry, metadata);
    }
    
    /* Register custom layer in global registry. */
    if (!window.customLayers) window.customLayers = {};
    window.customLayers[displayName] = layerGroup;
    if (type === 'pipeline') {
      window.selectedPipelineLayer = layerGroup;
    }

    invalidateStyleableLayerRegistry();
    updateLegendSymbols();
    
    showCustomPopup(
      '✅ Success',
      '<p style="text-align: center; margin: 15px 0;">Layer "' + displayName + '" created successfully!</p>',
      [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {
        currentMode = 'info';
        activateInfoMode();
        selectTool('info');
      }}]
    );
  }

  function addToLegend(name, layerType, options = {}) {
    const legendContainer = document.querySelector('.legend-control');
    if (!legendContainer) return;
    const resolvedColor = options.color || (layerType === 'line' ? '#0070f3' : '#f03');
    const resolvedLineStyle = options.lineStyle || 'solid';
    
    const legendItem = document.createElement('div');
    
    /* Generate legend HTML based on layer type (matching legend.js structure). */
    let legendHTML;
    if (layerType === 'line') {
      /* Line layer. */
      legendHTML = `<label class="legend-label"><input type="checkbox" id="toggle-${name.toLowerCase().replace(/\s+/g, '-')}" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block;"><div class="legend-line" style="background:${resolvedColor};"></div></span><span style="margin-left: 6px;">${name}</span></label><br>`;
    } else {
      /* Point or inline layer. */
      legendHTML = `<label class="legend-label"><input type="checkbox" id="toggle-${name.toLowerCase().replace(/\s+/g, '-')}" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;"><span class="legend-icon" style="background:${resolvedColor};"></span></span><span style="margin-left: 6px;">${name}</span></label><br>`;
    }
    
    legendItem.innerHTML = legendHTML;
    
    if (layerType === 'line') {
      const legendLineEl = legendItem.querySelector('.legend-line');
      styleLegendLineElement(legendLineEl, resolvedColor, resolvedLineStyle);
    }
    
    /* Insert before the Select All button. */
    const selectAllBtn = legendContainer.querySelector('#activate-all-btn');
    if (selectAllBtn) {
      const selectAllDiv = selectAllBtn.parentElement;
      legendContainer.insertBefore(legendItem, selectAllDiv);
    } else {
      legendContainer.appendChild(legendItem);
    }
    
    /* Toggle handler for the legend checkbox. */
    const checkbox = legendItem.querySelector('input');
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        map.addLayer(window.customLayers[name]);
      } else {
        map.removeLayer(window.customLayers[name]);
      }
    });
  }
})();
