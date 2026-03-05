/**
 * QGas - Options UI Module
 *
 * Module Description:
 * Manages the options dialog for styling layers, including color, size, and
 * line style controls, while keeping a global scope for UI compatibility.
 *
 * Author: Dipl.-Ing. Marco Quantschnig
 * Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - DOM elements for options, color, size, and line-type modals.
 * - Layer registries and styling helpers from core modules.
 *
 * Public API:
 * - openOptionsModal(): Open the layer options dialog.
 * - closeOptionsModal(): Close the layer options dialog.
 * - updateLayerColor(layerKey, newColor): Apply color updates to a layer.
 */
/*
 * UI Options module (extracted from core.js).
 * Maintains global scope for UI compatibility.
 */

document.getElementById('size-picker-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeSizePickerModal();
  }
});

document.getElementById('linetype-picker-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeLineTypePickerModal();
  }
});

/*
 * Options modal state and handlers.
 */
let currentLayerBeingChanged = null;

function openOptionsModal() {
  populateLayerList();
  document.getElementById('options-modal').style.display = 'flex';
}

function closeOptionsModal() {
  document.getElementById('options-modal').style.display = 'none';
}

function closeColorPickerModal() {
  document.getElementById('color-picker-modal').style.display = 'none';
}

function closeColorPickerModal() {
  document.getElementById('color-picker-modal').style.display = 'none';
  currentLayerBeingChanged = null;
}

function closeStylePickerModal() {
  document.getElementById('style-picker-modal').style.display = 'none';
  currentLayerBeingChanged = null;
}

function closeSizePickerModal() {
  document.getElementById('size-picker-modal').style.display = 'none';
  currentLayerBeingChanged = null;
}

function closeLineTypePickerModal() {
  document.getElementById('linetype-picker-modal').style.display = 'none';
  currentLayerBeingChanged = null;
}



/*
 * State for style/size pickers (in addition to currentLayerBeingChanged).
 */
let selectedShape = null;
let selectedSize = null;
let selectedLineType = 'solid';

function ensureStyleableLayerRegistry() {
  if (styleableLayerRegistryDirty) {
    styleableLayerRegistry = buildStyleableLayerRegistry();
    styleableLayerRegistryDirty = false;
  }
  return styleableLayerRegistry;
}

function buildStyleableLayerRegistry() {
  const registry = new Map();

  const collectLayerRefs = (entry) => {
    const refs = [];
    if (entry.configRef) {
      const ensuredLayer = ensureLayerInstanceForConfig(entry.configRef);
      if (ensuredLayer && !refs.includes(ensuredLayer)) {
        refs.push(ensuredLayer);
      }
    }
    if (entry.layerName && dynamicLayers[entry.layerName]) {
      const registeredLayer = dynamicLayers[entry.layerName];
      if (registeredLayer && !refs.includes(registeredLayer)) {
        refs.push(registeredLayer);
      }
    }
    const allowElementFallback = !entry.configRef && !entry.layerName && !entry.customLayer;
    if (!refs.length && allowElementFallback && entry.elementKey) {
      const elementLayers = getLayersForElementType(entry.elementKey) || [];
      elementLayers.forEach(layer => {
        if (layer && !refs.includes(layer)) {
          refs.push(layer);
        }
      });
    }
    if (entry.customLayer && !refs.includes(entry.customLayer)) {
      refs.push(entry.customLayer);
    }
    return refs;
  };

  if (Array.isArray(layerConfig)) {
    layerConfig.forEach((config, index) => {
      if (!config) return;
      const geometry = isLineLayerType(config.type) ? 'line' : 'point';
      const shape = geometry === 'line' ? null : (config.shape || config.markerType || 'circle');
      if (geometry !== 'line') {
        config.shape = shape;
      }
      const entryKey = config.layerName || `${(config.legendName || config.filename || 'layer')}_${index}`;
      const entry = {
        key: entryKey,
        name: config.legendName || config.layerName || config.filename || `Layer ${index + 1}`,
        geometry,
        color: config.color || (geometry === 'line' ? '#3388ff' : '#ff7800'),
        size: typeof config.size === 'number' ? config.size : (geometry === 'line' ? 3 : 6),
        shape,
        lineStyle: config.lineStyle || 'solid',
        configRef: config,
        elementKey: config.elementKey,
        layerName: config.layerName,
        layerRefs: [],
        isSublayer: !!config.isSublayer,
        parentLegendName: config.parentConfig?.legendName || null
      };
      entry.layerRefs = collectLayerRefs(entry);
      if (entry.geometry === 'line' && entry.lineStyle && entry.lineStyle !== 'solid' && entry.layerRefs.length) {
        entry.layerRefs.forEach(layerRef => applyLinePattern(layerRef, entry.lineStyle));
      }
      registry.set(entryKey, entry);
    });
  }

  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      if (!layer) return;
      const settings = layer._customLayerSettings || {};
      let geometry = settings.geometryClass || (layer._customLineLayer ? 'line' : 'point');
      if (geometry !== 'line') {
        geometry = 'point';
      }
      const entryKey = layer._optionsKey || `custom-${name.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
      const existingEntry = registry.get(entryKey);
      if (existingEntry) {
        if (Array.isArray(existingEntry.layerRefs) && !existingEntry.layerRefs.includes(layer)) {
          existingEntry.layerRefs.push(layer);
        }
        if (!existingEntry.customLayer) {
          existingEntry.customLayer = layer;
        }
        layer._optionsKey = entryKey;
        return;
      }
      const entry = {
        key: entryKey,
        name,
        geometry,
        color: geometry === 'line'
          ? (layer._customLineColor || settings.color || '#3388ff')
          : (layer._customLayerColor || settings.color || '#ff7800'),
        size: geometry === 'line'
          ? (layer._customLineWeight || settings.size || 4)
          : (settings.radius || settings.size || 6),
        shape: geometry === 'line' ? null : (settings.shape || 'circle'),
        lineStyle: settings.lineStyle || 'solid',
        customLayer: layer,
        elementKey: settings.typeKey,
        layerName: settings.layerName || name,
        layerRefs: [layer]
      };
      if (geometry === 'line' && entry.lineStyle && entry.lineStyle !== 'solid') {
        applyLinePattern(layer, entry.lineStyle);
      }
      registry.set(entryKey, entry);
      layer._optionsKey = entryKey;
    });
  }

  return registry;
}

function getStyleableLayerEntries() {
  const registry = ensureStyleableLayerRegistry();
  return Array.from(registry.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getStyleableLayerEntry(key) {
  if (!key) return null;
  const registry = ensureStyleableLayerRegistry();
  return registry.get(key) || null;
}

function resolveStyleEntryForLayer(layerInstance) {
  if (!layerInstance) return null;
  const registry = ensureStyleableLayerRegistry();
  for (const entry of registry.values()) {
    if (Array.isArray(entry.layerRefs) && entry.layerRefs.includes(layerInstance)) {
      return entry;
    }
  }
  return null;
}

function getLineStyleForLayer(layerInstance) {
  const entry = resolveStyleEntryForLayer(layerInstance);
  if (entry && entry.geometry === 'line') {
    return entry.lineStyle || 'solid';
  }
  if (layerInstance && layerInstance._customLayerSettings && layerInstance._customLayerSettings.lineStyle) {
    return layerInstance._customLayerSettings.lineStyle;
  }
  return 'solid';
}

/*
 * Legacy note: layerConfig now uses a dynamic array (see core module).
 */

function populateLayerList() {
  const layerList = document.getElementById('layer-list');
  layerList.innerHTML = '';

  const entries = getStyleableLayerEntries();
  if (!entries.length) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'layer-item';
    emptyItem.textContent = 'No layers available';
    layerList.appendChild(emptyItem);
    return;
  }

  entries.forEach(entry => {
    const layerItem = document.createElement('div');
    layerItem.className = 'layer-item';

    let iconStyle = '';
    if (entry.geometry === 'line') {
      iconStyle = `width: 20px; height: ${entry.size || 3}px; border-radius: 2px; background-color: ${entry.color};`;
    } else {
      const standardSize = 16;
      iconStyle = `width: ${standardSize}px; height: ${standardSize}px; background-color: ${entry.color}; border: 1px solid #333;`;
      switch(entry.shape) {
        case 'circle':
          iconStyle += ' border-radius: 50%;';
          break;
        case 'square':
          iconStyle += ' border-radius: 0;';
          break;
        case 'triangle':
          iconStyle += ' clip-path: polygon(50% 0%, 0% 100%, 100% 100%);';
          break;
        case 'diamond':
          iconStyle += ' transform: rotate(45deg);';
          break;
        case 'star':
          iconStyle += ' clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);';
          break;
        case 'cross':
          iconStyle += ' clip-path: polygon(20% 0%, 80% 0%, 80% 20%, 100% 20%, 100% 80%, 80% 80%, 80% 100%, 20% 100%, 20% 80%, 0% 80%, 0% 20%, 20% 20%);';
          break;
        default:
          iconStyle += ' border-radius: 50%;';
      }
    }

    const controls = [];
    controls.push(`<button class="change-btn" onclick="openColorPicker('${entry.key}')">Color</button>`);
    if (entry.geometry === 'line') {
      controls.push(`<button class="change-btn" onclick="openLineTypePicker('${entry.key}')">Line Type</button>`);
      controls.push(`<button class="change-btn" onclick="openSizePicker('${entry.key}')">Width</button>`);
    } else {
      controls.push(`<button class="change-btn" onclick="openStylePicker('${entry.key}')">Shape</button>`);
      controls.push(`<button class="change-btn" onclick="openSizePicker('${entry.key}')">Size</button>`);
    }

    const readableLineStyle = (style => {
      switch(style) {
        case 'dotted':
          return 'Line • dotted';
        case 'segmented':
          return 'Line • segmented';
        default:
          return 'Line • solid';
      }
    })(entry.lineStyle || 'solid');

    const readablePointMeta = entry.shape ? `Point • ${entry.shape}` : 'Point layer';
    const metaText = entry.geometry === 'line' ? readableLineStyle : readablePointMeta;

    layerItem.innerHTML = `
      <div class="layer-info-row">
        <div class="layer-icon" style="${iconStyle} margin-right: 10px; display: inline-block;"></div>
        <div class="layer-info-text">
          <span class="layer-name">${entry.name}</span>
          <span class="layer-meta">${metaText}</span>
        </div>
      </div>
      <div class="layer-controls">
        ${controls.join('')}
      </div>
    `;

    layerList.appendChild(layerItem);
  });
}

function openColorPicker(layerKey) {
  currentLayerBeingChanged = layerKey;
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry) return;
  
  document.getElementById('color-picker-title').textContent = `Change ${entry.name} Color`;
  setCustomColorInputs(entry.color);
  populateColorPalette(entry.color);
  selectColor(entry.color);
  document.getElementById('color-picker-modal').style.display = 'flex';
}

function populateColorPalette(activeColor = null) {
  const palette = document.getElementById('color-palette');
  if (!palette) return;
  palette.innerHTML = '';
  const normalizedActive = normalizeColorHex(activeColor || document.getElementById('custom-color-input')?.value);
  const sections = [];

  if (recentColorSelections.length) {
    sections.push({
      title: 'Recently used',
      description: 'Last applied colors',
      colors: [...recentColorSelections]
    });
  }

  quickColorCollections.forEach(section => sections.push(section));

  sections.forEach(section => {
    if (!section || !Array.isArray(section.colors) || !section.colors.length) {
      return;
    }
    const sectionEl = document.createElement('div');
    sectionEl.className = 'color-section';

    const header = document.createElement('div');
    header.className = 'color-section-header';

    const titleEl = document.createElement('span');
    titleEl.className = 'color-section-title';
    titleEl.textContent = section.title || 'Colors';
    header.appendChild(titleEl);

    if (section.description) {
      const hintEl = document.createElement('span');
      hintEl.className = 'color-section-hint';
      hintEl.textContent = section.description;
      header.appendChild(hintEl);
    }

    sectionEl.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'color-swatch-grid';

    section.colors.forEach(color => {
      if (!color) return;
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'color-swatch';
      swatch.dataset.color = color;
      swatch.style.background = color;
      swatch.title = `${color} (${section.title || 'Palette'})`;
      swatch.setAttribute('aria-label', `Use color ${color}`);
      if (normalizeColorHex(color) === normalizedActive) {
        swatch.classList.add('selected');
      }
      swatch.onclick = (event) => {
        selectColor(color, event.currentTarget);
      };
      grid.appendChild(swatch);
    });

    sectionEl.appendChild(grid);
    palette.appendChild(sectionEl);
  });

  if (!palette.children.length) {
    const emptyState = document.createElement('p');
    emptyState.textContent = 'Add a color by entering a HEX value below.';
    emptyState.style.fontSize = '13px';
    emptyState.style.color = '#777';
    palette.appendChild(emptyState);
  }
}

function selectColor(color, sourceElement = null) {
  const normalized = normalizeColorHex(color);
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.classList.remove('selected');
  });
  if (sourceElement) {
    sourceElement.classList.add('selected');
  } else if (normalized) {
    const matching = Array.from(document.querySelectorAll('.color-swatch'))
      .find(swatch => normalizeColorHex(swatch.dataset.color) === normalized);
    if (matching) {
      matching.classList.add('selected');
    }
  }
  setCustomColorInputs(normalized || color);
}

function applyColorChange() {
  if (!currentLayerBeingChanged) return;
  
  const newColor = document.getElementById('custom-color-input').value;
  const layerKey = currentLayerBeingChanged;
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry) return;

  const previousColor = entry.color;
  entry.color = newColor;
  if (entry.configRef) {
    entry.configRef.color = newColor;
  }
  if (entry.customLayer) {
    if (entry.geometry === 'line') {
      entry.customLayer._customLineColor = newColor;
    } else {
      entry.customLayer._customLayerColor = newColor;
      if (entry.customLayer._customLayerSettings) {
        entry.customLayer._customLayerSettings.color = newColor;
      }
    }
  }

  if (entry.geometry === 'line') {
    replaceLineColorUsage(previousColor, newColor);
  }

  updateLayerColor(layerKey, newColor);
  recordRecentColor(newColor);
  
  /* Refresh the layer list UI. */
  populateLayerList();
  
  /* Refresh legend symbols to reflect new colors. */
  updateLegendSymbols();
  
  closeColorPickerModal();
}

function updateLayerColor(layerKey, newColor) {
  console.log(`Ändere ${layerKey} Farbe zu ${newColor}`);
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry) return;

  const applyColor = (targetLayer) => {
    if (!targetLayer) return;
    if (entry.geometry === 'line') {
      applyColorToLineLayer(targetLayer, newColor);
    } else {
      applyColorToPointLayer(targetLayer, newColor, entry);
    }
  };

  const targets = new Set();
  const addTarget = (layer) => {
    if (layer) targets.add(layer);
  };

  if (Array.isArray(entry.layerRefs) && entry.layerRefs.length) {
    entry.layerRefs.forEach(addTarget);
  }

  if (entry.customLayer) {
    addTarget(entry.customLayer);
  }

  const hasDirectTargets = targets.size > 0;
  if (!hasDirectTargets && entry.elementKey && typeof getLayersForElementType === 'function') {
    const elementLayers = getLayersForElementType(entry.elementKey) || [];
    if (elementLayers.length === 1) {
      elementLayers.forEach(addTarget);
    }
  }

  if (!targets.size) return;
  targets.forEach(applyColor);
}

function applyColorToLineLayer(targetLayer, newColor) {
  const visit = (layer) => {
    if (!layer) return;
    if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON) {
      if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => visit(child));
      }
      return;
    }
    if (layer instanceof L.Polyline) {
      layer.setStyle({ color: newColor });
      layer._originalColor = newColor;
    }
  };

  if (targetLayer && typeof targetLayer.eachLayer === 'function') {
    targetLayer.eachLayer(child => visit(child));
  } else {
    visit(targetLayer);
  }
}

function applyColorToPointLayer(targetLayer, newColor, styleEntry) {
  const radius = styleEntry?.size || 6;
  const shape = styleEntry?.shape || 'circle';
  if (targetLayer && targetLayer._customLayerSettings) {
    targetLayer._customLayerSettings.color = newColor;
  }

  const visit = (layer) => {
    if (!layer) return;
    if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON) {
      if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => visit(child));
      }
      return;
    }
    if (layer instanceof L.CircleMarker) {
      const weight = layer.options?.weight ?? 1;
      const fillOpacity = layer.options?.fillOpacity ?? 0.85;
      const opacity = layer.options?.opacity ?? 1;
      layer.setStyle({
        fillColor: newColor,
        color: '#000',
        weight,
        fillOpacity,
        opacity
      });
    } else if (layer instanceof L.Marker && layer.options && layer.options.icon) {
      const newIcon = createCustomIcon(shape, newColor, radius);
      layer.setIcon(newIcon);
    }
    layer._originalColor = newColor;
  };

  if (targetLayer && typeof targetLayer.eachLayer === 'function') {
    targetLayer.eachLayer(child => visit(child));
  } else {
    visit(targetLayer);
  }
}

function getDashArrayForLineType(lineType) {
  switch ((lineType || 'solid').toLowerCase()) {
    case 'dotted':
      return '2 10';
    case 'segmented':
      return '12 8';
    default:
      return null;
  }
}

function applyLinePattern(targetLayer, lineType) {
  const dashArray = getDashArrayForLineType(lineType);
  const visit = (layer) => {
    if (!layer) return;
    if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON) {
      if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => visit(child));
      }
      return;
    }
    if (layer instanceof L.Polyline) {
      layer.setStyle({ dashArray: dashArray || null });
      layer._originalDashArray = dashArray || null;
      if (layer._path) {
        layer._path.style.strokeDasharray = dashArray ? dashArray : '';
      }
    }
  };

  if (targetLayer && typeof targetLayer.eachLayer === 'function' && !(targetLayer instanceof L.Polyline)) {
    targetLayer.eachLayer(child => visit(child));
  } else {
    visit(targetLayer);
  }
}

function applyWidthToLineLayer(targetLayer, newWidth) {
  const visit = (layer) => {
    if (!layer) return;
    if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON) {
      if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => visit(child));
      }
      return;
    }
    if (layer instanceof L.Polyline) {
      const style = { weight: newWidth };
      if (layer.options && typeof layer.options.opacity === 'number') {
        style.opacity = layer.options.opacity;
      }
      layer.setStyle(style);
      layer._originalWeight = newWidth;
      if (layer._path) {
        layer._path.style.strokeWidth = `${newWidth}px`;
      }
    }
  };

  if (targetLayer && typeof targetLayer.eachLayer === 'function') {
    targetLayer.eachLayer(child => visit(child));
  } else {
    visit(targetLayer);
  }
}

function applySizeToPointLayer(targetLayer, newRadius, styleEntry) {
  const color = styleEntry?.color || '#ff7800';
  const shape = styleEntry?.shape || 'circle';

  const visit = (layer) => {
    if (!layer) return;
    if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON) {
      if (typeof layer.eachLayer === 'function') {
        layer.eachLayer(child => visit(child));
      }
      return;
    }
    if (layer instanceof L.CircleMarker) {
      layer.setRadius(newRadius);
      layer._originalRadius = newRadius;
    } else if (layer instanceof L.Marker && layer.options && layer.options.icon) {
      const newIcon = createCustomIcon(shape, color, newRadius);
      layer.setIcon(newIcon);
    }
  };

  if (targetLayer && typeof targetLayer.eachLayer === 'function') {
    targetLayer.eachLayer(child => visit(child));
  } else {
    visit(targetLayer);
  }
}

/*
 * Style picker handlers (point layers only).
 */
function openStylePicker(layerKey) {
  currentLayerBeingChanged = layerKey;
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry || entry.geometry === 'line') return;
  
  document.getElementById('style-picker-title').textContent = `Change ${entry.name} Shape`;
  
  /* Highlight the current shape in the picker UI. */
  document.querySelectorAll('.shape-option').forEach(option => {
    option.classList.remove('selected');
    if (option.dataset.shape === entry.shape) {
      option.classList.add('selected');
    }
  });
  
  document.getElementById('style-picker-modal').style.display = 'flex';
}

function selectShape(shape, sourceElement = null) {
  console.log('selectShape aufgerufen mit:', shape);
  selectedShape = shape;
  
  document.querySelectorAll('.shape-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  const selectedOption = sourceElement || document.querySelector(`[data-shape="${shape}"]`);
  if (selectedOption) {
    selectedOption.classList.add('selected');
    selectedOption.focus();
    console.log('Shape-Option markiert:', shape);
  } else {
    console.log('Fehler: Shape-Option nicht gefunden:', shape);
  }
}

function applyShapeChange() {
  console.log('applyShapeChange aufgerufen');
  console.log('currentLayerBeingChanged:', currentLayerBeingChanged);
  console.log('selectedShape:', selectedShape);
  
  if (currentLayerBeingChanged && selectedShape) {
    const entry = getStyleableLayerEntry(currentLayerBeingChanged);
    if (entry && entry.geometry !== 'line') {
      console.log('Ändere Shape von', entry.name, 'zu', selectedShape);
      entry.shape = selectedShape;
      if (entry.configRef) {
        entry.configRef.shape = selectedShape;
        entry.configRef.markerType = selectedShape;
      }
      if (entry.customLayer && entry.customLayer._customLayerSettings) {
        entry.customLayer._customLayerSettings.shape = selectedShape;
      }
      updateLayerShape(currentLayerBeingChanged, selectedShape);
    }
    /* Update option list and legend to reflect the new shape. */
    populateLayerList();
    updateLegendSymbols();
    
    /* Restore info-mode handlers if the mode is active. */
    if (currentMode === 'info') {
      updateAllElementInteractions();
    }
  } else {
    console.log('Fehler: currentLayerBeingChanged oder selectedShape nicht gesetzt');
  }
  closeStylePickerModal();
}

/*
 * Size picker handlers (line width or point size).
 */
function openSizePicker(layerKey) {
  currentLayerBeingChanged = layerKey;
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry) return;
  
  const isLine = entry.geometry === 'line';
  const currentValue = entry.size || (isLine ? 3 : 6);
  
  document.getElementById('size-picker-title').textContent = 
    `Change ${entry.name} ${isLine ? 'Width' : 'Size'}`;
  
  const slider = document.getElementById('size-slider');
  const preview = document.getElementById('size-preview');
  const label = document.getElementById('size-label');
  
  /* Configure slider bounds and preview for line vs point layers. */
  if (isLine) {
    slider.min = '1';
    slider.max = '10';
    slider.value = currentValue;
    preview.style.width = '30px';
    preview.style.height = currentValue + 'px';
    preview.style.borderRadius = '2px';
    label.textContent = `Width: ${currentValue}px`;
  } else {
    slider.min = '2';
    slider.max = '20';
    slider.value = currentValue;
    const size = currentValue * 2;
    preview.style.width = size + 'px';
    preview.style.height = size + 'px';
    preview.style.borderRadius = '50%';
    label.textContent = `Size: ${currentValue}px`;
  }
  
  /* Sync preview as the slider moves. */
  slider.oninput = function() {
    const value = this.value;
    if (isLine) {
      preview.style.height = value + 'px';
      label.textContent = `Width: ${value}px`;
    } else {
      const size = value * 2;
      preview.style.width = size + 'px';
      preview.style.height = size + 'px';
      label.textContent = `Size: ${value}px`;
    }
    selectedSize = parseInt(value);
  };
  
  selectedSize = currentValue;
  document.getElementById('size-picker-modal').style.display = 'flex';
}

function applySizeChange() {
  if (currentLayerBeingChanged && selectedSize !== null) {
    const entry = getStyleableLayerEntry(currentLayerBeingChanged);
    if (entry) {
      entry.size = selectedSize;
      if (entry.configRef) {
        entry.configRef.size = selectedSize;
      }
      if (entry.customLayer) {
        if (entry.geometry === 'line') {
          entry.customLayer._customLineWeight = selectedSize;
        } else if (entry.customLayer._customLayerSettings) {
          entry.customLayer._customLayerSettings.radius = selectedSize;
          entry.customLayer._customLayerSettings.size = selectedSize;
        }
      }
      updateLayerSize(currentLayerBeingChanged, selectedSize);
    }
    populateLayerList(); // Options-Liste aktualisieren
    updateLegendSymbols(); // Legend aktualisieren
  }
  closeSizePickerModal();
}

function openLineTypePicker(layerKey) {
  currentLayerBeingChanged = layerKey;
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry || entry.geometry !== 'line') return;

  selectedLineType = entry.lineStyle || 'solid';
  document.getElementById('linetype-picker-title').textContent = `Change ${entry.name} Line Type`;

  document.querySelectorAll('#line-type-options .line-type-option').forEach(option => {
    const type = option.dataset.linetype;
    option.classList.toggle('selected', type === selectedLineType);
  });

  document.getElementById('linetype-picker-modal').style.display = 'flex';
}

function selectLineType(lineType, element) {
  selectedLineType = lineType;
  document.querySelectorAll('#line-type-options .line-type-option').forEach(option => {
    option.classList.remove('selected');
  });
  if (element) {
    element.classList.add('selected');
  }
}

function applyLineTypeChange() {
  if (!currentLayerBeingChanged) return;
  updateLineType(currentLayerBeingChanged, selectedLineType || 'solid');
  populateLayerList();
  updateLegendSymbols();
  closeLineTypePickerModal();
}

/*
 * Layer shape and size update helpers.
 */
function updateLayerShape(layerKey, newShape) {
  console.log(`updateLayerShape aufgerufen: ${layerKey} zu ${newShape}`);
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry || entry.geometry === 'line') return;
  if (Array.isArray(entry.layerRefs)) {
    entry.layerRefs.forEach(layer => recreateElementMarkersWithShape(layer, newShape, entry));
  }
}

function updateLineType(layerKey, newLineType) {
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry || entry.geometry !== 'line') return;
  entry.lineStyle = newLineType;
  if (entry.configRef) {
    entry.configRef.lineStyle = newLineType;
  }
  if (entry.customLayer && entry.customLayer._customLayerSettings) {
    entry.customLayer._customLayerSettings.lineStyle = newLineType;
  }
  if (Array.isArray(entry.layerRefs)) {
    entry.layerRefs.forEach(layer => applyLinePattern(layer, newLineType));
  }
}

function updateLayerSize(layerKey, newSize) {
  console.log(`Ändere ${layerKey} Größe zu ${newSize}`);
  const entry = getStyleableLayerEntry(layerKey);
  if (!entry) return;

  const applySize = (targetLayer) => {
    if (!targetLayer) return;
    if (entry.geometry === 'line') {
      applyWidthToLineLayer(targetLayer, newSize);
    } else {
      applySizeToPointLayer(targetLayer, newSize, entry);
    }
  };

  const targets = new Set();
  const addTarget = (layer) => {
    if (layer) targets.add(layer);
  };

  if (Array.isArray(entry.layerRefs) && entry.layerRefs.length) {
    entry.layerRefs.forEach(addTarget);
  }

  if (entry.customLayer) {
    addTarget(entry.customLayer);
  }

  if (!targets.size && entry.elementKey && typeof getLayersForElementType === 'function') {
    const elementLayers = getLayersForElementType(entry.elementKey) || [];
    elementLayers.forEach(addTarget);
  }

  targets.forEach(applySize);
}

function recreateElementMarkersWithShape(elementLayer, newShape, styleEntry = null) {
  console.log('recreateElementMarkersWithShape aufgerufen:', elementLayer, newShape);

  if (!elementLayer) {
    console.log('elementLayer ist undefined/null');
    return;
  }

  const entry = styleEntry || resolveStyleEntryForLayer(elementLayer);
  if (!entry) {
    console.log('Kein Style-Eintrag für Layer gefunden');
    return;
  }

  const color = entry.color || '#ff7800';
  const radius = entry.size || 6;
  const pane = elementLayer.options?.pane || 'overlayPane';

  const markersToRecreate = [];
  elementLayer.eachLayer(layer => {
    if (layer instanceof L.CircleMarker || layer instanceof L.Marker) {
      const latLng = typeof layer.getLatLng === 'function' ? layer.getLatLng() : null;
      if (!latLng) return;
      markersToRecreate.push({
        latLng,
        feature: layer.feature,
        options: { pane: layer.options?.pane || pane }
      });
      elementLayer.removeLayer(layer);
      if (drawnItems && drawnItems.hasLayer(layer)) {
        drawnItems.removeLayer(layer);
      }
    }
  });

  markersToRecreate.forEach(markerData => {
    let newMarker;
    if (newShape === 'circle') {
      newMarker = L.circleMarker(markerData.latLng, {
        radius,
        fillColor: color,
        color: '#333',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
        pane: markerData.options.pane
      });
      captureOriginalMarkerStyle(newMarker, 'default');
    } else {
      const customIcon = createCustomIcon(newShape, color, radius);
      newMarker = L.marker(markerData.latLng, {
        icon: customIcon,
        pane: markerData.options.pane
      });
    }

    if (markerData.feature) {
      newMarker.feature = markerData.feature;
    }

    elementLayer.addLayer(newMarker);
    if (drawnItems) {
      drawnItems.addLayer(newMarker);
    }
    setPointInteraction(newMarker);
  });
}

/*
 * Resolve the style registry key from a layer instance.
 */
function getLayerKeyFromLayer(elementLayer) {
  const entry = resolveStyleEntryForLayer(elementLayer);
  return entry ? entry.key : null;
}

/*
 * Build a custom SVG icon for non-circular point markers.
 */
function createCustomIcon(shape, color, radius) {
  const size = radius * 2;
  let svgContent = '';
  
  switch(shape) {
    case 'square':
      svgContent = `<rect x="2" y="2" width="${size-4}" height="${size-4}" fill="${color}" stroke="#333" stroke-width="1"/>`;
      break;
    case 'triangle':
      const points = `${size/2},2 2,${size-2} ${size-2},${size-2}`;
      svgContent = `<polygon points="${points}" fill="${color}" stroke="#333" stroke-width="1"/>`;
      break;
    case 'diamond':
      const diamondPoints = `${size/2},2 ${size-2},${size/2} ${size/2},${size-2} 2,${size/2}`;
      svgContent = `<polygon points="${diamondPoints}" fill="${color}" stroke="#333" stroke-width="1"/>`;
      break;
    case 'star':
      const starPoints = generateStarPoints(size/2, size/2, 5, size/2-2, size/4);
      svgContent = `<polygon points="${starPoints}" fill="${color}" stroke="#333" stroke-width="1"/>`;
      break;
    case 'cross':
      const crossWidth = size/4;
      svgContent = `
        <rect x="${size/2-crossWidth/2}" y="2" width="${crossWidth}" height="${size-4}" fill="${color}" stroke="#333" stroke-width="1"/>
        <rect x="2" y="${size/2-crossWidth/2}" width="${size-4}" height="${crossWidth}" fill="${color}" stroke="#333" stroke-width="1"/>
      `;
      break;
    default:
      /* Fallback to a circular marker. */
      svgContent = `<circle cx="${size/2}" cy="${size/2}" r="${radius-2}" fill="${color}" stroke="#333" stroke-width="1"/>`;
  }
  
  const svgIcon = L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${svgContent}</svg>`,
    className: 'custom-shape-icon',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
  
  return svgIcon;
}

/*
 * Generate polygon points for a star icon.
 */
function generateStarPoints(cx, cy, spikes, outerRadius, innerRadius) {
  let points = [];
  const step = Math.PI / spikes;
  
  for (let i = 0; i < 2 * spikes; i++) {
    const angle = i * step;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    points.push(`${x},${y}`);
  }
  
  return points.join(' ');
}

/*
 * Generate legend icon HTML based on color and shape.
 */
function generateLegendIcon(color, shape, size = 6) {
  const diameter = Math.max(10, Math.round(size * 2));
  const baseStyle = `width:${diameter}px; height:${diameter}px; display:inline-block; margin-right:6px;`;

  switch(shape) {
    case 'square':
      return `<span class="legend-icon" style="${baseStyle} background:${color}; border-radius:0;"></span>`;
    case 'triangle': {
      /* Use clip-path for a proper triangle shape. */
      return `<span class="legend-icon" style="${baseStyle} background:${color}; clip-path:polygon(50% 0%, 0% 100%, 100% 100%); border-radius:0;"></span>`;
    }
    case 'diamond':
      return `<span class="legend-icon" style="${baseStyle} background:${color}; transform:rotate(45deg); transform-origin:center;"></span>`;
    case 'star':
      return `<span class="legend-icon" style="${baseStyle} background:${color}; clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);"></span>`;
    case 'cross':
      return `<span class="legend-icon" style="${baseStyle} background:${color}; clip-path:polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%);"></span>`;
    default:
      /* Default circle swatch. */
      return `<span class="legend-icon" style="${baseStyle} background:${color}; border-radius:50%;"></span>`;
  }
}

function styleLegendLineElement(element, color, lineStyle = 'solid') {
  if (!element) return;
  const normalized = (lineStyle || 'solid').toLowerCase();
  element.style.boxSizing = 'border-box';
  element.style.borderRadius = '2px';
  element.style.borderColor = color;
  if (normalized === 'solid') {
    element.style.backgroundColor = color;
    element.style.borderWidth = '0';
    element.style.borderStyle = 'solid';
  } else {
    element.style.backgroundColor = 'transparent';
    element.style.borderWidth = '2px';
    element.style.borderStyle = normalized === 'dotted' ? 'dotted' : 'dashed';
  }
}

/*
 * Resolve legend toggle IDs for styleable entries.
 */
function getLegendToggleIdForEntry(entry) {
  if (!entry) return null;
  const candidates = [];
  if (entry.configRef && entry.configRef.filename) {
    candidates.push('toggle-' + entry.configRef.filename.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  if (entry.customLayer && entry.name) {
    candidates.push('toggle-' + entry.name.toLowerCase().replace(/\s+/g, '-'));
  }
  if (!candidates.length) return null;
  const existing = candidates.find(id => document.getElementById(id));
  return existing || candidates[0];
}

function updateLegendSymbols() {
  const legendDiv = document.querySelector('.legend-control');
  if (!legendDiv) return;
  const entries = getStyleableLayerEntries();
  entries.forEach(entry => {
    const toggleId = getLegendToggleIdForEntry(entry);
    if (!toggleId) return;
    const checkbox = document.getElementById(toggleId);
    if (!checkbox) return;
    const label = checkbox.closest('label') || checkbox.parentElement;
    if (!label) return;
    if (entry.geometry === 'line') {
      const lineEl = label.querySelector('.legend-line');
      if (lineEl) {
        const lineHeight = Math.max(2, entry.size || 3);
        lineEl.style.height = `${lineHeight}px`;
        if ((entry.lineStyle || 'solid') !== 'solid') {
          lineEl.style.borderWidth = `${Math.max(2, Math.round(lineHeight / 2))}px`;
        }
        styleLegendLineElement(lineEl, entry.color, entry.lineStyle || 'solid');
      }
    } else {
      const iconEl = label.querySelector('.legend-icon');
      if (iconEl) {
        iconEl.outerHTML = generateLegendIcon(entry.color, entry.shape || 'circle', entry.size || 6);
      }
    }
  });
}


/*
 * Grayscale map toggle and color input bindings.
 */
document.addEventListener('DOMContentLoaded', function() {
  /* Ensure overlays are hidden on load. */
  const toolsOverlay = document.getElementById('tools-popup-overlay');
  const customOverlay = document.getElementById('custom-popup-overlay');
  if (toolsOverlay) toolsOverlay.style.display = 'none';
  if (customOverlay) customOverlay.style.display = 'none';
  initializePlanGeorefUI();
  
  const grayscaleToggle = document.getElementById('grayscale-toggle');
  
  if (grayscaleToggle) {
    grayscaleToggle.addEventListener('change', function() {
      const tilePane = document.querySelector('.leaflet-tile-pane');
      if (this.checked) {
        tilePane.classList.add('map-grayscale');
        console.log('Graustufen-Modus aktiviert - nur Hintergrundkarte');
      } else {
        tilePane.classList.remove('map-grayscale');
        console.log('Graustufen-Modus deaktiviert');
      }
    });
  }

  const customColorInput = document.getElementById('custom-color-input');
  if (customColorInput) {
    customColorInput.addEventListener('input', (event) => {
      const value = event.target.value;
      if (value) {
        selectColor(value);
      }
    });
  }

  const customColorText = document.getElementById('custom-color-text');
  if (customColorText) {
    customColorText.addEventListener('input', (event) => {
      const value = event.target.value;
      if (isValidHexColor(value)) {
        const normalized = normalizeColorHex(value);
        selectColor(normalized);
      }
    });
    customColorText.addEventListener('blur', (event) => {
      const value = event.target.value;
      if (isValidHexColor(value)) {
        const normalized = normalizeColorHex(value);
        selectColor(normalized);
      } else {
        const fallback = document.getElementById('custom-color-input')?.value || '#0070f3';
        setCustomColorInputs(fallback);
      }
    });
  }
});

function createModalPopupContent(properties, layer) {
  console.log('createModalPopupContent properties:', properties);
  // Statisch versteckte Attribute
  const staticHiddenAttributes = [
    'overlap_percentage',
    'overlap_length',
    'Owner',
    'Parent'
  ];
  
  // Dynamisch versteckte Attribute basierend auf Benutzereinstellungen
  const elementType = determineElementType(layer);
  const dynamicHiddenAttributes = hiddenAttributesConfig[elementType] || [];
  
  // Kombiniere beide Listen
  const allHiddenAttributes = [...staticHiddenAttributes, ...dynamicHiddenAttributes];

  let content = '<table class="popup-table">';
  const orderedKeys = getOrderedAttributeKeys(properties, allHiddenAttributes);
  orderedKeys.forEach(key => {
    const value = properties[key];
    content += `<tr>
      <td><strong>${key}:</strong></td>
      <td><input type="text" value="${value || ''}" data-key="${key}" style="width: 200px;"></td>
    </tr>`;
  });
  
  content += '</table>';
  content += '<br><button id="save-attr-btn" style="background: #0070f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Save</button>';
  content += '<button id="add-attribute-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Add Attribute</button>';
  content += '<button id="delete-attribute-btn" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Delete</button>';
  content += '<button id="hide-attribute-btn" style="background: #ffc107; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Hide</button>';
  
  return content;
}


/*
 * Country filter helpers are defined in core; variables are initialized there.
 */

/*
 * Alias used by the Map.html main screen button.
 */
function toggleOptionsPanel(){
  openOptionsModal();
}
