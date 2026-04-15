/**
 * ================================================================================
 * QGas - Switch Sublayer Tool
 * ================================================================================
 * 
 * Enables moving infrastructure elements between different sublayers while
 * maintaining geometry and attributes. Useful for reorganizing data and
 * managing infrastructure plans.
 * 
 * Key Features:
 * - Interactive element selection
 * - Layer-to-layer transfer
 * - Attribute preservation
 * - Visual feedback during selection
 * - Batch element transfer
 * - Parent layer selection
 * 
 * Workflow:
 * 1. User selects source (parent) layer
 * 2. Chooses destination sublayer
 * 3. Selects elements to transfer (by clicking)
 * 4. Confirmation moves elements to new layer
 * 5. Layer metadata updated automatically
 * 
 * Technical Details:
 * - Preserves all GeoJSON properties
 * - Updates layer membership
 * - Maintains visual styling
 * - Handles both line and point geometries
 * - Updates legend automatically
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - Parent and target sublayer selection from layerConfig.
 * - Map interactions for feature selection.
 *
 * Public API:
 * - activateSwitchSublayerTool(): Start sublayer switching workflow.
 * 
 * ================================================================================
 */


/**
 * Begin the sublayer-switching workflow.
 *
 * Validates that at least one eligible parent layer is loaded, then
 * presents a selection dialog that lets the user choose a parent layer and
 * a destination sublayer. After confirmation, click handlers are attached
 * to every matching element so the user can mark features for transfer.
 * Completes by moving the selected elements to the destination sublayer and
 * updating the legend.
 *
 * @returns {void}
 */
function startSublayerSwitchFlow() {
  const parentOptions = getEligibleSublayerParents();
  if (!parentOptions.length) {
    showInfoPopup('No eligible parent layers are currently loaded. Please ensure at least one base layer is available before switching to a sublayer.', '🧩 Switch to Sublayer');
    currentMode = 'info';
    activateInfoMode();
    return;
  }

  const select = document.createElement('select');
  select.id = 'sublayer-parent-select';
  select.style.width = '100%';
  select.style.padding = '10px';
  select.style.border = '1px solid #ccc';
  select.style.borderRadius = '4px';
  select.style.marginTop = '10px';
  select.style.fontSize = '14px';

  parentOptions.forEach((config, index) => {
    const option = document.createElement('option');
    option.value = config.filename;
    option.textContent = `${config.legendName} (${config.type || 'Layer'})`;
    if (index === 0) option.selected = true;
    select.appendChild(option);
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(select);

  showCustomPopup(
    '🧩 Switch to Sublayer - Step 1',
    '<p style="text-align: center; margin: 15px 0;">Choose the parent layer that currently contains the elements you want to move.</p>',
    [
      {
        text: 'Next',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          const selectedFilename = select.value;
          if (!selectedFilename) {
            showInfoPopup('Please select a parent layer.', '🧩 Switch to Sublayer');
            return;
          }
          const parentConfig = parentOptions.find(cfg => cfg.filename === selectedFilename);
          if (!parentConfig) {
            showInfoPopup('The selected parent layer is no longer available.', '🧩 Switch to Sublayer');
            return;
          }
          closeCustomPopup();
          promptSublayerTargetSelection(parentConfig);
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {
          currentMode = 'info';
          activateInfoMode();
        }
      }
    ],
    wrapper
  );
}

function getEligibleSublayerParents() {
  if (!Array.isArray(layerConfig)) return [];
  return layerConfig.filter(config => config && config.enabled !== false && !config.isSublayer);
}

function promptSublayerTargetSelection(parentConfig) {
  const existingSublayers = Array.isArray(parentConfig.childSublayers) ? parentConfig.childSublayers : [];
  const targetSelect = document.createElement('select');
  targetSelect.id = 'sublayer-target-select';
  targetSelect.style.width = '100%';
  targetSelect.style.padding = '10px';
  targetSelect.style.border = '1px solid #ccc';
  targetSelect.style.borderRadius = '4px';
  targetSelect.style.marginTop = '10px';
  targetSelect.style.fontSize = '14px';

  existingSublayers.forEach((child, index) => {
    const option = document.createElement('option');
    option.value = child.filename;
    option.textContent = `${child.legendName} (existing)`;
    if (index === 0) option.selected = true;
    targetSelect.appendChild(option);
  });

  const createOption = document.createElement('option');
  createOption.value = '__create__';
  createOption.textContent = '➕ Create new sublayer';
  if (!existingSublayers.length) {
    createOption.selected = true;
  }
  targetSelect.appendChild(createOption);

  const nameInput = document.createElement('input');
  nameInput.id = 'new-sublayer-name';
  nameInput.type = 'text';
  nameInput.placeholder = 'e.g., Planned Expansions';
  nameInput.style.width = '100%';
  nameInput.style.padding = '10px';
  nameInput.style.border = '1px solid #ccc';
  nameInput.style.borderRadius = '4px';
  nameInput.style.marginTop = '10px';
  nameInput.style.fontSize = '14px';
  nameInput.style.maxWidth = '280px';
  nameInput.style.marginLeft = 'auto';
  nameInput.style.marginRight = 'auto';
  nameInput.style.textAlign = 'center';
  nameInput.style.display = existingSublayers.length ? 'none' : 'block';

  targetSelect.addEventListener('change', () => {
    nameInput.style.display = targetSelect.value === '__create__' ? 'block' : 'none';
    if (targetSelect.value === '__create__') {
      nameInput.focus();
    }
  });

  const wrapper = document.createElement('div');
  wrapper.appendChild(targetSelect);
  wrapper.appendChild(nameInput);

  showCustomPopup(
    '🧩 Switch to Sublayer - Step 2',
    `<p style="text-align: center; margin: 15px 0;">Parent Layer: <strong>${parentConfig.legendName}</strong><br>Select an existing sublayer or create a new one.</p>`,
    [
      {
        text: 'Back',
        type: 'secondary',
        onClick: () => {
          closeCustomPopup();
          startSublayerSwitchFlow();
        }
      },
      {
        text: 'Next',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          const selectedValue = targetSelect.value;
          let targetConfig = null;
          if (selectedValue === '__create__') {
            const desiredName = sanitizeSublayerLegendName(nameInput.value);
            if (!desiredName || desiredName.length < 3) {
              showInfoPopup('Please provide a sublayer name with at least 3 characters.', '🧩 Switch to Sublayer');
              nameInput.focus();
              return;
            }
            targetConfig = createRuntimeSublayerConfig(parentConfig, desiredName);
          } else {
            targetConfig = existingSublayers.find(cfg => cfg.filename === selectedValue);
          }

          if (!targetConfig) {
            showInfoPopup('Unable to determine the target sublayer. Please try again.', '🧩 Switch to Sublayer');
            return;
          }

          closeCustomPopup();
          prepareSublayerSelection(parentConfig, targetConfig);
        }
      }
    ],
    wrapper
  );
}

function createRuntimeSublayerConfig(parentConfig, legendName) {
  const safeLegendName = sanitizeSublayerLegendName(legendName);
  const filename = generateUniqueSublayerFilename(parentConfig, safeLegendName);
  const newConfig = {
    filename,
    legendName: safeLegendName,
    color: parentConfig.color,
    markerType: parentConfig.markerType,
    size: parentConfig.size,
    type: parentConfig.type,
    enabled: true,
    parentFilename: parentConfig.filename
  };
  insertConfigAfterParent(parentConfig, newConfig);
  updateLegendControl();
  invalidateStyleableLayerRegistry();
  ensureLayerInstanceForConfig(newConfig);
  return newConfig;
}

function prepareSublayerSelection(parentConfig, targetConfig) {
  if (!parentConfig || !targetConfig) {
    showInfoPopup('Missing target information for sublayer selection.', '🧩 Switch to Sublayer');
    return;
  }

  if ((parentConfig.type || '').toLowerCase() !== (targetConfig.type || '').toLowerCase()) {
    showInfoPopup('The selected sublayer has a different geometry type than its parent. Please choose a matching sublayer.', '🧩 Switch to Sublayer');
    return;
  }

  reapplyActiveCountryFilterState();

  const parentLayer = dynamicLayers[parentConfig.layerName] || getLegacyLayerReference(parentConfig.elementKey);
  const targetLayer = dynamicLayers[targetConfig.layerName] || getLegacyLayerReference(targetConfig.elementKey);

  if (!parentLayer) {
    showInfoPopup('The parent layer is not available on the map.', '🧩 Switch to Sublayer');
    return;
  }

  let featureCount = 0;
  parentLayer.eachLayer(() => { featureCount++; });
  if (featureCount === 0) {
    showInfoPopup('The selected parent layer does not contain any elements to move.', '🧩 Switch to Sublayer');
    currentMode = 'info';
    activateInfoMode();
    return;
  }

  const context = {
    parentConfig,
    targetConfig,
    parentLayer,
    targetLayer,
    selectedLayers: new Set(),
    hiddenLayers: [],
    boundHandlers: new Map(),
    parentLayerWasVisible: parentLayer ? map.hasLayer(parentLayer) : false,
    displayLayer: resolveDisplayLayerForParent(parentConfig, parentLayer),
    displayLayerWasVisible: false,
    usingFilteredDisplayLayer: false,
    parentLayerAddedForSelection: false,
    filterMaskedLayers: []
  };
  context.displayLayerWasVisible = context.displayLayer ? map.hasLayer(context.displayLayer) : false;
  context.usingFilteredDisplayLayer = !!(context.displayLayer && context.displayLayer !== context.parentLayer && context.displayLayerWasVisible);
  sublayerOperationContext = context;

  showCustomPopup(
    '🧩 Switch to Sublayer - Step 3',
    '<p style="text-align: center; margin: 15px 0;">Click "Start Selection" to isolate the parent layer and choose the elements you want to move.</p>',
    [
      {
        text: 'Start Selection',
        type: 'primary',
        keepOpen: true,
        onClick: () => {
          closeCustomPopup();
          beginSublayerSelection(context);
        }
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {
          sublayerOperationContext = null;
          currentMode = 'info';
          activateInfoMode();
        }
      }
    ]
  );
}

function resolveDisplayLayerForParent(parentConfig, fallbackLayer) {
  if (!parentConfig) return fallbackLayer;
  const metadata = layerMetadataRegistry[parentConfig.layerName];
  const elementKey = parentConfig.elementKey || metadata?.elementKey;
  if (!elementKey) return fallbackLayer;
  const matchesParentLayer = (candidate) => {
    if (!candidate) return false;
    const layerMeta = candidate._qgasMeta;
    if (!layerMeta) return false;
    if (parentConfig.layerName && layerMeta.layerName === parentConfig.layerName) {
      return true;
    }
    if (parentConfig.filename && layerMeta.filename) {
      const parentFile = normalizeFilenameReference(parentConfig.filename);
      const candidateFile = normalizeFilenameReference(layerMeta.filename);
      if (parentFile && candidateFile && parentFile === candidateFile) {
        return true;
      }
    }
    return false;
  };

  const legacyLayer = getLegacyLayerReference(elementKey);
  if (legacyLayer && matchesParentLayer(legacyLayer)) {
    return legacyLayer;
  }
  const candidateLayers = getLayersForElementType(elementKey);
  if (Array.isArray(candidateLayers)) {
    for (const candidate of candidateLayers) {
      if (matchesParentLayer(candidate)) {
        return candidate;
      }
    }
  }
  return fallbackLayer;
}

function beginSublayerSelection(context) {
  if (!context) return;
  ensureParentLayerVisibleForSelection(context);
  isolateParentLayerVisibility(context);
  applyActiveCountryFilterMask(context);
  attachSublayerSelectionHandlers(context);
  openSublayerSelectionHud(context);
}

function isolateParentLayerVisibility(context) {
  const hidden = [];
  Object.values(dynamicLayers || {}).forEach(layer => {
    if (!layer || layer === context.parentLayer || layer === context.displayLayer) return;
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
      hidden.push(layer);
    }
  });

  const legacyLayers = [pipelineLayer, estimatedPipelinesLayer, nodeLayer, powerplantsLayer, compressorsLayer, lngLayer, storageLayer, consumptionLayer];
  legacyLayers.forEach(layer => {
    if (!layer || layer === context.parentLayer || layer === context.displayLayer) return;
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
      hidden.push(layer);
    }
  });

  context.hiddenLayers = hidden;
}

function ensureParentLayerVisibleForSelection(context) {
  if (!context || !map) return;
  if (context.usingFilteredDisplayLayer) {
    if (context.displayLayer && !map.hasLayer(context.displayLayer)) {
      map.addLayer(context.displayLayer);
    }
    return;
  }
  if (context.parentLayer && !context.parentLayerWasVisible) {
    map.addLayer(context.parentLayer);
    context.parentLayerAddedForSelection = true;
  }
}

function applyActiveCountryFilterMask(context) {
  if (!context || !context.parentLayer) {
    context.filterMaskedLayers = [];
    return;
  }
  if (context.usingFilteredDisplayLayer) {
    context.filterMaskedLayers = [];
    return;
  }
  const hasActiveFilter = (selectedCountries instanceof Set) && selectedCountries.size > 0;
  if (!hasActiveFilter) {
    context.filterMaskedLayers = [];
    return;
  }

  const geometryType = (context.parentConfig?.type || '').toLowerCase();
  const matcher = geometryType === 'line' ? shouldShowPipeline : shouldShowElement;
  const maskedLayers = [];

  context.parentLayer.eachLayer(layer => {
    if (!layer || !layer.feature) return;
    if (matcher(layer.feature, selectedCountries)) {
      return;
    }
    const detachedEntry = detachLayerForSublayerFilter(layer, context.parentLayer);
    if (detachedEntry) {
      maskedLayers.push(detachedEntry);
    }
  });

  context.filterMaskedLayers = maskedLayers;
}

function detachLayerForSublayerFilter(layer, parentLayer) {
  if (!layer || !parentLayer || typeof parentLayer.removeLayer !== 'function') {
    return null;
  }
  const entry = {
    layer,
    clickLayer: layer._clickLayer || null,
    clickLayerWasVisible: !!(layer._clickLayer && map && map.hasLayer(layer._clickLayer))
  };
  parentLayer.removeLayer(layer);
  if (entry.clickLayer && entry.clickLayerWasVisible) {
    map.removeLayer(entry.clickLayer);
  }
  return entry;
}

function openSublayerSelectionHud(context) {
  const hudContent = `
    <p style="margin-bottom: 10px;">
      Parent Layer: <strong>${context.parentConfig.legendName}</strong><br>
      Target Sublayer: <strong>${context.targetConfig.legendName}</strong>
    </p>
    <p id="sublayer-selection-counter" style="font-weight: bold;">Selected: 0 elements</p>
    <p style="font-size: 13px; color: #555;">Click features on the map to toggle selection.<br>Only the parent layer is visible.</p>
  `;

  showCustomPopup(
    '🧩 Switch to Sublayer',
    hudContent,
    [
      {
        text: 'Confirm Move',
        type: 'primary',
        keepOpen: true,
        onClick: finalizeSublayerTransfer
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => cancelSublayerSelection('Transfer cancelled.')
      }
    ]
  );
  dockCustomPopupBottomRight();
  updateSublayerSelectionCounter(context);
}

function attachSublayerSelectionHandlers(context) {
  if (!context) return;
  const displayCandidate = context.displayLayer || context.parentLayer;
  if (!displayCandidate) return;

  if (context.boundHandlers && context.boundHandlers.size) {
    context.boundHandlers.forEach((handler, layer) => {
      if (layer && typeof layer.off === 'function') {
        layer.off('click', handler);
      }
    });
  }

  context.boundHandlers = new Map();
  const wiredLayers = new Set();
  const visitedRoots = new Set();
  let boundCount = 0;

  const enablePointerEvents = (candidate) => {
    if (!candidate) return;
    if (candidate.options) {
      candidate.options.interactive = true;
    }
    const domNode = candidate._path || (typeof candidate.getElement === 'function' ? candidate.getElement() : null);
    if (domNode && domNode.style) {
      domNode.style.pointerEvents = 'auto';
    }
  };

  const bindHandlerToLayer = (candidate) => {
    if (!candidate || typeof candidate.on !== 'function') return;
    const feature = candidate.feature;
    const geometryType = feature?.geometry?.type;
    if (!geometryType) return;

      /*
       * Only attach to actual geometries we can toggle (lines, polygons, points).
       */
    const isSelectableGeometry = /LineString|Polygon|Point/i.test(geometryType);
    if (!isSelectableGeometry) return;

    const layerId = (typeof L !== 'undefined' && typeof L.stamp === 'function') ? L.stamp(candidate) : null;
    if (layerId && wiredLayers.has(layerId)) {
      return;
    }
    if (layerId) {
      wiredLayers.add(layerId);
    }

    candidate.off('click');
    const handler = (e) => {
      if (e) {
        const domEvent = e.originalEvent || e;
        if (typeof L.DomEvent.stop === 'function') {
          L.DomEvent.stop(domEvent);
        } else if (typeof L.DomEvent.stopPropagation === 'function') {
          L.DomEvent.stopPropagation(domEvent);
        }
      }
      console.debug('[Sublayer] Feature clicked for selection', candidate.feature?.properties?.ID || candidate.feature?.properties?.Name || layerId);
      toggleSublayerSelection(candidate, context);
    };

    candidate.on('click', handler);
    context.boundHandlers.set(candidate, handler);
    enablePointerEvents(candidate);
    boundCount++;

    /*
     * Ensure associated click-layer proxies also trigger the same selection handler.
     */
    if (candidate._clickLayer && typeof candidate._clickLayer.eachLayer === 'function') {
      candidate._clickLayer.eachLayer(clickChild => {
        if (!clickChild || typeof clickChild.on !== 'function') return;
        clickChild.off('click');
        const proxyHandler = (evt) => {
          if (evt) {
            const domEvt = evt.originalEvent || evt;
            if (typeof L.DomEvent.stop === 'function') {
              L.DomEvent.stop(domEvt);
            } else if (typeof L.DomEvent.stopPropagation === 'function') {
              L.DomEvent.stopPropagation(domEvt);
            }
          }
          toggleSublayerSelection(candidate, context);
        };
        clickChild.on('click', proxyHandler);
        context.boundHandlers.set(clickChild, proxyHandler);
        enablePointerEvents(clickChild);
      });
    }
  };

  const traverseAndBind = (rootLayer) => {
    if (!rootLayer || visitedRoots.has(rootLayer)) return;
    visitedRoots.add(rootLayer);
    if (typeof rootLayer.eachLayer === 'function') {
      traverseLayerRecursively(rootLayer, bindHandlerToLayer);
    } else {
      bindHandlerToLayer(rootLayer);
    }
  };

  traverseAndBind(displayCandidate);

  if (!boundCount && context.parentLayer && context.parentLayer !== displayCandidate) {
    console.warn('Sublayer selection: no elements detected on display layer, falling back to parent layer.', context.parentConfig?.legendName);
    traverseAndBind(context.parentLayer);
  }

  if (!boundCount) {
    console.warn('Sublayer selection: no selectable features found for', context.parentConfig?.legendName);
    showInfoPopup('No selectable features were detected on the chosen parent layer. Please ensure it is visible and contains elements before retrying.', '🧩 Switch to Sublayer');
  } else {
    console.log(`Sublayer selection handlers attached for ${boundCount} feature${boundCount === 1 ? '' : 's'}.`);
  }
}

function toggleSublayerSelection(layer, context) {
  if (!context) return;
  const alreadySelected = context.selectedLayers.has(layer);
  if (alreadySelected) {
    context.selectedLayers.delete(layer);
    resetSublayerHighlight(layer);
  } else {
    context.selectedLayers.add(layer);
    highlightLayerForSublayer(layer);
  }
  updateSublayerSelectionCounter(context);
  console.debug('[Sublayer] current selection size:', context.selectedLayers.size);
}

function highlightLayerForSublayer(layer) {
  if (!layer) return;
  if (!layer._originalSublayerStyle) {
    layer._originalSublayerStyle = {
      color: layer.options?.color,
      weight: layer.options?.weight,
      opacity: layer.options?.opacity,
      fillColor: layer.options?.fillColor,
      fillOpacity: layer.options?.fillOpacity,
      radius: typeof layer.options?.radius === 'number' ? layer.options.radius : null,
      dashArray: layer.options?.dashArray || null
    };
  }

  const highlightColor = '#ff1744';
  const baseWeight = layer._originalSublayerStyle.weight || 3;
  const applyToPath = (target) => {
    if (target && target._path) {
      target._path.style.stroke = highlightColor;
      target._path.style.strokeWidth = `${Math.max(baseWeight + 3, 6)}px`;
      target._path.style.strokeDasharray = '';
      target._path.style.filter = 'drop-shadow(0 0 10px rgba(255,23,68,0.45))';
    }
  };
  if (layer.setStyle) {
    layer.setStyle({
      color: highlightColor,
      fillColor: highlightColor,
      weight: Math.max(baseWeight + 3, 6),
      opacity: 1,
      fillOpacity: 0.95,
      dashArray: null
    });
  }
  if (typeof layer.setRadius === 'function' && layer._originalSublayerStyle.radius) {
    layer.setRadius(layer._originalSublayerStyle.radius * 1.4);
  }
  applyToPath(layer);
  if (layer._clickLayer) {
    applyToPath(layer._clickLayer);
  }
}

function resetSublayerHighlight(layer) {
  if (!layer || !layer._originalSublayerStyle) return;
  const style = layer._originalSublayerStyle;
  if (layer.setStyle) {
    layer.setStyle({
      color: style.color,
      fillColor: style.fillColor,
      weight: style.weight,
      opacity: style.opacity,
      fillOpacity: style.fillOpacity
    });
  }
  if (typeof layer.setRadius === 'function' && style.radius) {
    layer.setRadius(style.radius);
  }
  if (layer._path) {
    layer._path.style.filter = '';
  }
}

function updateSublayerSelectionCounter(context) {
  const counter = document.getElementById('sublayer-selection-counter');
  if (!counter || !context) return;
  const count = context.selectedLayers.size;
  counter.textContent = `Selected: ${count} element${count === 1 ? '' : 's'}`;
}

function cancelSublayerSelection(message) {
  cleanupSublayerOperation(message || 'Selection aborted.');
}

function cleanupSublayerOperation(message) {
  if (!sublayerOperationContext) {
    if (message) {
      showInfoPopup(message, '🧩 Switch to Sublayer');
    }
    return;
  }

  const context = sublayerOperationContext;
  if (context.boundHandlers) {
    context.boundHandlers.forEach((handler, layer) => {
      if (layer) {
        layer.off('click', handler);
      }
    });
  }

  context.selectedLayers.forEach(layer => resetSublayerHighlight(layer));
  context.selectedLayers.clear();

  if (Array.isArray(context.hiddenLayers)) {
    context.hiddenLayers.forEach(layer => {
      if (layer && !map.hasLayer(layer)) {
        map.addLayer(layer);
      }
    });
  }

  if (Array.isArray(context.filterMaskedLayers) && context.parentLayer) {
    context.filterMaskedLayers.forEach(entry => {
      if (!entry || !entry.layer) return;
      if (typeof context.parentLayer.addLayer === 'function') {
        context.parentLayer.addLayer(entry.layer);
      }
      if (entry.clickLayer && entry.clickLayerWasVisible && map && map.hasLayer(context.parentLayer)) {
        map.addLayer(entry.clickLayer);
      }
    });
    context.filterMaskedLayers = [];
  }

  if (context.parentLayer && context.parentLayerAddedForSelection && map.hasLayer(context.parentLayer)) {
    map.removeLayer(context.parentLayer);
  }

  reapplyActiveCountryFilterState();

  sublayerOperationContext = null;
  closeCustomPopup();
  currentMode = 'info';
  activateInfoMode();
  if (message) {
    showInfoPopup(message, '🧩 Switch to Sublayer');
  }
}

function finalizeSublayerTransfer() {
  const context = sublayerOperationContext;
  if (!context) return;
  if (!context.selectedLayers.size) {
    showInfoPopup('Select at least one element before confirming the transfer.', '🧩 Switch to Sublayer');
    return;
  }
  if (!context.targetLayer) {
    showInfoPopup('The target sublayer is not available. Please restart the tool.', '🧩 Switch to Sublayer');
    return;
  }

  const targetMetadata = layerMetadataRegistry[context.targetConfig.layerName];
  let movedCount = 0;
  context.selectedLayers.forEach(layer => {
    const moved = moveLayerToSublayer(layer, context, targetMetadata);
    if (moved) {
      movedCount++;
    }
  });

  const summary = `${movedCount} element${movedCount === 1 ? '' : 's'} moved to ${context.targetConfig.legendName}.`;
  cleanupSublayerOperation(summary);
}

function moveLayerToSublayer(layer, context, targetMetadata) {
  if (!layer || !context || !context.parentLayer || !context.targetLayer) {
    return false;
  }

  resetSublayerHighlight(layer);
  delete layer._originalSublayerStyle;
  context.parentLayer.removeLayer(layer);
  context.targetLayer.addLayer(layer);

  if (targetMetadata) {
    assignMetadataToLayer(layer, targetMetadata);
  }

  const feature = layer.feature || (layer.feature = { type: 'Feature', properties: {}, geometry: layer.toGeoJSON?.().geometry || null });
  if (feature.properties) {
    feature.properties.Layer_Name = context.targetConfig.legendName;
    feature.properties.SubLayer = context.targetConfig.legendName;
    feature.properties.modified = true;
    feature.properties.__elementKey = targetMetadata?.elementKey || feature.properties.__elementKey;
  }

  applyTargetLayerStyling(layer, context.targetConfig);
  return true;
}

function applyTargetLayerStyling(layer, config) {
  if (!layer || !config) return;
  const isLine = isLineLayerType(config.type);
  if (isLine && layer.setStyle) {
    layer.setStyle({
      color: config.color || '#3388ff',
      weight: config.size || 3,
      opacity: 0.85
    });
    layer._originalColor = config.color;
    layer._originalWeight = config.size;
    layer._originalOpacity = 0.85;
    layer._originalDashArray = null;
  } else if (layer.setStyle) {
    layer.setStyle({
      color: '#000',
      weight: 1,
      opacity: 1,
      fillColor: config.color || '#ff7800',
      fillOpacity: 0.85
    });
    if (typeof layer.setRadius === 'function' && config.size) {
      layer.setRadius(config.size);
    }
    captureOriginalMarkerStyle(layer, 'default');
  }
}

/*
 * ================================================================================
 * Infrastructure Plan Georeferencing
 * ================================================================================
 */

const planLayers = [];
const loadedPlanIds = new Set();
const planGeorefState = {
  imageDataUrl: null,
  imageName: '',
  legendName: '',
  controlPairs: [],
  pendingImagePoint: null,
  awaitingMapPoint: false,
  mapClickHandler: null,
  imageNaturalWidth: 0,
  imageNaturalHeight: 0,
  zoom: 1,
  markers: new Map(),
  pendingMarkerEl: null,
  activePlanId: null,
  imageReady: false,
  viewportDragging: false,
  viewportDragMoved: false,
  viewportPointerActive: false,
  viewportPointerId: null,
  viewportDragStartX: 0,
  viewportDragStartY: 0,
  viewportStartScrollLeft: 0,
  viewportStartScrollTop: 0
};

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
}

function normalizePlanControlPairs(controlPairs = []) {
  if (!Array.isArray(controlPairs)) return [];
  return controlPairs
    .map((pair, idx) => {
      if (!pair || !pair.image || typeof pair.image.x !== 'number' || typeof pair.image.y !== 'number') {
        return null;
      }
      const lat = pair.latlng?.lat;
      const lng = pair.latlng?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return null;
      }
      return {
        id: pair.id || `plan-pt-${idx}`,
        image: { x: pair.image.x, y: pair.image.y },
        latlng: L.latLng(lat, lng)
      };
    })
    .filter(Boolean);
}

function sanitizePlanFolderSegment(segment) {
  const cleaned = sanitizeRelativePath(segment || '')
    .replace(/^\.+\/+/, '')
    .replace(/^Infrastructure_Plans\/+/, '')
    .replace(/\.\./g, '')
    .replace(/^\//, '');
  return cleaned;
}

function initializePlanGeorefUI() {
  if (window._planGeorefInitialized) return;
  window._planGeorefInitialized = true;

  const fileInput = document.getElementById('plan-file-input');
  const selectMapBtn = document.getElementById('plan-select-map-point');
  const clearPendingBtn = document.getElementById('plan-clear-pending');
  const finishBtn = document.getElementById('plan-finish-btn');
  const closeBtn = document.getElementById('plan-georef-close-btn');
  const resumeBtn = document.getElementById('plan-georef-resume-btn');
  const zoomSlider = document.getElementById('plan-zoom-slider');
  const legendNameInput = document.getElementById('plan-legend-name');
  const imageStage = document.getElementById('plan-image-stage');
  const imageEl = document.getElementById('plan-georef-image');
  const viewport = document.getElementById('plan-image-viewport');

  if (fileInput) {
    fileInput.addEventListener('change', (window.window.handlePlanFileSelection || function(){ console.warn('window.handlePlanFileSelection not available'); }));
  }
  if (selectMapBtn) {
    selectMapBtn.addEventListener('click', requestPlanMapPoint);
  }
  if (clearPendingBtn) {
    clearPendingBtn.addEventListener('click', () => {
      clearPendingPlanPoint();
    });
  }
  if (finishBtn) {
    finishBtn.addEventListener('click', finalizePlanGeoref);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', cancelPlanGeorefWorkflow);
  }
  if (resumeBtn) {
    resumeBtn.addEventListener('click', resumePlanOverlayFromMap);
  }
  if (zoomSlider) {
    zoomSlider.addEventListener('input', handlePlanZoomChange);
  }
  if (legendNameInput) {
    legendNameInput.addEventListener('input', (e) => {
      planGeorefState.legendName = (e.target.value || '').trim();
    });
  }
  if (imageStage) {
    imageStage.addEventListener('click', handlePlanImageClick);
  }
  if (viewport) {
    setupPlanViewportInteractions(viewport);
  }
}

function setupPlanViewportInteractions(viewport) {
  if (!viewport || viewport._planViewportInitialized) return;
  viewport._planViewportInitialized = true;
  viewport.addEventListener('pointerdown', handlePlanViewportPointerDown);
  viewport.addEventListener('pointermove', handlePlanViewportPointerMove);
  viewport.addEventListener('pointerup', handlePlanViewportPointerUp);
  viewport.addEventListener('pointerleave', handlePlanViewportPointerUp);
  viewport.addEventListener('pointercancel', handlePlanViewportPointerUp);
  viewport.addEventListener('wheel', handlePlanViewportWheel, { passive: false });
}

function handlePlanViewportPointerDown(event) {
  if (event.button !== 0) return;
  const viewport = event.currentTarget;
  planGeorefState.viewportPointerActive = true;
  planGeorefState.viewportDragging = false;
  planGeorefState.viewportDragMoved = false;
  planGeorefState.viewportPointerId = event.pointerId;
  planGeorefState.viewportDragStartX = event.clientX;
  planGeorefState.viewportDragStartY = event.clientY;
  planGeorefState.viewportStartScrollLeft = viewport.scrollLeft;
  planGeorefState.viewportStartScrollTop = viewport.scrollTop;
}

function handlePlanViewportPointerMove(event) {
  if (!planGeorefState.viewportPointerActive || planGeorefState.viewportPointerId !== event.pointerId) return;
  const viewport = event.currentTarget;
  const dx = event.clientX - planGeorefState.viewportDragStartX;
  const dy = event.clientY - planGeorefState.viewportDragStartY;
  if (!planGeorefState.viewportDragging) {
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      planGeorefState.viewportDragging = true;
      planGeorefState.viewportDragMoved = true;
      viewport.classList.add('plan-viewport--dragging');
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch (err) {
        /* Ignore pointer capture failures for non-supporting browsers. */
      }
    } else {
      return;
    }
  }
  viewport.scrollLeft = planGeorefState.viewportStartScrollLeft - dx;
  viewport.scrollTop = planGeorefState.viewportStartScrollTop - dy;
}

function handlePlanViewportPointerUp(event) {
  if (!planGeorefState.viewportPointerActive) return;
  const pointerId = planGeorefState.viewportPointerId;
  if (event && pointerId !== null && event.pointerId !== pointerId) return;
  const viewport = event ? event.currentTarget : document.getElementById('plan-image-viewport');
  const wasDragging = planGeorefState.viewportDragging;
  planGeorefState.viewportPointerActive = false;
  planGeorefState.viewportDragging = false;
  planGeorefState.viewportPointerId = null;
  if (viewport) {
    viewport.classList.remove('plan-viewport--dragging');
    if (wasDragging && pointerId !== null) {
      try {
        viewport.releasePointerCapture(pointerId);
      } catch (err) {
        /* Ignore pointer release failures if already released. */
      }
    }
  }
  setTimeout(() => {
    if (!planGeorefState.viewportDragging) {
      planGeorefState.viewportDragMoved = false;
    }
  }, 0);
}

function handlePlanViewportWheel(event) {
  if (!planGeorefState.imageReady) return;
  event.preventDefault();
  const slider = document.getElementById('plan-zoom-slider');
  if (!slider) return;
  const min = parseInt(slider.min, 10) || 25;
  const max = parseInt(slider.max, 10) || 200;
  const current = parseInt(slider.value, 10) || 100;
  const step = event.deltaY < 0 ? 5 : -5;
  let next = Math.min(max, Math.max(min, current + step));
  if (next === current) return;
  const viewport = event.currentTarget;
  const rect = viewport.getBoundingClientRect();
  const focalX = viewport.scrollLeft + (event.clientX - rect.left);
  const focalY = viewport.scrollTop + (event.clientY - rect.top);
  const oldWidth = planGeorefState.imageNaturalWidth * planGeorefState.zoom || 1;
  const oldHeight = planGeorefState.imageNaturalHeight * planGeorefState.zoom || 1;
  slider.value = next;
  handlePlanZoomChange({ target: slider });
  const newWidth = planGeorefState.imageNaturalWidth * planGeorefState.zoom || oldWidth;
  const newHeight = planGeorefState.imageNaturalHeight * planGeorefState.zoom || oldHeight;
  const scaleX = newWidth / oldWidth;
  const scaleY = newHeight / oldHeight;
  viewport.scrollLeft = Math.max(0, (focalX * scaleX) - (event.clientX - rect.left));
  viewport.scrollTop = Math.max(0, (focalY * scaleY) - (event.clientY - rect.top));
}
/*
 * Public activation wrapper.
 */
window.activateSwitchSublayerTool = function activateSwitchSublayerTool() {
  deactivateAllModes();
  currentMode = 'switch-sublayer';
  startSublayerSwitchFlow();
};
