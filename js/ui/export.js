// Extracted export logic from core.js (v5)

function exportChanges() {
  const extractFeatureForExport = (layer) => {
    if (!layer || typeof layer.toGeoJSON !== 'function') return null;
    const geo = layer.toGeoJSON();
    if (!geo || !geo.geometry) return null;
    geo.properties = { ...(layer.feature?.properties || {}), ...(geo.properties || {}) };
    return geo;
  };

  // Features nach Typ sammeln
  const pipelines = [];
  const compressors = [];
  const storages = [];
  const nodes = [];
  const lngs = [];
  const powerplants = [];

  // --- Pipelines as usual ---
  drawnItems.eachLayer(layer => {
    if (layer.feature && layer.feature.properties && layer.feature.properties.modified) {
      const geomType = layer.feature.geometry.type;
      if (geomType === "LineString") {
        const f = extractFeatureForExport(layer);
        if (f) pipelines.push(f);
      }
    }
  });

  // --- Nodes aus allen Node-Layern exportieren ---
  const exportedNodeIds = new Set();
  getAllNodeLayers().forEach(layerGroup => {
    if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
    layerGroup.eachLayer(layer => {
      const feature = layer.feature;
      const properties = feature?.properties;
      if (
        feature &&
        properties &&
        properties.modified &&
        feature.geometry?.type === 'Point' &&
        properties.Type === 'Node'
      ) {
        const nodeId = properties.ID;
        if (nodeId && exportedNodeIds.has(nodeId)) return;
        const f = extractFeatureForExport(layer);
        if (f) {
          if (nodeId) exportedNodeIds.add(nodeId);
          nodes.push(f);
        }
      }
    });
  });

  // --- Other types as usual ---
  if (typeof compressorsLayer !== "undefined") {
    compressorsLayer.eachLayer(layer => {
      if (
        layer.feature &&
        layer.feature.properties &&
        layer.feature.properties.modified &&
        layer.feature.geometry.type === "Point" &&
        layer.feature.properties.Type === "Compressor"
      ) {
        const f = extractFeatureForExport(layer);
        if (f) compressors.push(f);
      }
    });
  }
  if (typeof storageLayer !== "undefined") {
    storageLayer.eachLayer(layer => {
      if (
        layer.feature &&
        layer.feature.properties &&
        layer.feature.properties.modified &&
        layer.feature.geometry.type === "Point" &&
        layer.feature.properties.Type === "Storage"
      ) {
        const f = extractFeatureForExport(layer);
        if (f) storages.push(f);
      }
    });
  }
  if (typeof lngLayer !== "undefined") {
    lngLayer.eachLayer(layer => {
      if (
        layer.feature &&
        layer.feature.properties &&
        layer.feature.properties.modified &&
        layer.feature.geometry.type === "Point" &&
        layer.feature.properties.Type === "LNG"
      ) {
        const f = extractFeatureForExport(layer);
        if (f) lngs.push(f);
      }
    });
  }
  if (typeof powerplantsLayer !== "undefined") {
    powerplantsLayer.eachLayer(layer => {
      if (
        layer.feature &&
        layer.feature.properties &&
        layer.feature.properties.modified &&
        layer.feature.geometry.type === "Point" &&
        layer.feature.properties.Type === "Powerplant"
      ) {
        const f = extractFeatureForExport(layer);
        if (f) powerplants.push(f);
      }
    });
  }

  // === Shortpipes sammeln ===
  const shortpipes = [];
  if (shortPipeLayer) {
    shortPipeLayer.eachLayer(layer => {
      if (layer.feature) {
        const f = extractFeatureForExport(layer);
        if (f) shortpipes.push(f);
      }
    });
  }

  function exportGeoJSON(features, filename) {
    if (features.length === 0) return;
    features.forEach(f => {
      if (!f.properties) f.properties = {};
      f.properties["Last Changes"] = contributorName;
    });
    const geojson = {
      type: "FeatureCollection",
      features: features
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  // Exportiere geänderte Features
  exportGeoJSON(pipelines, "Export_Pipelines_Changed.geojson");
  exportGeoJSON(compressors, "Export_Compressors_Changed.geojson");
  exportGeoJSON(storages, "Export_Storages_Changed.geojson");
  exportGeoJSON(nodes, "Export_Nodes_Changed.geojson");
  exportGeoJSON(lngs, "Export_LNG_Changed.geojson");
  exportGeoJSON(powerplants, "Export_Powerplants_Changed.geojson");
  exportGeoJSON(shortpipes, "Export_Shortpipe_Changed.geojson");

  // Exportiere gelöschte Features
  exportGeoJSON(deletedPipelines, "Export_Pipelines_Deleted.geojson");
  exportGeoJSON(deletedCompressors, "Export_Compressors_Deleted.geojson");
  exportGeoJSON(deletedStorages, "Export_Storages_Deleted.geojson");
  exportGeoJSON(deletedNodes, "Export_Nodes_Deleted.geojson");
  exportGeoJSON(deletedLNGs, "Export_LNG_Deleted.geojson");
  exportGeoJSON(deletedPowerplants, "Export_Powerplants_Deleted.geojson");

  if (
    pipelines.length === 0 &&
    compressors.length === 0 &&
    storages.length === 0 &&
    nodes.length === 0 &&
    lngs.length === 0 &&
    powerplants.length === 0 &&
    shortpipes.length === 0 &&
    deletedPipelines.length === 0 &&
    deletedCompressors.length === 0 &&
    deletedStorages.length === 0 &&
    deletedNodes.length === 0 &&
    deletedLNGs.length === 0 &&
    deletedPowerplants.length === 0
  ) {
    showInfoPopup('No edited, new, or deleted elements to export.', '💾 Export');
  }
}

// Function to show folder name dialog for filtered data export
function showFolderNameDialog() {
  const folderModal = document.createElement('div');
  folderModal.style.position = 'fixed';
  folderModal.style.top = '0';
  folderModal.style.left = '0';
  folderModal.style.width = '100%';
  folderModal.style.height = '100%';
  folderModal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  folderModal.style.display = 'flex';
  folderModal.style.justifyContent = 'center';
  folderModal.style.alignItems = 'center';
  folderModal.style.zIndex = '1200';

  const modalContent = document.createElement('div');
  modalContent.style.background = 'white';
  modalContent.style.padding = '20px';
  modalContent.style.borderRadius = '10px';
  modalContent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
  modalContent.style.minWidth = '300px';
  modalContent.style.textAlign = 'center';

  modalContent.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">Export Filtered Data</h3>
    <label for="folder-name" style="display: block; margin: 15px 0 10px 0; font-weight: bold;">Folder Name:</label>
    <input type="text" id="folder-name" placeholder="Enter folder name" style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px;" />
    <button id="confirm-export-filtered-btn" style="display: block; width: 100%; margin: 5px 0; padding: 12px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Export</button>
    <button id="cancel-folder-btn" style="display: block; width: 100%; margin: 5px 0; padding: 12px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Cancel</button>
  `;

  folderModal.appendChild(modalContent);
  document.body.appendChild(folderModal);

  // Focus on input field
  setTimeout(() => {
    document.getElementById('folder-name').focus();
  }, 100);

  // Confirm export button
  document.getElementById('confirm-export-filtered-btn').onclick = function() {
    const folderName = document.getElementById('folder-name').value.trim();
    if (!folderName) {
      showInfoPopup('Please enter a folder name.', '📁 Export');
      return;
    }
    document.body.removeChild(folderModal);
    exportFilteredData(folderName);
  };

  // Cancel button
  document.getElementById('cancel-folder-btn').onclick = function() {
    document.body.removeChild(folderModal);
  };
}

// Function to export filtered data as ZIP
function exportFilteredData(folderName) {
  const zip = new JSZip();

  // Helper function to add GeoJSON to ZIP
  function addGeoJSONToZip(features, filename) {
    if (features.length === 0) return;
    const geojson = {
      type: "FeatureCollection",
      features: features
    };
    zip.file(filename, JSON.stringify(geojson, null, 2));
  }

  // Collect filtered data from current layers
  const pipelines = [];
  const nodes = [];
  const powerplants = [];
  const compressors = [];
  const lngs = [];
  const storages = [];
  const consumption = [];

  // Collect pipelines (both regular and estimated)
  if (pipelineLayer) {
    pipelineLayer.eachLayer(layer => {
      if (layer.feature) {
        pipelines.push(layer.feature);
      }
    });
  }
  if (estimatedPipelinesLayer) {
    estimatedPipelinesLayer.eachLayer(layer => {
      if (layer.feature) {
        pipelines.push(layer.feature);
      }
    });
  }

  // Collect nodes
  getAllNodeLayers().forEach(layerGroup => {
    if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
    layerGroup.eachLayer(layer => {
      if (layer.feature) {
        nodes.push(layer.feature);
      }
    });
  });

  // Collect powerplants
  if (powerplantsLayer) {
    powerplantsLayer.eachLayer(layer => {
      if (layer.feature) {
        powerplants.push(layer.feature);
      }
    });
  }

  // Collect compressors
  if (compressorsLayer) {
    compressorsLayer.eachLayer(layer => {
      if (layer.feature) {
        compressors.push(layer.feature);
      }
    });
  }

  // Collect LNG terminals
  if (lngLayer) {
    lngLayer.eachLayer(layer => {
      if (layer.feature) {
        lngs.push(layer.feature);
      }
    });
  }

  // Collect storage sites
  if (storageLayer) {
    storageLayer.eachLayer(layer => {
      if (layer.feature) {
        storages.push(layer.feature);
      }
    });
  }

  // Collect consumption points
  if (consumptionLayer) {
    consumptionLayer.eachLayer(layer => {
      if (layer.feature) {
        consumption.push(layer.feature);
      }
    });
  }

  // Add files to ZIP
  addGeoJSONToZip(pipelines, 'PL_Pipelines.geojson');
  addGeoJSONToZip(nodes, 'N_Nodes.geojson');
  addGeoJSONToZip(powerplants, 'P_Powerplants.geojson');
  addGeoJSONToZip(compressors, 'C_Compressors.geojson');
  addGeoJSONToZip(lngs, 'L_LNG.geojson');
  addGeoJSONToZip(storages, 'S_Storages.geojson');
  addGeoJSONToZip(consumption, 'Consumption_Points.geojson');

  // Generate and download ZIP
  zip.generateAsync({ type: "blob" }).then(function(content) {
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Function to export complete dataset (all current features) - DYNAMIC VERSION
async function exportCompleteDataset() {
  const zip = new JSZip();
  const exportedFilenames = new Set();

  const extractFeatureForExport = (layer) => {
    if (!layer || typeof layer.toGeoJSON !== 'function') return null;
    const geo = layer.toGeoJSON();
    if (!geo || !geo.geometry) return null;
    geo.properties = { ...(layer.feature?.properties || {}), ...(geo.properties || {}) };
    return geo;
  };

  // Helper function to add GeoJSON to ZIP
  function addGeoJSONToZip(features, filename) {
    if (features.length === 0) return;
    features.forEach(f => {
      if (!f.properties) f.properties = {};
      // Only add "Last Changes" for actually modified features
      if (f.properties.modified) {
        f.properties["Last Changes"] = contributorName;
      }
    });
    const geojson = {
      type: "FeatureCollection",
      features: features
    };
    zip.file(filename, JSON.stringify(geojson, null, 2));
    exportedFilenames.add(normalizeFilenameReference(filename));
  }

  // Collect data dynamically from all layers in layerConfig
  layerConfig.forEach(config => {
    const layerName = config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
    const layer = dynamicLayers[layerName];
    
    if (layer) {
      const features = [];
      layer.eachLayer(l => {
        const f = extractFeatureForExport(l);
        if (f) {
          features.push(f);
        }
      });
      
      if (features.length > 0) {
        addGeoJSONToZip(features, config.filename);
        console.log(`Exported ${features.length} features to ${config.filename}`);
      }
    }
  });

  // Also include estimated pipelines if they exist
  if (typeof estimatedPipelinesLayer !== 'undefined' && estimatedPipelinesLayer) {
    const features = [];
    estimatedPipelinesLayer.eachLayer(layer => {
      const f = extractFeatureForExport(layer);
      if (f) features.push(f);
    });
    if (features.length > 0) {
      addGeoJSONToZip(features, 'Estimated_Pipelines.geojson');
    }
  }
  
  // Include short pipes if they exist
  if (shortPipeLayer) {
    const features = [];
    shortPipeLayer.eachLayer(layer => {
      const f = extractFeatureForExport(layer);
      if (f) features.push(f);
    });
    if (features.length > 0) {
      // Extract only the filename without project path for export
      const fullPath = getShortPipeResolvedExportPath();
      const filename = fullPath.includes('/') ? fullPath.split('/').pop() : fullPath;
      addGeoJSONToZip(features, filename);
    }
  }

  // Include any custom layers that are not already covered by layerConfig
  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      if (!layer) return;
      const settings = layer._customLayerSettings || {};
      const fallbackFilename = settings.filename || `${name}.geojson`;
      if (exportedFilenames.has(normalizeFilenameReference(fallbackFilename))) {
        return;
      }
      const features = [];
      layer.eachLayer(l => {
        const f = extractFeatureForExport(l);
        if (f) features.push(f);
      });
      if (features.length > 0) {
        addGeoJSONToZip(features, fallbackFilename);
        console.log(`Exported ${features.length} features from custom layer ${name} to ${fallbackFilename}`);
      }
    });
  }

  // Include any georeferenced infrastructure plans
  if (Array.isArray(planLayers) && planLayers.length) {
    const plansFolder = zip.folder('Infrastructure_Plans');
    const planManifestEntries = [];

    const sanitizeSegment = (value, fallback) => {
      const safe = (value || fallback || '').toString().trim();
      const sanitized = safe.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
      return sanitized || fallback || 'Plan';
    };

    const decodeDataUrl = (dataUrl) => {
      if (!dataUrl || typeof dataUrl !== 'string') return null;
      const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (!match) return null;
      const mime = match[1];
      const base64 = match[2];
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const extension = (mime.split('/')?.[1] || 'png').replace(/[^a-z0-9]/gi, '') || 'png';
        return { bytes, extension };
      } catch (error) {
        console.warn('Failed to decode plan image for export:', error);
        return null;
      }
    };

    planLayers.forEach((entry, index) => {
      if (!entry) return;
      const planConfig = entry.config || entry.layer?._config;
      if (!planConfig) return;
      const folderName = sanitizeSegment(entry.name || planConfig.name, `Plan_${index + 1}`);
      const folderLabel = `${folderName}_${index + 1}`;
      const planFolder = plansFolder.folder(folderLabel);
      const serializedPairs = (planConfig.controlPairs || []).map(pair => {
        const latlng = pair.latlng || {};
        return {
          id: pair.id,
          image: pair.image,
          latlng: (latlng.lat !== undefined && latlng.lng !== undefined)
            ? { lat: latlng.lat, lng: latlng.lng }
            : null
        };
      });

      let exportedImageFile = null;
      const decoded = decodeDataUrl(planConfig.imageDataUrl);
      if (decoded) {
        const imageBase = sanitizeSegment((planConfig.imageName || folderName).replace(/\.[^.]+$/, ''), `Plan_${index + 1}`);
        exportedImageFile = `${imageBase}.${decoded.extension}`;
        planFolder.file(exportedImageFile, decoded.bytes, { binary: true });
      }

      const metadata = {
        id: entry.id || planConfig.id,
        name: entry.name || planConfig.name || folderName,
        imageName: planConfig.imageName || exportedImageFile || null,
        imageFile: exportedImageFile,
        imageWidth: planConfig.imageWidth || null,
        imageHeight: planConfig.imageHeight || null,
        controlPoints: serializedPairs
      };
      planFolder.file('metadata.json', JSON.stringify(metadata, null, 2));

      if (exportedImageFile) {
        planManifestEntries.push({
          id: metadata.id,
          name: metadata.name,
          folder: folderLabel,
          metadataFile: 'metadata.json',
          imageFile: exportedImageFile
        });
      }
    });

    if (planManifestEntries.length) {
      const manifestPayload = {
        version: 1,
        generatedAt: new Date().toISOString(),
        project: currentProject || null,
        plans: planManifestEntries
      };
      plansFolder.file('plans_manifest.json', JSON.stringify(manifestPayload, null, 2));
    }
  }

  // Update Excel configuration with current layer settings
  try {
    const workbook = XLSX.utils.book_new();
    const wsData = [
      ['Filename', 'Legend Name', 'Color', 'Marker Type', 'Size', 'Layer Type', 'Parent Filename'],
      []  // Empty row
    ];
    
    // Add all layers from layerConfig with current settings
    layerConfig.forEach(config => {
      wsData.push([
        config.filename,
        config.legendName,
        config.color,
        config.markerType,
        config.size,
        config.type,
        config.parentFilename || ''
      ]);
    });

    const hasShortPipeConfig = Array.isArray(layerConfig) && layerConfig.some(isShortPipeConfigEntry);
    if (!hasShortPipeConfig && shortPipeLayerHasFeatures()) {
      const shortPipeConfig = getShortPipeConfigTemplate();
      wsData.push([
        shortPipeConfig.filename,
        shortPipeConfig.legendName,
        shortPipeConfig.color,
        shortPipeConfig.markerType,
        shortPipeConfig.size,
        shortPipeConfig.type,
        shortPipeConfig.parentFilename
      ]);
      console.log('Appended Short-Pipes layer to Excel configuration for export.');
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Input_Files');
    
    // Convert to binary and add to ZIP
    const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    zip.file('02_Input_and_Configuration.xlsx', excelBinary);
    console.log('Added updated Excel configuration to export');
  } catch (error) {
    console.error('Error creating Excel file:', error);
  }

  // Add Data and Licensing file if available
  try {
    const { response } = await fetchProjectResource('01_Data_and_Licensing.txt');
    if (response) {
      const text = await response.text();
      zip.file('01_Data_and_Licensing.txt', text);
      console.log('Added Data and Licensing file to export');
    }
  } catch (error) {
    console.log('No Data and Licensing file found');
  }

  // Generate and download ZIP
  zip.generateAsync({ type: "blob" }).then(function(content) {
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Complete_Dataset_${currentProject}_${new Date().toISOString().split('T')[0]}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✓ Export completed successfully');
  });
}


  // Alert entfernt - wird durch Loading-Screen ersetzt



function getShortPipeResolvedExportPath() {
  const configEntry = getConfiguredShortPipeConfig();
  const filename = configEntry?.filename || SHORT_PIPE_CONFIG_DEFAULTS.filename;
  return resolveLayerFilePath(filename);
}

function openExportDialog() {
  showCustomPopup(
    '💾 Export Data',
    '<p style="text-align: center; margin: 15px 0;">Choose export type:</p>',
    [
      {
        text: 'Export Changes',
        type: 'primary',
        onClick: exportChanges
      },
      {
        text: 'Export Filtered Data',
        type: 'primary',
        onClick: exportFilteredData
      },
      {
        text: 'Export Complete Dataset',
        type: 'primary',
        onClick: exportCompleteDataset
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {}
      }
    ]
  );
}

