/**
 * ================================================================================
 * QGas - Filter UI Module
 * ================================================================================
 * 
 * Manages the geographic filtering system for infrastructure visualization.
 * Allows users to filter displayed elements by European country codes.
 * 
 * Key Responsibilities:
 * - Filter modal UI management
 * - Country selection interface
 * - Layer filtering by country code
 * - Filter state management
 * - Original layer state preservation
 * 
 * Filtering Approach:
 * - Preserves original layers before filtering
 * - Creates filtered copies based on country selection
 * - Supports multiple country selection
 * - Provides "Clear All" functionality
 * 
 * Supported Countries:
 * - All EU member states
 * - United Kingdom
 * - Uses ISO 3166-1 alpha-2 country codes
 * 
 * Global Scope: This module maintains global scope for compatibility with
 * inline HTML event handlers.
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - DOM elements for the filter modal and country selection UI.
 * - Map layer registries and country metadata embedded in features.
 *
 * Public API:
 * - openFilterModal(): Open the filter dialog.
 * - applyCountryFilter(): Apply the selected country filter.
 * - clearAllFilters(): Reset to unfiltered layers.
 * 
 * ================================================================================
 */

/* ================================================================================
 * FILTER MODAL FUNCTIONS
 * ================================================================================
 */

/**
 * Open the main filter selection modal
 */
function openFilterModal() {
  document.getElementById('filter-modal').style.display = 'flex';
}

/**
 * Close the main filter selection modal
 */
function closeFilterModal() {
  document.getElementById('filter-modal').style.display = 'none';
}

/**
 * Open the country-specific filter modal
 * Transitions from main filter modal to country selection interface
 */
function openCountryFilterModal() {
  closeFilterModal();
  populateCountryList();
  document.getElementById('country-filter-modal').style.display = 'flex';
}

/**
 * Close the country filter modal
 */
function closeCountryFilterModal() {
  document.getElementById('country-filter-modal').style.display = 'none';
}

/**
 * Clear all active filters and restore original layer state
 */
function clearAllFilters() {
  restoreAllOriginalLayers();
  selectedCountries.clear();
  closeFilterModal();
}

/* ================================================================================
 * COUNTRY DATA
 * ================================================================================
 * List of European countries with ISO 3166-1 alpha-2 codes.
 */
europeanCountries = [
  { name: 'Germany', code: 'DE' },
  { name: 'Austria', code: 'AT' },
  { name: 'Belgium', code: 'BE' },
  { name: 'Bulgaria', code: 'BG' },
  { name: 'Croatia', code: 'HR' },
  { name: 'Cyprus', code: 'CY' },
  { name: 'Czech Republic', code: 'CZ' },
  { name: 'Denmark', code: 'DK' },
  { name: 'Estonia', code: 'EE' },
  { name: 'Finland', code: 'FI' },
  { name: 'France', code: 'FR' },
  { name: 'Greece', code: 'GR' },
  { name: 'Hungary', code: 'HU' },
  { name: 'Ireland', code: 'IE' },
  { name: 'Italy', code: 'IT' },
  { name: 'Latvia', code: 'LV' },
  { name: 'Lithuania', code: 'LT' },
  { name: 'Luxembourg', code: 'LU' },
  { name: 'Malta', code: 'MT' },
  { name: 'Netherlands', code: 'NL' },
  { name: 'Poland', code: 'PL' },
  { name: 'Portugal', code: 'PT' },
  { name: 'Romania', code: 'RO' },
  { name: 'Slovakia', code: 'SK' },
  { name: 'Slovenia', code: 'SI' },
  { name: 'Spain', code: 'ES' },
  { name: 'Sweden', code: 'SE' },
  { name: 'United Kingdom', code: 'GB' }
];

/**
 * Populate the country list UI with checkboxes for all European countries
 * Restores previously selected countries from the selectedCountries Set
 */
function populateCountryList() {
  const countryList = document.getElementById('country-list');
  countryList.innerHTML = '';
  
  europeanCountries.forEach(country => {
    const countryItem = document.createElement('div');
    countryItem.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    `;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `country-${country.code}`;
    checkbox.value = country.code;
    checkbox.checked = selectedCountries.has(country.code);
    checkbox.style.cssText = 'margin-right: 10px;';
    
    const label = document.createElement('label');
    label.htmlFor = `country-${country.code}`;
    label.textContent = `${country.name} (${country.code})`;
    label.style.cssText = 'cursor: pointer; flex: 1;';
    
    countryItem.appendChild(checkbox);
    countryItem.appendChild(label);
    countryList.appendChild(countryItem);
    
    /* Bind checkbox changes to the selection set. */
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        selectedCountries.add(this.value);
      } else {
        selectedCountries.delete(this.value);
      }
    });
  });
}

function selectAllCountries() {
  selectedCountries.clear();
  europeanCountries.forEach(country => {
    selectedCountries.add(country.code);
    const checkbox = document.getElementById(`country-${country.code}`);
    if (checkbox) checkbox.checked = true;
  });
}

function clearCountrySelection() {
  selectedCountries.clear();
  europeanCountries.forEach(country => {
    const checkbox = document.getElementById(`country-${country.code}`);
    if (checkbox) checkbox.checked = false;
  });
}

function applyCountryFilter() {
  /* Store original layers if not already stored. */
  if (!originalPipelineLayer && pipelineLayer) {
    originalPipelineLayer = pipelineLayer;
  }
  if (!originalEstimatedPipelinesLayer && estimatedPipelinesLayer) {
    originalEstimatedPipelinesLayer = estimatedPipelinesLayer;
  }
  if (!originalNodeLayer && nodeLayer) {
    originalNodeLayer = nodeLayer;
  }
  if (!originalPowerplantsLayer && powerplantsLayer) {
    originalPowerplantsLayer = powerplantsLayer;
  }
  if (!originalCompressorsLayer && compressorsLayer) {
    originalCompressorsLayer = compressorsLayer;
  }
  if (!originalLngLayer && lngLayer) {
    originalLngLayer = lngLayer;
  }
  if (!originalStorageLayer && storageLayer) {
    originalStorageLayer = storageLayer;
  }
  if (!originalConsumptionLayer && consumptionLayer) {
    originalConsumptionLayer = consumptionLayer;
  }
  if (!originalShortPipeLayer && shortPipeLayer) {
    originalShortPipeLayer = shortPipeLayer;
  }
  if (!originalBorderpointsLayer && borderpointsLayer) {
    originalBorderpointsLayer = borderpointsLayer;
  }
  if (!originalDemandsLayer && demandsLayer) {
    originalDemandsLayer = demandsLayer;
  }
  if (!originalProductionsLayer && productionsLayer) {
    originalProductionsLayer = productionsLayer;
  }
  if (!originalHydrogenPipeLayer && hydrogenPipeLayer) {
    originalHydrogenPipeLayer = hydrogenPipeLayer;
  }
  if (!originalElectrolyzersLayer && electrolyzersLayer) {
    originalElectrolyzersLayer = electrolyzersLayer;
  }
  
  if (selectedCountries.size === 0) {
    /* If no countries selected, show all elements (original layers). */
    restoreAllOriginalLayers();
  } else {
    /* Filter all elements based on selected countries. */
    filterAllElementsByCountries(selectedCountries);
  }
  
  closeCountryFilterModal();
}

function restoreAllOriginalLayers() {
  const prevPipelineLayer = pipelineLayer;
  const prevEstimatedLayer = estimatedPipelinesLayer;
  const prevNodeLayer = nodeLayer;
  const prevPowerplantsLayer = powerplantsLayer;
  const prevCompressorsLayer = compressorsLayer;
  const prevLngLayer = lngLayer;
  const prevStorageLayer = storageLayer;
  const prevConsumptionLayer = consumptionLayer;
  const prevShortPipeLayer = shortPipeLayer;
  const prevBorderpointsLayer = borderpointsLayer;
  const prevDemandsLayer = demandsLayer;
  const prevProductionsLayer = productionsLayer;
  const prevHydrogenPipeLayer = hydrogenPipeLayer;
  const prevElectrolyzersLayer = electrolyzersLayer;

  /* Remove current layers from map. */
  removeAllCurrentLayers();
  
  /* Add back original layers. */
  if (originalPipelineLayer && !map.hasLayer(originalPipelineLayer)) {
    map.addLayer(originalPipelineLayer);
    pipelineLayer = originalPipelineLayer;
    applyDeletedIdentitiesToLayer(pipelineLayer);
  }
  if (originalEstimatedPipelinesLayer && !map.hasLayer(originalEstimatedPipelinesLayer)) {
    map.addLayer(originalEstimatedPipelinesLayer);
    estimatedPipelinesLayer = originalEstimatedPipelinesLayer;
    applyDeletedIdentitiesToLayer(estimatedPipelinesLayer);
  }
  if (originalNodeLayer && !map.hasLayer(originalNodeLayer)) {
    map.addLayer(originalNodeLayer);
    nodeLayer = originalNodeLayer;
    applyDeletedIdentitiesToLayer(nodeLayer);
  }
  if (originalPowerplantsLayer && !map.hasLayer(originalPowerplantsLayer)) {
    map.addLayer(originalPowerplantsLayer);
    powerplantsLayer = originalPowerplantsLayer;
    applyDeletedIdentitiesToLayer(powerplantsLayer);
  }
  if (originalCompressorsLayer && !map.hasLayer(originalCompressorsLayer)) {
    map.addLayer(originalCompressorsLayer);
    compressorsLayer = originalCompressorsLayer;
    applyDeletedIdentitiesToLayer(compressorsLayer);
  }
  if (originalLngLayer && !map.hasLayer(originalLngLayer)) {
    map.addLayer(originalLngLayer);
    lngLayer = originalLngLayer;
    applyDeletedIdentitiesToLayer(lngLayer);
  }
  if (originalStorageLayer && !map.hasLayer(originalStorageLayer)) {
    map.addLayer(originalStorageLayer);
    storageLayer = originalStorageLayer;
    applyDeletedIdentitiesToLayer(storageLayer);
  }
  if (originalConsumptionLayer && !map.hasLayer(originalConsumptionLayer)) {
    map.addLayer(originalConsumptionLayer);
    consumptionLayer = originalConsumptionLayer;
    applyDeletedIdentitiesToLayer(consumptionLayer);
  }
  if (originalShortPipeLayer && !map.hasLayer(originalShortPipeLayer)) {
    map.addLayer(originalShortPipeLayer);
    shortPipeLayer = originalShortPipeLayer;
    applyDeletedIdentitiesToLayer(shortPipeLayer);
  }
  if (originalBorderpointsLayer && !map.hasLayer(originalBorderpointsLayer)) {
    map.addLayer(originalBorderpointsLayer);
    borderpointsLayer = originalBorderpointsLayer;
    applyDeletedIdentitiesToLayer(borderpointsLayer);
  }
  if (originalDemandsLayer && !map.hasLayer(originalDemandsLayer)) {
    map.addLayer(originalDemandsLayer);
    demandsLayer = originalDemandsLayer;
    applyDeletedIdentitiesToLayer(demandsLayer);
  }
  if (originalProductionsLayer && !map.hasLayer(originalProductionsLayer)) {
    map.addLayer(originalProductionsLayer);
    productionsLayer = originalProductionsLayer;
    applyDeletedIdentitiesToLayer(productionsLayer);
  }
  if (originalHydrogenPipeLayer && !map.hasLayer(originalHydrogenPipeLayer)) {
    map.addLayer(originalHydrogenPipeLayer);
    hydrogenPipeLayer = originalHydrogenPipeLayer;
    applyDeletedIdentitiesToLayer(hydrogenPipeLayer);
  }
  if (originalElectrolyzersLayer && !map.hasLayer(originalElectrolyzersLayer)) {
    map.addLayer(originalElectrolyzersLayer);
    electrolyzersLayer = originalElectrolyzersLayer;
    applyDeletedIdentitiesToLayer(electrolyzersLayer);
  }

  synchronizeLayerReferences('pipelines', prevPipelineLayer, pipelineLayer);
  synchronizeLayerReferences('pipelines', prevEstimatedLayer, estimatedPipelinesLayer);
  synchronizeLayerReferences('nodes', prevNodeLayer, nodeLayer);
  synchronizeLayerReferences('powerplants', prevPowerplantsLayer, powerplantsLayer);
  synchronizeLayerReferences('compressors', prevCompressorsLayer, compressorsLayer);
  synchronizeLayerReferences('lng', prevLngLayer, lngLayer);
  synchronizeLayerReferences('storages', prevStorageLayer, storageLayer);
  synchronizeLayerReferences('consumption', prevConsumptionLayer, consumptionLayer);
  synchronizeLayerReferences('shortPipes', prevShortPipeLayer, shortPipeLayer);
  synchronizeLayerReferences('borderpoints', prevBorderpointsLayer, borderpointsLayer);
  synchronizeLayerReferences('demands', prevDemandsLayer, demandsLayer);
  synchronizeLayerReferences('productions', prevProductionsLayer, productionsLayer);
  synchronizeLayerReferences('hydrogenPipes', prevHydrogenPipeLayer, hydrogenPipeLayer);
  synchronizeLayerReferences('electrolyzers', prevElectrolyzersLayer, electrolyzersLayer);

  if (window.selectedPipelineLayer === prevPipelineLayer) {
    window.selectedPipelineLayer = pipelineLayer;
  }
}

function removeAllCurrentLayers() {
  /* Helper to remove click layers. */
  function removeClickLayers(layerGroup) {
    if (layerGroup) {
      layerGroup.eachLayer(layer => {
        if (layer._clickLayer && map.hasLayer(layer._clickLayer)) {
          map.removeLayer(layer._clickLayer);
        }
      });
    }
  }

  if (pipelineLayer && map.hasLayer(pipelineLayer)) {
    removeClickLayers(pipelineLayer);
    map.removeLayer(pipelineLayer);
  }
  if (estimatedPipelinesLayer && map.hasLayer(estimatedPipelinesLayer)) {
    removeClickLayers(estimatedPipelinesLayer);
    map.removeLayer(estimatedPipelinesLayer);
  }
  if (nodeLayer && map.hasLayer(nodeLayer)) {
    removeClickLayers(nodeLayer);
    map.removeLayer(nodeLayer);
  }
  if (powerplantsLayer && map.hasLayer(powerplantsLayer)) {
    removeClickLayers(powerplantsLayer);
    map.removeLayer(powerplantsLayer);
  }
  if (compressorsLayer && map.hasLayer(compressorsLayer)) {
    removeClickLayers(compressorsLayer);
    map.removeLayer(compressorsLayer);
  }
  if (lngLayer && map.hasLayer(lngLayer)) {
    removeClickLayers(lngLayer);
    map.removeLayer(lngLayer);
  }
  if (storageLayer && map.hasLayer(storageLayer)) {
    removeClickLayers(storageLayer);
    map.removeLayer(storageLayer);
  }
  if (consumptionLayer && map.hasLayer(consumptionLayer)) {
    removeClickLayers(consumptionLayer);
    map.removeLayer(consumptionLayer);
  }
  if (shortPipeLayer && map.hasLayer(shortPipeLayer)) {
    removeClickLayers(shortPipeLayer);
    map.removeLayer(shortPipeLayer);
  }
  if (borderpointsLayer && map.hasLayer(borderpointsLayer)) {
    removeClickLayers(borderpointsLayer);
    map.removeLayer(borderpointsLayer);
  }
  if (demandsLayer && map.hasLayer(demandsLayer)) {
    removeClickLayers(demandsLayer);
    map.removeLayer(demandsLayer);
  }
  if (productionsLayer && map.hasLayer(productionsLayer)) {
    removeClickLayers(productionsLayer);
    map.removeLayer(productionsLayer);
  }
  if (hydrogenPipeLayer && map.hasLayer(hydrogenPipeLayer)) {
    removeClickLayers(hydrogenPipeLayer);
    map.removeLayer(hydrogenPipeLayer);
  }
  if (electrolyzersLayer && map.hasLayer(electrolyzersLayer)) {
    removeClickLayers(electrolyzersLayer);
    map.removeLayer(electrolyzersLayer);
  }
}

function filterAllElementsByCountries(selectedCountryCodes) {
  console.log('filterAllElementsByCountries called with:', Array.from(selectedCountryCodes));

  const prevPipelineLayer = pipelineLayer;
  const prevEstimatedLayer = estimatedPipelinesLayer;
  const prevNodeLayer = nodeLayer;
  const prevPowerplantsLayer = powerplantsLayer;
  const prevCompressorsLayer = compressorsLayer;
  const prevLngLayer = lngLayer;
  const prevStorageLayer = storageLayer;
  const prevConsumptionLayer = consumptionLayer;
  const prevShortPipeLayer = shortPipeLayer;
  const prevBorderpointsLayer = borderpointsLayer;
  const prevDemandsLayer = demandsLayer;
  const prevProductionsLayer = productionsLayer;
  const prevHydrogenPipeLayer = hydrogenPipeLayer;
  const prevElectrolyzersLayer = electrolyzersLayer;

  /* Remove current layers from map. */
  removeAllCurrentLayers();

  /* Create filtered layers from original data. */
  const filteredPipelineLayer = originalPipelineLayer ? L.layerGroup() : null;
  const filteredEstimatedLayer = originalEstimatedPipelinesLayer ? L.layerGroup() : null;
  const filteredNodeLayer = originalNodeLayer ? L.layerGroup() : null;
  const filteredPowerplantsLayer = originalPowerplantsLayer ? L.layerGroup() : null;
  const filteredCompressorsLayer = originalCompressorsLayer ? L.layerGroup() : null;
  const filteredLngLayer = originalLngLayer ? L.layerGroup() : null;
  const filteredStorageLayer = originalStorageLayer ? L.layerGroup() : null;
  const filteredConsumptionLayer = originalConsumptionLayer ? L.layerGroup() : null;
  const filteredShortPipeLayer = originalShortPipeLayer ? L.layerGroup() : null;
  const filteredBorderpointsLayer = originalBorderpointsLayer ? L.layerGroup() : null;
  const filteredDemandsLayer = originalDemandsLayer ? L.layerGroup() : null;
  const filteredProductionsLayer = originalProductionsLayer ? L.layerGroup() : null;
  const filteredHydrogenPipeLayer = originalHydrogenPipeLayer ? L.layerGroup() : null;
  const filteredElectrolyzersLayer = originalElectrolyzersLayer ? L.layerGroup() : null;
  const addFilteredLayerToMap = (layerGroup, label) => {
    if (!layerGroup) return;
    if (!map.hasLayer(layerGroup)) {
      map.addLayer(layerGroup);
    }
    console.log(`Added ${label} layer with ${layerGroup.getLayers().length} features`);
  };

  /* Filter pipelines. */
  if (originalPipelineLayer) {
    let pipelineCount = 0;
    originalPipelineLayer.eachLayer(layer => {
      if (layer.feature && shouldShowPipeline(layer.feature, selectedCountryCodes)) {
        filteredPipelineLayer?.addLayer(layer);
        pipelineCount++;
      }
    });
    console.log('Filtered pipelines:', pipelineCount);
  }

  /* Filter estimated pipelines. */
  if (originalEstimatedPipelinesLayer && filteredEstimatedLayer) {
    let estimatedCount = 0;
    originalEstimatedPipelinesLayer.eachLayer(layer => {
      if (layer.feature && shouldShowPipeline(layer.feature, selectedCountryCodes)) {
        filteredEstimatedLayer.addLayer(layer);
        estimatedCount++;
      }
    });
    console.log('Filtered estimated pipelines:', estimatedCount);
  }

  /* Filter nodes. */
  if (originalNodeLayer && filteredNodeLayer) {
    let nodeCount = 0;
    originalNodeLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredNodeLayer.addLayer(layer);
        nodeCount++;
      }
    });
    console.log('Filtered nodes:', nodeCount);
  }

  /* Filter powerplants. */
  if (originalPowerplantsLayer && filteredPowerplantsLayer) {
    let powerplantCount = 0;
    originalPowerplantsLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredPowerplantsLayer.addLayer(layer);
        powerplantCount++;
      }
    });
    console.log('Filtered powerplants:', powerplantCount);
  }

  /* Filter compressors. */
  if (originalCompressorsLayer && filteredCompressorsLayer) {
    let compressorCount = 0;
    originalCompressorsLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredCompressorsLayer.addLayer(layer);
        compressorCount++;
      }
    });
    console.log('Filtered compressors:', compressorCount);
  }

  /* Filter LNG terminals. */
  if (originalLngLayer && filteredLngLayer) {
    let lngCount = 0;
    originalLngLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredLngLayer.addLayer(layer);
        lngCount++;
      }
    });
    console.log('Filtered LNG terminals:', lngCount);
  }

  /* Filter storage sites. */
  if (originalStorageLayer && filteredStorageLayer) {
    let storageCount = 0;
    originalStorageLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredStorageLayer.addLayer(layer);
        storageCount++;
      }
    });
    console.log('Filtered storage sites:', storageCount);
  }

  /* Filter consumption points. */
  if (originalConsumptionLayer && filteredConsumptionLayer) {
    let consumptionCount = 0;
    originalConsumptionLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredConsumptionLayer.addLayer(layer);
        consumptionCount++;
      }
    });
    console.log('Filtered consumption points:', consumptionCount);
  }

  /* Filter short pipes. */
  if (originalShortPipeLayer && filteredShortPipeLayer) {
    let shortPipeCount = 0;
    originalShortPipeLayer.eachLayer(layer => {
      if (layer.feature && shouldShowPipeline(layer.feature, selectedCountryCodes)) {
        filteredShortPipeLayer.addLayer(layer);
        shortPipeCount++;
      }
    });
    console.log('Filtered short pipes:', shortPipeCount);
  }

  /* Filter border points. */
  if (originalBorderpointsLayer && filteredBorderpointsLayer) {
    let borderCount = 0;
    originalBorderpointsLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredBorderpointsLayer.addLayer(layer);
        borderCount++;
      }
    });
    console.log('Filtered border points:', borderCount);
  }

  /* Filter demands. */
  if (originalDemandsLayer && filteredDemandsLayer) {
    let demandCount = 0;
    originalDemandsLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredDemandsLayer.addLayer(layer);
        demandCount++;
      }
    });
    console.log('Filtered demands:', demandCount);
  }

  /* Filter productions. */
  if (originalProductionsLayer && filteredProductionsLayer) {
    let productionCount = 0;
    originalProductionsLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredProductionsLayer.addLayer(layer);
        productionCount++;
      }
    });
    console.log('Filtered productions:', productionCount);
  }

  /* Filter hydrogen pipelines. */
  if (originalHydrogenPipeLayer && filteredHydrogenPipeLayer) {
    let hydrogenCount = 0;
    originalHydrogenPipeLayer.eachLayer(layer => {
      if (layer.feature && shouldShowPipeline(layer.feature, selectedCountryCodes)) {
        filteredHydrogenPipeLayer.addLayer(layer);
        hydrogenCount++;
      }
    });
    console.log('Filtered hydrogen pipelines:', hydrogenCount);
  }

  /* Filter electrolyzers. */
  if (originalElectrolyzersLayer && filteredElectrolyzersLayer) {
    let electrolyzerCount = 0;
    originalElectrolyzersLayer.eachLayer(layer => {
      if (layer.feature && shouldShowElement(layer.feature, selectedCountryCodes)) {
        filteredElectrolyzersLayer.addLayer(layer);
        electrolyzerCount++;
      }
    });
    console.log('Filtered electrolyzers:', electrolyzerCount);
  }

  /* Add filtered layers to map (even if empty, so editing targets exist). */
  applyDeletedIdentitiesToLayer(filteredPipelineLayer);
  applyDeletedIdentitiesToLayer(filteredEstimatedLayer);
  applyDeletedIdentitiesToLayer(filteredNodeLayer);
  applyDeletedIdentitiesToLayer(filteredPowerplantsLayer);
  applyDeletedIdentitiesToLayer(filteredCompressorsLayer);
  applyDeletedIdentitiesToLayer(filteredLngLayer);
  applyDeletedIdentitiesToLayer(filteredStorageLayer);
  applyDeletedIdentitiesToLayer(filteredConsumptionLayer);
  applyDeletedIdentitiesToLayer(filteredShortPipeLayer);
  applyDeletedIdentitiesToLayer(filteredBorderpointsLayer);
  applyDeletedIdentitiesToLayer(filteredDemandsLayer);
  applyDeletedIdentitiesToLayer(filteredProductionsLayer);
  applyDeletedIdentitiesToLayer(filteredHydrogenPipeLayer);
  applyDeletedIdentitiesToLayer(filteredElectrolyzersLayer);

  addFilteredLayerToMap(filteredPipelineLayer, 'pipeline');
  addFilteredLayerToMap(filteredEstimatedLayer, 'estimated pipeline');
  addFilteredLayerToMap(filteredNodeLayer, 'node');
  addFilteredLayerToMap(filteredPowerplantsLayer, 'powerplant');
  addFilteredLayerToMap(filteredCompressorsLayer, 'compressor');
  addFilteredLayerToMap(filteredLngLayer, 'lng');
  addFilteredLayerToMap(filteredStorageLayer, 'storage');
  addFilteredLayerToMap(filteredConsumptionLayer, 'consumption');
  addFilteredLayerToMap(filteredShortPipeLayer, 'short pipe');
  addFilteredLayerToMap(filteredBorderpointsLayer, 'border point');
  addFilteredLayerToMap(filteredDemandsLayer, 'demand');
  addFilteredLayerToMap(filteredProductionsLayer, 'production');
  addFilteredLayerToMap(filteredHydrogenPipeLayer, 'hydrogen pipeline');
  addFilteredLayerToMap(filteredElectrolyzersLayer, 'electrolyzer');

  /* Update current layer references (originals remain intact). */
  pipelineLayer = filteredPipelineLayer;
  estimatedPipelinesLayer = filteredEstimatedLayer;
  nodeLayer = filteredNodeLayer;
  powerplantsLayer = filteredPowerplantsLayer;
  compressorsLayer = filteredCompressorsLayer;
  lngLayer = filteredLngLayer;
  storageLayer = filteredStorageLayer;
  consumptionLayer = filteredConsumptionLayer;
  shortPipeLayer = filteredShortPipeLayer;
  borderpointsLayer = filteredBorderpointsLayer;
  demandsLayer = filteredDemandsLayer;
  productionsLayer = filteredProductionsLayer;
  hydrogenPipeLayer = filteredHydrogenPipeLayer;
  electrolyzersLayer = filteredElectrolyzersLayer;

  synchronizeLayerReferences('pipelines', prevPipelineLayer, pipelineLayer);
  synchronizeLayerReferences('pipelines', prevEstimatedLayer, estimatedPipelinesLayer);
  synchronizeLayerReferences('nodes', prevNodeLayer, nodeLayer);
  synchronizeLayerReferences('powerplants', prevPowerplantsLayer, powerplantsLayer);
  synchronizeLayerReferences('compressors', prevCompressorsLayer, compressorsLayer);
  synchronizeLayerReferences('lng', prevLngLayer, lngLayer);
  synchronizeLayerReferences('storages', prevStorageLayer, storageLayer);
  synchronizeLayerReferences('consumption', prevConsumptionLayer, consumptionLayer);
  synchronizeLayerReferences('shortPipes', prevShortPipeLayer, shortPipeLayer);
  synchronizeLayerReferences('borderpoints', prevBorderpointsLayer, borderpointsLayer);
  synchronizeLayerReferences('demands', prevDemandsLayer, demandsLayer);
  synchronizeLayerReferences('productions', prevProductionsLayer, productionsLayer);
  synchronizeLayerReferences('hydrogenPipes', prevHydrogenPipeLayer, hydrogenPipeLayer);
  synchronizeLayerReferences('electrolyzers', prevElectrolyzersLayer, electrolyzersLayer);

  if (window.selectedPipelineLayer === prevPipelineLayer) {
    window.selectedPipelineLayer = pipelineLayer;
  }

  enforceFilteredLayerPresence();
}

function reapplyActiveCountryFilterState() {
  const hasActiveFilter = (selectedCountries instanceof Set) && selectedCountries.size > 0;
  if (!hasActiveFilter) {
    return;
  }
  filterAllElementsByCountries(selectedCountries);
}

function enforceFilteredLayerPresence() {
  if (!map || !(selectedCountries instanceof Set) || selectedCountries.size === 0) {
    return;
  }

  const ensurePair = (originalLayer, filteredLayer) => {
    if (!filteredLayer || filteredLayer === originalLayer) return;
    if (originalLayer && map.hasLayer(originalLayer)) {
      map.removeLayer(originalLayer);
    }
    if (!map.hasLayer(filteredLayer) && typeof filteredLayer.getLayers === 'function' && filteredLayer.getLayers().length > 0) {
      map.addLayer(filteredLayer);
    }
  };

  ensurePair(originalPipelineLayer, pipelineLayer);
  ensurePair(originalEstimatedPipelinesLayer, estimatedPipelinesLayer);
  ensurePair(originalNodeLayer, nodeLayer);
  ensurePair(originalPowerplantsLayer, powerplantsLayer);
  ensurePair(originalCompressorsLayer, compressorsLayer);
  ensurePair(originalLngLayer, lngLayer);
  ensurePair(originalStorageLayer, storageLayer);
  ensurePair(originalConsumptionLayer, consumptionLayer);
  ensurePair(originalShortPipeLayer, shortPipeLayer);
  ensurePair(originalBorderpointsLayer, borderpointsLayer);
  ensurePair(originalDemandsLayer, demandsLayer);
  ensurePair(originalProductionsLayer, productionsLayer);
  ensurePair(originalHydrogenPipeLayer, hydrogenPipeLayer);
  ensurePair(originalElectrolyzersLayer, electrolyzersLayer);
}

/*
 * Country name to country code mapping.
 */
const countryNameToCode = {
  'Germany': 'DE',
  'France': 'FR',
  'Italy': 'IT',
  'Spain': 'ES',
  'United Kingdom': 'GB',
  'Great Britain': 'GB',
  'England': 'GB',
  'Scotland': 'GB',
  'Wales': 'GB',
  'Northern Ireland': 'GB',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Switzerland': 'CH',
  'Denmark': 'DK',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Slovakia': 'SK',
  'Hungary': 'HU',
  'Slovenia': 'SI',
  'Croatia': 'HR',
  'Romania': 'RO',
  'Bulgaria': 'BG',
  'Greece': 'GR',
  'Portugal': 'PT',
  'Ireland': 'IE',
  'Finland': 'FI',
  'Estonia': 'EE',
  'Latvia': 'LV',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Malta': 'MT',
  'Cyprus': 'CY',
  'Litauen': 'LT',
  'Algeria': 'DZ',
  /* Extend mappings as needed. */
};

const countryNameLookup = {};
Object.entries(countryNameToCode).forEach(([name, code]) => {
  if (typeof name === 'string' && code) {
    countryNameLookup[name.trim().toLowerCase()] = code;
  }
});

const countryCodeAliases = {
  UK: 'GB',
  EL: 'GR'
};

const iso3ToIso2 = {
  AUT: 'AT',
  BEL: 'BE',
  BGR: 'BG',
  HRV: 'HR',
  CYP: 'CY',
  CZE: 'CZ',
  DNK: 'DK',
  EST: 'EE',
  FIN: 'FI',
  FRA: 'FR',
  DEU: 'DE',
  GRC: 'GR',
  HUN: 'HU',
  IRL: 'IE',
  ITA: 'IT',
  LVA: 'LV',
  LTU: 'LT',
  LUX: 'LU',
  MLT: 'MT',
  NLD: 'NL',
  POL: 'PL',
  PRT: 'PT',
  ROU: 'RO',
  SVK: 'SK',
  SVN: 'SI',
  ESP: 'ES',
  SWE: 'SE',
  GBR: 'GB'
};

const elementCountryKeys = [
  'Country_Code',
  'CountryCode',
  'Country',
  'Country_of_Location',
  'Country Location',
  'CountryName',
  'Country_Name',
  'NUTS_ID',
  'NUTS_CODE',
  'NUTS3_ID',
  'NUTS3ID'
];

const pipelineStartCountryKeys = [
  'Country_Start',
  'country_start',
  'Start_Country',
  'NUTS3_ID_Start',
  'NUTS_ID_Start'
];

const pipelineEndCountryKeys = [
  'Country_End',
  'country_end',
  'End_Country',
  'NUTS3_ID_End',
  'NUTS_ID_End'
];

function normalizeCountryCodeToken(rawCode) {
  if (rawCode == null) return null;
  const lettersOnly = String(rawCode).trim().replace(/[^a-zA-Z]/g, '');
  if (!lettersOnly) return null;
  const upper = lettersOnly.toUpperCase();
  if (upper.length === 2) {
    return countryCodeAliases[upper] || upper;
  }
  if (upper.length === 3 && iso3ToIso2[upper]) {
    return iso3ToIso2[upper];
  }
  return null;
}

function extractCountryCodesFromValue(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap(extractCountryCodesFromValue).filter(Boolean);
  }

  const raw = String(value).trim();
  if (!raw) return [];

  const candidates = new Set([raw]);
  raw.split(/[,;\/|]/).forEach(part => {
    if (part && part.trim()) {
      candidates.add(part.trim());
    }
  });
  const parenMatches = raw.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    parenMatches.forEach(segment => {
      const inside = segment.replace(/[()]/g, '').trim();
      if (inside) {
        candidates.add(inside);
      }
    });
  }

  const codes = new Set();
  candidates.forEach(token => {
    if (!token) return;
    const lower = token.toLowerCase();
    if (countryNameLookup[lower]) {
      codes.add(countryNameLookup[lower]);
    }

    const normalizedCode = normalizeCountryCodeToken(token);
    if (normalizedCode) {
      codes.add(normalizedCode);
    }

    token.split(/\s+/).forEach(part => {
      if (!part) return;
      const partLower = part.toLowerCase();
      if (countryNameLookup[partLower]) {
        codes.add(countryNameLookup[partLower]);
      }
      const partCode = normalizeCountryCodeToken(part);
      if (partCode) {
        codes.add(partCode);
      }
    });
  });

  return Array.from(codes);
}

function normalizePropertyKeyName(key) {
  if (typeof key !== 'string') {
    return '';
  }
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getValuesForCandidateKeys(properties, candidateKeys) {
  if (!properties || !candidateKeys || !candidateKeys.length) {
    return [];
  }

  const normalizedCandidates = new Set(
    candidateKeys
      .map(normalizePropertyKeyName)
      .filter(Boolean)
  );

  if (!normalizedCandidates.size) {
    return [];
  }

  const values = [];
  Object.entries(properties).forEach(([propKey, value]) => {
    if (!normalizedCandidates.has(normalizePropertyKeyName(propKey))) {
      return;
    }
    values.push(value);
  });
  return values;
}

function hasAnyValueForKeys(properties, keys) {
  if (!properties || !Array.isArray(keys) || !keys.length) {
    return false;
  }
  const values = getValuesForCandidateKeys(properties, keys);
  return values.some(value => {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  });
}

function doesFeatureMatchCountryFilter(properties, selectedCountryCodes, candidateKeys) {
  if (!properties) return false;
  if (!(selectedCountryCodes instanceof Set) || selectedCountryCodes.size === 0) {
    return true;
  }

  const values = getValuesForCandidateKeys(properties, candidateKeys);
  for (const value of values) {
    if (!value) continue;
    const codes = extractCountryCodesFromValue(value);
    if (codes.some(code => selectedCountryCodes.has(code))) {
      return true;
    }
  }
  return false;
}

function shouldShowElement(feature, selectedCountryCodes) {
  if (!feature?.properties) {
    console.log('shouldShowElement: No properties', feature);
    return false;
  }

  if (doesFeatureMatchCountryFilter(feature.properties, selectedCountryCodes, elementCountryKeys)) {
    return true;
  }

  const hasLineCountryMetadata = hasAnyValueForKeys(feature.properties, pipelineStartCountryKeys) ||
    hasAnyValueForKeys(feature.properties, pipelineEndCountryKeys);

  if (hasLineCountryMetadata) {
    return (
      doesFeatureMatchCountryFilter(feature.properties, selectedCountryCodes, pipelineStartCountryKeys) ||
      doesFeatureMatchCountryFilter(feature.properties, selectedCountryCodes, pipelineEndCountryKeys)
    );
  }

  return false;
}

function shouldShowPipeline(feature, selectedCountryCodes) {
  if (!feature?.properties) {
    console.log('shouldShowPipeline: No properties', feature);
    return false;
  }

  const startMatches = doesFeatureMatchCountryFilter(feature.properties, selectedCountryCodes, pipelineStartCountryKeys);
  const endMatches = doesFeatureMatchCountryFilter(feature.properties, selectedCountryCodes, pipelineEndCountryKeys);
  const result = startMatches || endMatches;
  if (result) {
    return true;
  }

  return doesFeatureMatchCountryFilter(feature.properties, selectedCountryCodes, elementCountryKeys);
}


/*
 * Alias used by Map.html main screen button.
 */
function toggleFilterPanel(){
  try { openFilterModal(); } catch(e){ console.error('toggleFilterPanel failed', e); if (typeof showCustomPopup==='function') showCustomPopup('⚠️ Error', String(e)); }
}
