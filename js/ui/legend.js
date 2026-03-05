/**
 * QGas - Legend UI Module
 *
 * Module Description:
 * Maintains the legend controls, visibility toggles, and synchronization
 * between legend state and map layers.
 *
 * Author: Dipl.-Ing. Marco Quantschnig
 * Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
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
  entry.className = 'legend-plan-entry';
  const checkboxId = `toggle-${planConfig.id}`;
  entry.innerHTML = `
    <label>
      <input type="checkbox" id="${checkboxId}" checked style="margin-right: 6px;">
      <span class="legend-icon" style="background:linear-gradient(135deg, rgba(33,37,41,0.15), rgba(33,37,41,0.85)); border:1px solid rgba(0,0,0,0.35);"></span>
      <span>${planConfig.name}</span>
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
      const layerName = config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
      const layer = dynamicLayers[layerName];
      
      /* Show legend entry even if layer not yet loaded (filled when loaded). */
      const toggleId = 'toggle-' + config.filename.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const labelClass = 'legend-label';
      const labelOpen = `<label class="${labelClass}">`;
      const labelClose = '</label><br>';
      
      if (isLineLayerType(config.type)) {
        /* Line layer entry. */
        legendContent += `${labelOpen}<input type="checkbox" id="${toggleId}" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block;"><div class="legend-line" style="background:${config.color};"></div></span><span style="margin-left: 6px;">${config.legendName}</span>${labelClose}`;
      } else {
        /* Point or inline layer entry. */
        const markerShape = config.markerType || 'circle';
        const markerSize = config.size || 6;
        const iconHTML = generateLegendIcon(config.color, markerShape, markerSize);
        legendContent += `${labelOpen}<input type="checkbox" id="${toggleId}" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block; text-align: center;">${iconHTML}</span><span style="margin-left: 6px;">${config.legendName}</span>${labelClose}`;
      }
    });
  
  /* Add shortPipeLayer if present and not already configured. */
  if (!legendHasShortPipeEntry && shortPipeLayer) {
    legendContent += '<label class="legend-label"><input type="checkbox" id="toggle-shortpipes" checked style="margin-right: 6px;"><span style="width: 20px; display: inline-block;"><span class="legend-line" style="background:#ff8800; border-radius:2px; border:1px dashed #ff8800;"></span></span><span style="margin-left: 6px;">Short-Pipes</span></label><br>';
  }
  
  /* Add "Select All" button. */
  legendContent += '<div style="margin-top: 8px; text-align: center;"><button id="activate-all-btn" style="background: #007cba; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Select All</button></div>';
  
  /* Statistics button. */
  const statsContent = '<div style="margin-top: 8px; text-align: center; border-top: 1px solid #dee2e6; padding-top: 8px;"><button id="statistics-btn" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Statistics</button></div>';
  
  legendControl.innerHTML = legendContent + statsContent;
  
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
      const layerName = config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
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
    
      /* Statistics button. */
      const statsContent = '<div style="margin-top: 8px; text-align: center; border-top: 1px solid #dee2e6; padding-top: 8px;"><button id="statistics-btn" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Statistics</button></div>';
    
      /* Select All button at the end. */
      const selectAllContent = '<div style="margin-top: 8px; text-align: center;"><button id="activate-all-btn" style="background: #007cba; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">Select All</button></div>';
    
      container.innerHTML = legendContent + statsContent + selectAllContent;
    
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

