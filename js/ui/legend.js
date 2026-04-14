/**
 * QGas - Legend UI Module
 *
 * Module Description:
 * Maintains the legend controls, visibility toggles, and synchronization
 * between legend state and map layers.
 *
 * Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin
 * Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - DOM legend container and checkbox elements.
 * - Map layer references and visibility state.
 *
 * Public API:
 * - updateLegendControl(): Rebuild and refresh the legend UI.
 * - updateLegendSymbols(): Refresh legend swatches after style updates.
 */
const legendToggleRegistry = new Map();
let legendRemoveMode = false;
let legendRenameMode = false;

function unregisterLegendToggle(elementKey) {
  if (!elementKey || !legendToggleRegistry.has(elementKey)) return;
  const entry = legendToggleRegistry.get(elementKey);
  const { checkbox, handler } = entry || {};
  if (checkbox && handler) {
    checkbox.removeEventListener('change', handler);
  }
  legendToggleRegistry.delete(elementKey);
}

function registerLegendToggle({ checkbox, resolveLayers, elementKey }) {
  if (!checkbox || typeof resolveLayers !== 'function') return null;
  if (elementKey) {
    unregisterLegendToggle(elementKey);
  }
  const key = elementKey || Symbol('legendToggle');
  const handler = () => {
    if (!map) return;
    const resolved = resolveLayers();
    const layers = Array.isArray(resolved) ? resolved : [resolved];
    layers.forEach(layer => {
      if (!layer) return;
      const shouldShow = !!checkbox.checked;
      const isVisible = map.hasLayer(layer);
      if (shouldShow && !isVisible) {
        layer.addTo(map); // erst auf die Karte, damit map.eachLayer ihn sieht
        applyDeletedIdentitiesToLayer(layer);
        // Bei Pipelines auch shortPipeLayer bereinigen
        if (elementKey === 'PLPipelinesLayer' || elementKey === 'pipelines') {
          if (shortPipeLayer) applyDeletedIdentitiesToLayer(shortPipeLayer);
        }
      } else if (shouldShow && isVisible) {
        // Layer ist bereits sichtbar, aber wir müssen gelöschte Features entfernen
        applyDeletedIdentitiesToLayer(layer);
        // Bei Pipelines auch shortPipeLayer bereinigen
        if (elementKey === 'PLPipelinesLayer' || elementKey === 'pipelines') {
          if (shortPipeLayer) applyDeletedIdentitiesToLayer(shortPipeLayer);
        }
      } else if (!shouldShow && isVisible) {
        // Entferne den Layer selbst
        map.removeLayer(layer);
        // Sicherheit: auch alle Child-Layer explizit entfernen
        if (typeof layer.eachLayer === 'function') {
          layer.eachLayer(child => {
            if (map.hasLayer(child)) {
              map.removeLayer(child);
            }
            // Falls Klick-Layer existieren
            if (child && child._clickLayer && map.hasLayer(child._clickLayer)) {
              map.removeLayer(child._clickLayer);
            }
          });
        }
        // Falls Layer selbst einen _clickLayer hat
        if (layer._clickLayer && map.hasLayer(layer._clickLayer)) {
          map.removeLayer(layer._clickLayer);
        }
      }
    });
  };
  checkbox.addEventListener('change', handler);
  legendToggleRegistry.set(key, { checkbox, handler });
  handler();
  return key;
}

function setPlanOverlayVisibility(overlay, shouldShow) {
  if (!overlay) return;
  if (shouldShow) {
    if (map && !map.hasLayer(overlay)) {
      map.addLayer(overlay);
    }
    if (overlay._canvas) {
      overlay._canvas.style.display = 'block';
    }
    if (typeof overlay._reset === 'function') {
      overlay._reset();
    }
    return;
  }
  if (overlay._canvas) {
    overlay._canvas.style.display = 'none';
  }
  if (map && map.hasLayer(overlay)) {
    map.removeLayer(overlay);
  }
}

function addPlanLayerToLegend(planConfig, overlay) {
  const legendContainer = document.querySelector('.legend-control');
  if (!legendContainer) return;
  const entry = document.createElement('div');
  entry.className = 'legend-plan-entry legend-entry';
  entry.dataset.planId  = planConfig.id;
  entry.dataset.toggleId = `toggle-${planConfig.id}`;
  const checkboxId = `toggle-${planConfig.id}`;
  entry.innerHTML = `
    <label>
      <input type="checkbox" id="${checkboxId}" checked style="margin-right: 6px;">
      <span class="legend-icon" style="background:linear-gradient(135deg, rgba(33,37,41,0.15), rgba(33,37,41,0.85)); border:1px solid rgba(0,0,0,0.35);"></span>
      <span class="legend-name-label">${planConfig.name}</span>
    </label>
  `;
  const selectAllBtn = legendContainer.querySelector('#activate-all-btn');
  if (selectAllBtn && selectAllBtn.parentElement) {
    legendContainer.insertBefore(entry, selectAllBtn.parentElement);
  } else {
    legendContainer.appendChild(entry);
  }
  const checkbox = entry.querySelector('input');
  if (checkbox) {
    unregisterLegendToggle(planConfig.id);
    const handler = () => setPlanOverlayVisibility(overlay, checkbox.checked);
    checkbox.addEventListener('change', handler);
    legendToggleRegistry.set(planConfig.id, { checkbox, handler });
    handler();
  }
  /* Apply active mode styles to newly added entry. */
  if (legendRemoveMode) applyRemoveModeStyles(true);
  if (legendRenameMode) applyRenameModeStyles(true);
}

  /*
   * Rebuild and refresh the legend control UI.
   */
  function updateLegendControl() {
    const legendControl = document.querySelector('.legend-control');
    if (!legendControl) return;
    
    let legendContent = '';
    const legendEntries = getOrderedLegendConfigs();
    const legendHasShortPipeEntry = legendEntries.some(isShortPipeConfigEntry);
    
    /* Generate legend dynamically from ordered configuration. */
    legendEntries.forEach(config => {
      /* Use config.layerName when available (covers imported layers with '_imported' suffix). */
      const layerName = config.layerName ||
        config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
      const layer = dynamicLayers[layerName];
      
      /* Show legend entry even if layer not yet loaded (filled when loaded). */
      const toggleId = 'toggle-' + config.filename.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const labelClass = 'legend-label';
      const labelOpen = `<label class="${labelClass}">`;
      const labelClose = '</label><br>';
      
      if (isLineLayerType(config.type)) {
        /* Line layer entry. */
        legendContent += `<div class="legend-entry" data-layer-name="${layerName}" data-toggle-id="${toggleId}">${labelOpen}<input type="checkbox" id="${toggleId}" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block;"><div class="legend-line" style="background:${config.color};"></div></span><span class="legend-name-label" style="margin-left: 6px;">${config.legendName}</span>${labelClose}</div>`;
      } else {
        /* Point or inline layer entry. */
        const markerShape = config.markerType || 'circle';
        const markerSize = config.size || 6;
        const iconHTML = generateLegendIcon(config.color, markerShape, markerSize);
        legendContent += `<div class="legend-entry" data-layer-name="${layerName}" data-toggle-id="${toggleId}">${labelOpen}<input type="checkbox" id="${toggleId}" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;">${iconHTML}</span><span class="legend-name-label" style="margin-left: 6px;">${config.legendName}</span>${labelClose}</div>`;
      }
    });
  
  /* Add shortPipeLayer if present and not already configured. */
  if (!legendHasShortPipeEntry && shortPipeLayer) {
    legendContent += '<div class="legend-entry" data-layer-name="shortPipeLayer" data-toggle-id="toggle-shortpipes"><label class="legend-label"><input type="checkbox" id="toggle-shortpipes" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block;"><span class="legend-line" style="background:#ff8800; border-radius:2px; border:1px dashed #ff8800;"></span></span><span class="legend-name-label" style="margin-left: 6px;">Short-Pipes</span></label><br></div>';
  }
  
  /* All 4 action buttons in a 2×2 grid. */
  const allButtonsContent = '<div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;"><button id="activate-all-btn" style="background: #007cba; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Select All</button><button id="statistics-btn" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Statistics</button><button id="remove-layer-btn" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Remove</button><button id="rename-layer-btn" style="background: #fd7e14; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Rename</button></div>';

  legendControl.innerHTML = legendContent + allButtonsContent;
  
  /* Re-add event listeners after rebuilding. */
  const statsBtn = legendControl.querySelector('#statistics-btn');
  if (statsBtn) {
    L.DomEvent.on(statsBtn, 'click', function(e) {
      L.DomEvent.stopPropagation(e);
      openStatisticsModal();
    });
  }
  
  /* Add toggle event listeners for new layers. */
  createLegendEventHandlers();

  /* Re-attach infrastructure plan entries after rebuild. */
  if (Array.isArray(planLayers) && planLayers.length) {
    planLayers.forEach(entry => {
      const overlay = entry?.layer;
      const config = entry?.config || entry?.layer?._config;
      if (overlay && config) {
        addPlanLayerToLegend(config, overlay);
      }
    });
  }
}

/*
 * Create event handlers for legend checkboxes.
 */
function createLegendEventHandlers() {
  const registeredCheckboxes = [];

  const registerToggle = ({ toggleId, resolveLayers, key }) => {
    const checkbox = document.getElementById(toggleId);
    if (!checkbox || typeof resolveLayers !== 'function') {
      return;
    }
    registerLegendToggle({
      checkbox,
      resolveLayers,
      elementKey: key
    });
    registeredCheckboxes.push(checkbox);
  };

  if (Array.isArray(layerConfig)) {
    layerConfig.forEach(config => {
      if (!config || !config.filename) return;
      const toggleId = 'toggle-' + config.filename.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '');
      /* Prefer config.layerName (set by registerNewImportedLayer / upsertLayerConfigEntry)
       * over the naively recomputed name so that imported layers with '_imported' suffix
       * are found correctly in dynamicLayers. */
      const layerName = config.layerName ||
        config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
      registerToggle({
        toggleId,
        resolveLayers: () => dynamicLayers[layerName],
        key: layerName
      });
    });
  }

  registerToggle({
    toggleId: 'toggle-shortpipes',
    resolveLayers: () => shortPipeLayer,
    key: 'shortPipeLayer'
  });

  const activateAllBtn = document.getElementById('activate-all-btn');
  if (activateAllBtn) {
    activateAllBtn.onclick = function () {
      if (!registeredCheckboxes.length) return;
      const allChecked = registeredCheckboxes.every(cb => cb.checked);
      registeredCheckboxes.forEach(cb => {
        cb.checked = !allChecked;
        cb.dispatchEvent(new Event('change'));
      });
    };
  }

  const statisticsBtn = document.getElementById('statistics-btn');
  if (statisticsBtn) {
    statisticsBtn.onclick = function() {
      openStatisticsModal();
    };
  }

  /* Remove-layer mode. */
  const removeLayerBtn = document.getElementById('remove-layer-btn');
  if (removeLayerBtn) {
    if (legendRemoveMode) applyRemoveModeStyles(true);
    removeLayerBtn.onclick = function () {
      legendRemoveMode = !legendRemoveMode;
      if (legendRemoveMode) { legendRenameMode = false; applyRenameModeStyles(false); }
      applyRemoveModeStyles(legendRemoveMode);
    };
  }

  /* Rename-layer mode. */
  const renameLayerBtn = document.getElementById('rename-layer-btn');
  if (renameLayerBtn) {
    if (legendRenameMode) applyRenameModeStyles(true);
    renameLayerBtn.onclick = function () {
      legendRenameMode = !legendRenameMode;
      if (legendRenameMode) { legendRemoveMode = false; applyRemoveModeStyles(false); }
      applyRenameModeStyles(legendRenameMode);
    };
  }

  /* Use event delegation on the container so plan entries injected
   * after this call are also covered. */
  const legendControl = document.querySelector('.legend-control');
  if (legendControl && !legendControl._entryDelegateAttached) {
    legendControl._entryDelegateAttached = true;
    legendControl.addEventListener('click', function (e) {
      if (!legendRemoveMode && !legendRenameMode) return;
      /* Don't intercept clicks on the inline rename input itself. */
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      const entry = e.target.closest('.legend-entry');
      if (!entry) return;
      e.preventDefault();
      e.stopPropagation();
      if (legendRemoveMode) {
        const layerName = entry.dataset.layerName;
        const planId    = entry.dataset.planId;
        const toggleId  = entry.dataset.toggleId;
        const labelEl   = entry.querySelector('.legend-name-label');
        const displayName = labelEl ? labelEl.textContent.trim() : (layerName || planId || 'layer');
        if (!confirm(`Remove layer "${displayName}" from the project?`)) return;
        if (planId) {
          removePlanLayerFromProject(planId);
        } else if (layerName) {
          removeLayerFromProject(layerName, toggleId);
        }
      } else if (legendRenameMode) {
        const layerName = entry.dataset.layerName;
        const planId    = entry.dataset.planId;
        const labelEl   = entry.querySelector('.legend-name-label');
        if (!labelEl) return;
        startInlineRename(labelEl, layerName, planId);
      }
    });
  }
}

function applyRemoveModeStyles(active) {
  const btn = document.getElementById('remove-layer-btn');
  if (btn) {
    btn.textContent = active ? 'Done' : 'Remove';
    btn.style.background = active ? '#6c757d' : '#dc3545';
  }
  document.querySelectorAll('.legend-entry').forEach(entry => {
    if (active) {
      entry.style.cursor       = 'pointer';
      entry.style.outline      = '1px dashed #dc3545';
      entry.style.borderRadius = '2px';
    } else if (!legendRenameMode) {
      entry.style.cursor       = '';
      entry.style.outline      = '';
      entry.style.borderRadius = '';
    }
  });
}

function applyRenameModeStyles(active) {
  const btn = document.getElementById('rename-layer-btn');
  if (btn) {
    btn.textContent = active ? 'Done' : 'Rename';
    btn.style.background = active ? '#6c757d' : '#fd7e14';
  }
  document.querySelectorAll('.legend-entry').forEach(entry => {
    if (active) {
      entry.style.cursor       = 'text';
      entry.style.outline      = '1px dashed #fd7e14';
      entry.style.borderRadius = '2px';
    } else if (!legendRemoveMode) {
      entry.style.cursor       = '';
      entry.style.outline      = '';
      entry.style.borderRadius = '';
    }
  });
}

function startInlineRename(labelEl, layerName, planId) {
  if (labelEl._renaming) return;
  labelEl._renaming = true;
  const currentName = labelEl.textContent.trim();
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.style.cssText = 'width:120px;padding:1px 4px;font-size:12px;border:1px solid #fd7e14;border-radius:3px;';
  labelEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const newName = input.value.trim() || currentName;
    const newLabel = document.createElement('span');
    newLabel.className = 'legend-name-label';
    newLabel.style.marginLeft = '6px';
    newLabel.textContent = newName;
    input.replaceWith(newLabel);
    /* Update backing data so rename persists in exports. */
    if (planId) {
      /* Plan layer rename. */
      const planEntry = Array.isArray(planLayers) ? planLayers.find(p => String(p.id) === String(planId)) : null;
      if (planEntry) {
        planEntry.name = newName;
        if (planEntry.config) planEntry.config.name = newName;
      }
    } else if (layerName) {
      /* Regular / imported layer rename. */
      const cfg = Array.isArray(layerConfig)
        ? layerConfig.find(c => (c.layerName || '') === layerName
            || ((c.filename || '').replace('.geojson','').replace(/[^a-zA-Z0-9]/g,'') + 'Layer') === layerName)
        : null;
      if (cfg) cfg.legendName = newName;
    }
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { input.value = currentName; input.blur(); }
  });
}

function removePlanLayerFromProject(planId) {
  const idx = Array.isArray(planLayers)
    ? planLayers.findIndex(p => String(p.id) === String(planId))
    : -1;
  if (idx >= 0) {
    const entry = planLayers[idx];
    const overlay = entry.layer;
    if (overlay) {
      if (map && map.hasLayer(overlay)) map.removeLayer(overlay);
      if (overlay._canvas && overlay._canvas.parentNode) {
        overlay._canvas.parentNode.removeChild(overlay._canvas);
      }
    }
    unregisterLegendToggle(planId);
    if (typeof loadedPlanIds !== 'undefined') loadedPlanIds.delete(planId);
    planLayers.splice(idx, 1);
  }
  /* Remove the DOM entry directly (plan entries are injected outside innerHTML). */
  const domEntry = document.querySelector(`.legend-plan-entry[data-plan-id="${planId}"]`);
  if (domEntry) domEntry.remove();
}

function removeLayerFromProject(layerName, toggleId) {
  const layerObj = dynamicLayers[layerName];
  if (layerObj) {
    if (map && map.hasLayer(layerObj)) map.removeLayer(layerObj);
    if (typeof layerObj.eachLayer === 'function') {
      layerObj.eachLayer(child => {
        if (map && map.hasLayer(child)) map.removeLayer(child);
        if (child && child._clickLayer && map && map.hasLayer(child._clickLayer)) {
          map.removeLayer(child._clickLayer);
        }
      });
    }
    if (layerObj._clickLayer && map && map.hasLayer(layerObj._clickLayer)) {
      map.removeLayer(layerObj._clickLayer);
    }
  }

  delete dynamicLayers[layerName];
  if (window.customLayers) {
    const humanKey = layerName.replace(/Layer$/, '').replace(/_imported$/, '');
    delete window.customLayers[layerName];
    delete window.customLayers[humanKey];
  }
  unregisterLegendToggle(layerName);
  if (toggleId) unregisterLegendToggle(toggleId);

  if (Array.isArray(layerConfig)) {
    const idx = layerConfig.findIndex(c => {
      /* Prefer direct layerName match (set by upsertLayerConfigEntry),
       * fall back to filename derivation for legacy entries. */
      if (c.layerName) return c.layerName === layerName;
      const ln = (c.filename || '').replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
      return ln === layerName;
    });
    if (idx >= 0) layerConfig.splice(idx, 1);
  }

  updateLegendControl();
}

  /* Legend toggle event handler. */
document.addEventListener('DOMContentLoaded', () => {
  /* Delay binding until layers have loaded. */
  setTimeout(() => {
    createLegendEventHandlers();
  }, 2000); // 2 Sekunden warten bis Layer geladen sind
});

function initLegendControl(mapInstance) {
  if (!mapInstance || !window.L) return;
  const map = mapInstance;

    /* Add the legend control container. */
    const legend = L.control({ position: 'topright' });
    legend.onAdd = function (map) {
      const container = L.DomUtil.create('div', 'legend-control leaflet-bar');
      container.style.background = 'white';
      container.style.padding = '8px';
      container.style.borderRadius = '5px';
      container.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
      container.style.fontSize = '14px';
    
      /* Legend content. */
      const legendContent = '<label><input type="checkbox" id="toggle-pipelines" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block;"><div class="legend-line"></div></span><span style="margin-left: 6px;">Pipelines</span></label><br>' +
        '<label><input type="checkbox" id="toggle-nodes" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;"><span class="legend-icon" style="background:#ff7800;"></span></span><span style="margin-left: 6px;">Nodes</span></label><br>' +
        '<label><input type="checkbox" id="toggle-powerplants" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;"><span class="legend-icon" style="background:#090;"></span></span><span style="margin-left: 6px;">Power Plants</span></label><br>' +
        '<label><input type="checkbox" id="toggle-compressors" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;"><span class="legend-icon" style="background:#009;"></span></span><span style="margin-left: 6px;">Compressors</span></label><br>' +
        '<label><input type="checkbox" id="toggle-lng" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;"><span class="legend-icon" style="background:#099;"></span></span><span style="margin-left: 6px;">LNG Terminals</span></label><br>' +
        '<label><input type="checkbox" id="toggle-storages" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;"><span class="legend-icon" style="background:#990;"></span></span><span style="margin-left: 6px;">Storage Sites</span></label><br>' +
        '<label><input type="checkbox" id="toggle-shortpipes" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block;"><span class="legend-line" style="background:#ff8800; border-radius:2px; border:1px dashed #ff8800;"></span></span><span style="margin-left: 6px;">Short-Pipes</span></label><br>' +
        '<label><input type="checkbox" id="toggle-consumption" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;"><span class="legend-icon" style="background:#ff8800;"></span></span><span style="margin-left: 6px;">Consumption</span></label><br>';
    
      /* All 4 action buttons in a 2×2 grid. */
      const selectAllContent = '<div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;"><button id="activate-all-btn" style="background: #007cba; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Select All</button><button id="statistics-btn" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Statistics</button><button id="remove-layer-btn" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Remove</button><button id="rename-layer-btn" style="background: #fd7e14; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Rename</button></div>';
    
      container.innerHTML = legendContent + selectAllContent;
    
      /* Add event listener for statistics button. */
      const statsBtn = container.querySelector('#statistics-btn');
      L.DomEvent.on(statsBtn, 'click', function(e) {
        L.DomEvent.stopPropagation(e);
        openStatisticsModal();
      });
    
      L.DomEvent.disableClickPropagation(container);
      return container;
    };
    legend.addTo(map);

}

window.initLegendControl = initLegendControl;

