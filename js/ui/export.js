/**
 * QGas - Export Module
 *
 * Module Description:
 * Handles export workflows for changed, filtered, and complete datasets,
 * including ZIP assembly and Excel configuration generation. Filtered exports
 * apply active country rules consistently and merge synchronized active/original
 * compressor features without duplicate IDs.
 *
 * Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - In-memory layer state (dynamicLayers, layerConfig, deleted registry).
 * - External libraries: JSZip, XLSX.
 *
 * Public API:
 * - exportChanges(): Export changed and deleted elements.
 * - exportFilteredData(folderName): Export filtered datasets to ZIP.
 * - exportCompleteDataset(): Export the full current dataset to ZIP.
 */
/*
 * Extracted export logic from core.js (v5).
 */

function normalizeExportFormat(format) {
  const normalized = String(format || 'geojson').toLowerCase();
  return ['geojson', 'csv', 'lego'].includes(normalized) ? normalized : 'geojson';
}

function filenameForExportFormat(filename, format) {
  return String(filename || 'Layer.geojson').replace(/\.(?:geojson|csv)$/i, `.${normalizeExportFormat(format)}`);
}

function featuresToCsv(features) {
  const propertyNames = [];
  const seen = new Set();
  features.forEach(feature => Object.keys(feature.properties || {}).forEach(key => {
    if (!seen.has(key)) { seen.add(key); propertyNames.push(key); }
  }));
  const rows = features.map(feature => {
    const row = {};
    propertyNames.forEach(key => {
      const value = feature.properties?.[key];
      row[key] = value && typeof value === 'object' ? JSON.stringify(value) : (value ?? '');
    });
    row.geometry = JSON.stringify(feature.geometry);
    return row;
  });
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...propertyNames, 'geometry'] });
  return '\uFEFF' + XLSX.utils.sheet_to_csv(worksheet);
}

function serializeFeatures(features, format) {
  return normalizeExportFormat(format) === 'csv'
    ? featuresToCsv(features)
    : JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
}

async function chooseExportDirectory() {
  if (typeof window.showDirectoryPicker !== 'function') return { handle: null, cancelled: false };
  try {
    const handle = await window.showDirectoryPicker({
      id: 'qgas-export-directory',
      mode: 'readwrite',
      startIn: 'downloads'
    });
    return { handle, cancelled: false };
  } catch (error) {
    if (error?.name === 'AbortError') return { handle: null, cancelled: true };
    console.warn('Folder selection is unavailable; using the browser download folder.', error);
    return { handle: null, cancelled: false };
  }
}

async function saveExportBlob(blob, filename, directorySelection = null) {
  const selection = directorySelection || await chooseExportDirectory();
  if (selection.cancelled) return false;
  if (selection.handle) {
    const fileHandle = await selection.handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}

const LEGO_NETWORK_TEMPLATE_PATH = 'Input/Lego_Template/Gas_Network.xlsx';
const LEGO_NETWORK_MAPPING_PATH = 'Input/Lego_Template/Gas_Network_Mapping.txt';
const LEGO_NODE_TEMPLATE_PATH = 'Input/Lego_Template/Gas_NodeInfo.xlsx';
const LEGO_NODE_MAPPING_PATH = 'Input/Lego_Template/Gas_NodeInfo_Mapping.txt';
const LEGO_NETWORK_FIRST_DATA_ROW = 8;

function parseLegoNetworkMapping(text) {
  const rules = [];
  const mappings = [];

  String(text || '').split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const fields = rawLine.split(';').map(value => value.trim());
    const recordType = (fields[0] || '').toUpperCase();
    if (recordType === 'RULE' && fields.length >= 4) {
      rules.push({
        category: fields[1].toLowerCase(),
        layerType: fields[2].toLowerCase(),
        namePatterns: fields[3].split('|').map(value => value.trim().toLowerCase()).filter(Boolean)
      });
      return;
    }
    if (recordType === 'MAP' && fields.length >= 6) {
      mappings.push({
        category: fields[1].toLowerCase(),
        column: fields[2].toUpperCase(),
        header: fields[3],
        attributes: fields[4].split('|').map(value => value.trim()).filter(Boolean),
        defaultValue: fields[5] || '',
        transform: fields.slice(6).join(';')
      });
      return;
    }
    throw new Error(`Invalid LEGO mapping entry on line ${index + 1}.`);
  });

  if (!rules.length || !mappings.length) {
    throw new Error('The LEGO mapping must contain at least one RULE and one MAP entry.');
  }
  return { rules, mappings };
}

function classifyLegoNetworkLayer(config, rules) {
  const layerType = String(config?.type || '').trim().toLowerCase();
  const descriptor = `${config?.filename || ''} ${config?.legendName || ''}`.toLowerCase();
  const matchingRule = rules.find(rule => {
    if (rule.layerType !== layerType) return false;
    return rule.namePatterns.includes('*') ||
      rule.namePatterns.some(pattern => descriptor.includes(pattern));
  });
  return matchingRule?.category || null;
}

function getLegoMappedValue(mapping, properties, datasetName) {
  let result;
  for (const attribute of mapping.attributes) {
    if (!Object.prototype.hasOwnProperty.call(properties, attribute)) continue;
    const value = properties[attribute];
    if (value !== null && value !== undefined && value !== '') {
      result = value;
      break;
    }
  }
  if (result === undefined) {
    if (mapping.defaultValue === '$dataset') result = datasetName;
    else if (mapping.defaultValue === '$qgas_dataset') result = `QGAS ${datasetName}`;
    else if (/^-?(?:\d+|\d*\.\d+)$/.test(mapping.defaultValue)) result = Number(mapping.defaultValue);
    else result = mapping.defaultValue;
  }
  const divideMatch = String(mapping.transform || '').match(/^divide:(-?(?:\d+|\d*\.\d+))$/i);
  if (divideMatch && result !== '' && result !== null && result !== undefined) {
    const numericValue = Number(result);
    const divisor = Number(divideMatch[1]);
    if (Number.isFinite(numericValue) && Number.isFinite(divisor) && divisor !== 0) {
      result = numericValue / divisor;
    }
  }
  if (String(mapping.transform || '').toLowerCase() === 'text' && result !== null && result !== undefined) {
    result = String(result);
  }
  return result;
}

function collectLegoNetworkRows(mappingConfig, scope = 'complete') {
  const rows = [];
  const seenLayerGroups = new Set();
  const seenFeatureLayers = new WeakSet();
  const replacedCompressorIds = new Set();
  const shortPipeGroups = new Set();
  const shortPipeFeatureLayers = new WeakSet();
  const onlyChanged = scope === 'changes';
  const useOriginals = scope === 'complete';

  const registerShortPipeGroup = group => {
    if (!group || typeof group.eachLayer !== 'function') return;
    shortPipeGroups.add(group);
    const visit = layer => {
      if (!layer) return;
      if (layer.feature) shortPipeFeatureLayers.add(layer);
      if (typeof layer.eachLayer === 'function') layer.eachLayer(visit);
    };
    group.eachLayer(visit);
  };
  try { registerShortPipeGroup(shortPipeLayer); } catch (e) {}
  try { registerShortPipeGroup(originalShortPipeLayer); } catch (e) {}

  const matchesActiveExportFilter = (feature, category) => {
    if (scope !== 'filtered') return true;
    let countryCodes = null;
    try {
      if (selectedCountries instanceof Set && selectedCountries.size) countryCodes = selectedCountries;
    } catch (e) {}
    if (!countryCodes) return true;
    if ((category === 'pipeline' || category === 'shortpipe') && typeof shouldShowPipeline === 'function') {
      return shouldShowPipeline(feature, countryCodes);
    }
    if (typeof shouldShowElement === 'function') return shouldShowElement(feature, countryCodes);
    return true;
  };

  const addLayer = (layer, config) => {
    if (!layer || typeof layer.eachLayer !== 'function' || seenLayerGroups.has(layer)) return;
    const category = classifyLegoNetworkLayer(config, mappingConfig.rules);
    if (!category) return;
    if (category !== 'shortpipe' && shortPipeGroups.has(layer)) return;
    seenLayerGroups.add(layer);
    const datasetName = String(config.legendName || config.filename || 'Dataset')
      .replace(/^.*[\\/]/, '')
      .replace(/\.(geojson|json|csv)$/i, '');
    layer.eachLayer(featureLayer => {
      const feature = featureLayer?.feature;
      if (!feature || feature.properties?.deleted) return;
      if (category === 'pipeline' && shortPipeFeatureLayers.has(featureLayer)) return;
      if (seenFeatureLayers.has(featureLayer)) return;
      if (onlyChanged && !feature.properties?.modified) return;
      if (!matchesActiveExportFilter(feature, category)) return;
      if (category === 'compressor') {
        const distributionGroup = String(feature.properties?.Distribution_Group ?? '').trim().toLowerCase();
        const featureId = String(feature.properties?.id ?? feature.properties?.ID ?? '').trim().toLowerCase();
        if (distributionGroup) replacedCompressorIds.add(distributionGroup);
        else if (featureId && replacedCompressorIds.has(featureId)) return;
      }
      seenFeatureLayers.add(featureLayer);
      rows.push({ category, datasetName, properties: { ...(feature.properties || {}) } });
    });
  };

  (Array.isArray(layerConfig) ? layerConfig : []).forEach(config => {
    const configuredType = String(config?.type || '').trim().toLowerCase();
    if (configuredType !== 'line' && configuredType !== 'in-line') return;
    const layerName = typeof getLayerNameFromConfig === 'function'
      ? getLayerNameFromConfig(config)
      : String(config.filename || '').replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
    let layer = dynamicLayers[layerName];
    const category = classifyLegoNetworkLayer(config, mappingConfig.rules);
    if (
      category !== 'shortpipe' &&
      typeof shortPipeLayer !== 'undefined' &&
      layer === shortPipeLayer
    ) {
      /* The dedicated short-pipe group must be exported with its own LEGO
       * category and data-source label, never through a pipeline alias. */
      return;
    }
    if (
      !useOriginals &&
      category === 'compressor' &&
      typeof compressorsLayer !== 'undefined' &&
      compressorsLayer
    ) {
      /* Country filtering can replace the configured dynamic-layer reference.
       * Distributed compressors are always inserted into the active compressor
       * group, so filtered/changes exports must read that authoritative group. */
      layer = compressorsLayer;
    }
    if (useOriginals) {
      if (
        category === 'pipeline' &&
        typeof pipelineLayer !== 'undefined' &&
        layer === pipelineLayer &&
        typeof originalPipelineLayer !== 'undefined' &&
        originalPipelineLayer
      ) {
        layer = originalPipelineLayer;
      } else if (
        category === 'compressor' &&
        typeof compressorsLayer !== 'undefined' &&
        layer === compressorsLayer &&
        typeof originalCompressorsLayer !== 'undefined' &&
        originalCompressorsLayer
      ) {
        layer = originalCompressorsLayer;
      } else if (
        category === 'shortpipe' &&
        typeof shortPipeLayer !== 'undefined' &&
        layer === shortPipeLayer &&
        typeof originalShortPipeLayer !== 'undefined' &&
        originalShortPipeLayer
      ) {
        layer = originalShortPipeLayer;
      }
    }
    addLayer(layer, config);
  });

  /* Compressor references may be replaced when a country filter is applied.
   * Merge both authoritative groups and apply the active filter per feature;
   * the WeakSet above prevents shared Leaflet markers from being duplicated. */
  const compressorConfig = (Array.isArray(layerConfig) ? layerConfig : []).find(config =>
    classifyLegoNetworkLayer(config, mappingConfig.rules) === 'compressor'
  ) || { filename: 'compressors.geojson', legendName: 'Compressors', type: 'In-Line' };
  if (!useOriginals) {
    try { addLayer(compressorsLayer, compressorConfig); } catch (e) {}
    try { addLayer(originalCompressorsLayer, compressorConfig); } catch (e) {}
  }

  if (typeof shortPipeLayer !== 'undefined' && shortPipeLayer) {
    const shortPipeConfig = (typeof getConfiguredShortPipeConfig === 'function' && getConfiguredShortPipeConfig()) ||
      { filename: 'Short_Pipes.geojson', legendName: 'Short Pipes', type: 'Line' };
    const sourceLayer = useOriginals && typeof originalShortPipeLayer !== 'undefined' && originalShortPipeLayer
      ? originalShortPipeLayer
      : shortPipeLayer;
    addLayer(sourceLayer, shortPipeConfig);
  }

  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      const settings = layer?._customLayerSettings || {};
      const geometryClass = settings.geometryClass || (layer?._customLineLayer ? 'line' : '');
      const type = geometryClass === 'inline' ? 'In-Line' : (geometryClass === 'line' ? 'Line' : '');
      if (!type) return;
      addLayer(layer, {
        filename: settings.filename || `${name}.geojson`,
        legendName: settings.name || layer._customLayerName || name,
        type
      });
    });
  }

  /* A moved short pipe can still exist as a separate marker instance in an
   * original/filtered pipeline group. Object-identity checks cannot detect
   * that case, so the Short-Pipe ID is authoritative and removes the stale
   * pipeline row before ordering and workbook generation. */
  const exportedShortPipeIds = new Set(rows
    .filter(entry => entry.category === 'shortpipe')
    .map(entry => String(entry.properties?.id ?? entry.properties?.ID ?? '').trim().toLowerCase())
    .filter(Boolean));
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const entry = rows[index];
    if (entry.category !== 'pipeline') continue;
    const id = String(entry.properties?.id ?? entry.properties?.ID ?? '').trim().toLowerCase();
    if (id && exportedShortPipeIds.has(id)) rows.splice(index, 1);
  }
  const exportedValveIds = new Set(rows
    .filter(entry => entry.category === 'valve')
    .map(entry => String(entry.properties?.id ?? entry.properties?.ID ?? '').trim().toLowerCase())
    .filter(Boolean));
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const entry = rows[index];
    if (entry.category !== 'pipeline') continue;
    const id = String(entry.properties?.id ?? entry.properties?.ID ?? '').trim().toLowerCase();
    if (id && exportedValveIds.has(id)) rows.splice(index, 1);
  }

  const categoryOrder = new Map([
    ['pipeline', 0],
    ['compressor', 1],
    ['valve', 2],
    ['shortpipe', 3],
    ['inline', 4]
  ]);
  rows.sort((left, right) =>
    (categoryOrder.get(left.category) ?? 99) - (categoryOrder.get(right.category) ?? 99)
  );

  const loopCounts = new Map();
  rows.forEach(entry => {
    const startNode = String(entry.properties.node_start ?? '').trim();
    const endNode = String(entry.properties.node_end ?? '').trim();
    const combination = `${startNode}\u0000${endNode}`;
    const loopNumber = (loopCounts.get(combination) || 0) + 1;
    loopCounts.set(combination, loopNumber);
    entry.properties.__lego_loop = `Loop${loopNumber}`;
  });
  return rows;
}

function collectLegoNodeRows(mappingConfig, scope = 'complete') {
  const rows = [];
  const seenLayerGroups = new Set();
  const onlyChanged = scope === 'changes';
  const useOriginals = scope === 'complete';

  const addLayer = (layer, config) => {
    if (!layer || typeof layer.eachLayer !== 'function' || seenLayerGroups.has(layer)) return;
    const category = classifyLegoNetworkLayer(config, mappingConfig.rules);
    if (category !== 'node') return;
    seenLayerGroups.add(layer);
    const datasetName = String(config.legendName || config.filename || 'Nodes')
      .replace(/^.*[\\/]/, '')
      .replace(/\.(geojson|json|csv)$/i, '');
    layer.eachLayer(featureLayer => {
      const feature = featureLayer?.feature;
      if (!feature || feature.properties?.deleted) return;
      if (onlyChanged && !feature.properties?.modified) return;
      rows.push({ category, datasetName, properties: feature.properties || {} });
    });
  };

  (Array.isArray(layerConfig) ? layerConfig : []).forEach(config => {
    if (classifyLegoNetworkLayer(config, mappingConfig.rules) !== 'node') return;
    const layerName = typeof getLayerNameFromConfig === 'function'
      ? getLayerNameFromConfig(config)
      : String(config.filename || '').replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
    let layer = dynamicLayers[layerName];
    if (
      useOriginals &&
      typeof nodeLayer !== 'undefined' &&
      layer === nodeLayer &&
      typeof originalNodeLayer !== 'undefined' &&
      originalNodeLayer
    ) {
      layer = originalNodeLayer;
    }
    addLayer(layer, config);
  });

  const directNodesLayer = useOriginals &&
    typeof originalNodeLayer !== 'undefined' &&
    originalNodeLayer
    ? originalNodeLayer
    : (typeof nodeLayer !== 'undefined' ? nodeLayer : null);
  addLayer(directNodesLayer, {
    filename: 'nodes.geojson',
    legendName: 'Nodes',
    type: 'Point'
  });

  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      const settings = layer?._customLayerSettings || {};
      if (settings.typeKey !== 'Node' && settings.elementKey !== 'nodes') return;
      addLayer(layer, {
        filename: settings.filename || `${name}.geojson`,
        legendName: settings.name || layer._customLayerName || name,
        type: 'Node'
      });
    });
  }
  return rows;
}

function getLegoXmlElement(parent, localName) {
  return Array.from(parent.getElementsByTagNameNS('*', localName))[0] || null;
}

function setLegoTemplateCellValue(xmlDocument, rowElement, column, rowNumber, value) {
  const cells = Array.from(rowElement.getElementsByTagNameNS('*', 'c'));
  const cell = cells.find(candidate => String(candidate.getAttribute('r') || '').replace(/\d+$/, '') === column);
  if (!cell) return;

  cell.setAttribute('r', `${column}${rowNumber}`);
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  cell.removeAttribute('t');

  if (value === null || value === undefined || value === '') return;
  const namespace = rowElement.namespaceURI;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const valueElement = xmlDocument.createElementNS(namespace, 'v');
    valueElement.textContent = String(value);
    cell.appendChild(valueElement);
    return;
  }

  cell.setAttribute('t', 'inlineStr');
  const inlineString = xmlDocument.createElementNS(namespace, 'is');
  const textElement = xmlDocument.createElementNS(namespace, 't');
  const text = String(value);
  if (/^\s|\s$/.test(text)) {
    textElement.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
  }
  textElement.textContent = text;
  inlineString.appendChild(textElement);
  cell.appendChild(inlineString);
}

async function buildPopulatedLegoWorkbook(templateBuffer, mappingConfig, rows, lastColumn) {
  const templateArchive = await JSZip.loadAsync(templateBuffer);
  const worksheetPath = 'xl/worksheets/sheet1.xml';
  const worksheetFile = templateArchive.file(worksheetPath);
  if (!worksheetFile) throw new Error(`The template does not contain ${worksheetPath}.`);
  const parser = new DOMParser();
  const xmlDocument = parser.parseFromString(await worksheetFile.async('string'), 'application/xml');
  if (xmlDocument.getElementsByTagName('parsererror').length) {
    throw new Error('The LEGO worksheet XML could not be read.');
  }

  const sharedStringsFile = templateArchive.file('xl/sharedStrings.xml');
  const sharedStrings = [];
  if (sharedStringsFile) {
    const sharedDocument = parser.parseFromString(await sharedStringsFile.async('string'), 'application/xml');
    Array.from(sharedDocument.getElementsByTagNameNS('*', 'si')).forEach(item => {
      sharedStrings.push(
        Array.from(item.getElementsByTagNameNS('*', 't')).map(text => text.textContent || '').join('')
      );
    });
  }
  const readTemplateCellText = address => {
    const cell = Array.from(xmlDocument.getElementsByTagNameNS('*', 'c'))
      .find(candidate => candidate.getAttribute('r') === address);
    if (!cell) return '';
    const value = getLegoXmlElement(cell, 'v')?.textContent || '';
    return cell.getAttribute('t') === 's' ? String(sharedStrings[Number(value)] || '') : value;
  };
  mappingConfig.mappings.forEach(mapping => {
    const templateHeader = readTemplateCellText(`${mapping.column}3`).trim();
    if (templateHeader !== mapping.header) {
      throw new Error(
        `Mapping column ${mapping.column} expects "${mapping.header}", but the template contains "${templateHeader}".`
      );
    }
  });

  const sheetData = getLegoXmlElement(xmlDocument, 'sheetData');
  if (!sheetData) throw new Error('The LEGO worksheet has no sheetData element.');
  const templateRow = Array.from(sheetData.getElementsByTagNameNS('*', 'row'))
    .find(row => Number(row.getAttribute('r')) === LEGO_NETWORK_FIRST_DATA_ROW);
  if (!templateRow) throw new Error(`Template data row ${LEGO_NETWORK_FIRST_DATA_ROW} was not found.`);
  const rowPattern = templateRow.cloneNode(true);
  let exactIntegerStyleIndex = '';
  const stylesPath = 'xl/styles.xml';
  const stylesFile = templateArchive.file(stylesPath);
  if (stylesFile) {
    const stylesDocument = parser.parseFromString(await stylesFile.async('string'), 'application/xml');
    const cellXfs = getLegoXmlElement(stylesDocument, 'cellXfs');
    const diameterTemplateCell = Array.from(rowPattern.getElementsByTagNameNS('*', 'c'))
      .find(cell => String(cell.getAttribute('r') || '').replace(/\d+$/, '') === 'H');
    const sourceStyleIndex = Number(diameterTemplateCell?.getAttribute('s'));
    const styles = cellXfs ? Array.from(cellXfs.getElementsByTagNameNS('*', 'xf')) : [];
    const sourceStyle = Number.isInteger(sourceStyleIndex) ? styles[sourceStyleIndex] : null;
    if (cellXfs && sourceStyle) {
      const integerStyle = sourceStyle.cloneNode(true);
      integerStyle.setAttribute('numFmtId', '0');
      integerStyle.removeAttribute('applyNumberFormat');
      cellXfs.appendChild(integerStyle);
      exactIntegerStyleIndex = String(styles.length);
      cellXfs.setAttribute('count', String(styles.length + 1));
      templateArchive.file(stylesPath, new XMLSerializer().serializeToString(stylesDocument));
    }
  }
  Array.from(sheetData.getElementsByTagNameNS('*', 'row')).forEach(row => {
    if (Number(row.getAttribute('r')) >= LEGO_NETWORK_FIRST_DATA_ROW) sheetData.removeChild(row);
  });

  rows.forEach((entry, index) => {
    const targetRow = LEGO_NETWORK_FIRST_DATA_ROW + index;
    const rowElement = rowPattern.cloneNode(true);
    rowElement.setAttribute('r', String(targetRow));
    Array.from(rowElement.getElementsByTagNameNS('*', 'c')).forEach(cell => {
      const column = String(cell.getAttribute('r') || '').replace(/\d+$/, '');
      setLegoTemplateCellValue(xmlDocument, rowElement, column, targetRow, '');
    });
    mappingConfig.mappings
      .filter(mapping => mapping.category === '*' || mapping.category === entry.category)
      .forEach(mapping => {
        setLegoTemplateCellValue(
          xmlDocument,
          rowElement,
          mapping.column,
          targetRow,
          getLegoMappedValue(mapping, entry.properties, entry.datasetName)
        );
        if (
          mapping.column === 'H' &&
          (entry.category === 'shortpipe' || entry.category === 'valve')
        ) {
          const diameterCell = Array.from(rowElement.getElementsByTagNameNS('*', 'c'))
            .find(cell => cell.getAttribute('r') === `H${targetRow}`);
          /* Preserve fill/borders from the template while using a General
           * numeric format, so the numeric sentinel is visibly exactly 9999. */
          if (diameterCell && exactIntegerStyleIndex) {
            diameterCell.setAttribute('s', exactIntegerStyleIndex);
          }
        }
      });
    sheetData.appendChild(rowElement);
  });

  const lastRow = Math.max(LEGO_NETWORK_FIRST_DATA_ROW - 1, LEGO_NETWORK_FIRST_DATA_ROW + rows.length - 1);
  const dimension = getLegoXmlElement(xmlDocument, 'dimension');
  if (dimension) dimension.setAttribute('ref', `A1:${lastColumn}${lastRow}`);
  templateArchive.file(worksheetPath, new XMLSerializer().serializeToString(xmlDocument));
  return templateArchive.generateAsync({ type: 'uint8array' });
}

async function exportLegoFormat(scope = 'complete', requestedName = '') {
  try {
    const cacheSuffix = `?v=${Date.now()}`;
    const [templateResponse, mappingResponse, nodeTemplateResponse, nodeMappingResponse] = await Promise.all([
      fetch(`${LEGO_NETWORK_TEMPLATE_PATH}${cacheSuffix}`),
      fetch(`${LEGO_NETWORK_MAPPING_PATH}${cacheSuffix}`),
      fetch(`${LEGO_NODE_TEMPLATE_PATH}${cacheSuffix}`),
      fetch(`${LEGO_NODE_MAPPING_PATH}${cacheSuffix}`)
    ]);
    if (!templateResponse.ok) throw new Error(`Template not found: ${LEGO_NETWORK_TEMPLATE_PATH}`);
    if (!mappingResponse.ok) throw new Error(`Mapping not found: ${LEGO_NETWORK_MAPPING_PATH}`);
    if (!nodeTemplateResponse.ok) throw new Error(`Template not found: ${LEGO_NODE_TEMPLATE_PATH}`);
    if (!nodeMappingResponse.ok) throw new Error(`Mapping not found: ${LEGO_NODE_MAPPING_PATH}`);

    const networkMapping = parseLegoNetworkMapping(await mappingResponse.text());
    const nodeMapping = parseLegoNetworkMapping(await nodeMappingResponse.text());
    const networkRows = collectLegoNetworkRows(networkMapping, scope);
    const nodeRows = collectLegoNodeRows(nodeMapping, scope);
    const [networkWorkbook, nodeWorkbook] = await Promise.all([
      buildPopulatedLegoWorkbook(await templateResponse.arrayBuffer(), networkMapping, networkRows, 'R'),
      buildPopulatedLegoWorkbook(await nodeTemplateResponse.arrayBuffer(), nodeMapping, nodeRows, 'N')
    ]);
    const legoPackage = new JSZip();
    legoPackage.file('Gas_Network.xlsx', networkWorkbook);
    legoPackage.file('Gas_NodeInfo.xlsx', nodeWorkbook);
    const geoJsonProjectFolder = legoPackage.folder('GeoJSON_Project');
    if (scope === 'filtered') {
      await exportFilteredData(requestedName || 'Filtered_Data', 'geojson', {
        zip: geoJsonProjectFolder,
        download: false
      });
    } else {
      await exportCompleteDataset('geojson', {
        zip: geoJsonProjectFolder,
        download: false
      });
    }
    const blob = await legoPackage.generateAsync({
      type: 'blob',
      mimeType: 'application/zip'
    });
    const safeRequestedName = String(requestedName || '').trim().replace(/[<>:"/\\|?*]+/g, '_');
    const scopeLabel = scope === 'changes' ? 'Changes' : (scope === 'filtered' ? 'Filtered' : 'Complete');
    const filename = safeRequestedName
      ? `${safeRequestedName}.zip`
      : `LEGO_${scopeLabel}_${currentProject}_${new Date().toISOString().split('T')[0]}.zip`;
    await saveExportBlob(blob, filename);

    if (!networkRows.length && !nodeRows.length) {
      showInfoPopup('The LEGO package was exported, but no matching network or node features were found.', 'LEGO Export');
    }
  } catch (error) {
    console.error('LEGO export failed:', error);
    showInfoPopup(`Could not create the LEGO export: ${error.message}`, 'LEGO Export');
  }
}

/**
 * Export all changed and deleted elements as GeoJSON files in a ZIP archive.
 *
 * Collects every layer feature whose <code>last_changed</code> value is not
 * <code>original</code> and all
 * entries in the soft-deletion registry. Organises the output into
 * GeoJSON files per infrastructure type (pipelines, nodes, compressors,
 * storages, power-plants, etc.) and triggers a browser download of the
 * resulting ZIP archive (<code>changes.zip</code>).
 *
 * @returns {void}
 */
async function exportChanges(format = 'geojson') {
  format = normalizeExportFormat(format);
  if (format === 'lego') {
    exportLegoFormat('changes');
    return;
  }
  const featureHasChanges = properties => typeof isFeatureChanged === 'function'
    ? isFeatureChanged(properties)
    : Boolean(properties?.last_changed && String(properties.last_changed).toLowerCase() !== 'original');

  const extractFeatureForExport = (layer) => {
    if (!layer || typeof layer.toGeoJSON !== 'function') return null;
    const geo = layer.toGeoJSON();
    if (!geo || !geo.geometry) return null;
    geo.properties = { ...(layer.feature?.properties || {}), ...(geo.properties || {}) };
    if (typeof initializeFeatureChangeTracking === 'function') initializeFeatureChangeTracking(geo);
    return geo;
  };

  /* Collect features by type. */
  const pipelines = [];
  const compressors = [];
  const storages = [];
  const nodes = [];
  const lngs = [];
  const powerplants = [];

  /* Pipelines from drawn items. */
  drawnItems.eachLayer(layer => {
    if (layer.feature && layer.feature.properties && featureHasChanges(layer.feature.properties)) {
      const geomType = layer.feature.geometry.type;
      if (geomType === "LineString") {
        const f = extractFeatureForExport(layer);
        if (f) pipelines.push(f);
      }
    }
  });

  /* Nodes across all node layers (de-duplicated by canonical id). */
  const exportedNodeIds = new Set();
  getAllNodeLayers().forEach(layerGroup => {
    if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
    layerGroup.eachLayer(layer => {
      const feature = layer.feature;
      const properties = feature?.properties;
      if (
        feature &&
        properties &&
        featureHasChanges(properties) &&
        feature.geometry?.type === 'Point'
      ) {
        const nodeId = properties.id;
        if (nodeId && exportedNodeIds.has(nodeId)) return;
        const f = extractFeatureForExport(layer);
        if (f) {
          if (nodeId) exportedNodeIds.add(nodeId);
          nodes.push(f);
        }
      }
    });
  });

  /* Other point-based infrastructure layers. */
  if (typeof compressorsLayer !== "undefined") {
    compressorsLayer.eachLayer(layer => {
      if (
        layer.feature &&
        layer.feature.properties &&
        featureHasChanges(layer.feature.properties) &&
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
        featureHasChanges(layer.feature.properties) &&
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
        featureHasChanges(layer.feature.properties) &&
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
        featureHasChanges(layer.feature.properties) &&
        layer.feature.geometry.type === "Point" &&
        layer.feature.properties.Type === "Powerplant"
      ) {
        const f = extractFeatureForExport(layer);
        if (f) powerplants.push(f);
      }
    });
  }

  /* Short pipes from dedicated layer. */
  const shortpipes = [];
  if (shortPipeLayer) {
    shortPipeLayer.eachLayer(layer => {
      if (layer.feature && featureHasChanges(layer.feature.properties)) {
        const f = extractFeatureForExport(layer);
        if (f) shortpipes.push(f);
      }
    });
  }

  function buildSpatialExport(features, filename) {
    if (features.length === 0) return;
    features.forEach(f => {
      if (!f.properties) f.properties = {};
      if (typeof initializeFeatureChangeTracking === 'function') initializeFeatureChangeTracking(f);
    });
    const outputFilename = filenameForExportFormat(filename, format);
    const blob = new Blob([serializeFeatures(features, format)], {
      type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/geo+json'
    });
    return { blob, filename: outputFilename };
  }

  const exportFiles = [
    buildSpatialExport(pipelines, "Export_Pipelines_Changed.geojson"),
    buildSpatialExport(compressors, "Export_Compressors_Changed.geojson"),
    buildSpatialExport(storages, "Export_Storages_Changed.geojson"),
    buildSpatialExport(nodes, "Export_Nodes_Changed.geojson"),
    buildSpatialExport(lngs, "Export_LNG_Changed.geojson"),
    buildSpatialExport(powerplants, "Export_Powerplants_Changed.geojson"),
    buildSpatialExport(shortpipes, "Export_Shortpipe_Changed.geojson"),
    buildSpatialExport(deletedPipelines, "Export_Pipelines_Deleted.geojson"),
    buildSpatialExport(deletedCompressors, "Export_Compressors_Deleted.geojson"),
    buildSpatialExport(deletedStorages, "Export_Storages_Deleted.geojson"),
    buildSpatialExport(deletedNodes, "Export_Nodes_Deleted.geojson"),
    buildSpatialExport(deletedLNGs, "Export_LNG_Deleted.geojson"),
    buildSpatialExport(deletedPowerplants, "Export_Powerplants_Deleted.geojson")
  ].filter(Boolean);

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
    return;
  }

  const directorySelection = await chooseExportDirectory();
  if (directorySelection.cancelled) return;
  for (const file of exportFiles) {
    await saveExportBlob(file.blob, file.filename, directorySelection);
  }
}

/*
 * Show a dialog to collect the export folder name for filtered data.
 */
function showFolderNameDialog(format = 'geojson') {
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

  /* Focus on input field after insertion. */
  setTimeout(() => {
    document.getElementById('folder-name').focus();
  }, 100);

  /* Confirm export button. */
  document.getElementById('confirm-export-filtered-btn').onclick = function() {
    const folderName = document.getElementById('folder-name').value.trim();
    if (!folderName) {
      showInfoPopup('Please enter a folder name.', '📁 Export');
      return;
    }
    document.body.removeChild(folderModal);
    if (normalizeExportFormat(format) === 'lego') {
      exportLegoFormat('filtered', folderName);
    } else {
      exportFilteredData(folderName, format);
    }
  };

  /* Cancel button. */
  document.getElementById('cancel-folder-btn').onclick = function() {
    document.body.removeChild(folderModal);
  };
}

/*
 * Export filtered data as a ZIP archive.
 */
/**
 * Export the currently filtered dataset as a ZIP archive.
 *
 * Iterates all active layer configurations, applies the current attribute
 * filter state, and serialises each layer to a GeoJSON file. Supplementary
 * files (Excel configuration workbook, short-pipe definitions) are appended
 * and the archive is offered for browser download as
 * {@code <folderName>.zip}.
 *
 * @param {string} folderName - Name used for the top-level ZIP folder and the
 *   downloaded filename.
 * @returns {Promise<void>}
 */
async function exportFilteredData(folderName, format = 'geojson', options = {}) {
  format = normalizeExportFormat(format);
  const zip = options.zip || new JSZip();
  const exportedFilenames = new Set();
  const exportedConfigFilenames = new Set();
  const configList = Array.isArray(layerConfig) ? layerConfig : [];
  const knownConfigFilenames = new Set(
    configList.map(cfg => normalizeFilenameReference(filenameForExportFormat(cfg?.filename, format)))
  );
  const additionalConfigEntries = [];
  const deletedIdentities = (typeof collectAllDeletedIdentities === 'function')
    ? collectAllDeletedIdentities()
    : new Set();

  const buildCustomConfigEntry = (layer, name, filename) => {
    const settings = layer?._customLayerSettings || {};
    const legendName = settings.name || layer?._customLayerName || name || filename.replace(/\.geojson$/i, '');
    const geometryClass = settings.geometryClass || (layer?._customLineLayer ? 'line' : 'point');
    const isLine = geometryClass === 'line';
    const isInline = geometryClass === 'inline';
    const isNode = settings.typeKey === 'Node' || settings.elementKey === 'nodes';
    const type = isLine ? 'Line' : (isInline ? 'In-Line' : (isNode ? 'Node' : 'Point'));
    const color = isLine
      ? (layer?._customLineColor || settings.color || '#3388ff')
      : (layer?._customLayerColor || settings.color || '#ff7800');
    const size = isLine
      ? (layer?._customLineWeight || settings.size || 4)
      : (settings.radius || settings.size || 6);
    const markerType = isLine ? 'line' : (settings.shape || 'circle');
    const parentFilename = settings.parentFilename || '';
    return { filename, legendName, color, markerType, size, type, parentFilename };
  };

  const isDeletedFeature = (feature) => {
    if (!feature) return false;
    if (feature.properties && feature.properties.deleted) return true;
    if (typeof buildFeatureIdentity !== 'function') return false;
    const identity = buildFeatureIdentity(feature);
    return identity ? deletedIdentities.has(identity) : false;
  };

  const extractFeatureForExport = (layer) => {
    if (!layer || typeof layer.toGeoJSON !== 'function') return null;
    const geo = layer.toGeoJSON();
    if (!geo || !geo.geometry) return null;
    geo.properties = { ...(layer.feature?.properties || {}), ...(geo.properties || {}) };
    if (typeof initializeFeatureChangeTracking === 'function') initializeFeatureChangeTracking(geo);
    if (isDeletedFeature(layer.feature || geo)) return null;
    return geo;
  };

  function addGeoJSONToZip(features, filename) {
    if (features.length === 0) return;
    const outputFilename = filenameForExportFormat(filename, format);
    zip.file(outputFilename, serializeFeatures(features, format));
    exportedFilenames.add(normalizeFilenameReference(outputFilename));
  }

  const collectConfiguredFeatures = (config, configuredLayer) => {
    const isCompressorConfig = /compressor/i.test(`${config?.filename || ''} ${config?.legendName || ''}`);
    const sources = isCompressorConfig
      ? Array.from(new Set([
          (typeof compressorsLayer !== 'undefined' ? compressorsLayer : null),
          configuredLayer,
          (typeof originalCompressorsLayer !== 'undefined' ? originalCompressorsLayer : null)
        ].filter(Boolean)))
      : [configuredLayer].filter(Boolean);
    const candidates = [];
    sources.forEach(source => source.eachLayer?.(layer => {
      const feature = layer?.feature;
      if (!feature) return;
      if (isCompressorConfig) {
        try {
          if (selectedCountries instanceof Set && selectedCountries.size &&
              typeof shouldShowElement === 'function' &&
              !shouldShowElement(feature, selectedCountries)) return;
        } catch (e) {}
      }
      const exported = extractFeatureForExport(layer);
      if (exported) candidates.push(exported);
    }));
    if (!isCompressorConfig) return candidates;

    const replacedIds = new Set(candidates
      .map(feature => String(feature.properties?.Distribution_Group ?? '').trim().toLowerCase())
      .filter(Boolean));
    const byId = new Map();
    candidates.forEach(feature => {
      const id = String(feature.properties?.id ?? feature.properties?.ID ?? '').trim().toLowerCase();
      const group = String(feature.properties?.Distribution_Group ?? '').trim();
      if (!group && id && replacedIds.has(id)) return;
      const key = id || JSON.stringify(feature.geometry);
      if (!byId.has(key)) byId.set(key, feature);
    });
    return Array.from(byId.values());
  };

  /* Collect data dynamically from all layers in layerConfig. */
  configList.forEach(config => {
    const layerName = typeof getLayerNameFromConfig === 'function'
      ? getLayerNameFromConfig(config)
      : config.filename.replace(/\.(?:geojson|csv)$/i, '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
    const layer = dynamicLayers[layerName];
    const features = collectConfiguredFeatures(config, layer);
    if (features.length > 0) {
      addGeoJSONToZip(features, config.filename);
      exportedConfigFilenames.add(normalizeFilenameReference(filenameForExportFormat(config.filename, format)));
      console.log(`Exported ${features.length} features to ${config.filename}`);
    }
  });

  /* Include estimated pipelines if present. */
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

  /* Include short pipes if present. */
  if (shortPipeLayer) {
    const features = [];
    shortPipeLayer.eachLayer(layer => {
      const f = extractFeatureForExport(layer);
      if (f) features.push(f);
    });
    if (features.length > 0) {
      const fullPath = getShortPipeResolvedExportPath();
      const filename = fullPath.includes('/') ? fullPath.split('/').pop() : fullPath;
      addGeoJSONToZip(features, filename);
    }
  }

  /* Include custom layers not already covered by layerConfig. */
  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      if (!layer) return;
      const settings = layer._customLayerSettings || {};
      const fallbackFilename = settings.filename || `${name}.geojson`;
      if (exportedFilenames.has(normalizeFilenameReference(filenameForExportFormat(fallbackFilename, format)))) {
        return;
      }
      const features = [];
      layer.eachLayer(l => {
        const f = extractFeatureForExport(l);
        if (f) features.push(f);
      });
      if (features.length > 0) {
        addGeoJSONToZip(features, fallbackFilename);
        exportedConfigFilenames.add(normalizeFilenameReference(filenameForExportFormat(fallbackFilename, format)));
        const normalized = normalizeFilenameReference(filenameForExportFormat(fallbackFilename, format));
        if (!knownConfigFilenames.has(normalized)) {
          additionalConfigEntries.push(buildCustomConfigEntry(layer, name, fallbackFilename));
        }
        console.log(`Exported ${features.length} features from custom layer ${name} to ${fallbackFilename}`);
      }
    });
  }

  /* Add Excel configuration for the exported layers. */
  try {
    const configList = Array.isArray(layerConfig) ? layerConfig : [];
    const workbook = XLSX.utils.book_new();
    const wsData = [
      ['Filename', 'Legend Name', 'Color', 'Marker Type', 'Size', 'Layer Type', 'Parent Filename'],
      []
    ];

    configList.forEach(config => {
      const normalized = normalizeFilenameReference(filenameForExportFormat(config?.filename || '', format));
      if (!exportedConfigFilenames.has(normalized)) {
        return;
      }
      wsData.push([
        filenameForExportFormat(config.filename, format),
        config.legendName,
        config.color,
        config.markerType,
        config.size,
        config.type,
        config.parentFilename || ''
      ]);
    });

    additionalConfigEntries.forEach(config => {
      const normalized = normalizeFilenameReference(filenameForExportFormat(config.filename, format));
      if (!exportedConfigFilenames.has(normalized)) {
        return;
      }
      if (knownConfigFilenames.has(normalized)) {
        return;
      }
      wsData.push([
        filenameForExportFormat(config.filename, format),
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
        filenameForExportFormat(shortPipeConfig.filename, format),
        shortPipeConfig.legendName,
        shortPipeConfig.color,
        shortPipeConfig.markerType,
        shortPipeConfig.size,
        shortPipeConfig.type,
        shortPipeConfig.parentFilename
      ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Input_Files');
    const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    zip.file('config.xlsx', excelBinary);
  } catch (error) {
    console.error('Error creating Excel file for filtered export:', error);
  }

  /* Add license file if available. */
  try {
    let response = null;
    if (typeof fetchProjectResource === 'function') {
      const result = await fetchProjectResource('license.txt');
      response = result?.response || null;
    }
    if (!response) {
      const fallbackUrl = typeof buildInputUrl === 'function'
        ? buildInputUrl('license.txt')
        : `Input/${(currentProject || 'Standard')}/license.txt?v=${Date.now()}`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (fallbackResponse.ok) {
        response = fallbackResponse;
      }
    }
    if (response) {
      const text = await response.text();
      zip.file('license.txt', text);
    }
  } catch (error) {
    console.log('No Data and Licensing file found for filtered export');
  }

  /* Generate and download ZIP. */
  if (options.download === false) return zip;
  const content = await zip.generateAsync({ type: "blob" });
  await saveExportBlob(content, `${folderName}.zip`);
}

/*
 * Export the complete dataset (dynamic layer configuration).
 */
/**
 * Export the complete current dataset as a ZIP archive.
 *
 * Serialises all registered dynamic layers — including layers that have no
 * unsaved modifications — together with the Excel configuration workbook and
 * short-pipe definitions. The archive is downloaded as
 * <code>complete_dataset.zip</code>. Useful for creating a full project
 * snapshot or preparing input for a fresh run.
 *
 * @returns {Promise<void>}
 * @example
 * // Trigger a full project snapshot download
 * exportCompleteDataset().then(() => {
 *   console.log('complete_dataset.zip downloaded');
 * });
 */
async function exportCompleteDataset(format = 'geojson', options = {}) {
  format = normalizeExportFormat(format);
  if (format === 'lego') {
    await exportLegoFormat('complete');
    return;
  }
  const zip = options.zip || new JSZip();
  const exportedFilenames = new Set();
  const deletedIdentities = (typeof collectAllDeletedIdentities === 'function')
    ? collectAllDeletedIdentities()
    : new Set();
  const exportedConfigFilenames = new Set();
  const configList = Array.isArray(layerConfig) ? layerConfig : [];
  const knownConfigFilenames = new Set(
    configList.map(cfg => normalizeFilenameReference(filenameForExportFormat(cfg?.filename, format)))
  );
  const additionalConfigEntries = [];

  const buildCustomConfigEntry = (layer, name, filename) => {
    const settings = layer?._customLayerSettings || {};
    const legendName = settings.name || layer?._customLayerName || name || filename.replace(/\.geojson$/i, '');
    const geometryClass = settings.geometryClass || (layer?._customLineLayer ? 'line' : 'point');
    const isLine = geometryClass === 'line';
    const isInline = geometryClass === 'inline';
    const isNode = settings.typeKey === 'Node' || settings.elementKey === 'nodes';
    const type = isLine ? 'Line' : (isInline ? 'In-Line' : (isNode ? 'Node' : 'Point'));
    const color = isLine
      ? (layer?._customLineColor || settings.color || '#3388ff')
      : (layer?._customLayerColor || settings.color || '#ff7800');
    const size = isLine
      ? (layer?._customLineWeight || settings.size || 4)
      : (settings.radius || settings.size || 6);
    const markerType = isLine ? 'line' : (settings.shape || 'circle');
    const parentFilename = settings.parentFilename || '';
    return { filename, legendName, color, markerType, size, type, parentFilename };
  };

  const isDeletedFeature = (feature) => {
    if (!feature) return false;
    if (feature.properties && feature.properties.deleted) return true;
    if (typeof buildFeatureIdentity !== 'function') return false;
    const identity = buildFeatureIdentity(feature);
    return identity ? deletedIdentities.has(identity) : false;
  };

  const extractFeatureForExport = (layer) => {
    if (!layer || typeof layer.toGeoJSON !== 'function') return null;
    const geo = layer.toGeoJSON();
    if (!geo || !geo.geometry) return null;
    geo.properties = { ...(layer.feature?.properties || {}), ...(geo.properties || {}) };
    if (typeof initializeFeatureChangeTracking === 'function') initializeFeatureChangeTracking(geo);
    if (isDeletedFeature(layer.feature || geo)) return null;
    return geo;
  };

  /* Helper to add GeoJSON to ZIP. */
  function addGeoJSONToZip(features, filename) {
    if (features.length === 0) return;
    features.forEach(f => {
      if (!f.properties) f.properties = {};
      if (typeof initializeFeatureChangeTracking === 'function') initializeFeatureChangeTracking(f);
    });
    const outputFilename = filenameForExportFormat(filename, format);
    zip.file(outputFilename, serializeFeatures(features, format));
    exportedFilenames.add(normalizeFilenameReference(outputFilename));
  }

  const collectConfiguredFeatures = (config, configuredLayer) => {
    const isCompressorConfig = /compressor/i.test(`${config?.filename || ''} ${config?.legendName || ''}`);
    const sources = isCompressorConfig
      ? Array.from(new Set([
          (typeof originalCompressorsLayer !== 'undefined' ? originalCompressorsLayer : null),
          (typeof compressorsLayer !== 'undefined' ? compressorsLayer : null),
          configuredLayer
        ].filter(Boolean)))
      : [configuredLayer].filter(Boolean);
    const candidates = [];
    sources.forEach(source => source.eachLayer?.(layer => {
      const exported = extractFeatureForExport(layer);
      if (exported) candidates.push(exported);
    }));
    if (!isCompressorConfig) return candidates;

    const replacedIds = new Set(candidates
      .map(feature => String(feature.properties?.Distribution_Group ?? '').trim().toLowerCase())
      .filter(Boolean));
    const byId = new Map();
    candidates.forEach(feature => {
      const id = String(feature.properties?.id ?? feature.properties?.ID ?? '').trim().toLowerCase();
      const group = String(feature.properties?.Distribution_Group ?? '').trim();
      if (!group && id && replacedIds.has(id)) return;
      const key = id || JSON.stringify(feature.geometry);
      if (!byId.has(key)) byId.set(key, feature);
    });
    return Array.from(byId.values());
  };

  /* Collect data dynamically from all layers in layerConfig. */
  configList.forEach(config => {
    const layerName = config.filename.replace(/\.(?:geojson|csv)$/i, '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
    const layer = dynamicLayers[layerName];
    const features = collectConfiguredFeatures(config, layer);

    if (features.length > 0) {
      addGeoJSONToZip(features, config.filename);
      exportedConfigFilenames.add(normalizeFilenameReference(filenameForExportFormat(config.filename, format)));
      console.log(`Exported ${features.length} features to ${config.filename}`);
    }
  });

  /* Include estimated pipelines if present. */
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
  
  /* Include short pipes if present. */
  if (shortPipeLayer) {
    const features = [];
    shortPipeLayer.eachLayer(layer => {
      const f = extractFeatureForExport(layer);
      if (f) features.push(f);
    });
    if (features.length > 0) {
      /* Extract only the filename without project path for export. */
      const fullPath = getShortPipeResolvedExportPath();
      const filename = fullPath.includes('/') ? fullPath.split('/').pop() : fullPath;
      addGeoJSONToZip(features, filename);
    }
  }

  /* Include custom layers not already covered by layerConfig. */
  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      if (!layer) return;
      const settings = layer._customLayerSettings || {};
      const fallbackFilename = settings.filename || `${name}.geojson`;
      if (exportedFilenames.has(normalizeFilenameReference(filenameForExportFormat(fallbackFilename, format)))) {
        return;
      }
      const features = [];
      layer.eachLayer(l => {
        const f = extractFeatureForExport(l);
        if (f) features.push(f);
      });
      if (features.length > 0) {
        addGeoJSONToZip(features, fallbackFilename);
        exportedConfigFilenames.add(normalizeFilenameReference(filenameForExportFormat(fallbackFilename, format)));
        const normalized = normalizeFilenameReference(filenameForExportFormat(fallbackFilename, format));
        if (!knownConfigFilenames.has(normalized)) {
          additionalConfigEntries.push(buildCustomConfigEntry(layer, name, fallbackFilename));
        }
        console.log(`Exported ${features.length} features from custom layer ${name} to ${fallbackFilename}`);
      }
    });
  }

  /* Include georeferenced infrastructure plans. */
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

  /* Update Excel configuration with current layer settings. */
  try {
    const workbook = XLSX.utils.book_new();
    const wsData = [
      ['Filename', 'Legend Name', 'Color', 'Marker Type', 'Size', 'Layer Type', 'Parent Filename'],
      []  // Empty row
    ];
    
    /* Add all layers from layerConfig with current settings. */
    configList.forEach(config => {
      const normalized = normalizeFilenameReference(filenameForExportFormat(config.filename, format));
      if (!exportedConfigFilenames.has(normalized)) {
        return;
      }
      wsData.push([
        filenameForExportFormat(config.filename, format),
        config.legendName,
        config.color,
        config.markerType,
        config.size,
        config.type,
        config.parentFilename || ''
      ]);
    });

    additionalConfigEntries.forEach(config => {
      const normalized = normalizeFilenameReference(filenameForExportFormat(config.filename, format));
      if (!exportedConfigFilenames.has(normalized)) {
        return;
      }
      if (knownConfigFilenames.has(normalized)) {
        return;
      }
      wsData.push([
        filenameForExportFormat(config.filename, format),
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
        filenameForExportFormat(shortPipeConfig.filename, format),
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
    
    /* Convert to binary and add to ZIP. */
    const excelBinary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    zip.file('config.xlsx', excelBinary);
    console.log('Added updated Excel configuration to export');
  } catch (error) {
    console.error('Error creating Excel file:', error);
  }

  /* Add license file if available. */
  try {
    const { response } = await fetchProjectResource('license.txt');
    if (response) {
      const text = await response.text();
      zip.file('license.txt', text);
      console.log('Added license file to export');
    }
  } catch (error) {
    console.log('No Data and Licensing file found');
  }

  if (options.download === false) return zip;

  /* Generate and download ZIP. */
  return zip.generateAsync({ type: "blob" }).then(function(content) {
    const filename = `Complete_Dataset_${currentProject}_${new Date().toISOString().split('T')[0]}.zip`;
    return saveExportBlob(content, filename);
    console.log('✓ Export completed successfully');
  });
}


  /* Alert removed; replaced by loading screen. */



function getShortPipeResolvedExportPath() {
  const configEntry = getConfiguredShortPipeConfig();
  const filename = configEntry?.filename || SHORT_PIPE_CONFIG_DEFAULTS.filename;
  return resolveLayerFilePath(filename);
}

/**
 * Open the export type selection dialog.
 *
 * Presents a modal popup with three export options: changes only, filtered
 * data (prompts for a folder name), and the complete dataset. Delegates to
 * {@link exportChanges}, {@link showFolderNameDialog}, or
 * {@link exportCompleteDataset} on confirmation.
 *
 * @returns {void}
 */
function openExportDialog() {
  showCustomPopup(
    '💾 Export Data',
    `<p style="text-align: center; margin: 15px 0 8px;">Choose export type:</p>
     <label for="export-file-format" style="display:block; margin:0 0 6px;">File format</label>
     <select id="export-file-format" style="width:100%; padding:8px; margin-bottom:12px;">
       <option value="geojson">GeoJSON (.geojson)</option>
       <option value="csv">CSV (.csv)</option>
       <option value="lego">LEGO Format</option>
     </select>`,
    [
      {
        text: 'Export Changes',
        type: 'primary',
        onClick: () => exportChanges(document.getElementById('export-file-format')?.value)
      },
      {
        text: 'Export Filtered Data',
        type: 'primary',
        onClick: () => showFolderNameDialog(document.getElementById('export-file-format')?.value)
      },
      {
        text: 'Export Complete Dataset',
        type: 'primary',
        onClick: () => exportCompleteDataset(document.getElementById('export-file-format')?.value)
      },
      {
        text: 'Cancel',
        type: 'secondary',
        onClick: () => {}
      }
    ]
  );
}

