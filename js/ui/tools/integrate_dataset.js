/**
 * ================================================================================
 * QGas - Integrate Dataset Tool
 * ================================================================================
 * 
 * Enables integration of external GeoJSON datasets into the current map.
 * Supports both preloaded datasets and file upload.
 * 
 * Key Features:
 * - Preloaded dataset selection
 * - GeoJSON file upload
 * - Interactive element-to-pipeline mapping
 * - Data validation
 * - Layer creation for new datasets
 * - Automatic legend integration
 * 
 * Workflow:
 * 1. User selects dataset source (preloaded or file)
 * 2. Dataset is loaded and validated
 * 3. If needed, user maps elements to pipelines
 * 4. Dataset is integrated as new layer
 * 5. Legend updated with new layer
 * 
 * Technical Details:
 * - Validates GeoJSON structure
 * - Creates appropriate layer types (point/line)
 * - Handles feature properties
 * - Supports pipeline association
 * - Registers in layer metadata
 * 
 * Development Information:
 * - Author: Dipl.-Ing. Marco Quantschnig
 * - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - User-selected datasets and file paths.
 * - Map instance for temporary layer previews.
 *
 * Public API:
 * - activateIntegrateDatasetTool(): Start dataset integration workflow.
 * 
 * ================================================================================
 */

/**
 * Activate the integrate-dataset tool.
 *
 * Validates that a contributor name has been entered, deactivates all
 * other editing modes, and launches the dataset integration workflow via
 * {@link startDatasetIntegration}. The workflow guides the user through
 * selecting a GeoJSON source (preloaded server dataset or local file
 * upload) and creating pairwise element-equivalence links between the
 * integration dataset and the currently loaded QGas layers.
 *
 * @returns {void}
 */
function activateIntegrateDatasetTool() {
  if (!checkContributorName || !checkContributorName()) return;
  deactivateAllModes();
  startDatasetIntegration();
}

function startDatasetIntegration() {
  console.log('Starting dataset integration...');
  console.log('Available datasets:', Object.keys(additionalDatasets));
  
  /*
   * Combined approach: present preloaded datasets and a file upload option.
   */
  let optionsHtml = '<div style="text-align: center; margin: 15px 0;">';
  
  /* Render preloaded datasets when available. */
  const loadedDatasets = Object.keys(additionalDatasets);
  if (loadedDatasets.length > 0) {
    optionsHtml += '<p><strong>Preloaded datasets:</strong></p>';
    optionsHtml += '<select id="preloaded-select" style="width: 100%; padding: 8px; margin: 5px 0;">';
    optionsHtml += '<option value="">Select preloaded dataset...</option>';
    loadedDatasets.forEach(filename => {
      optionsHtml += `<option value="${filename}">${filename.replace('.geojson', '')}</option>`;
    });
    optionsHtml += '</select>';
    optionsHtml += '<button onclick="loadPreloadedDataset()" style="width: 100%; padding: 8px; margin: 5px 0; background: #28a745; color: white; border: none; border-radius: 4px;">Use Preloaded</button>';
    optionsHtml += '<hr style="margin: 15px 0;">';
  }
  
  /* File input option (always available). */
  optionsHtml += '<p><strong>Or upload your own .geojson file:</strong></p>';
  optionsHtml += '<input type="file" id="dataset-file-input" accept=".geojson" style="width: 100%; padding: 8px; margin: 5px 0;">';
  optionsHtml += '<button onclick="loadFileDataset()" style="width: 100%; padding: 8px; margin: 5px 0; background: #007bff; color: white; border: none; border-radius: 4px;">Upload & Use File</button>';
  optionsHtml += '</div>';
  
  showCustomPopup(
    '🔗 Integrate Dataset - Select Source',
    optionsHtml,
    [
      {text: 'Cancel', type: 'secondary', onClick: () => {
        currentMode = 'info';
        activateInfoMode();
        selectTool('info');
      }}
    ]
  );
}

/*
 * Global functions for popup button handlers.
 */
/**
 * Load and activate a preloaded server-side dataset for integration.
 *
 * Reads the selected value from the <code>#preloaded-select</code> dropdown
 * element rendered inside the current popup and calls
 * {@link setupIntegrationModeWithPreloaded} with the chosen filename.
 * Shows an info popup if no selection has been made.
 *
 * @returns {void}
 */
window.loadPreloadedDataset = function() {
  const select = document.getElementById('preloaded-select');
  const selectedFile = select.value;
  
  if (selectedFile && additionalDatasets[selectedFile]) {
    setupIntegrationModeWithPreloaded(selectedFile);
  } else {
    showInfoPopup('Please select a dataset first.', '🔗 Integrate Dataset');
  }
};

/**
 * Load a user-supplied GeoJSON file and activate it for integration.
 *
 * Reads the file selected in <code>#dataset-file-input</code>, parses it
 * as JSON, and registers the resulting feature collection under the
 * original filename key in the integration dataset registry. Then calls
 * {@link setupIntegrationModeWithPreloaded} to activate the integration
 * workflow. Shows an error popup if parsing fails or no file is selected.
 *
 * @returns {void}
 */
window.loadFileDataset = function() {
  const fileInput = document.getElementById('dataset-file-input');
  const file = fileInput.files[0];
  
  if (file) {
    console.log('File selected for integration:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        console.log('✅ File loaded successfully for integration');
        
        /* Create a temporary layer and start integration. */
        const tempFilename = file.name;
        createDatasetLayer(tempFilename, data);
        
        setTimeout(() => {
          setupIntegrationModeWithPreloaded(tempFilename);
        }, 500);
        
      } catch (error) {
        console.error('❌ File parsing failed:', error);
        showCustomPopup(
          '❌ Error',
          '<p style="text-align: center; margin: 15px 0;">Invalid GeoJSON file format.</p>',
          [{text: 'OK', type: 'primary', onClick: () => {}}]
        );
      }
    };
    reader.readAsText(file);
  } else {
    showInfoPopup('Please select a file first.', '🔗 Integrate Dataset');
  }
};

function setupIntegrationModeWithPreloaded(filename) {
  console.log('Setting up integration mode with:', filename);
  
  const dataset = additionalDatasets[filename];
  if (!dataset) {
    showCustomPopup(
      '❌ Error',
      '<p style="text-align: center; margin: 15px 0;">Dataset not found or not loaded properly.</p>',
      [{text: 'OK', type: 'primary', onClick: () => {}}]
    );
    return;
  }
  
  integrationMode = true;
  equivalenceList = [];
  selectedQGasElements.clear();
  integrationLayer = dataset.layer;
  
  /* Hide all layers except pipelines. */
  if (typeof powerplantsLayer !== 'undefined' && powerplantsLayer && map.hasLayer(powerplantsLayer)) {
    map.removeLayer(powerplantsLayer);
  }
  if (typeof compressorsLayer !== 'undefined' && compressorsLayer && map.hasLayer(compressorsLayer)) {
    map.removeLayer(compressorsLayer);
  }
  if (typeof storageLayer !== 'undefined' && storageLayer && map.hasLayer(storageLayer)) {
    map.removeLayer(storageLayer);
  }
  if (typeof storagesLayer !== 'undefined' && storagesLayer && map.hasLayer(storagesLayer)) {
    map.removeLayer(storagesLayer);
  }
  if (typeof lngLayer !== 'undefined' && lngLayer && map.hasLayer(lngLayer)) {
    map.removeLayer(lngLayer);
  }
  if (typeof nodeLayer !== 'undefined' && nodeLayer && map.hasLayer(nodeLayer)) {
    map.removeLayer(nodeLayer);
  }
  if (typeof consumptionLayer !== 'undefined' && consumptionLayer && map.hasLayer(consumptionLayer)) {
    map.removeLayer(consumptionLayer);
  }
  
  /* Ensure the pipelines layer remains visible. */
  if (typeof pipelineLayer !== 'undefined' && pipelineLayer && !map.hasLayer(pipelineLayer)) {
    pipelineLayer.addTo(map);
  }
  
  /* Highlight the integration layer for selection. */
  integrationLayer.setStyle({
    color: '#ff6600',
    weight: 4,
    opacity: 0.8,
    fillOpacity: 0.1
  });
  
  /* Update click handlers for the integration layer. */
  integrationLayer.eachLayer(layer => {
    layer.off('click');
    layer.on('click', function(e) {
      if (integrationMode) {
        selectIntegrationElement(layer.feature, layer);
        e.stopPropagation();
      }
    });
  });
  
  /* Activate pipeline click handlers for mapping. */
  if (pipelineLayer) {
    pipelineLayer.eachLayer(layer => {
      layer.off('click');
      layer.on('click', function(e) {
        if (integrationMode) {
          selectPipelineElement(layer.feature, layer);
          e.stopPropagation();
        }
      });
    });
  }
  
  closeCustomPopup();
  showIntegrationControls(filename);
}

function selectPipelineElement(feature, layer) {
  if (!feature) return;
  
  const id = feature.properties.ID;
  
  if (selectedQGasElements.has(id)) {
    selectedQGasElements.delete(id);
    layer.setStyle({ color: '#3388ff', weight: 3 });
  } else {
    selectedQGasElements.add(id);
    layer.setStyle({ color: '#00ff00', weight: 5 });
  }
  
  console.log('Selected QGas elements:', Array.from(selectedQGasElements));
}

function selectIntegrationElement(feature, layer) {
  if (!feature) return;
  
  currentIntegrationElement = { feature, layer };
  
  /* Briefly highlight the selected integration feature. */
  layer.setStyle({ color: '#ff0000', weight: 6 });
  
  setTimeout(() => {
    layer.setStyle({ color: '#ff6600', weight: 4 });
  }, 300);
  
  if (selectedQGasElements.size === 0) {
    showInfoPopup('Please select at least one QGas pipeline element first.', '🔗 Integrate Dataset');
    return;
  }
  
  /* Create the mapping entry between dataset and QGas elements. */
  const qgasIds = Array.from(selectedQGasElements);
  const datasetIdField = detectIdField(feature.properties);
  const datasetId = datasetIdField ? feature.properties[datasetIdField] : 'unknown';
  
  equivalenceList.push({
    datasetElement: datasetId,
    qgasElements: qgasIds
  });
  
  console.log('Created link:', { datasetElement: datasetId, qgasElements: qgasIds });
  
  /* Reset the current selection state. */
  selectedQGasElements.clear();
  if (pipelineLayer) {
    pipelineLayer.eachLayer(l => {
      l.setStyle({ color: '#3388ff', weight: 3 });
    });
  }
  
  showInfoPopup(`Linked dataset element ${datasetId} to ${qgasIds.length} QGas elements.`, '🔗 Integration');
}

function detectIdField(properties) {
  const idFields = ['id', 'ID', 'Project_ID', 'project_id', 'element_id', 'Element_ID'];
  for (let field of idFields) {
    if (properties.hasOwnProperty(field)) {
      return field;
    }
  }
  for (let key in properties) {
    if (key.toLowerCase().includes('id')) {
      return key;
    }
  }
  return null;
}

function showIntegrationControls(filename) {
  const controlHtml = `
    <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; background: rgba(0,0,0,0.9); color: white; padding: 15px 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
      <h3 style="margin: 0 0 10px 0; text-align: center;">Integration Mode: ${filename}</h3>
      <p style="margin: 5px 0; font-size: 13px; text-align: center;">
        1. Select QGas pipelines (green)<br>
        2. Click dataset element (orange) to link<br>
        Links created: <span id="integration-count">0</span>
      </p>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button onclick="finishIntegration()" style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Finish</button>
        <button onclick="cancelIntegration()" style="flex: 1; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
      </div>
    </div>
  `;
  
  const controlDiv = document.createElement('div');
  controlDiv.id = 'integration-controls';
  controlDiv.innerHTML = controlHtml;
  document.body.appendChild(controlDiv);
  
  updateIntegrationCount();
}

function updateIntegrationCount() {
  const countEl = document.getElementById('integration-count');
  if (countEl) {
    countEl.textContent = equivalenceList.length;
  }
}

/**
 * Finish the integration session and export the equivalence list.
 *
 * Serialises the current <code>equivalenceList</code> array to a JSON
 * file (<code>integration_equivalences.json</code>) and triggers a browser
 * download. After the download is initiated, the integration overlay
 * is cleaned up and a success summary popup is shown.
 *
 * @returns {void}
 */
window.finishIntegration = function() {
  console.log('Finishing integration with equivalences:', equivalenceList);
  
  /* Export the equivalence list. */
  const dataStr = JSON.stringify(equivalenceList, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'integration_equivalences.json';
  link.click();
  
  cleanupIntegrationMode();
  
  showCustomPopup(
    '✅ Integration Complete',
    `<p style="text-align: center; margin: 15px 0;">Created ${equivalenceList.length} links.<br>Equivalence list downloaded.</p>`,
    [{text: 'OK', type: 'primary', onClick: () => {}}]
  );
};

/**
 * Cancel the integration session and clean up all temporary state.
 *
 * Delegates to {@link cleanupIntegrationMode} to remove the integration
 * overlay, restore hidden layers, and clear all pending equivalences.
 * Shows a brief cancellation info popup.
 *
 * @returns {void}
 */
window.cancelIntegration = function() {
  cleanupIntegrationMode();
  showInfoPopup('Integration cancelled.', '🔗 Integration');
};

function cleanupIntegrationMode() {
  integrationMode = false;
  equivalenceList = [];
  selectedQGasElements.clear();
  integrationLayer = null;
  currentIntegrationElement = null;
  
  /* Remove integration controls. */
  const controlDiv = document.getElementById('integration-controls');
  if (controlDiv) {
    controlDiv.remove();
  }
  
  /* Restore previously hidden layers. */
  if (powerplantsLayer) powerplantsLayer.addTo(map);
  if (compressorsLayer) compressorsLayer.addTo(map);
  if (storageLayer) storageLayer.addTo(map);
  if (storagesLayer) storagesLayer.addTo(map);
  if (lngLayer) lngLayer.addTo(map);
  if (nodeLayer) nodeLayer.addTo(map);
  if (consumptionLayer) consumptionLayer.addTo(map);
  
  /* Reset click handlers to default. */
  if (pipelineLayer) {
    pipelineLayer.eachLayer(layer => {
      layer.off('click');
      layer.setStyle({ color: '#3388ff', weight: 3 });
    });
  }
  
  /* Return to info mode. */
  currentMode = 'info';
  activateInfoMode();
  selectTool('info');
}

