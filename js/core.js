/**
 * ================================================================================
 * QGas - Core Application Module
 * ================================================================================
 * 
 * This is the main JavaScript module for the QGas Interactive Gas Infrastructure
 * Toolkit. It handles map initialization, data loading, user interactions, and
 * all core functionality for visualizing and editing pipeline infrastructure.
 * 
 * Key Responsibilities:
 * - Map initialization and layer management (Leaflet.js)
 * - Dynamic layer loading and registry management
 * - Project context management
 * - Contributor tracking system
 * - Infrastructure element CRUD operations
 * - Interactive editing modes (add, edit, delete pipelines/nodes)
 * - Styling and visual customization
 * - Data persistence and synchronization
 * - Element attribute management
 * - Filter and search functionality
 * 
 * Technical Stack:
 * - Leaflet.js for interactive mapping
 * - GeoJSON for infrastructure data
 * - LocalStorage for client-side persistence
 * 
 * Module Structure:
 * - Global state variables and configuration
 * - Layer management and registry
 * - Map initialization
 * - Data loading and processing
 * - Interactive tools and modes
 * - Element management (CRUD operations)
 * - UI helpers and utilities
 * 
 * Development Information:
 * - Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
 * - Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology, Inffeldgasse 18, Graz, 8010, Austria
 * - Created: August 2025
 * - License: See LICENSE file
 * - Disclaimer: AI-assisted tools were used to support development and documentation.
 *
 * Inputs:
 * - DOM containers and UI elements declared in GUI.html.
 * - External libraries: Leaflet, Leaflet.Draw, JSZip, XLSX, Chart.js.
 * - Global runtime state (layerConfig, dynamicLayers, contributorInitials).
 *
 * Public API (selected):
 * - formatElementId(prefix, contributor, number): Build a standardized element ID.
 * - getFacilityPrefix(type): Resolve or register a facility prefix.
 * - getNextIdNumber(type, layerOverride): Compute the next sequential ID number.
 * - createNewNode(latlng, nodeId, options): Create and register a node marker.
 * - getAllNodeLayers(): Return active node layers.
 * - getAllLineLayers(): Return active line layers.
 * 
 * ================================================================================
 */

/* ================================================================================
 * GLOBAL STATE - CONTRIBUTOR SYSTEM
 * ================================================================================
 * Top-level declarations required for contributor attribution.
 */
  let contributorName = '';
  let contributorInitials = '';
  let contributors = [];
  
/* ================================================================================
 * GLOBAL STATE - PROJECT MANAGEMENT
 * ================================================================================
 * The current dataset folder that scopes layer discovery and persistence.
 */
  /* Default project selection used when no other context is resolved. */
  let currentProject = 'Standard';
  
/* ================================================================================
 * GLOBAL STATE - LAYER MANAGEMENT
 * ================================================================================
 * Dynamic layer registries and caches for infrastructure visualization.
 */
  /* Layer configuration entries loaded from Excel or fallback defaults. */
  let layerConfig = [];
  /* Registry for dynamically loaded layers keyed by layer name. */
  let dynamicLayers = {};
  /* Layer metadata (type, style, and legend conventions). */
  const layerMetadataRegistry = {};
  /* Index mapping element keys to their metadata records. */
  const elementKeyMetadataIndex = {};
  /* Mapping from element keys to their layer instances. */
  const elementTypeLayerMap = {};
  /* Layer groups holding deleted elements for undo or audit workflows. */
  const deletedLayerRegistry = {};
  /* Cache of layers eligible for styling controls. */
  let styleableLayerRegistry = new Map();
  /* Dirty flag to force rebuilding the styleable layer cache. */
  let styleableLayerRegistryDirty = true;
  /* Temporary store of point layers hidden during edit geometry mode. */
  const editModeHiddenPointLayers = new Set();
  /* Toggle that tracks the edit-geometry visibility state. */
  let editGeometryVisibilityActive = false;
  /* Registry for additional (integration) datasets keyed by filename. */
  const additionalDatasets = {};

/* ================================================================================
 * GLOBAL STATE - STYLING AND COLORS
 * ================================================================================
 * Centralized color registries and palettes for styling elements.
 */
  const customLineColorPalette = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#ff6f61', '#60a917',
    '#0099c6', '#dd4477', '#66aa00', '#b82e2e', '#316395', '#994499'
  ];
  /* Tracks line colors currently assigned to line layers. */
  const usedLineColors = new Map();
  /* Predefined color schemes for quick selection. */
  const quickColorCollections = [
    {
      title: 'Pipeline essentials',
      description: 'High-contrast line colors',
      colors: ['#FF5E5B', '#FFB400', '#1F77B4', '#2ECC71', '#B52B65', '#333652']
    },
    {
      title: 'Bright nodes',
      description: 'Vivid point colors',
      colors: ['#E63946', '#F4A261', '#2A9D8F', '#3A86FF', '#8338EC', '#FF006E']
    },
    {
      title: 'Soft overlays',
      description: 'Pastel background layers',
      colors: ['#FFCDB2', '#FFAFCC', '#BDE0FE', '#C7F9CC', '#F4E285', '#E0AAFF']
    }
  ];
  /* Recent color history for UI recall. */
  const recentColorSelections = [];
  /* Maximum number of recent colors to retain. */
  const MAX_RECENT_COLORS = 6;
  
/* ================================================================================
 * PROJECT PERSISTENCE
 * ================================================================================
 * LocalStorage keys and defaults for persisting project context.
 */
  const PROJECT_STORAGE_KEY = 'qgasSelectedProject';
  const DEFAULT_PROJECT = 'Standard';

/**
 * Sanitize project name to prevent injection and ensure filesystem compatibility
 * @param {string} name - Raw project name
 * @returns {string} Sanitized project name (alphanumeric, underscore, hyphen only)
 */
  function sanitizeProjectName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().replace(/[^a-zA-Z0-9_\- ]/g, '');
  }

/**
 * Persist the selected project to browser localStorage for future sessions
 * @param {string} projectName - Project name to save
 */
  function persistProjectSelection(projectName) {
    const sanitized = sanitizeProjectName(projectName);
    if (!sanitized) return;
    try {
      localStorage.setItem(PROJECT_STORAGE_KEY, sanitized);
    } catch (error) {
      console.warn('Could not persist project selection', error);
    }
  }

/**
 * Retrieve the stored project selection from localStorage
 * @returns {string} Stored project name or empty string if not found
 */
  function getStoredProjectSelection() {
    try {
      return sanitizeProjectName(localStorage.getItem(PROJECT_STORAGE_KEY));
    } catch (error) {
      console.warn('Could not read stored project selection', error);
      return '';
    }
  }

/**
 * Extract project name from URL query parameters
 * @returns {string} Project name from URL or empty string
 */
  function getProjectFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      return sanitizeProjectName(params.get('project'));
    } catch (error) {
      console.warn('Could not parse project query parameter', error);
      return '';
    }
  }

/**
 * Fetch current project from the server API
 * @returns {Promise<string>} Project name from server or empty string
 */
  async function fetchProjectFromServer() {
    try {
      const response = await fetch(`/api/current_project?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return '';
      const payload = await response.json();
      return sanitizeProjectName(payload?.project);
    } catch (error) {
      console.warn('Project API not available, falling back to stored selection', error);
      return '';
    }
  }

/**
 * Determine the active project context from multiple sources
 * Priority: URL query > Server API > LocalStorage > Default
 * @returns {Promise<string>} Resolved project name
 */
  async function determineProjectContext() {
    const viaQuery = getProjectFromQuery();
    if (viaQuery) return viaQuery;

    const viaApi = await fetchProjectFromServer();
    if (viaApi) return viaApi;

    const viaStorage = getStoredProjectSelection();
    if (viaStorage) return viaStorage;

    return sanitizeProjectName(currentProject) || DEFAULT_PROJECT;
  }

/* ================================================================================
 * COLOR MANAGEMENT UTILITIES
 * ================================================================================
 */

/**
 * Normalize color values to lowercase hex format (#rrggbb)
 * Handles short hex (#rgb) and values without # prefix
 * @param {string} color - Input color value
 * @returns {string} Normalized hex color or empty string
 */
  function normalizeColorHex(color) {
    if (!color) return '';
    let value = color.trim();
    if (!value) return '';
    const shortHex = /^#?[0-9a-fA-F]{3}$/;
    const longHex = /^#?[0-9a-fA-F]{6}$/;

    if (!value.startsWith('#')) {
      if (shortHex.test(value) || longHex.test(value)) {
        value = `#${value}`;
      }
    }

    if (/^#[0-9a-fA-F]{3}$/.test(value)) {
      value = '#' + value.substring(1).split('').map(ch => ch + ch).join('');
    }

    return value.toLowerCase();
  }

/**
 * Track usage of a line color for statistics and recommendations
 * @param {string} color - Color hex value to register
 */
  function registerLineColorUsage(color) {
    const key = normalizeColorHex(color);
    if (!key) return;
    usedLineColors.set(key, (usedLineColors.get(key) || 0) + 1);
  }

  /*
   * Decrement usage counts and release colors that are no longer used.
   */
  function unregisterLineColorUsage(color) {
    const key = normalizeColorHex(color);
    if (!key || !usedLineColors.has(key)) return;
    const remaining = usedLineColors.get(key) - 1;
    if (remaining <= 0) {
      usedLineColors.delete(key);
    } else {
      usedLineColors.set(key, remaining);
    }
  }

  /*
   * Replace a tracked color assignment while keeping usage statistics accurate.
   */
  function replaceLineColorUsage(oldColor, newColor) {
    if (normalizeColorHex(oldColor) !== normalizeColorHex(newColor)) {
      unregisterLineColorUsage(oldColor);
    }
    registerLineColorUsage(newColor);
  }

  /*
   * Maintain a bounded MRU list of recent color selections for UI recall.
   */
  function recordRecentColor(color) {
    const normalized = normalizeColorHex(color);
    if (!/^#[0-9a-f]{6}$/.test(normalized)) return;
    const existingIndex = recentColorSelections.findIndex(entry => normalizeColorHex(entry) === normalized);
    if (existingIndex !== -1) {
      recentColorSelections.splice(existingIndex, 1);
    }
    recentColorSelections.unshift(normalized);
    if (recentColorSelections.length > MAX_RECENT_COLORS) {
      recentColorSelections.length = MAX_RECENT_COLORS;
    }
  }

  /*
   * Validate hex colors in long format, with or without leading '#'.
   */
  function isValidHexColor(value) {
    if (!value) return false;
    return /^#?[0-9a-fA-F]{6}$/.test(value.trim());
  }

  /*
   * Keep the custom color input widgets synchronized with a normalized value.
   */
  function setCustomColorInputs(color) {
    const normalized = normalizeColorHex(color);
    if (!/^#[0-9a-f]{6}$/.test(normalized)) return;
    const colorInput = document.getElementById('custom-color-input');
    if (colorInput && colorInput.value.toLowerCase() !== normalized) {
      colorInput.value = normalized;
    }
    const textInput = document.getElementById('custom-color-text');
    if (textInput && textInput.value.toLowerCase() !== normalized) {
      textInput.value = normalized.toUpperCase();
    }
  }

  /*
   * Mark the styleable layer cache as stale so it is rebuilt on demand.
   */
  function invalidateStyleableLayerRegistry() {
    styleableLayerRegistryDirty = true;
  }

  /*
   * Check whether a given color is currently assigned to any line layer.
   */
  function colorIsInUse(color) {
    return usedLineColors.has(normalizeColorHex(color));
  }

  /*
   * Return an available line color, falling back to randomized candidates.
   */
  function getUniqueLineColor() {
    for (const color of customLineColorPalette) {
      if (!colorIsInUse(color)) {
        return color;
      }
    }
    for (let i = 0; i < 50; i++) {
      const randomColor = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
      if (!colorIsInUse(randomColor)) {
        return randomColor;
      }
    }
    return '#4a4a4a';
  }

  /*
   * Derive a stable custom layer ID prefix from a display name.
   */
  function deriveCustomLayerPrefix(name) {
    if (!name) return generatePrefixFromName('CustomLayer');
    return generatePrefixFromName(name, name);
  }

  /*
   * Resolve a human-readable name for a layer group, prioritizing metadata.
   */
  function getLayerGroupDisplayName(layerGroup) {
    if (!layerGroup) return null;
    if (layerGroup._customLayerName) return layerGroup._customLayerName;
    if (layerGroup._qgasMeta && layerGroup._qgasMeta.legendName) {
      return layerGroup._qgasMeta.legendName;
    }
    if (layerGroup === pipelineLayer) return 'Pipelines';
    if (layerGroup === hydrogenPipeLayer) return 'Hydrogen Pipelines';
    if (layerGroup === estimatedPipelinesLayer) return 'Estimated Pipelines';
    if (layerGroup === shortPipeLayer) return 'Short Pipes';
    return null;
  }

  /*
   * Identify the layer-specific ID context used for new element identifiers.
   */
  function getLayerIdContext(layerGroup) {
    const fallbackType = 'Pipeline';
    if (!layerGroup) {
      return { typeKey: fallbackType, prefix: getFacilityPrefix(fallbackType) };
    }
    if (layerGroup._customLayerSettings && layerGroup._customLayerSettings.idPrefix) {
      const settings = layerGroup._customLayerSettings;
      if (!facilityTypeMap[settings.typeKey]) {
        facilityTypeMap[settings.typeKey] = settings.idPrefix;
      }
      return { typeKey: settings.typeKey, prefix: settings.idPrefix };
    }
    const parentName = getLayerGroupDisplayName(layerGroup);
    const aliasType = resolveFacilityTypeAlias(parentName);
    const resolvedType = aliasType || parentName || fallbackType;
    return { typeKey: resolvedType, prefix: getFacilityPrefix(resolvedType) };
  }

  /*
   * Resolve the node-specific ID context, honoring custom node-layer settings.
   */
  function getNodeIdContext(nodeLayer) {
    if (nodeLayer && nodeLayer._customLayerSettings) {
      const settings = nodeLayer._customLayerSettings;
      const typeKey = settings.typeKey || 'Node';
      const idPrefix = settings.idPrefix || getFacilityPrefix(typeKey);
      if (!facilityTypeMap[typeKey]) {
        facilityTypeMap[typeKey] = idPrefix;
      }
      return { typeKey, prefix: idPrefix };
    }
    return { typeKey: 'Node', prefix: getFacilityPrefix('Node') };
  }

  /*
   * Determine the display name for a feature based on its metadata and layer.
   */
  function getLayerDisplayNameForFeature(layer) {
    if (!layer) return 'Pipeline';
    if (layer.feature && layer.feature.properties && layer.feature.properties.Layer_Name) {
      return layer.feature.properties.Layer_Name;
    }
    if (layer._originLayerName) {
      return layer._originLayerName;
    }
    const metadata = getLayerMetadataFromParents(layer);
    if (metadata && metadata.legendName) {
      return metadata.legendName;
    }
    return 'Pipeline';
  }

  /*
   * Extract default attribute values for custom line layers, when present.
   */
  function getCustomLineDefaults(layerCandidate) {
    if (layerCandidate && layerCandidate._customLayerSettings && layerCandidate._customLayerSettings.defaultAttributes) {
      return { ...layerCandidate._customLayerSettings.defaultAttributes };
    }
    return null;
  }

  /*
   * Order attribute keys with ID fields first, and optionally hide keys.
   */
  function getOrderedAttributeKeys(properties, hiddenAttributes = []) {
    if (!properties) return [];
    const hiddenSet = new Set(hiddenAttributes || []);
    const idKeys = [];
    const otherKeys = [];
    Object.keys(properties).forEach(key => {
      if (hiddenSet.has(key)) return;
      if (key && key.toLowerCase() === 'id') {
        idKeys.push(key);
      } else {
        otherKeys.push(key);
      }
    });
    return [...idKeys, ...otherKeys];
  }
  
/* ================================================================================
 * COUNTRY FILTER SYSTEM
 * ================================================================================
 * Maintains the current geographic filter selection.
 */
  let selectedCountries = new Set();

/**
 * Format a standardized element ID with prefix, contributor initials, and number
 * @param {string} prefix - Element type prefix (e.g., 'PL' for pipeline)
 * @param {string} contributor - Contributor initials
 * @param {number} number - Sequential number
 * @returns {string} Formatted ID (e.g., 'PL_ABC_001')
 */
  function formatElementId(prefix, contributor, number) {
    const sanitizedPrefix = (prefix || 'EL').trim().toUpperCase();
    const sanitizedContributor = (contributor && contributor.trim()) ? contributor.trim().toUpperCase() : 'XX';
    return `${sanitizedPrefix}_${sanitizedContributor}_${number}`;
  }
  
/* ================================================================================
 * LEGACY LAYER REFERENCES
 * ================================================================================
 * Backward-compatible handles to original layer groups.
 */
  let pipelineLayer = null;
  let nodeLayer = null;
  let powerplantsLayer = null;
  let compressorsLayer = null;
  let lngLayer = null;
  let storageLayer = null;
  let consumptionLayer = null;
  let shortPipeLayer = null;
  let estimatedPipelinesLayer = null;
  let borderpointsLayer = null;
  let demandsLayer = null;
  let productionsLayer = null;
  let hydrogenPipeLayer = null;
  let electrolyzersLayer = null;
  let nodePositionEditActive = false;
  
/* ================================================================================
 * ORIGINAL LAYERS FOR FILTERING
 * ================================================================================
 * Stores original layer references for filter reset operations.
 */
  let originalPipelineLayer = null;
  let originalEstimatedPipelinesLayer = null;
  let originalNodeLayer = null;
  let originalPowerplantsLayer = null;
  let originalCompressorsLayer = null;
  let originalLngLayer = null;
  let originalStorageLayer = null;
  let originalConsumptionLayer = null;
  let originalShortPipeLayer = null;
  let originalBorderpointsLayer = null;
  let originalDemandsLayer = null;
  let originalProductionsLayer = null;
  let originalHydrogenPipeLayer = null;
  let originalElectrolyzersLayer = null;

/* ================================================================================
 * SUBLAYER AND GROUPING STATE
 * ================================================================================
 */
  /* Context object for sublayer switching operations. */
  let sublayerOperationContext = null;
  /* Pipeline grouping cache: {name, pipelines, startPoint, endPoint, totalLength}. */
  let pipelineGroups = [];
  
/* ================================================================================
 * MAP INITIALIZATION
 * ================================================================================
 * Leaflet map setup and foundational panes.
 */
const map = L.map('map', {
    attributionControl: false,
    scrollWheelZoom: true,
    zoomDelta: 1,
    zoomSnap: 0.25
  }).setView([52, 15], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map);

  if (typeof initLegendControl === 'function') {
    initLegendControl(map);
  }

  /*
   * Custom wheel zoom handler with ctrlKey gating for fine-grained control.
   */
  const mapContainer = map.getContainer();
  mapContainer.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      const currentZoom = map.getZoom();
      const newZoom = currentZoom + delta;
      
      map.setZoom(newZoom, {
        animate: true,
        duration: 0.1
      });
      
      return false;
    }
  }, { passive: false });

  /*
   * Dedicated panes to enforce visual stacking order for map overlays.
   */
  const planOverlayPane = map.createPane('planOverlayPane');
  planOverlayPane.style.zIndex = 340;
  planOverlayPane.style.pointerEvents = 'none';
  const pipelinePane = map.createPane('pipelinePane');
  pipelinePane.style.zIndex = 350;
  const nodePane = map.createPane('nodePane');
  nodePane.style.zIndex = 360;

  /*
   * Normalize relative paths to prevent accidental absolute traversal.
   */
  function sanitizeRelativePath(path) {
    return (path || '').replace(/^\.\/+/, '').replace(/^\/+/, '').replace(/\\/g, '/');
  }

  /*
   * Resolve file names into project-aware relative layer paths.
   */
  function resolveLayerFilePath(fileName) {
    const cleaned = sanitizeRelativePath(fileName);
    if (!cleaned) return '';
    if (cleaned.includes('/')) {
      return cleaned;
    }
    if (currentProject) {
      return `${currentProject}/${cleaned}`;
    }
    return cleaned;
  }

  /*
   * Build Input/ URLs with optional cache busting and project prefixing.
   */
  function buildInputUrl(fileName, options = {}) {
    const { skipProjectPrefix = false, cacheBust = true } = options;
    const relativePath = skipProjectPrefix ? sanitizeRelativePath(fileName) : resolveLayerFilePath(fileName);
    if (!relativePath) return '';
    const cacheParam = cacheBust ? `?v=${Date.now()}` : '';
    return `Input/${relativePath}${cacheParam}`;
  }

  /*
   * Normalize layer file names for case-insensitive matching.
   */
  function normalizeFilenameReference(fileName) {
    const sanitized = sanitizeRelativePath(fileName || '');
    return sanitized.toLowerCase();
  }

  /*
   * Establish parent-child relationships for sublayers in config metadata.
   */
  function applySublayerRelationships(configList) {
    if (!Array.isArray(configList)) return configList;
    const lookup = new Map();
    configList.forEach(config => {
      const normalized = normalizeFilenameReference(config?.filename || '');
      config.normalizedFilename = normalized;
      config.parentFilename = sanitizeRelativePath(config?.parentFilename || '');
      config.parentConfig = null;
      config.childSublayers = [];
      config.isSublayer = false;
      if (normalized) {
        lookup.set(normalized, config);
      }
    });

    configList.forEach(config => {
      const parentKey = normalizeFilenameReference(config.parentFilename);
      if (parentKey && lookup.has(parentKey)) {
        const parentConfig = lookup.get(parentKey);
        config.parentConfig = parentConfig;
        config.isSublayer = true;
        parentConfig.childSublayers = parentConfig.childSublayers || [];
        parentConfig.childSublayers.push(config);
      }
    });

    return configList;
  }

  /*
   * Recompute sublayer relationships after config mutations.
   */
  function rebuildLayerRelationships() {
    if (!Array.isArray(layerConfig)) return;
    applySublayerRelationships(layerConfig);
  }

  /*
   * Decide whether a layer config should be omitted from legend displays.
   */
  function shouldSkipLayerConfig(config) {
    if (!config) return false;
    const descriptor = `${config.legendName || ''} ${config.filename || ''}`.toLowerCase();
    if (!descriptor.trim()) return false;
    return descriptor.includes('estimated pipeline');
  }

  /*
   * Produce a legend ordering that keeps sublayers adjacent to parents.
   */
  function getOrderedLegendConfigs() {
    if (!Array.isArray(layerConfig)) return [];
    const ordered = [];
    const visited = new Set();
    const pushWithChildren = (config) => {
      if (!config || visited.has(config)) return;
      ordered.push(config);
      visited.add(config);
      if (Array.isArray(config.childSublayers) && config.childSublayers.length) {
        config.childSublayers.forEach(child => pushWithChildren(child));
      }
    };
    layerConfig.forEach(config => {
      if (config && !config.isSublayer) {
        pushWithChildren(config);
      }
    });
    layerConfig.forEach(config => pushWithChildren(config));
    return ordered;
  }

  /*
   * Derive the internal JS layer name from the backing filename.
   */
  function getLayerNameFromConfig(config) {
    if (!config || !config.filename) return '';
    return config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
  }

  /*
   * Select the Leaflet pane that best matches the layer type.
   */
  function resolveDefaultPaneForConfig(config) {
    const lowerFilename = (config?.filename || '').toLowerCase();
    const typeHint = (config?.type || '').toLowerCase();
    if (lowerFilename.includes('pipeline') || lowerFilename.startsWith('pl_') ||
        (lowerFilename.includes('short') && lowerFilename.includes('pipe')) || typeHint === 'shortpipe') {
      return 'pipelinePane';
    }
    if (lowerFilename.includes('node') || lowerFilename.startsWith('n_') || typeHint === 'node') {
      return 'nodePane';
    }
    return null;
  }

  /*
   * Limit sublayer legend names to stable, human-readable labels.
   */
  function sanitizeSublayerLegendName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return 'Sublayer';
    return trimmed.replace(/\s+/g, ' ').substring(0, 60);
  }

  /*
   * Generate a unique filename for a new sublayer within a parent directory.
   */
  function generateUniqueSublayerFilename(parentConfig, sublayerName) {
    const parentFile = sanitizeRelativePath(parentConfig?.filename || '');
    const lastSlash = parentFile.lastIndexOf('/');
    const folder = lastSlash !== -1 ? parentFile.slice(0, lastSlash + 1) : '';
    const baseName = lastSlash !== -1 ? parentFile.slice(lastSlash + 1) : parentFile;
    const baseWithoutExt = baseName.replace(/\.geojson$/i, '') || 'Layer';
    const slug = (sublayerName || 'Sublayer').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'sublayer';
    const existingKeys = new Set((layerConfig || []).map(cfg => normalizeFilenameReference(cfg?.filename)));
    let candidate = `${folder}${baseWithoutExt}_${slug}.geojson`;
    let counter = 1;
    while (existingKeys.has(normalizeFilenameReference(candidate))) {
      candidate = `${folder}${baseWithoutExt}_${slug}_${counter}.geojson`;
      counter++;
    }
    return candidate;
  }

  /*
   * Generate a unique filename for an ad-hoc custom layer.
   */
  function generateUniqueCustomFilename(layerDisplayName) {
    const base = (layerDisplayName || 'Custom_Layer').toString().trim();
    const slug = base.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Custom_Layer';
    const existingKeys = new Set((layerConfig || []).map(cfg => normalizeFilenameReference(cfg?.filename || '')));
    let candidate = `${slug}.geojson`;
    let counter = 1;
    while (existingKeys.has(normalizeFilenameReference(candidate))) {
      candidate = `${slug}_${counter}.geojson`;
      counter++;
    }
    return candidate;
  }

  /*
   * Insert or update layer configuration entries while preserving order.
   */
  function upsertLayerConfigEntry(config, metadata) {
    if (!config) return null;
    if (!Array.isArray(layerConfig)) {
      layerConfig = [];
    }
    const normalized = normalizeFilenameReference(config.filename);
    let existing = layerConfig.find(cfg => normalizeFilenameReference(cfg.filename) === normalized);
    if (!existing) {
      existing = {};
      layerConfig.push(existing);
    }
    Object.assign(existing, config);
    existing.layerName = config.layerName || getLayerNameFromConfig(existing);
    if (metadata) {
      existing.elementKey = metadata.elementKey;
      existing.geometryClass = metadata.geometryClass;
    }
    rebuildLayerRelationships();
    return existing;
  }

  /*
   * Insert a new config immediately after a parent and its sublayers.
   */
  function insertConfigAfterParent(parentConfig, newConfig) {
    if (!Array.isArray(layerConfig)) {
      layerConfig = [];
    }
    if (!parentConfig) {
      layerConfig.push(newConfig);
      rebuildLayerRelationships();
      return;
    }
    const parentIndex = layerConfig.indexOf(parentConfig);
    if (parentIndex === -1) {
      layerConfig.push(newConfig);
      rebuildLayerRelationships();
      return;
    }
    let insertIndex = parentIndex + 1;
    while (insertIndex < layerConfig.length && normalizeFilenameReference(layerConfig[insertIndex].parentFilename) === normalizeFilenameReference(parentConfig.filename)) {
      insertIndex++;
    }
    layerConfig.splice(insertIndex, 0, newConfig);
    rebuildLayerRelationships();
  }

  /*
   * Infer element keys from filenames, legend names, and type hints.
   */
  function inferElementKeyFromConfig(config = {}, layerName = '') {
    const descriptor = `${(config.legendName || '')} ${(config.filename || '')} ${layerName}`.toLowerCase();
    const typeHint = (config.type || '').toLowerCase();

    if (descriptor.includes('hydrogen') && (descriptor.includes('pipe') || descriptor.includes('line'))) {
      return 'hydrogenPipes';
    }
    if (descriptor.includes('short') && descriptor.includes('pipe')) {
      return 'shortPipes';
    }
    if (descriptor.includes('electroly')) {
      return 'electrolyzers';
    }
    if (descriptor.includes('border')) {
      return 'borderpoints';
    }
    if (descriptor.includes('demand')) {
      return 'demands';
    }
    if (descriptor.includes('production')) {
      return 'productions';
    }
    if (descriptor.includes('consumption') || descriptor.includes('nuts3')) {
      return 'consumption';
    }
    if (descriptor.includes('compressor')) {
      return 'compressors';
    }
    if (descriptor.includes('lng')) {
      return 'lng';
    }
    if (descriptor.includes('storage')) {
      return 'storages';
    }
    if (descriptor.includes('power')) {
      return 'powerplants';
    }
    if (descriptor.includes('node')) {
      return 'nodes';
    }
    if (descriptor.includes('pipe') || descriptor.includes('pipeline')) {
      return 'pipelines';
    }
    if (typeHint === 'shortpipe') {
      return 'shortPipes';
    }
    if (typeHint === 'line') {
      return 'pipelines';
    }
    if (typeHint === 'in-line') {
      return 'inlineElements';
    }
    if (typeHint === 'node') {
      return 'nodes';
    }
    if (typeHint === 'point') {
      return 'points';
    }
    const sanitized = descriptor.replace(/[^a-z0-9]/g, '');
    return sanitized || 'layerGroup';
  }

  /*
   * Register metadata for a newly loaded layer and its classification.
   */
  function registerLayerMetadata(layerName, config = {}) {
    const providedElementKey = config.elementKey || config.typeKey;
    const elementKey = providedElementKey || inferElementKeyFromConfig(config, layerName);
    const providedGeometryClass = (config.geometryClass || '').toLowerCase();
    const geometryClassRaw = providedGeometryClass || (config.type || '').toLowerCase();
    const geometryClass = (geometryClassRaw === 'line' || geometryClassRaw === 'shortpipe')
      ? 'line'
      : (geometryClassRaw === 'in-line' ? 'inline' : 'point');
    const typeHint = (config.type || '').toLowerCase();
    const metadata = {
      layerName,
      elementKey,
      geometryClass,
      filename: config.filename || '',
      legendName: config.legendName || layerName,
      markerType: config.markerType || null,
      size: config.size || null,
      parentFilename: config.parentFilename || '',
      parentLegendName: config.parentConfig?.legendName || null,
      isSublayer: !!config.parentFilename,
      typeHint,
      rawType: config.type || '',
      isNodeLayer: elementKey === 'nodes' || typeHint === 'node'
    };
    layerMetadataRegistry[layerName] = metadata;
    if (!elementKeyMetadataIndex[elementKey]) {
      elementKeyMetadataIndex[elementKey] = [];
    }
    elementKeyMetadataIndex[elementKey].push(metadata);
    return metadata;
  }

  /*
   * Attach metadata to a layer instance and its underlying GeoJSON feature.
   */
  function assignMetadataToLayer(layer, metadata) {
    if (!layer || !metadata) return;
    layer._qgasMeta = metadata;
    if (layer.feature && layer.feature.properties) {
      layer.feature.properties.__elementKey = metadata.elementKey;
    }
  }

  /*
   * Track layer instances by element key for targeted lookups.
   */
  function rememberLayerInstanceForElementKey(elementKey, layerInstance) {
    if (!elementKey || !layerInstance) return;
    if (!elementTypeLayerMap[elementKey]) {
      elementTypeLayerMap[elementKey] = new Set();
    }
    elementTypeLayerMap[elementKey].add(layerInstance);
  }

  /*
   * Remove layer references when layers are unloaded or destroyed.
   */
  function removeLayerReferenceForElementKey(elementKey, layerInstance) {
    if (!elementKey || !layerInstance) return;
    const registry = elementTypeLayerMap[elementKey];
    if (registry && registry.has(layerInstance)) {
      registry.delete(layerInstance);
      if (registry.size === 0) {
        delete elementTypeLayerMap[elementKey];
      }
    }
  }

  function swapElementLayerReference(elementKey, previousLayer, newLayer) {
    if (elementKey && previousLayer) {
      removeLayerReferenceForElementKey(elementKey, previousLayer);
    }
    if (elementKey && newLayer) {
      rememberLayerInstanceForElementKey(elementKey, newLayer);
    }
  }

  function replaceDynamicLayerReference(previousLayer, newLayer) {
    if (!previousLayer || !dynamicLayers) return;
    Object.keys(dynamicLayers).forEach(key => {
      if (dynamicLayers[key] === previousLayer) {
        dynamicLayers[key] = newLayer || null;
      }
    });
  }

  function synchronizeLayerReferences(elementKey, previousLayer, newLayer) {
    if (!previousLayer && !newLayer) return;
    replaceDynamicLayerReference(previousLayer, newLayer);
    swapElementLayerReference(elementKey, previousLayer, newLayer);
    if (previousLayer !== newLayer) {
      invalidateStyleableLayerRegistry();
    }
  }

  function getMetadataForElementKey(elementKey) {
    if (!elementKey) return null;
    const entries = elementKeyMetadataIndex[elementKey];
    if (Array.isArray(entries) && entries.length > 0) {
      return entries[0];
    }
    return null;
  }

  function getLayerMetadataFromParents(layer) {
    if (!layer || !layer._eventParents) return null;
    for (const parentId in layer._eventParents) {
      if (!Object.prototype.hasOwnProperty.call(layer._eventParents, parentId)) continue;
      const parent = layer._eventParents[parentId];
      if (parent && parent._qgasMeta) {
        return parent._qgasMeta;
      }
    }
    return null;
  }

  function getLegacyLayerReference(elementType) {
    switch (elementType) {
      case 'pipelines':
        return pipelineLayer;
      case 'nodes':
        return nodeLayer;
      case 'powerplants':
        return powerplantsLayer;
      case 'compressors':
        return compressorsLayer;
      case 'lng':
        return lngLayer;
      case 'storages':
        return storageLayer;
      case 'consumption':
        return consumptionLayer;
      case 'shortPipes':
        return shortPipeLayer;
      case 'borderpoints':
        return borderpointsLayer;
      case 'demands':
        return demandsLayer;
      case 'productions':
        return productionsLayer;
      case 'hydrogenPipes':
        return hydrogenPipeLayer;
      case 'electrolyzers':
        return electrolyzersLayer;
      default:
        return null;
    }
  }

  function registerLegacyLayerReference(elementType, layerInstance) {
    switch (elementType) {
      case 'pipelines':
        pipelineLayer = layerInstance;
        originalPipelineLayer = layerInstance;
        break;
      case 'nodes':
        nodeLayer = layerInstance;
        originalNodeLayer = layerInstance;
        break;
      case 'powerplants':
        powerplantsLayer = layerInstance;
        originalPowerplantsLayer = layerInstance;
        break;
      case 'compressors':
        compressorsLayer = layerInstance;
        originalCompressorsLayer = layerInstance;
        break;
      case 'lng':
        lngLayer = layerInstance;
        originalLngLayer = layerInstance;
        break;
      case 'storages':
        storageLayer = layerInstance;
        originalStorageLayer = layerInstance;
        break;
      case 'consumption':
        consumptionLayer = layerInstance;
        originalConsumptionLayer = layerInstance;
        break;
      case 'shortPipes':
        if (shortPipeLayer && shortPipeLayer._isFallback && shortPipeLayer !== layerInstance && map) {
          if (map.hasLayer(shortPipeLayer)) {
            map.removeLayer(shortPipeLayer);
          }
        }
        shortPipeLayer = layerInstance;
        if (shortPipeLayer) {
          shortPipeLayer._isFallback = false;
        }
        originalShortPipeLayer = layerInstance;
        break;
      case 'borderpoints':
        borderpointsLayer = layerInstance;
        originalBorderpointsLayer = layerInstance;
        break;
      case 'demands':
        demandsLayer = layerInstance;
        originalDemandsLayer = layerInstance;
        break;
      case 'productions':
        productionsLayer = layerInstance;
        originalProductionsLayer = layerInstance;
        break;
      case 'hydrogenPipes':
        hydrogenPipeLayer = layerInstance;
        originalHydrogenPipeLayer = layerInstance;
        break;
      case 'electrolyzers':
        electrolyzersLayer = layerInstance;
        originalElectrolyzersLayer = layerInstance;
        break;
    }
  }

  function getOriginalLayerReference(elementType) {
    switch (elementType) {
      case 'pipelines':
        return originalPipelineLayer;
      case 'nodes':
        return originalNodeLayer;
      case 'powerplants':
        return originalPowerplantsLayer;
      case 'compressors':
        return originalCompressorsLayer;
      case 'lng':
        return originalLngLayer;
      case 'storages':
        return originalStorageLayer;
      case 'consumption':
        return originalConsumptionLayer;
      case 'shortPipes':
        return originalShortPipeLayer;
      case 'borderpoints':
        return originalBorderpointsLayer;
      case 'demands':
        return originalDemandsLayer;
      case 'productions':
        return originalProductionsLayer;
      case 'hydrogenPipes':
        return originalHydrogenPipeLayer;
      case 'electrolyzers':
        return originalElectrolyzersLayer;
      default:
        return null;
    }
  }

  function getLayersForElementType(elementType) {
    if (!elementType) return [];
    const result = [];
    const registered = elementTypeLayerMap[elementType];
    if (registered && registered.size > 0) {
      registered.forEach(layer => {
        if (layer && !result.includes(layer)) {
          result.push(layer);
        }
      });
    }
    const legacyLayer = getLegacyLayerReference(elementType);
    if (legacyLayer && !result.includes(legacyLayer)) {
      result.push(legacyLayer);
    }
    const originalLayer = getOriginalLayerReference(elementType);
    if (originalLayer && !result.includes(originalLayer)) {
      result.push(originalLayer);
    }
    return result;
  }

  function buildFeatureIdentity(feature) {
    if (!feature) return '';
    const props = feature.properties || {};
    const candidateKeys = ['Global_ID', 'GlobalID', 'global_id', 'Unique_ID', 'unique_id', 'PIPELINE_ID', 'Pipeline_ID', 'PIPELINEID', 'ID', 'Id', 'id', 'Name'];
    for (const key of candidateKeys) {
      const value = props[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return `${key}:${String(value).trim()}`;
      }
    }
    if (feature.id !== undefined && feature.id !== null) {
      return `feature-id:${feature.id}`;
    }
    return safeGeometrySignature(feature.geometry);
  }

  function safeGeometrySignature(geometry) {
    if (!geometry || !geometry.type) return '';
    try {
      const clone = { type: geometry.type, coordinates: null };
      if (Array.isArray(geometry.coordinates)) {
        if (geometry.type === 'LineString') {
          clone.coordinates = geometry.coordinates.slice(0, 5);
        } else if (geometry.type === 'MultiLineString' || geometry.type === 'MultiPolygon') {
          clone.coordinates = geometry.coordinates.map(segment => Array.isArray(segment) ? segment.slice(0, 5) : segment).slice(0, 5);
        } else if (geometry.type === 'Polygon') {
          clone.coordinates = geometry.coordinates.map(ring => Array.isArray(ring) ? ring.slice(0, 5) : ring).slice(0, 2);
        } else {
          clone.coordinates = geometry.coordinates;
        }
      } else {
        clone.coordinates = geometry.coordinates || null;
      }
      return `geom:${JSON.stringify(clone)}`;
    } catch (error) {
      console.warn('Failed to build geometry signature', error);
      return '';
    }
  }

  function removeFeatureFromLayerGroupByIdentity(layerGroup, feature, directLayerInstance) {
    if (!layerGroup || !feature) return;
    const hasLayerMethod = typeof layerGroup.hasLayer === 'function';
    if (directLayerInstance && hasLayerMethod && layerGroup.hasLayer(directLayerInstance)) {
      layerGroup.removeLayer(directLayerInstance);
    }
    if (typeof layerGroup.eachLayer !== 'function') return;
    const identity = buildFeatureIdentity(feature);
    if (!identity) return;
    const removalQueue = [];
    layerGroup.eachLayer(candidate => {
      if (candidate === directLayerInstance) return;
      if (!candidate?.feature) return;
      const candidateIdentity = buildFeatureIdentity(candidate.feature);
      if (candidateIdentity && candidateIdentity === identity) {
        removalQueue.push(candidate);
      }
    });
    removalQueue.forEach(candidate => {
      if (hasLayerMethod && layerGroup.hasLayer(candidate)) {
        layerGroup.removeLayer(candidate);
      } else if (typeof layerGroup.removeLayer === 'function') {
        layerGroup.removeLayer(candidate);
      }
    });
  }

  function removeFeatureFromElementLayers(feature, elementType, directLayerInstance = null) {
    const targetLayers = getLayersForElementType(elementType);
    targetLayers.forEach(layerGroup => {
      removeFeatureFromLayerGroupByIdentity(layerGroup, feature, directLayerInstance);
    });
  }

  function removeFeatureFromAllMapLayers(feature) {
    if (!feature || !map) return;
    const identity = buildFeatureIdentity(feature);
    if (!identity) return;
    removeFeatureByIdentityFromAllMapLayers(identity);
  }

  function removeFeatureByIdentityFromAllMapLayers(identity) {
    if (!identity || !map) return;
    
    let removalCount = 0;
    
    // Iteriere durch ALLE Layer auf der Karte
    map.eachLayer(layer => {
      if (!layer || typeof layer.eachLayer !== 'function') return;
      
      const removalQueue = [];
      layer.eachLayer(child => {
        if (!child?.feature) return;
        const childIdentity = buildFeatureIdentity(child.feature);
        if (childIdentity === identity) {
          removalQueue.push(child);
        }
      });
      
      removalQueue.forEach(child => {
        if (typeof layer.removeLayer === 'function') {
          layer.removeLayer(child);
          removalCount++;
        }
      });
    });
  }

  // Wenn Layer-Reloads passieren (z.B. bei Projektwechsel), alte gelöschte Features sofort entfernen
  function applyAllDeletedIdentitiesToMap() {
    const allDeletedIdentities = collectAllDeletedIdentities();
    allDeletedIdentities.forEach(id => removeFeatureByIdentityFromAllMapLayers(id));
  }

  const deletedElementIdentityRegistry = new Map();

  function recordDeletedFeatureIdentity(feature, elementType) {
    if (!feature) {
      console.warn('recordDeletedFeatureIdentity - no feature provided');
      return;
    }
    const identity = buildFeatureIdentity(feature);
    if (!identity) {
      console.warn('recordDeletedFeatureIdentity - could not build identity');
      return;
    }
    let resolvedType = elementType;
    if (!resolvedType) {
      const props = feature.properties || {};
      resolvedType = props.__elementKey || null;
    }
    if (!resolvedType) {
      console.warn('recordDeletedFeatureIdentity - no element type resolved');
      return;
    }
    if (!deletedElementIdentityRegistry.has(resolvedType)) {
      deletedElementIdentityRegistry.set(resolvedType, new Set());
    }
    deletedElementIdentityRegistry.get(resolvedType).add(identity);

    // Sofort alle Vorkommen dieses Features aus allen Layern entfernen
    removeFeatureByIdentityFromAllMapLayers(identity);
  }

  function resolveElementKeyFromLayerInstance(layerInstance) {
    if (!layerInstance) return null;
    if (layerInstance._qgasMeta?.elementKey) {
      return layerInstance._qgasMeta.elementKey;
    }
    if (typeof layerInstance.getLayers === 'function') {
      let resolved = null;
      layerInstance.eachLayer(child => {
        if (resolved) return;
        if (child?._qgasMeta?.elementKey) {
          resolved = child._qgasMeta.elementKey;
          return;
        }
        if (child?.feature?.properties?.__elementKey) {
          resolved = child.feature.properties.__elementKey;
        }
      });
      return resolved;
    }
    return null;
  }

  function collectAllDeletedIdentities() {
    const ids = new Set();
    // Registry-basierte Identities
    deletedElementIdentityRegistry.forEach(reg => reg.forEach(id => ids.add(id)));
    // Aus gelöschten Feature-Arrays ableiten
    const addFromArray = arr => {
      if (!Array.isArray(arr)) return;
      arr.forEach(f => {
        const id = buildFeatureIdentity(f);
        if (id) ids.add(id);
      });
    };
    addFromArray(deletedPipelines);
    addFromArray(deletedNodes);
    addFromArray(deletedPowerplants);
    addFromArray(deletedCompressors);
    addFromArray(deletedLNGs);
    addFromArray(deletedStorages);
    addFromArray(deletedCustomElements);
    addFromArray(deletedDrawnItems);
    return ids;
  }

  function applyDeletedIdentitiesToLayer(layerGroup) {
    if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
    const elementKey = resolveElementKeyFromLayerInstance(layerGroup);
    
    const allDeletedIdentities = collectAllDeletedIdentities();
    if (allDeletedIdentities.size === 0) return;
    
    // Globale Bereinigung: entferne aus allen Map-Layern
    allDeletedIdentities.forEach(identity => removeFeatureByIdentityFromAllMapLayers(identity));
    
    const removalQueue = [];
    layerGroup.eachLayer(child => {
      if (!child?.feature) return;
      const identity = buildFeatureIdentity(child.feature);
      if (identity && allDeletedIdentities.has(identity)) {
        removalQueue.push(child);
      }
    });
    removalQueue.forEach(child => {
      if (typeof layerGroup.removeLayer === 'function') {
        layerGroup.removeLayer(child);
      }
    });
  }

  function getDeletedLayerGroup(elementType) {
    if (!elementType) return null;
    if (!deletedLayerRegistry[elementType]) {
      deletedLayerRegistry[elementType] = L.layerGroup();
    }
    return deletedLayerRegistry[elementType];
  }

  function stashLayerInDeletedGroup(layerInstance, elementType) {
    if (!layerInstance || !elementType) return;
    const hiddenGroup = getDeletedLayerGroup(elementType);
    if (!hiddenGroup) return;
    if (typeof hiddenGroup.hasLayer === 'function' && hiddenGroup.hasLayer(layerInstance)) {
      return;
    }
    hiddenGroup.addLayer(layerInstance);
    if (map && map.hasLayer(layerInstance)) {
      map.removeLayer(layerInstance);
    }
  }

  async function fetchProjectResource(fileName, options = {}) {
    const { fallbackToRoot = true, logAttempts = false } = options;
    const timestamp = Date.now();
    const sanitized = sanitizeRelativePath(fileName);
    const candidates = [];
    if (currentProject) {
      candidates.push(`${currentProject}/${sanitized}`);
    }
    if (fallbackToRoot) {
      candidates.push(sanitized);
    }
    for (const relative of candidates) {
      const url = `Input/${relative}?v=${timestamp}`;
      if (logAttempts) {
        console.log(`Loading ${fileName} from: ${url}`);
      }
      try {
        const response = await fetch(url);
        if (response.ok) {
          return { url, response };
        }
        if (logAttempts) {
          console.warn(`${fileName} not found at ${url}`);
        }
      } catch (error) {
        if (logAttempts) {
          console.warn(`Error loading ${fileName} from ${url}:`, error);
        }
      }
    }
    return { url: null, response: null };
  }

  /*
   * Load a GeoJSON layer if the referenced file exists.
   */
  function loadLayer(fileName, layerName, styleOptions, onEachFeatureCallback, onLoadCallback) {
    styleOptions = styleOptions || {};
    const resolvedPath = resolveLayerFilePath(fileName);
    const url = buildInputUrl(resolvedPath, { skipProjectPrefix: true });
    if (!url) {
      console.warn(`No valid path resolved for layer ${layerName}`);
      return;
    }
    console.log(`Loading layer from: ${url}`);
    let metadata = layerMetadataRegistry[layerName];
    if (!metadata) {
      const inferredType = styleOptions.pointToLayer ? 'Point' : 'Line';
      metadata = registerLayerMetadata(layerName, {
        filename: fileName,
        legendName: layerName,
        type: inferredType
      });
    }
    fetch(url)
      .then(response => {
        if (!response.ok) {
          console.log(`File ${fileName} not found at ${url}, skipping.`);
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (data) {
          const paneName = styleOptions.pane || 'overlayPane';
          const userOnEachFeature = typeof onEachFeatureCallback === 'function' ? onEachFeatureCallback : null;
          const geoJsonOptions = {
            pane: paneName,
            style: styleOptions.style || {},
            onEachFeature: function(feature, layer) {
              assignMetadataToLayer(layer, metadata);
              handleFeature(feature, layer);
              if (userOnEachFeature) {
                userOnEachFeature(feature, layer);
              }
            }
          };
          if (styleOptions.pointToLayer) {
            geoJsonOptions.pointToLayer = function(feature, latlng) {
              const marker = styleOptions.pointToLayer(feature, latlng);
              if (marker && marker.options && !marker.options.pane) {
                marker.options.pane = paneName;
              }
              return marker;
            };
          }

          let layer = L.geoJSON(data, geoJsonOptions);
          layer.addTo(map);
          assignMetadataToLayer(layer, metadata);
          rememberLayerInstanceForElementKey(metadata.elementKey, layer);
          registerLegacyLayerReference(metadata.elementKey, layer);
          applyDeletedIdentitiesToLayer(layer);
          if (metadata.elementKey === 'nodes' && typeof updateSplitNodeOffsets === 'function') {
            updateSplitNodeOffsets();
          }
          const autoActivateKeys = ['pipelines', 'nodes', 'powerplants', 'compressors', 'lng', 'storages', 'consumption'];
          if (autoActivateKeys.includes(metadata.elementKey) && typeof activateInfoMode === 'function') {
            activateInfoMode();
          }
          
          // Store in dynamicLayers for configuration-based access
          dynamicLayers[layerName] = layer;
          invalidateStyleableLayerRegistry();

          // Ensure legend state (if available) is respected once the layer finishes loading
          const toggleId = 'toggle-' + fileName.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const legendCheckbox = document.getElementById(toggleId);
          if (legendCheckbox && !legendCheckbox.checked && map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
          const legendEntry = legendToggleRegistry.get(layerName);
          if (legendEntry && typeof legendEntry.handler === 'function') {
            legendEntry.handler();
          }
          
          console.log(`Loaded ${fileName}`);
          
          if (onLoadCallback) onLoadCallback();
        }
      })
      .catch(error => {
        console.log(`Error loading ${fileName}:`, error);
      });
  }

  const DEFAULT_LINE_COLOR_SEQUENCE = ['#0070f3', '#ff6b6b', '#20c997', '#a55eea', '#ffb400', '#00b8d9', '#ff5f1f'];
  const DEFAULT_POINT_COLOR_SEQUENCE = ['#ff6b6b', '#2ec4b6', '#f4c430', '#6c63ff', '#1bc47d', '#ff6ec7', '#3d5afe', '#ff924a'];

  /*
   * Load layer configuration from Excel, falling back to defaults.
   */
  async function loadLayerConfiguration() {
    try {
      const { response } = await fetchProjectResource('config.xlsx', { logAttempts: true });
      if (!response) {
        console.log('Configuration file not found, using defaults');
        return getDefaultLayerConfiguration();
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const sheetName = 'Input_Files';
      if (!workbook.SheetNames.includes(sheetName)) {
        console.log('Input_Files sheet not found, using defaults');
        return getDefaultLayerConfiguration();
      }
      
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const config = [];
      const colorAssignmentState = { lineIndex: 0, pointIndex: 0 };

      const firstDataRowIndex = data.findIndex(row => Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('.geojson')));
      const startIndex = firstDataRowIndex >= 0 ? firstDataRowIndex : 0;

      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue; // Skip empty rows
        
        // Based on current behavior: row[1] has legend names like "Compressors", "Demands" etc.
        // So the actual structure must be different. Let's check all columns:
        // We need to find which column has the .geojson filenames
        
        let filename = null;
        let legendName = null;
        
        // Search for the column that contains .geojson files
        for (let col = 0; col < row.length; col++) {
          if (row[col] && typeof row[col] === 'string' && row[col].includes('.geojson')) {
            filename = row[col];
            // Legend name is probably in column B (index 1)
            legendName = row[1] || filename.replace('.geojson', '');
            break;
          }
        }
        
        if (!filename) {
          if (i <= 4) console.warn('No .geojson file found in row', i);
          continue;
        }
        
        // Now map the rest - Excel structure: [filename, legendName, color, markerType, size, layerType]
        // Row indices: [0, 1, 2, 3, 4, 5]
        const rawLayerType = typeof row[5] === 'string' ? row[5].trim() : '';
        const layerType = rawLayerType || 'Point';
        const isLineLikeType = isLineLayerType(layerType);
        const color = resolveLayerColor(row[2], layerType, colorAssignmentState);
        const markerType = row[3] || (isLineLikeType ? 'line' : 'circle');
        const parsedSize = parseInt(row[4], 10);
        const defaultSize = isLineLikeType ? 4 : 6;
        const size = Number.isFinite(parsedSize) ? parsedSize : defaultSize;
        const parentFilename = sanitizeRelativePath(row[6] || '');
        
        config.push({
          filename: filename,
          legendName: legendName,
          color: color,
          markerType: markerType,
          size: size,
          type: layerType,
          enabled: true,
          parentFilename: parentFilename
        });
      }
      
      console.log('✓ Loaded layer configuration from Excel:', config);
      console.log(`Total layers configured: ${config.length}`);
      
      // Log which files are configured
      config.forEach(c => console.log(`  - ${c.filename}: ${c.legendName} (${c.type}, ${c.color})`));
      
      return applySublayerRelationships(config);
      
    } catch (error) {
      console.error('Error loading configuration:', error);
      return getDefaultLayerConfiguration();
    }
  }

  function resolveLayerColor(rawColor, layerType, colorState = { lineIndex: 0, pointIndex: 0 }) {
    const normalizedInput = normalizeHexColorValue(rawColor);
    if (normalizedInput) {
      return normalizedInput;
    }

    const isLineLayer = isLineLayerType(layerType);
    const palette = isLineLayer ? DEFAULT_LINE_COLOR_SEQUENCE : DEFAULT_POINT_COLOR_SEQUENCE;
    const indexKey = isLineLayer ? 'lineIndex' : 'pointIndex';
    const paletteIndex = colorState[indexKey] % palette.length;
    const resolvedColor = palette[paletteIndex];
    colorState[indexKey] = (colorState[indexKey] + 1) % palette.length;
    return resolvedColor;
  }

  function normalizeHexColorValue(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const threeHexMatch = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
    if (threeHexMatch) {
      const hex = threeHexMatch[1].toUpperCase();
      const expanded = hex.split('').map(ch => ch + ch).join('');
      return `#${expanded}`;
    }

    const sixHexMatch = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
    if (sixHexMatch) {
      return `#${sixHexMatch[1].toUpperCase()}`;
    }

    return trimmed;
  }

  function normalizeLayerType(value) {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
  }

  function isShortPipeTypeLabel(value) {
    const normalized = normalizeLayerType(value);
    return normalized === 'shortpipe' || normalized === 'short_pipe' || normalized === 'short-pipe';
  }

  function isLineLayerType(value) {
    const normalized = normalizeLayerType(value);
    return normalized === 'line' || isShortPipeTypeLabel(normalized);
  }
  
  function getDefaultLayerConfiguration() {
    console.log('Using default layer configuration');
    const fallbackBase = currentProject ? `${currentProject}/` : 'Standard/';
    const defaults = [
      { filename: `${fallbackBase}PL_Pipelines.geojson`, legendName: 'Pipelines', color: DEFAULT_LINE_COLOR_SEQUENCE[0], markerType: 'line', size: 3, type: 'Line', enabled: true, parentFilename: '' },
      { filename: `${fallbackBase}N_Nodes.geojson`, legendName: 'Nodes', color: DEFAULT_POINT_COLOR_SEQUENCE[0], markerType: 'circle', size: 6, type: 'Point', enabled: true, parentFilename: '' },
      { filename: `${fallbackBase}P_Powerplants.geojson`, legendName: 'Power Plants', color: DEFAULT_POINT_COLOR_SEQUENCE[1], markerType: 'circle', size: 8, type: 'Point', enabled: true, parentFilename: '' },
      { filename: `${fallbackBase}C_Compressors.geojson`, legendName: 'Compressors', color: DEFAULT_POINT_COLOR_SEQUENCE[2], markerType: 'circle', size: 7, type: 'In-Line', enabled: true, parentFilename: '' },
      { filename: `${fallbackBase}L_LNG.geojson`, legendName: 'LNG Terminals', color: DEFAULT_POINT_COLOR_SEQUENCE[3], markerType: 'circle', size: 9, type: 'Point', enabled: true, parentFilename: '' },
      { filename: `${fallbackBase}S_Storages.geojson`, legendName: 'Storage Sites', color: DEFAULT_POINT_COLOR_SEQUENCE[4], markerType: 'circle', size: 8, type: 'Point', enabled: true, parentFilename: '' },
      { filename: `${fallbackBase}NUTS3_Centroids.geojson`, legendName: 'Consumption', color: DEFAULT_POINT_COLOR_SEQUENCE[5], markerType: 'circle', size: 4, type: 'Point', enabled: true, parentFilename: '' }
    ];
    return applySublayerRelationships(defaults);
  }

  /*
   * Load contributors from localStorage (persistent until cache is cleared).
   */
  function loadContributors() {
    const stored = localStorage.getItem('qgas_contributors');
    if (stored) {
      contributors = JSON.parse(stored);
      console.log('Contributors loaded from browser localStorage');
    }

    return contributors;
  }

  /*
   * Persist contributors to localStorage (no server-side storage).
   */
  function saveContributors() {
    localStorage.setItem('qgas_contributors', JSON.stringify(contributors));
    console.log('Contributors saved to browser localStorage');
  }

  function addContributor(firstName, surname, institution) {
    const fullName = `${firstName} ${surname}`;
    const contributor = {
      id: Date.now().toString(),
      firstName: firstName,
      surname: surname,
      fullName: fullName,
      institution: institution,
      created: new Date().toISOString()
    };
    contributors.push(contributor);
    saveContributors();
    return contributor;
  }
  
  function deleteContributor(contributorId) {
    showConfirmationPopup({
      title: '🗑️ Delete Contributor',
      message: 'Are you sure you want to delete this contributor?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        contributors = contributors.filter(c => c.id !== contributorId);
        saveContributors();
        populateContributorSelect();
        console.log('Contributor deleted');
      }
    });
  }

  function populateContributorSelect() {
    const list = document.getElementById('contributor-list');
    list.innerHTML = '';

    if (contributors.length === 0) {
      list.innerHTML = '<p style="color: #666; margin: 0;">No contributors available</p>';
      return;
    }

    contributors.forEach(contributor => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 8px;
        border-bottom: 1px solid #eee;
        background: white;
      `;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'contributor-select';
      radio.value = contributor.id;
      radio.style.marginRight = '10px';

      const label = document.createElement('label');
      label.style.cssText = `
        flex: 1;
        cursor: pointer;
        margin: 0;
        font-size: 14px;
      `;
      label.textContent = `${contributor.fullName} (${contributor.institution})`;
      label.onclick = () => radio.click();

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.style.cssText = `
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 10px;
      `;
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteContributor(contributor.id);
      };

      item.appendChild(radio);
      item.appendChild(label);
      item.appendChild(deleteBtn);
      list.appendChild(item);
    });
  }

  function openNewContributorModal() {
    document.getElementById('new-contributor-modal').style.display = 'flex';
    document.getElementById('contributor-form').reset();
    document.getElementById('contributor-firstname').focus();
    
    // Reset submit button state in case of previous errors
    const submitButton = document.querySelector('#contributor-form button[type="submit"]');
    submitButton.disabled = false;
    submitButton.textContent = 'Create Contributor';
    submitButton.style.background = '#28a745';
    isSubmittingContributor = false;
  }

  function closeNewContributorModal() {
    document.getElementById('new-contributor-modal').style.display = 'none';
  }

  /*
   * Citation modal handlers.
   */
  function openCiteModal() {
    document.getElementById('cite-modal').style.display = 'flex';
  }

  function closeCiteModal() {
    document.getElementById('cite-modal').style.display = 'none';
  }

  function copyBibTeX() {
    const bibtexContent = document.getElementById('bibtex-content').textContent;
    navigator.clipboard.writeText(bibtexContent).then(function() {
      // Temporarily change button text to show success
      const copyBtn = document.querySelector('#cite-modal button[onclick="copyBibTeX()"]');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.style.background = '#218838';
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#28a745';
      }, 2000);
    }).catch(function(err) {
      console.error('Failed to copy: ', err);
      showErrorPopup('Failed to copy to clipboard. Please select and copy manually.');
    });
  }

  /*
   * Data and licensing modal handlers.
   */
  async function openDataLicensingModal() {
    const modal = document.getElementById('data-licensing-modal');
    const contentDiv = modal.querySelector('div[style*="background: #f8f9fa"]');
    
    try {
      // Load the data and licensing file from the current project folder
      const { response } = await fetchProjectResource('license.txt');
      
      if (response) {
        const text = await response.text();
        
        if (text.trim()) {
          // Parse the file content
          const lines = text.split('\n');
          let htmlContent = '<div style="line-height: 1.8;">';
          let currentSection = '';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line === 'Text:') {
              currentSection = 'text';
              continue;
            } else if (line === 'Citation:') {
              currentSection = 'citation';
              htmlContent += '<div style="margin-top: 25px;"><strong style="color: #495057;">Citation:</strong><br>';
              continue;
            } else if (line === 'License:') {
              currentSection = 'license';
              htmlContent += '</div><div style="margin-top: 25px;"><strong style="color: #495057;">License:</strong><br>';
              continue;
            }
            
            if (line) {
              let processedLine = line;
              
              // Remove any existing HTML tags/attributes from the text file
              processedLine = processedLine.replace(/(<a href="|" target="_blank" style="color: #[0-9a-fA-F]+;">|<\/a>)/g, '');
              
              // Now make URLs clickable
              // Match DOI links
              processedLine = processedLine.replace(
                /(https?:\/\/doi\.org\/[^\s]+)/g,
                '<a href="$1" target="_blank" style="color: #007bff;">$1</a>'
              );
              
              // Match other URLs (but not if already in a link)
              processedLine = processedLine.replace(
                /(?<!href=")(https?:\/\/(?!doi\.org)[^\s<]+)/g,
                '<a href="$1" target="_blank" style="color: #007bff;">$1</a>'
              );
              
              if (currentSection === 'text') {
                htmlContent += `<p style="color: #495057; margin-bottom: 15px;">${processedLine}</p>`;
              } else {
                htmlContent += `<span style="color: #666;">${processedLine}</span><br>`;
              }
            } else if (currentSection) {
              // Empty line adds spacing
              htmlContent += '<br>';
            }
          }
          
          htmlContent += '</div></div>';
          contentDiv.innerHTML = htmlContent;
        } else {
          // File is empty, show no content
          contentDiv.innerHTML = '';
        }
      } else {
        // File not found, use default content
        contentDiv.innerHTML = getDefaultDataLicensingContent();
      }
    } catch (error) {
      console.error('Error loading data and licensing file:', error);
      contentDiv.innerHTML = getDefaultDataLicensingContent();
    }
    
    modal.style.display = 'flex';
  }
  
  function getDefaultDataLicensingContent() {
    return `
      <p style="color: #495057; margin-bottom: 25px;">
        In order to demonstrate the features and advances of the QGas toolkit, the SciGRID_gas IGGIELGNC-1 dataset was translated in a QGas suitable format. The dataset is contained in the input folder of the toolkit.
      </p>
      
      <div style="margin-bottom: 25px;">
        <strong style="color: #495057;">Cite:</strong><br>
        <span style="color: #666;">Diettrich, J., Pluta, A., Medjroubi, W., Dasenbrock, J., & Sandoval, J. E. (2021). SciGRID_gas IGGIELGNC-1 (0.2) [Data set]. Zenodo. <a href="https://doi.org/10.5281/zenodo.5509988" target="_blank" style="color: #007bff;">https://doi.org/10.5281/zenodo.5509988</a></span>
      </div>
      
      <div>
        <strong style="color: #495057;">Link:</strong><br>
        <a href="https://zenodo.org/records/5509988" target="_blank" style="color: #007bff;">https://zenodo.org/records/5509988</a>
      </div>
    `;
  }

  function closeDataLicensingModal() {
    document.getElementById('data-licensing-modal').style.display = 'none';
  }


  /*
   * Preload assets and manage the initial loading screen sequence.
   */
  function preloadAllAssets() {
    return new Promise((resolve) => {
      const logos = ['Images/TU_Graz.png', 'Images/QGas_Logo.png', 'Images/Logo_IEE.png', 'Images/Loading_Screen.png'];
      let loadedCount = 0;
      
      logos.forEach(logoSrc => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          if (loadedCount === logos.length) {
            resolve();
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === logos.length) {
            resolve();
          }
        };
        img.src = logoSrc;
      });
    });
  }
  
  /*
   * Reveal the application once all preload assets are complete.
   */
  preloadAllAssets().then(() => {
    /* Make the body visible after preload completion. */
    document.body.style.visibility = 'visible';
    
    /* Assign loading-screen and header logos. */
    const logoSources = ['Images/QGas_Logo.png', 'Images/Logo_IEE.png', 'Images/TU_Graz.png'];
    const topLogoSources = ['Images/QGas_Logo.png', 'Images/TU_Graz.png', 'Images/Logo_IEE.png'];
    const loadingLogos = document.querySelectorAll('.logo-container img');
    const topLogos = document.querySelectorAll('#top-logo .logo-row img');
    
    /* Assign the loading-screen background image. */
    const loadingBackground = document.getElementById('loading-background');
    if (loadingBackground) {
      loadingBackground.src = 'Images/Loading_Screen.png';
    }
    
    logoSources.forEach((src, index) => {
      if (loadingLogos[index]) {
        loadingLogos[index].src = src;
        loadingLogos[index].style.opacity = '1';
      }
    });
    
    topLogoSources.forEach((src, index) => {
      if (topLogos[index]) {
        topLogos[index].src = src;
      }
    });
    
    /* Start the simulated progress bar. */
    const loadingScreen = document.getElementById('loading-screen');
    const progressBar = document.getElementById('progress-bar');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 1;
      if (progressBar) {
        progressBar.style.width = progress + '%';
      }
      
      if (progress >= 100) {
      clearInterval(interval);
      /* Fade out the loading screen shortly after completion. */
      setTimeout(() => {
        if (loadingScreen) {
          loadingScreen.style.opacity = '0';
          loadingScreen.style.transition = 'opacity 0.5s ease-out';
          setTimeout(() => {
            loadingScreen.style.display = 'none';
            console.log('Loading beendet, zeige Contributor Popup...');
            
            /* Hide any lingering overlays before showing contributor flow. */
            document.getElementById('tools-popup-overlay').style.display = 'none';
            document.getElementById('tools-popup').style.display = 'none';
            document.getElementById('custom-popup-overlay').style.display = 'none';
            document.getElementById('custom-popup').style.display = 'none';
            
            /* Show contributor selection popup. */
            const popup = document.getElementById('contributor-popup');
            const createBtn = document.getElementById('create-contributor-btn');
            const applyBtn = document.getElementById('contributor-apply-btn');
            
            if (popup) {
              /* Load and render contributor list. */
              loadContributors();
              populateContributorSelect();
              
              popup.style.display = 'flex';
              console.log('Contributor Popup angezeigt');
              
              /* Wire create-contributor action. */
              createBtn.onclick = function() {
                openNewContributorModal();
              };
              
              /* Wire apply/continue action. */
              applyBtn.onclick = function(e) {
                console.log('Continue Button geklickt!', e);
                const selectedRadio = document.querySelector('input[name="contributor-select"]:checked');
                const selectedId = selectedRadio ? selectedRadio.value : null;
                console.log('Selected ID:', selectedId);
                if (selectedId) {
                  /* Existing contributor selected. */
                  const contributor = contributors.find(c => c.id === selectedId);
                  console.log('Found contributor:', contributor);
                  if (contributor) {
                    const fullName = contributor.fullName;
                    document.getElementById('contributor-input').value = fullName;
                    contributorName = fullName;
                    contributorInitials = contributor.fullName.split(/\s+/).map(n => n[0] ? n[0].toUpperCase() : '').join('');
                    
                    /* Close popup on successful selection. */
                    popup.style.display = 'none';
                    console.log('Contributor gesetzt:', fullName);
                  }
                } else {
                  showInfoPopup('Please select a contributor or create a new one.');
                }
              };
            } else {
              console.error('Popup nicht gefunden');
            }
          }, 500);
        }
      }, 500);
    }
  }, 75); // 7500ms / 100 steps = 75ms per step
  
  });

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  function removeLayerCompletely(layer) {
    if (!layer) return;
    if (layer._clickLayer && map && map.hasLayer(layer._clickLayer)) {
      map.removeLayer(layer._clickLayer);
    }
    if (layer._clickLayer && drawnItems && drawnItems.hasLayer && drawnItems.hasLayer(layer._clickLayer)) {
      drawnItems.removeLayer(layer._clickLayer);
    }
    if (drawnItems && typeof drawnItems.removeLayer === 'function') {
      if (drawnItems.hasLayer && drawnItems.hasLayer(layer)) {
        drawnItems.removeLayer(layer);
      } else {
        drawnItems.removeLayer(layer);
      }
    }
  }

  const drawControl = new L.Control.Draw({
    draw: false,
    edit: {
        featureGroup: drawnItems,
        edit: true,
        remove: true,
        selectedPathOptions: {
          maintainColor: true
        }
    }
  });
  map.addControl(drawControl);

  if (L.EditToolbar && L.EditToolbar.Edit) {
    const editOptions = L.EditToolbar.Edit.prototype.options || {};
    editOptions.selectedPathOptions = editOptions.selectedPathOptions || {};
    editOptions.selectedPathOptions.maintainColor = true;
    L.EditToolbar.Edit.prototype.options = editOptions;
  }

  /*
   * Reset pipeline highlights when popups close.
   */
  map.on('popupclose', function(e) {
    if (activePipeline) {
      resetPipelineStyle(activePipeline);
      activePipeline = null;
    }
  });

  /*
   * Route newly drawn geometries to the appropriate layer group.
   */
  map.on('draw:created', function(e) {
    const layer = e.layer;
    if (currentMode === 'draw-pipeline') {
      /* Remove from drawnItems and add to the selected pipeline layer. */
      drawnItems.removeLayer(layer);
      layer.options = layer.options || {};
      layer.options.pane = 'pipelinePane';
      const targetGroup = (window.selectedPipelineLayer && window.selectedPipelineLayer !== drawnItems) ? window.selectedPipelineLayer : drawnItems;

      /* Finalize pipeline creation and insert into target group. */
      finalizeDrawnPipeline(layer);
      targetGroup.addLayer(layer);
      /* Assign parent layer metadata to the newly created pipeline. */
      if (targetGroup._qgasMeta) {
        assignMetadataToLayer(layer, targetGroup._qgasMeta);
      }
      if (typeof layer.bringToBack === 'function') {
        layer.bringToBack();
      }
      
      /* Disable the drawing tool once the pipeline is created. */
      if (window.polylineDrawer) {
        window.polylineDrawer.disable();
        window.polylineDrawer = null;
      }
      
      /* Clear draw context after all handlers complete. */
      setTimeout(() => {
        delete window.pipelineDrawContext;
      }, 100);
    } else {
      /* Default behavior for non-pipeline drawing. */
      drawnItems.addLayer(layer);
    }
  });

  const hiddenAttributes = ['overlap_percentage', 'overlap_length', 'Owner', 'Parent'];

  // 1. Popup-Logik für Attribute im Info-Modus: Speichern markiert als bearbeitet
  function createPopupContent(properties, layer) {
  console.log('*** createPopupContent CALLED ***');
  // Diese Attribute sollen NICHT angezeigt werden (statisch versteckt):
  const staticHiddenAttributes = [
    'overlap_percentage',
    'overlap_length',
    'Owner',
    'Parent',
    'Country_Start',
    'Country_End',
    'modified'
  ];
  
  // Dynamisch versteckte Attribute basierend auf Benutzereinstellungen
  const elementType = determineElementType(layer);
  const layerScopeLabel = getLayerDisplayNameForFeature(layer) || elementType || 'Unknown';
  ensureHiddenAttributeBucket(elementType);
  const dynamicHiddenAttributes = hiddenAttributesConfig[elementType] || [];
  // Kombiniere beide Listen
  const allHiddenAttributes = [...staticHiddenAttributes, ...dynamicHiddenAttributes];
  
  let html = '<table class="popup-table">';
  const orderedKeys = getOrderedAttributeKeys(properties, allHiddenAttributes);
  orderedKeys.forEach(key => {
    html += `<tr><td>${key}</td><td><input type="text" value="${properties[key] || ''}" data-key="${key}" style="width:20ch"></td></tr>`;
  });
  html += '</table>';
  html += `<div style="margin-top: 10px;">
    <button id="save-attr-btn">Save</button>
  </div>`;
  return html;
}

  // Spezielle Popup-Funktion für Consumption-Layer
  function createConsumptionPopupContent(properties, layer) {
    // Diese Attribute sollen NICHT angezeigt werden (statisch versteckt):
    const staticHiddenAttributes = [
      'overlap_percentage',
      'overlap_length',
      'Owner',
      'Parent',
      'Country_Start',
      'Country_End',
      'modified'
    ];
    
    // Dynamisch versteckte Attribute basierend auf Benutzereinstellungen
    const elementType = determineElementType(layer);
    ensureHiddenAttributeBucket(elementType);
    const dynamicHiddenAttributes = hiddenAttributesConfig[elementType] || [];
    
    // Kombiniere beide Listen
    const allHiddenAttributes = [...staticHiddenAttributes, ...dynamicHiddenAttributes];
    
    let html = '<table class="popup-table">';
    const orderedKeys = getOrderedAttributeKeys(properties, allHiddenAttributes);
    orderedKeys.forEach(key => {
      html += `<tr><td>${key}</td><td><input type="text" value="${properties[key] || ''}" data-key="${key}" style="width:20ch"></td></tr>`;
    });
    html += '</table>';
    html += `<div style="margin-top: 10px;">
      <button id="save-attr-btn">Save</button>
      <button id="add-attribute-btn" style="margin-left: 10px;">Add Attribute</button>
      <button id="delete-attribute-btn" style="margin-left: 10px; background: #dc3545; color: white;">Delete</button>
      <button id="hide-attribute-btn" style="margin-left: 10px; background: #ffc107; color: black;">Hide</button>
    </div>`;
    html += `<button id="show-timeseries-btn" style="margin-top: 10px; background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Show time series</button>`;
    return html;
  }

  // Spezielle Modal-Popup-Funktion für Consumption-Layer
  function createConsumptionModalPopupContent(properties, layer) {
    // Diese Attribute sollen NICHT angezeigt werden (statisch versteckt):
    const staticHiddenAttributes = [
      'overlap_percentage',
      'overlap_length',
      'Owner',
      'Parent',
      'Country_Start',
      'Country_End',
      'modified'
    ];
    
    // Dynamisch versteckte Attribute basierend auf Benutzereinstellungen
    const elementType = determineElementType(layer);
    ensureHiddenAttributeBucket(elementType);
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
    content += '<button id="delete-attribute-btn" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Delete Attribute</button>';
    content += '<button id="hide-attribute-btn" style="background: #ffc107; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Hide Attribute</button>';
    content += '<button id="show-timeseries-btn" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Show time series</button>';
    
    return content;
  }

  function openAttributePopup(layer) {
    const content = createPopupContent(layer.feature.properties, layer);
    layer.bindPopup(content).openPopup();
    
    // Store current layer for Add Attribute functionality
    currentPopupLayer = layer;

    setTimeout(() => {
      const btn = document.getElementById('save-attr-btn');
      if (btn) {
        btn.onclick = function () {
          // Alle Inputs auslesen und ins Properties-Objekt schreiben
          const inputs = layer.getPopup().getElement().querySelectorAll('input[data-key]');
          let changed = false;
          inputs.forEach(input => {
            const key = input.getAttribute('data-key');
            if (layer.feature.properties[key] !== input.value) changed = true;
            layer.feature.properties[key] = input.value;
          });
          // Als bearbeitet markieren, wenn etwas geändert wurde
          if (changed) layer.feature.properties.modified = true;
          layer.closePopup();
        };
      }
      
      // Add Attribute Button Event Listener
      const addAttrBtn = document.getElementById('add-attribute-btn');
      if (addAttrBtn) {
        addAttrBtn.onclick = function () {
          console.log('Add Attribute clicked for layer:', currentPopupLayer);
          if (currentPopupLayer) {
            currentPopupLayer.closePopup();
            showAddAttributeDialog(currentPopupLayer);
          }
        };
      }
    }, 100);
  }

  function handleFeature(feature, layer) {
    drawnItems.addLayer(layer);
    
    // Set up interaction based on geometry type
    const geomType = feature.geometry.type;
    
    if (geomType === 'LineString' || geomType === 'MultiLineString') {
      // Pipeline interaction
      setPipelineInteraction(layer);
    } else if (geomType === 'Point' || geomType === 'MultiPoint') {
      // Point interaction (nodes, powerplants, etc.)
      setPointInteraction(layer);
    }
  }
  
  // Universal point interaction handler
  function setPointInteraction(layer) {
    layer.off('click');
    
    if (currentMode === 'info') {
      layer.on('click', function() {
        if (currentMode !== 'info' || window.__suppressInfoPopups) { return; }
        highlightElement(this);
        const content = createModalPopupContent(this.feature.properties, this);
        const elementType = this.feature.properties.Type || 'Element';
        const title = `${elementType}: ${this.feature.properties.ID || this.feature.properties.Name || 'Unnamed'}`;
        showElementModal(title, content, this);
        
        setTimeout(() => {
          const btn = document.getElementById('save-attr-btn');
          if (btn) {
            btn.onclick = function() {
              const inputs = document.querySelectorAll('#modal-body input[data-key]');
              let changed = false;
              inputs.forEach(input => {
                const key = input.getAttribute('data-key');
                if (this.feature.properties[key] !== input.value) changed = true;
                this.feature.properties[key] = input.value;
              });
              if (changed) this.feature.properties.modified = true;
              closeElementModal();
            }.bind(this);
          }
        }, 100);
      });
    } else if (currentMode === 'delete') {
      // Delete mode handling
      layer.on('click', function(e) {
        // Will be handled by delete mode logic
      });
    }
  }

  // Layer variables now declared globally at line ~1307
  let currentMode = 'info';  // Info Mode als Standard
  updateActiveToolDisplay('info');  // Aktives Tool Display initialisieren
  let editingLayer = null;
  let nodePositionEditBuffer = null;

  // Speicher-Button für Pipeline-Bearbeitung
  function showSaveButton(layer) {
    if (document.getElementById('save-edit-btn')) return; // Nur einen Button zulassen

    const btn = document.createElement('button');
    btn.id = 'save-edit-btn';
    btn.textContent = 'Save Changes';
    btn.className = 'main-menu-btn edit-action-btn';
    btn.style.display = 'block';
    btn.style.background = '#28a745';

    btn.onclick = function () {
      releasePipelineEndpointLocks(layer);
      if (layer.editing) layer.editing.disable();
      // Markiere das Feature als geändert
      if (layer.feature && layer.feature.properties) {
        layer.feature.properties.modified = true;
        // Geometrie aktualisieren
        layer.feature.geometry = layer.toGeoJSON().geometry;
      }
      delete layer._editSessionSnapshot;
      btn.remove();
      document.getElementById('discard-edit-btn')?.remove();
      editingLayer = null;
      // Nach dem Speichern: Zurück zum Info-Modus
      deactivateAllModes();
      activateInfoMode(); // Zurück zum Info Mode
    };

    // Button zur tools-section hinzufügen
    const toolsSection = document.getElementById('tools-section');
    toolsSection.appendChild(btn);
  }

  function lockPipelineEndpoints(layer) {
    if (!layer || !layer.editing) return;

    const applyLock = () => {
      let markers = layer.editing._markers;
      if (!markers || !markers.length) return false;

      if (Array.isArray(markers[0])) {
        const flattened = [];
        markers.forEach(group => {
          if (Array.isArray(group)) {
            group.forEach(m => flattened.push(m));
          } else {
            flattened.push(group);
          }
        });
        markers = flattened;
      }

      if (markers.length < 2) return false;

      const lockMarker = marker => {
        if (!marker || marker._endpointLocked) return;
        marker._endpointLocked = true;
        const lockedLatLng = marker.getLatLng ? marker.getLatLng() : null;

        if (marker.dragging && marker.dragging.enabled()) {
          marker.dragging.disable();
        }

        marker.off('drag');
        marker.off('dragstart');
        marker.off('dragend');
        marker.off('mousedown');
        marker.off('touchstart');

        marker.on('drag dragstart', function () {
          if (lockedLatLng) {
            marker.setLatLng(lockedLatLng);
          }
        });

        marker.on('mousedown touchstart', function (evt) {
          L.DomEvent.stopPropagation(evt);
          L.DomEvent.preventDefault(evt);
        });

        if (marker._icon) {
          marker._icon.style.opacity = '0.35';
          marker._icon.style.cursor = 'not-allowed';
          marker._icon.style.pointerEvents = 'none';
          marker._icon.title = 'Endpoint locked – move the connected node instead';
        }
      };

      lockMarker(markers[0]);
      lockMarker(markers[markers.length - 1]);
      return true;
    };

    if (!applyLock()) {
      setTimeout(applyLock, 100);
    }

    if (!layer._endpointLockHooksBound) {
      const reapply = () => {
        setTimeout(() => {
          if (layer.editing && layer.editing._enabled) {
            lockPipelineEndpoints(layer);
          }
        }, 0);
      };
      layer.on('edit', reapply);
      if (map && !layer._endpointLockMapHandler) {
        const mapHandler = evt => {
          if (evt?.poly === layer) {
            reapply();
          }
        };
        map.on(L.Draw.Event.EDITVERTEX, mapHandler);
        layer._endpointLockMapHandler = mapHandler;
      }
      layer._endpointLockHooksBound = true;
      layer._endpointLockReapply = reapply;
    }
  }

  function releasePipelineEndpointLocks(layer) {
    if (!layer) return;
    if (layer._endpointLockReapply) {
      layer.off('edit', layer._endpointLockReapply);
      layer._endpointLockReapply = null;
    }
    if (layer._endpointLockMapHandler && map) {
      map.off(L.Draw.Event.EDITVERTEX, layer._endpointLockMapHandler);
      layer._endpointLockMapHandler = null;
    }
    layer._endpointLockHooksBound = false;
  }

  function restorePipelineEditStyle(layer) {
    if (!layer) return;

    const fallbackColor = layer._originalColor || layer.options?.color || '#3388ff';
    const fallbackWeight = layer._originalWeight || layer.options?.weight || 3;
    const fallbackOpacity = layer._originalOpacity ?? layer.options?.opacity ?? 0.8;
    const fallbackDash = layer._originalDashArray ?? layer.options?.dashArray ?? null;

    layer.setStyle({
      color: fallbackColor,
      weight: fallbackWeight,
      opacity: fallbackOpacity,
      dashArray: fallbackDash
    });

    if (layer._path) {
      layer._path.style.stroke = fallbackColor;
      layer._path.style.strokeWidth = fallbackWeight + 'px';
      layer._path.style.opacity = fallbackOpacity;
      layer._path.style.strokeDasharray = fallbackDash ? fallbackDash : '';
    }
  }

  function bindPipelineEditStyleHandlers(layer) {
    if (!layer || layer._maintainEditStyleBound) return;
    const reapply = () => restorePipelineEditStyle(layer);
    layer.on('editstart', reapply);
    layer.on('edit', reapply);
    layer._maintainEditStyleBound = true;
  }

  function assignPipelineLength(properties, lengthValue) {
    if (!properties) return;
    const normalizedTarget = 'lengthkm';
    let applied = false;
    Object.keys(properties).forEach(key => {
      if (!key) return;
      const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (normalizedKey === normalizedTarget) {
        properties[key] = lengthValue;
        applied = true;
      }
    });
    if (!applied) {
      properties.Length_km = lengthValue;
    }
  }

  function cloneLatLngStructure(latlngs) {
    if (Array.isArray(latlngs)) {
      return latlngs.map(item => cloneLatLngStructure(item));
    }
    if (latlngs && typeof latlngs.lat === 'number' && typeof latlngs.lng === 'number') {
      return L.latLng(latlngs.lat, latlngs.lng);
    }
    if (latlngs && typeof latlngs[0] === 'number' && typeof latlngs[1] === 'number') {
      return L.latLng(latlngs[0], latlngs[1]);
    }
    return latlngs;
  }

  function captureLayerEditSnapshot(layer) {
    if (!layer || typeof layer.getLatLngs !== 'function') return;
    layer._editSessionSnapshot = {
      latlngs: cloneLatLngStructure(layer.getLatLngs()),
      featureGeometry: layer.feature?.geometry ? JSON.parse(JSON.stringify(layer.feature.geometry)) : null
    };
  }

  function restoreLayerEditSnapshot(layer) {
    const snapshot = layer?._editSessionSnapshot;
    if (!layer || !snapshot || !snapshot.latlngs) return false;
    if (typeof layer.setLatLngs === 'function') {
      layer.setLatLngs(cloneLatLngStructure(snapshot.latlngs));
    }
    if (layer.feature && snapshot.featureGeometry) {
      layer.feature.geometry = JSON.parse(JSON.stringify(snapshot.featureGeometry));
    }
    refreshEditableLayerCache(layer);
    return true;
  }

  function refreshPolylineEditingHandlers(layer) {
    if (!layer || !layer.editing) return;
    try {
      const editingActive = !!layer.editing._enabled;

      if (typeof layer.editing._updateLatLngs === 'function') {
        layer.editing._updateLatLngs({ layer });
      } else if (Array.isArray(layer._latlngs)) {
        layer.editing.latlngs = [layer._latlngs];
        if (Array.isArray(layer._holes) && layer._holes.length) {
          layer.editing.latlngs = layer.editing.latlngs.concat(layer._holes);
        }
      }

      if (layer.editing._poly) {
        layer.editing._poly._latlngs = layer._latlngs;
      }

      if (Array.isArray(layer.editing._verticesHandlers) && Array.isArray(layer.editing.latlngs)) {
        layer.editing._verticesHandlers.forEach((handler, idx) => {
          if (!handler) return;
          handler._latlngs = layer.editing.latlngs[idx] || layer.editing.latlngs[0];
          if (!editingActive && handler._markerGroup && typeof handler._markerGroup.clearLayers === 'function') {
            handler._markerGroup.clearLayers();
          }
          if (!editingActive) {
            handler._markers = [];
          } else if (typeof handler.updateMarkers === 'function') {
            handler.updateMarkers();
          }
        });
      }

      if (!editingActive) {
        if (layer.editing._markerGroup && typeof layer.editing._markerGroup.clearLayers === 'function') {
          layer.editing._markerGroup.clearLayers();
        }
        layer.editing._markers = [];
      } else if (typeof layer.editing.updateMarkers === 'function') {
        layer.editing.updateMarkers();
      }
    } catch (error) {
      console.warn('Failed to refresh polyline editing handlers:', error);
    }
  }

  function refreshEditableLayerCache(layer) {
    if (!layer || typeof layer.getLatLngs !== 'function') return;
    const latlngs = layer.getLatLngs();
    if (!latlngs) return;
    const cloned = cloneLatLngStructure(latlngs);
    layer._originalLatLngs = cloned;
    layer._origLatLngs = cloneLatLngStructure(latlngs);
    if (layer.editing && layer.editing._poly) {
      layer.editing._poly._latlngs = layer._latlngs || latlngs;
      const refreshed = cloneLatLngStructure(layer._latlngs || latlngs);
      layer.editing._poly._originalLatLngs = refreshed;
      layer.editing._origLatLngs = cloneLatLngStructure(layer._latlngs || latlngs);
      refreshPolylineEditingHandlers(layer);
    }
  }

  function syncLayerFeatureGeometry(layer) {
    if (!layer || typeof layer.toGeoJSON !== 'function' || !layer.feature) return;
    try {
      const geo = layer.toGeoJSON();
      if (geo && geo.geometry) {
        layer.feature.geometry = geo.geometry;
      }
      refreshEditableLayerCache(layer);
    } catch (error) {
      console.error('Failed to synchronize layer geometry:', error);
    }
  }

  // Verwerfen-Button für Pipeline-Bearbeitung
  function showDiscardButton(layer) {
    if (document.getElementById('discard-edit-btn')) return; // Nur einen Button zulassen

    const btn = document.createElement('button');
    btn.id = 'discard-edit-btn';
    btn.textContent = 'Discard Changes';
    btn.className = 'main-menu-btn edit-action-btn';
    btn.style.display = 'block';
    btn.style.background = '#dc3545';

    btn.onclick = function () {
      releasePipelineEndpointLocks(layer);
      if (layer.editing) layer.editing.disable();
      restoreLayerEditSnapshot(layer);
      delete layer._editSessionSnapshot;
      btn.remove();
      document.getElementById('save-edit-btn')?.remove();
      editingLayer = null;
      // Nach dem Verwerfen: Zurück zum Info-Modus
      deactivateAllModes();
      activateInfoMode(); // Zurück zum Info Mode
    };

    // Button zur tools-section hinzufügen
    const toolsSection = document.getElementById('tools-section');
    toolsSection.appendChild(btn);
  }

  // Save Button für Delete Mode

  function setPipelineInteraction(layer, modeOverride) {
    layer.off('click');
    layer.unbindPopup(); // Popup IMMER entfernen

    const mode = modeOverride || currentMode;

    if (mode === 'info') {
      layer.on('click', function () {
        if (currentMode !== 'info') {
          return;
        }
        // Pipeline hervorheben
        highlightPipeline(layer);
        
        // Modal mit Pipeline-Details anzeigen
        const content = createModalPopupContent(layer.feature.properties, layer);
        const layerDisplayName = getLayerDisplayNameForFeature(layer);
        const title = `${layerDisplayName}: ${layer.feature.properties.ID || 'Unnamed'}`;
        showElementModal(title, content, layer);
        
        setTimeout(() => rebindModalAttributeControls(layer), 100);
      });
    } else if (mode === 'edit') {
      layer.on('click', function () {
        // Nur einen Layer gleichzeitig bearbeiten
        if (window.editingLayer && window.editingLayer !== layer) {
          window.editingLayer.editing.disable();
          const btn = document.getElementById('save-edit-btn');
          if (btn) btn.remove();
        }
        window.editingLayer = layer;
        if (layer.editing) {
          layer.editing.enable();
          restorePipelineEditStyle(layer);
          bindPipelineEditStyleHandlers(layer);
          lockPipelineEndpoints(layer);
          showSaveButton(layer);
          showDiscardButton(layer);
        }
      });
      layer.closePopup();
    } else if (mode === 'delete') {
      // Delete mode handlers are set by activateDeleteMode() function
      // This section is left empty to allow activateDeleteMode to control all delete interactions
    } else if (divisionMode && mode === 'divide-pipeline') {
      setPipelineDivisionInteraction(layer);
    }
  }

  function setNodeInteraction(layer) {
    layer.off('click');
    
    if (currentMode === 'info') {
      // Nodes haben im Info-Modus keine spezielle Interaktion
      // Event-Handler werden dynamisch über setupNodeClickHandlers gesetzt
    }
  }

  async function ensureShortPipeConfigPresence() {
    if (!Array.isArray(layerConfig)) {
      layerConfig = [];
    }
    if (layerConfig.some(isShortPipeConfigEntry)) {
      return;
    }
    const { response } = await fetchProjectResource(SHORT_PIPE_CONFIG_DEFAULTS.filename, { logAttempts: true });
    if (!response) {
      return;
    }
    layerConfig.push({ ...getShortPipeConfigTemplate() });
    rebuildLayerRelationships();
    console.log('Automatically registered Short-Pipes configuration after detecting Short_Pipes.geojson.');
  }

  // Helper function to create markers with different shapes based on markerType
  function createShapedMarker(latlng, options = {}) {
    const { shape = 'circle', size = 6, color = '#ff7800', pane = 'overlayPane' } = options;
    
    // For circle, use native CircleMarker (best performance)
    if (shape === 'circle' || !shape) {
      return L.circleMarker(latlng, {
        pane: pane,
        radius: size,
        fillColor: color,
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.85
      });
    }
    
    // For other shapes, use DivIcon with SVG
    const iconSize = size * 2;
    let svgContent = '';
    
    switch(shape.toLowerCase()) {
      case 'square':
        svgContent = `<rect width="${iconSize}" height="${iconSize}" fill="${color}" stroke="#000" stroke-width="1"/>`;
        break;
      case 'triangle':
        svgContent = `<polygon points="${iconSize/2},0 0,${iconSize} ${iconSize},${iconSize}" fill="${color}" stroke="#000" stroke-width="1"/>`;
        break;
      case 'diamond':
        svgContent = `<polygon points="${iconSize/2},0 ${iconSize},${iconSize/2} ${iconSize/2},${iconSize} 0,${iconSize/2}" fill="${color}" stroke="#000" stroke-width="1"/>`;
        break;
      case 'star': {
        const cx = iconSize / 2;
        const cy = iconSize / 2;
        const outerRadius = iconSize / 2;
        const innerRadius = iconSize / 4;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
          points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
        }
        svgContent = `<polygon points="${points.join(' ')}" fill="${color}" stroke="#000" stroke-width="1"/>`;
        break;
      }
      case 'cross': {
        const w = iconSize / 3;
        svgContent = `<polygon points="${w},0 ${w*2},0 ${w*2},${w} ${iconSize},${w} ${iconSize},${w*2} ${w*2},${w*2} ${w*2},${iconSize} ${w},${iconSize} ${w},${w*2} 0,${w*2} 0,${w} ${w},${w}" fill="${color}" stroke="#000" stroke-width="1"/>`;
        break;
      }
      default:
        // Fallback to circle
        return L.circleMarker(latlng, {
          pane: pane,
          radius: size,
          fillColor: color,
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.85
        });
    }
    
    const svg = `<svg width="${iconSize}" height="${iconSize}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
    
    const icon = L.divIcon({
      html: svg,
      className: 'custom-shape-marker',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2]
    });
    
    return L.marker(latlng, { 
      icon: icon,
      pane: pane
    });
  }

  // Dynamic layer loading based on configuration
  async function loadAllLayersFromConfig() {
    console.log('=== Starting dynamic layer loading ===');
    console.log('Current project:', currentProject);
    layerConfig = await loadLayerConfiguration();
    layerConfig = Array.isArray(layerConfig) ? layerConfig.filter(cfg => !shouldSkipLayerConfig(cfg)) : [];
    const hasConfiguredShortPipe = layerConfig.some(isShortPipeConfigEntry);
    if (!hasConfiguredShortPipe) {
      await ensureShortPipeConfigPresence();
    }
    const finalShortPipeConfigExists = layerConfig.some(isShortPipeConfigEntry);
    console.log('Configuration loaded, will load', layerConfig.length, 'layers');
    invalidateStyleableLayerRegistry();
    
    for (const config of layerConfig) {
      if (!config.enabled) continue;
      
      const layerName = config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
      const metadata = registerLayerMetadata(layerName, config);
      config.layerName = layerName;
      config.elementKey = metadata.elementKey;
      config.geometryClass = metadata.geometryClass;
      const lowerFilename = config.filename.toLowerCase();
      const typeHint = (config.type || '').toLowerCase();
      const isShortPipeType = typeHint === 'shortpipe';
      const isPipelineLayer = isShortPipeType || lowerFilename.includes('pipeline') || lowerFilename.startsWith('pl_') || (lowerFilename.includes('short') && lowerFilename.includes('pipe'));
      const isNodeLayer = metadata.elementKey === 'nodes' || typeHint === 'node' || lowerFilename.includes('node') || lowerFilename.startsWith('n_');
      const resolvedPane = resolveDefaultPaneForConfig(config);
      const targetPane = resolvedPane || (isPipelineLayer ? 'pipelinePane' : (isNodeLayer ? 'nodePane' : null));
      
      if ((config.type || '').toLowerCase() === 'line' || isShortPipeType) {
        if (config.color) {
          registerLineColorUsage(config.color);
        }
        loadLayer(config.filename, layerName, {
          pane: targetPane,
          style: {
            color: config.color,
            weight: config.size,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          },
          tolerance: 40
        }, function(feature, layer) {
          // Store original style for reset
          layer._originalColor = config.color;
          layer._originalWeight = config.size;
          layer._originalOpacity = typeof layer.options?.opacity === 'number' ? layer.options.opacity : 0.8;
          layer._originalDashArray = layer.options?.dashArray || null;
        });
      } else {
        // Point or In-Line
        loadLayer(config.filename, layerName, {
          pane: targetPane,
          pointToLayer: (feature, latlng) => {
            const marker = createShapedMarker(latlng, {
              shape: config.markerType || 'circle',
              size: config.size || 6,
              color: config.color || '#ff7800',
              pane: targetPane || 'overlayPane'
            });
            marker.feature = feature;
            captureOriginalMarkerStyle(marker, 'default');
            return marker;
          },
          onEachFeature: (feature, layer) => {
            // Special handling for nodes - add pipeline connection callback
            if (metadata.elementKey === 'nodes') {
              const originalClick = layer._events?.click?.[0]?.fn;
              layer.on('click', function(e) {
                // Handle add-pipeline mode
                if (currentMode === 'add-pipeline' && window.nodeSelectionCallback) {
                  window.nodeSelectionCallback(this.feature.properties.ID, this.getLatLng());
                  e.stopPropagation();
                } else if (originalClick) {
                  // Call the original click handler from handleFeature
                  originalClick.call(this, e);
                }
              });
            }
          }
        }, null, config.filename === 'NUTS3_Centroids.geojson' ? function() {
          setTimeout(() => {
            loadAdditionalDatasets();
          }, 1000);
        } : null);
      }
      
      // Store layer reference placeholder for later assignment
      dynamicLayers[layerName] = null;
    }
    
    // Update legend after all layers configured
    if (!finalShortPipeConfigExists && !shortPipeLayer) {
      initializeFallbackShortPipeLayer();
    }
    setTimeout(() => {
      updateLegendControl();
      loadPersistedInfrastructurePlans();
      linkInlineElementsToNearbyNodes();
    }, 2000);
  }

  function ensureLayerInstanceForConfig(config) {
    if (!config) return null;
    const layerName = getLayerNameFromConfig(config);
    if (!layerName) return null;
    config.layerName = layerName;
    if (dynamicLayers[layerName]) {
      return dynamicLayers[layerName];
    }

    const geometryType = (config.type || '').toLowerCase();
    const isShortPipeType = geometryType === 'shortpipe';
    const targetPane = resolveDefaultPaneForConfig(config);
    const metadata = registerLayerMetadata(layerName, config);

    const geojsonOptions = {
      pane: targetPane || undefined,
      onEachFeature: (feature, layer) => {
        assignMetadataToLayer(layer, metadata);
        handleFeature(feature, layer);
      }
    };

    if (geometryType === 'line' || isShortPipeType) {
      geojsonOptions.style = {
        color: config.color || '#3388ff',
        weight: config.size || 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      };
    } else {
      geojsonOptions.pointToLayer = (feature, latlng) => {
        const marker = createShapedMarker(latlng, {
          shape: config.markerType || 'circle',
          size: config.size || 6,
          color: config.color || '#ff7800',
          pane: targetPane || 'overlayPane'
        });
        marker.feature = feature;
        captureOriginalMarkerStyle(marker, 'default');
        return marker;
      };
    }

    const layer = L.geoJSON({ type: 'FeatureCollection', features: [] }, geojsonOptions).addTo(map);
    assignMetadataToLayer(layer, metadata);
    rememberLayerInstanceForElementKey(metadata.elementKey, layer);
    dynamicLayers[layerName] = layer;
    invalidateStyleableLayerRegistry();
    return layer;
  }
  
  async function initializeProjectAndLayers() {
    try {
      const resolvedProject = await determineProjectContext();
      if (resolvedProject) {
        currentProject = resolvedProject;
        persistProjectSelection(resolvedProject);
      } else {
        currentProject = DEFAULT_PROJECT;
      }
    } catch (error) {
      console.warn('Falling back to default project due to detection error:', error);
      currentProject = DEFAULT_PROJECT;
    }
    await loadAllLayersFromConfig();
  }

  // Start loading layers after project context is resolved
  initializeProjectAndLayers();

map.on(L.Draw.Event.CREATED, function (e) {
  if (window.pipelineDrawContext) {
    // Der Add-Pipeline-Workflow verarbeitet dieses Event separat
    return;
  }

  const layer = e.layer;

  if (e.layerType === 'polyline') {
    // Pipeline sofort zur Karte hinzufügen!
    layer.options = layer.options || {};
    layer.options.pane = 'pipelinePane';
    drawnItems.addLayer(layer);
    
    // Setze dünnen visuellen Stil
    layer.setStyle({ color: '#0070f3', weight: 3 });
    if (typeof layer.bringToBack === 'function') {
      layer.bringToBack();
    }
    
    // Erstelle unsichtbare dickere Linie für Klickbereich
    const feature = layer.toGeoJSON();
    const clickLayer = L.geoJSON(feature, {
      style: {
        color: 'transparent',
        weight: 12, // Dicker Klickbereich
        opacity: 0,
        fillOpacity: 0,
        stroke: true
      }
    });
    
    // Event-Weiterleitung von Klick-Layer zur sichtbaren Linie
    clickLayer.eachLayer(clickableLayer => {
      ['click', 'mouseover', 'mouseout', 'contextmenu'].forEach(eventType => {
        clickableLayer.on(eventType, function(e) {
          layer.fire(eventType, e);
        });
      });
    });
    
    // Füge Klick-Layer zur Karte hinzu
    clickLayer.addTo(map);
    layer._clickLayer = clickLayer;

    // Pipeline-Kontext verarbeiten
    const ctx = window.pipelineDrawContext || {};
    const latlngs = layer.getLatLngs();
    let startNodeId = ctx.startNodeId;
    let endNodeId = null;
    const nodeLayerTarget = ctx.nodeLayer || getActivePipelineNodeLayer();
    const nodeIdContext = getNodeIdContext(nodeLayerTarget);
    if (!ctx.nodeLayer && nodeLayerTarget) {
      ctx.nodeLayer = nodeLayerTarget;
    }
    
    // Start-Node erstellen falls nicht vorhanden
    if (!ctx.hasStartNode && latlngs.length > 0) {
      const startPos = latlngs[0];
      const newNodeId = formatElementId(
        nodeIdContext.prefix,
        contributorInitials,
        getNextIdNumber(nodeIdContext.typeKey, nodeLayerTarget)
      );
      createNewNode(startPos, newNodeId, { targetLayer: nodeLayerTarget });
      startNodeId = newNodeId;
    }
    
    // End-Node erstellen falls nicht vorhanden
    if (!ctx.hasEndNode && latlngs.length > 0) {
      const endPos = latlngs[latlngs.length - 1];
      const newNodeId = formatElementId(
        nodeIdContext.prefix,
        contributorInitials,
        getNextIdNumber(nodeIdContext.typeKey, nodeLayerTarget)
      );
      createNewNode(endPos, newNodeId, { targetLayer: nodeLayerTarget });
      endNodeId = newNodeId;
    }

    // ID-Vorschlag nach Schema
    const pipelinePrefix = getFacilityPrefix("Pipeline");
    const pipelineId = formatElementId(pipelinePrefix, contributorInitials, getNextIdNumber("Pipeline"));
    const popupDiv = document.createElement('div');
    popupDiv.innerHTML = `
      <label>ID: <input id="pipeline-id" type="text" value="${pipelineId}" style="width:20ch"></label><br>
      <button id="save-pipeline-attr">Save</button>
      <button id="add-attribute-btn" style="margin-left: 10px;">Add Attribute</button>
      <button id="delete-attribute-btn" style="margin-left: 10px; background: #dc3545; color: white;">Delete</button>
      <button id="hide-attribute-btn" style="margin-left: 10px; background: #ffc107; color: black;">Hide</button>
    `;
    layer.bindPopup(popupDiv).openPopup();

    setTimeout(() => {
      document.getElementById('save-pipeline-attr').onclick = function () {
        const id = document.getElementById('pipeline-id').value.trim();

        // Hole die Attribute des ersten vorhandenen Pipeline-Features
        const defaultAttrs = getDefaultPipelineAttributes(window.selectedPipelineLayer || pipelineLayer || drawnItems);

        // Länge der Pipeline berechnen
        const lengthKm = calculatePipelineLength(layer);

        // Setze die Attribute, ID und modified (inkl. Start/End-Nodes und Länge)
        const properties = { ...defaultAttrs, ID: id, modified: true };
        assignPipelineLength(properties, lengthKm);
        if (startNodeId) properties.Start_Node = startNodeId;
        if (endNodeId) properties.End_Node = endNodeId;
        
        const feature = {
          type: "Feature",
          properties: properties,
          geometry: layer.toGeoJSON().geometry
        };
        layer.feature = feature;
        layer.closePopup();
        setPipelineInteraction(layer, 'info');
        
        // Polyline-Drawing-Modus deaktivieren und zurück zum Info Mode
        if (window.polylineDrawer && window.polylineDrawer._enabled) {
          window.polylineDrawer.disable();
        }
        
        // Kontext löschen
        window.pipelineDrawContext = null;
        
        // Zurück zum Info Mode wechseln
        currentMode = 'info';
        activateInfoMode();
        
        // Info Mode Button als aktiv markieren
        const infoBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Info Mode');
        if (infoBtn) {
          setActiveBtn(infoBtn);
        }
      };
    }, 100);
  } else if (e.layerType === 'marker') {
    const latlng = e.layer.getLatLng();
    
    // WICHTIG: NICHT zu drawnItems hinzufügen, sondern direkt zur Map
    // Das verhindert Drawing-Cursor-Probleme
    let circleMarker = L.circleMarker(latlng, {
      radius: 6,
      fillColor: "#ccc",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.85
    }).addTo(map);  // Direkt zur Map statt zu drawnItems
    captureOriginalMarkerStyle(circleMarker, 'default');

    // 1. Popup mit Typ-Auswahl anzeigen
    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
      <label for="point-type-select">Select Point Type:</label><br>
      <select id="point-type-select">
        <option value="">-- Please select --</option>
        <option value="Node">Node</option>
        <option value="Compressor">Compressor</option>
        <option value="LNG">LNG</option>
        <option value="Storage">Storage</option>
        <option value="Powerplant">Powerplant</option>
      </select>
      <br><button id="save-point-type">Continue</button>
    `;
    circleMarker.bindPopup(popupContent).openPopup();

    popupContent.querySelector('#save-point-type').onclick = () => {
      // SOFORT Drawing-Modus deaktivieren und ALLE Drawing-Handler entfernen!
      if (window.markerDrawer) {
        if (window.markerDrawer._enabled) {
          window.markerDrawer.disable();
        }
        // Map Click-Handler vom Drawing entfernen
        map.off('click', window.markerDrawer._onClick, window.markerDrawer);
        console.log('Marker-Drawing-Modus vollständig deaktiviert');
      }
      
      const select = popupContent.querySelector('#point-type-select');
      const selectedType = select.value;
      if (!selectedType) {
        showInfoPopup('Please select a point type.', '⚠️ Missing Type');
        return;
      }

      // 2. ID-Vorschlag nach Typ generieren
      const typePrefix = getFacilityPrefix(selectedType);
      const autoId = formatElementId(typePrefix, contributorInitials, getNextIdNumber(selectedType));

      const finalizePointCreation = (rawId) => {
        const userId = (rawId || '').trim();
        if (!userId) {
          showInfoPopup('Point ID is required.', '⚠️ Missing ID');
          return;
        }

        // 3. Hole Standard-Attribute für diesen Typ
        const defaultAttrs = getDefaultPointAttributes(selectedType);

        // 4. Style je nach Typ setzen
        let style = {};
        switch (selectedType) {
          case 'Node':
            style = { radius: 5, fillColor: "#f03", color: "#900", weight: 1, opacity: 1, fillOpacity: 0.7 };
            break;
          case 'LNG Terminal':
            style = { radius: 6, fillColor: "#099", color: "#099", weight: 1, opacity: 1, fillOpacity: 0.7 };
            break;
          case 'Storage':
            style = { radius: 6, fillColor: "#990", color: "#990", weight: 1, opacity: 1, fillOpacity: 0.7 };
            break;
          case 'Power plant':
            style = { radius: 6, fillColor: "#090", color: "#090", weight: 1, opacity: 1, fillOpacity: 0.7 };
            break;
        }
        circleMarker.setStyle(style);

        // 5. Feature-Daten setzen, jetzt auch mit ID, Typ, Standard-Attributen und modified
        const properties = { ...defaultAttrs, Type: selectedType, ID: userId, modified: true };
        
        // Wenn ein Node ausgewählt wurde, füge die Node-ID hinzu
        if (window.selectedNodeForInfrastructure) {
          properties.Node = window.selectedNodeForInfrastructure;
          console.log('Node-Verbindung hinzugefügt:', window.selectedNodeForInfrastructure);
          // Reset nach Verwendung
          window.selectedNodeForInfrastructure = null;
        }
        
        circleMarker.feature = {
          type: "Feature",
          properties: properties,
          geometry: { type: "Point", coordinates: [latlng.lng, latlng.lat] }
        };

        // Popup mit Info ersetzen
        const infoContent = createPopupContent(circleMarker.feature.properties);
        circleMarker.bindPopup(infoContent);

        circleMarker.closePopup();

        // Aus der Map entfernen (wurde temporär direkt zur Map hinzugefügt)
        map.removeLayer(circleMarker);
        
        // In den richtigen Layer hinzufügen
        switch (selectedType) {
          case 'Node': {
            const targetNodeLayer = getActivePipelineNodeLayer() || resolveNodeLayer({ createIfMissing: true });
            if (targetNodeLayer) {
              circleMarker._parentNodeLayer = targetNodeLayer;
              targetNodeLayer.addLayer(circleMarker);
            }
            break;
          }
          case 'LNG Terminal': if (lngLayer) lngLayer.addLayer(circleMarker); break;
          case 'Storage': if (storageLayer) storageLayer.addLayer(circleMarker); break;
          case 'Power plant': if (powerplantsLayer) powerplantsLayer.addLayer(circleMarker); break;
        }
        
        // WICHTIG: markerDrawer komplett neu erstellen BEVOR Info Mode aktiviert wird
        window.markerDrawer = null;
        window.markerDrawer = new L.Draw.Marker(map, { icon: undefined });
        
        // Zurück zum Info Mode wechseln (Drawing-Modus wurde bereits oben deaktiviert)
        currentMode = 'info';
        activateInfoMode();
        
        // Info Mode Button als aktiv markieren
        const infoBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Info Mode');
        if (infoBtn) {
          setActiveBtn(infoBtn);
        }
        
        // WICHTIG: ALLE Event-Handler vom neuen Element entfernen (auch Drawing-Handler)
        circleMarker.off();
        
        // WICHTIG: Info-Mode Click-Handler für das neue Element setzen
        circleMarker.on('click', function(e) {
          if (e) L.DomEvent.stopPropagation(e);
          const elementType = selectedType || 'Element';
          highlightElement(circleMarker);
          const content = createModalPopupContent(circleMarker.feature.properties, circleMarker);
          const title = `${elementType}: ${circleMarker.feature.properties.ID || circleMarker.feature.properties.Name || 'Unnamed'}`;
          showElementModal(title, content, circleMarker);
          setTimeout(() => rebindModalAttributeControls(circleMarker), 100);
        });
      };

      showInputPrompt({
        title: '🆔 New Point ID',
        message: `Enter a new ID for the ${selectedType} element:`,
        defaultValue: autoId,
        placeholder: autoId,
        confirmText: 'Create',
        cancelText: 'Cancel',
        onConfirm: finalizePointCreation,
        onCancel: () => {
          map.removeLayer(circleMarker);
          currentMode = 'info';
          activateInfoMode();
        }
      });
    };
  }
});

// Beim Bearbeiten das modified-Flag setzen
map.on('draw:edited', function (e) {
  e.layers.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties) {
      layer.feature.properties.modified = true;
    }
  });
});

// Export und Screenshot Buttons werden jetzt über Main Menu gesteuert (siehe HTML)
// Alte Button-Erstellung entfernt
// Export und Screenshot werden jetzt über das Main Menu gesteuert

// Function to export changes (original functionality)
  function createAttributeForm(properties, layer) {
  // Diese Attribute sollen NICHT angezeigt werden (statisch versteckt):
  const staticHiddenAttributes = ['Parent', 'overlap_percentage', 'overlap_length', 'Owner', 'modified'];
  
  // Dynamisch versteckte Attribute basierend auf Benutzereinstellungen
  const elementType = layer ? determineElementType(layer) : null;
  if (elementType) {
    ensureHiddenAttributeBucket(elementType);
  }
  const dynamicHiddenAttributes = elementType ? (hiddenAttributesConfig[elementType] || []) : [];
  // Kombiniere beide Listen
  const allHiddenAttributes = [...staticHiddenAttributes, ...dynamicHiddenAttributes];
  
  let html = '<table>';
  let visibleCount = 0;
  let hiddenCount = 0;
  
  for (const key in properties) {
    if (allHiddenAttributes.includes(key)) {
      hiddenCount++;
      console.log('Hiding attribute:', key);
      continue;
    }
    visibleCount++;
    html += `<tr>
      <td>${key}</td>
      <td><input type="text" data-key="${key}" value="${properties[key] || ''}" style="width:20ch" /></td>
    </tr>`;
  }
  
  console.log(`createAttributeForm - Visible: ${visibleCount}, Hidden: ${hiddenCount}`);
  html += '</table>';
  html += `<div style="margin-top: 10px;">
    <button id="popup-save-btn">Save</button>
    <button id="popup-add-attribute-btn" style="margin-left: 10px;">Add Attribute</button>
    <button id="popup-delete-attribute-btn" style="margin-left: 10px; background: #dc3545; color: white;">Delete</button>
  </div>`;
  return html;
}

// Globale Variable für aktive Pipeline
let activePipeline = null;
let activeElement = null;

// Funktion zum Highlighten eines Elements (rote Umrandung)
function captureOriginalMarkerStyle(layer, mode = 'default') {
  if (!layer) return;
  if (layer instanceof L.LayerGroup) {
    layer.eachLayer(subLayer => captureOriginalMarkerStyle(subLayer, mode));
    return;
  }
  
  // Handle CircleMarker
  if (layer instanceof L.CircleMarker) {
    const styleSnapshot = {
      color: layer.options.color,
      weight: layer.options.weight,
      fillColor: layer.options.fillColor,
      fillOpacity: layer.options.fillOpacity,
      radius: layer.options.radius
    };
    if (mode === 'highlight') {
      if (!layer._highlightBackupStyle) {
        layer._highlightBackupStyle = styleSnapshot;
      }
    } else {
      layer._defaultMarkerStyle = styleSnapshot;
    }
  }
  
  // Handle DivIcon Marker (for custom shapes)
  if (layer instanceof L.Marker && layer.options.icon instanceof L.DivIcon) {
    const icon = layer.options.icon;
    const styleSnapshot = {
      html: icon.options.html,
      iconSize: icon.options.iconSize,
      iconAnchor: icon.options.iconAnchor,
      className: icon.options.className
    };
    if (mode === 'highlight') {
      if (!layer._highlightBackupStyle) {
        layer._highlightBackupStyle = styleSnapshot;
      }
    } else {
      layer._defaultMarkerStyle = styleSnapshot;
    }
  }
}

if (L && L.CircleMarker && L.CircleMarker.addInitHook) {
  L.CircleMarker.addInitHook(function() {
    captureOriginalMarkerStyle(this, 'default');
  });
}

function highlightElement(layer) {
  console.log('highlightElement aufgerufen für Layer:', layer);
  
  // Entferne vorheriges Element-Highlight
  if (activeElement && activeElement !== layer) {
    resetElementStyle(activeElement);
  }
  
  // Entferne vorheriges Pipeline-Highlight
  resetAllPipelineHighlights();
  
  // Setze neues aktives Element
  activeElement = layer;
  
  // Store current layer for Add Attribute functionality
  currentPopupLayer = layer;
  
  // Highlighte das Element je nach Typ
  if (layer instanceof L.LayerGroup) {
    // Für Layer-Gruppen (Nodes mit erweitertem Klickbereich)
    layer.eachLayer(subLayer => {
      if (subLayer instanceof L.CircleMarker && subLayer.options.fillOpacity > 0) {
        // Nur den sichtbaren Marker highlighten
        captureOriginalMarkerStyle(subLayer, 'highlight');
        subLayer.setStyle({
          color: "#ff0000",
          weight: 3,
          fillColor: subLayer.options.fillColor,
          fillOpacity: subLayer.options.fillOpacity
        });
      }
    });
  } else if (layer instanceof L.CircleMarker) {
    // Für CircleMarkers (Nodes, etc.)
    captureOriginalMarkerStyle(layer, 'highlight');
    layer.setStyle({
      color: "#ff0000",
      weight: 3,
      fillColor: layer.options.fillColor, // Behalte die ursprüngliche Füllfarbe
      fillOpacity: layer.options.fillOpacity
    });
  } else if (layer instanceof L.Marker) {
    // Für normale Marker
    if (layer._icon) {
      layer._icon.style.filter = "sepia(1) saturate(5) hue-rotate(320deg)";
      layer._icon.style.border = "2px solid #ff0000";
      layer._icon.style.borderRadius = "50%";
    }
  }
  
  console.log('Element hervorgehoben:', layer);
}

// Funktion zum Zurücksetzen des Element-Stils
function resetElementStyle(layer) {
  console.log('resetElementStyle aufgerufen für Layer:', layer);
  
  if (layer instanceof L.LayerGroup) {
    // Für Layer-Gruppen (Nodes mit erweitertem Klickbereich)
    layer.eachLayer(subLayer => {
      if (subLayer instanceof L.CircleMarker && subLayer.options.fillOpacity > 0) {
        const baseStyle = subLayer._highlightBackupStyle || subLayer._defaultMarkerStyle;
        if (baseStyle) {
          subLayer.setStyle({
            color: baseStyle.color,
            weight: baseStyle.weight,
            fillColor: baseStyle.fillColor,
            fillOpacity: baseStyle.fillOpacity
          });
          if (typeof subLayer.setRadius === 'function' && baseStyle.radius !== undefined) {
            subLayer.setRadius(baseStyle.radius);
          }
          subLayer._highlightBackupStyle = null;
        }
      }
    });
  } else if (layer instanceof L.CircleMarker) {
    const baseStyle = layer._highlightBackupStyle || layer._defaultMarkerStyle;
    if (baseStyle) {
      layer.setStyle({
        color: baseStyle.color,
        weight: baseStyle.weight,
        fillColor: baseStyle.fillColor,
        fillOpacity: baseStyle.fillOpacity
      });
      if (typeof layer.setRadius === 'function' && baseStyle.radius !== undefined) {
        layer.setRadius(baseStyle.radius);
      }
      layer._highlightBackupStyle = null;
    }
  } else if (layer instanceof L.Marker) {
    // Für normale Marker
    if (layer._icon) {
      layer._icon.style.filter = "";
      layer._icon.style.border = "";
      layer._icon.style.borderRadius = "";
      layer._icon.style.outline = "";
    }
  }
}

// Funktion zum Highlighten einer Pipeline (rot und dick)
function highlightPipeline(layer) {
  // highlightPipeline aufgerufen
  // Layer type check
  // Layer options logging
  // Layer feature logging
  
  // Entferne vorheriges Highlight
  if (activePipeline && activePipeline !== layer) {
    console.log('Resette vorherige Pipeline:', activePipeline);
    resetPipelineStyle(activePipeline);
  }
  
  // Entferne vorheriges Element-Highlight
  resetAllElementHighlights();
  
  // Setze neue aktive Pipeline
  activePipeline = layer;
  
  // Highlighte die Pipeline (rot und dicker)
  if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === "LineString") {
    // Setze Highlight-Stil für Pipeline
    
    // NEUER ANSATZ: Highlighte den Click-Layer wenn er existiert, sonst den Main Layer
    let layerToHighlight = layer;
    
    // Wenn dieser Layer einen Click-Layer hat, verwende den Click-Layer für Highlighting
    if (layer._clickLayer) {
      console.log('Layer hat Click-Layer, highlighte NUR Click-Layer');
      layerToHighlight = layer._clickLayer.getLayers()[0]; // Erster Layer im ClickLayer
      
      // Mache den Click-Layer sichtbar und rot
      layerToHighlight.setStyle({
        color: "#ff0000",
        weight: 6,
        opacity: 1,
        fillOpacity: 0
      });
      
      // Erzwinge DOM-Update für clickLayer
      if (layerToHighlight._path) {
        layerToHighlight._path.style.stroke = "#ff0000";
        layerToHighlight._path.style.strokeWidth = "6px";
        layerToHighlight._path.style.opacity = "1";
        layerToHighlight._path.style.strokeDasharray = "";
      }
      // WICHTIG: Highlighte NICHT den Main Layer!
    } else {
      // Layer hat keinen Click-Layer, highlighte Main Layer
      // Standard-Highlighting für Layer ohne Click-Layer (drawn items)
      layerToHighlight.setStyle({ 
        color: "#ff0000", 
        weight: 6, 
        opacity: 1,
        dashArray: null 
      });
      
      // Erzwinge DOM-Update für main layer
      if (layerToHighlight._path) {
        layerToHighlight._path.style.stroke = "#ff0000";
        layerToHighlight._path.style.strokeWidth = "6px";
        layerToHighlight._path.style.opacity = "1";
        layerToHighlight._path.style.strokeDasharray = "";
      }
    }
    
  } else {
    console.log('Layer ist keine LineString Pipeline:', layer.feature);
  }
}

// Funktion zum Zurücksetzen des Pipeline-Stils
function resetPipelineStyle(layer) {
  // resetPipelineStyle aufgerufen
  
  if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === "LineString") {
    // Setze normalen Stil für Pipeline zurück
    
    // Wenn der Layer einen Click-Layer hat, verstecke den Click-Layer wieder
    if (layer._clickLayer) {
      console.log('Layer hat Click-Layer, verstecke NUR Click-Layer');
      const clickLayerToReset = layer._clickLayer.getLayers()[0];
      
      // Mache den Click-Layer wieder unsichtbar
      clickLayerToReset.setStyle({
        color: 'transparent',
        weight: 12,
        opacity: 0,
        fillOpacity: 0
      });
      
      // DOM-Update für Click-Layer
      if (clickLayerToReset._path) {
        clickLayerToReset._path.style.stroke = "transparent";
        clickLayerToReset._path.style.strokeWidth = "12px";
        clickLayerToReset._path.style.opacity = "0";
      }
      
      // WICHTIG: Main Layer wird NICHT zurückgesetzt, weil er nie gehighlighted wurde!
      // Der Main Layer behält seinen ursprünglichen Stil
      
    } else {
      // Layer hat keinen Click-Layer, setze normalen Main Layer Style
      // Standard-Reset für Layer ohne Click-Layer (drawn items)
      
      // Check if this is a Short-Pipe (in shortPipeLayer)
      let isShortPipe = false;
      if (shortPipeLayer && shortPipeLayer.hasLayer(layer)) {
        isShortPipe = true;
      }
      
      // Get original color from stored values or fallback
      let pipelineColor = "#0070f3"; // fallback
      let pipelineWeight = 3; // fallback
      let pipelineOpacity = 0.8;
      let pipelineDash = null;
      
      if (isShortPipe) {
        pipelineColor = "#ff8800";
        pipelineWeight = 4;
        pipelineOpacity = 0.8;
        pipelineDash = null;
      } else {
        // Use the stored original style (set during loading)
        if (layer._originalColor) {
          pipelineColor = layer._originalColor;
        }
        else if (layer.options && layer.options.color) {
          pipelineColor = layer.options.color;
        }
        if (layer._originalWeight) {
          pipelineWeight = layer._originalWeight;
        }
        else if (layer.options && layer.options.weight) {
          pipelineWeight = layer.options.weight;
        }
        if (layer._originalOpacity !== undefined) {
          pipelineOpacity = layer._originalOpacity;
        }
        else if (layer.options && typeof layer.options.opacity === 'number') {
          pipelineOpacity = layer.options.opacity;
        }
        if (layer._originalDashArray !== undefined) {
          pipelineDash = layer._originalDashArray;
        }
        else if (layer.options && layer.options.dashArray !== undefined) {
          pipelineDash = layer.options.dashArray;
        }
      }
      
      layer.setStyle({ 
        color: pipelineColor, 
        weight: pipelineWeight, 
        opacity: pipelineOpacity,
        dashArray: pipelineDash 
      });
      
      // Erzwinge Redraw
      if (layer._path) {
        layer._path.style.stroke = pipelineColor;
        layer._path.style.strokeWidth = pipelineWeight + "px";
        layer._path.style.opacity = pipelineOpacity;
        layer._path.style.strokeDasharray = pipelineDash ? pipelineDash : '';
      }
    }
  }
}

// Funktion zum Zurücksetzen aller Pipeline-Highlights
function resetAllPipelineHighlights() {
  if (activePipeline) {
    resetPipelineStyle(activePipeline);
    activePipeline = null;
  }
  
  // Setze auch grün markierte Pipelines vom Node-Edit zurück
  if (window.selectedNodeConnectedPipelines) {
    window.selectedNodeConnectedPipelines.forEach(layer => {
      resetPipelineStyle(layer);
    });
    window.selectedNodeConnectedPipelines = [];
  }
}

// Funktion zum Zurücksetzen aller Element-Highlights
function resetAllElementHighlights() {
  if (activeElement) {
    resetElementStyle(activeElement);
    activeElement = null;
  }
}

/**
 * Open the attribute info overlay for a pipeline feature.
 *
 * Highlights the clicked pipeline layer, stores it as the active popup
 * layer for attribute editing, generates the attribute form via
 * {@link createAttributeForm}, and binds Save, Add Attribute, and Delete
 * action handlers. The overlay remains visible until the user dismisses
 * it or selects another element.
 *
 * @param {L.Path} layer - The Leaflet polyline layer whose attributes
 *   should be displayed.
 * @returns {void}
 */
function openInfoOverlay(layer) {
  // Highlighte die angeklickte Pipeline
  highlightPipeline(layer);
  
  // Store current layer for Add Attribute functionality
  currentPopupLayer = layer;
  
  const popup = document.getElementById('info-popup');
  // Always regenerate content to reflect current visibility settings
  popup.innerHTML = createAttributeForm(layer.feature.properties, layer);
  popup.style.display = 'block';
  bindInfoOverlayActions(layer);
}

function bindInfoOverlayActions(layer) {
  const popup = document.getElementById('info-popup');
  if (!popup) return;

  const saveBtn = popup.querySelector('#popup-save-btn');
  if (saveBtn) {
    saveBtn.onclick = function () {
      const inputs = popup.querySelectorAll('input[data-key]');
      let hasTechnicalAttributeChange = false;

      inputs.forEach(input => {
        const key = input.getAttribute('data-key');
        const oldValue = layer.feature.properties[key];
        const newValue = input.value;

        if ((key === 'Diameter_mm' || key === 'Name' || key === 'Pressure_bar') &&
            newValue && newValue.trim() !== '') {
          const oldValueTrimmed = (oldValue || '').toString().trim();
          const newValueTrimmed = newValue.trim();

          if (newValueTrimmed !== oldValueTrimmed) {
            hasTechnicalAttributeChange = true;
          }
        }

        layer.feature.properties[key] = newValue;
      });

      const protectedSources = ['OpenStreetMap', 'Global Energy Monitor', 'Manual research'];
      const currentSource = layer.feature.properties.Source;

      if (hasTechnicalAttributeChange && (!currentSource || !protectedSources.includes(currentSource))) {
        layer.feature.properties.Source = 'Contributor';
      }

      layer.feature.properties.modified = true;
      popup.style.display = 'none';

      resetPipelineStyle(layer);
      activePipeline = null;
    };
  }

  const addAttrBtn = popup.querySelector('#popup-add-attribute-btn');
  if (addAttrBtn) {
    addAttrBtn.onclick = function () {
      showAddAttributeDialog(layer);
    };
  }

  const deleteAttrBtn = popup.querySelector('#popup-delete-attribute-btn');
  if (deleteAttrBtn) {
    deleteAttrBtn.onclick = function () {
      showDeleteAttributeDialog(layer);
    };
  }
}

function refreshInfoOverlayContent(layer) {
  const popup = document.getElementById('info-popup');
  if (!popup) return;
  if (currentPopupLayer !== layer) return;
  popup.innerHTML = createAttributeForm(layer.feature.properties, layer);
  popup.style.display = 'block';
  bindInfoOverlayActions(layer);
}

function refreshLayerPopupIfOpen(layer) {
  if (!layer || typeof layer.isPopupOpen !== 'function') return;
  if (!layer.isPopupOpen()) return;
  openAttributePopup(layer);
}

function refreshElementModal(layer) {
  const modal = document.getElementById('element-modal');
  if (!modal || modal.style.display === 'none') return;
  if (currentLayer !== layer) return;
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;
  const content = createModalPopupContent(layer.feature.properties, layer);
  modalBody.innerHTML = content;
  rebindModalAttributeControls(layer);
}

function rebindModalAttributeControls(layer) {
  const modal = document.getElementById('element-modal');
  if (!modal || modal.style.display === 'none') return;

  const saveBtn = document.getElementById('save-attr-btn');
  if (saveBtn) {
    saveBtn.onclick = function () {
      try {
        const inputs = document.querySelectorAll('#modal-body input[data-key]');
        let changed = false;
        let technicalAttributeChanged = false;
        const isShortPipe = shortPipeLayer && shortPipeLayer.hasLayer && shortPipeLayer.hasLayer(layer);

        inputs.forEach(input => {
          const key = input.getAttribute('data-key');
          const newValue = input.value;
          const oldValue = layer.feature?.properties ? layer.feature.properties[key] : undefined;
          if (oldValue !== newValue) {
            changed = true;
            const isLine = layer.feature?.geometry?.type === 'LineString';
            if (isLine && (key === 'Diameter_mm' || key === 'Name' || key === 'Pressure_bar')) {
              technicalAttributeChanged = true;
            }
            if (layer.feature && layer.feature.properties) {
              layer.feature.properties[key] = newValue;
            }
          }
        });

        if (technicalAttributeChanged && layer.feature && layer.feature.properties) {
          const protectedSources = ['OpenStreetMap', 'Global Energy Monitor', 'Manual research'];
          const currentSource = layer.feature.properties.Source;
          if (!protectedSources.includes(currentSource)) {
            layer.feature.properties.Source = 'Contributor';
          }
        }

        if (changed && layer.feature && layer.feature.properties) {
          layer.feature.properties.modified = true;
          window.hasUnsavedChanges = true;
        }

        closeElementModal();

        if (isShortPipe) {
          try {
            layer.setStyle({ color: '#ff8800', weight: 4, dashArray: null, opacity: 0.8 });
          } catch (styleError) {
            console.warn('Could not reset short-pipe style:', styleError);
          }
        }
      } catch (error) {
        console.error('Error saving attributes from modal:', error);
      }
    };
  }

  const timeseriesBtn = document.getElementById('show-timeseries-btn');
  if (timeseriesBtn && typeof showTimeSeriesChart === 'function') {
    timeseriesBtn.onclick = function () {
      try {
        showTimeSeriesChart(layer.feature?.properties || {});
      } catch (error) {
        console.error('Error opening time series chart:', error);
      }
    };
  }
}

function showAddAttributeDialog(layer) {
  createAttributeManagementDialog(layer);
}

function showDeleteAttributeDialog(layer) {
  createDeleteAttributeDialog(layer);
}

function createDeleteAttributeDialog(layer) {
  const elementType = determineElementType(layer);
  const layerScopeLabel = (typeof getLayerDisplayNameForFeature === 'function' ? getLayerDisplayNameForFeature(layer) : null) || elementType || 'Unknown';

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'delete-attribute-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 25px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  
  dialog.innerHTML = `
    <h3 style="margin-top: 0; color: #333; text-align: center;">Delete Attributes</h3>
    <p style="color: #666; text-align: center; margin-bottom: 20px;">Delete attributes from: <strong>${layerScopeLabel}</strong></p>
    
    <div style="margin-bottom: 25px;">
      <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Click the red X next to any attribute to delete it from ${layerScopeLabel}:</p>
      <div id="delete-attribute-list" style="max-height: 400px; overflow-y: auto;">
        ${generateAttributeList(layer)}
      </div>
    </div>
    
    <div style="text-align: center;">
      <button id="close-delete-dialog" style="
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      ">Close</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Add event listeners
  setupDeleteAttributeDialogEvents(overlay, layer, elementType);
}

function setupDeleteAttributeDialogEvents(overlay, layer, elementType) {
  // Close dialog
  document.getElementById('close-delete-dialog').onclick = function() {
    document.body.removeChild(overlay);
  };
  
  // Close on overlay click
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };
  
  const targetLayerGroup = findOwningLayerGroup(layer);
  const scopeLabelRaw = getLayerDisplayNameForFeature(layer) || targetLayerGroup?._qgasMeta?.legendName || elementType;
  const scopeLabel = scopeLabelRaw || 'the current selection';

  // Delete attribute buttons (using event delegation)
  document.getElementById('delete-attribute-list').onclick = function(e) {
    if (e.target.classList.contains('delete-attr-btn')) {
      const attributeName = e.target.getAttribute('data-attr');
      
      showCustomPopup(
        '⚠️ Delete Attribute',
        `<p style="text-align: center; margin: 15px 0;">Are you sure you want to delete the attribute "${attributeName}" from ${scopeLabel}?</p>`,
        [
          {
            text: 'Delete',
            type: 'primary',
            keepOpen: false,
            onClick: () => {
              const deletedCount = deleteAttributeFromAllElements(elementType, attributeName, targetLayerGroup);
              if (!deletedCount) {
                showCustomPopup(
                  'ℹ️ No Changes',
                  `<p style="text-align: center; margin: 15px 0;">No elements in ${scopeLabel} contained the attribute "${attributeName}".</p>`,
                  [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => {} }]
                );
                return;
              }
              
              // Update the attribute list
              document.getElementById('delete-attribute-list').innerHTML = generateAttributeList(layer);
              
              showCustomPopup(
                '✅ Success',
                `<p style="text-align: center; margin: 15px 0;">Attribute "${attributeName}" deleted from ${deletedCount} element${deletedCount === 1 ? '' : 's'} in ${scopeLabel}.</p>`,
                [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
              );

              refreshInfoOverlayContent(layer);
              refreshLayerPopupIfOpen(layer);
              refreshElementModal(layer);
            }
          },
          {text: 'Cancel', type: 'secondary', keepOpen: false, onClick: () => {}}
        ]
      );
    }
  };
}

function showHideAttributeDialog(layer) {
  createHideAttributeDialog(layer);
}

function createHideAttributeDialog(layer) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'hide-attribute-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 25px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  const elementType = determineElementType(layer);
  
  dialog.innerHTML = `
    <h3 style="margin-top: 0; color: #333; text-align: center;">Hide/Show Attributes</h3>
    <p style="color: #666; text-align: center; margin-bottom: 20px;">Manage visibility for: <strong>${elementType || 'Unknown'}</strong></p>
    
    <div style="margin-bottom: 25px;">
      <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Click the eye icon to toggle attribute visibility in popups:</p>
      <div id="hide-attribute-list" style="max-height: 400px; overflow-y: auto;">
        ${generateHideAttributeList(layer)}
      </div>
    </div>
    
    <div style="text-align: center;">
      <button id="save-hide-dialog" style="
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      ">Save</button>
      <button id="cancel-hide-dialog" style="
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        margin-left: 10px;
      ">Cancel</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Add event listeners
  setupHideAttributeDialogEvents(overlay, layer, elementType);
}

function generateHideAttributeList(layer) {
  const properties = layer.feature.properties;
  const elementType = determineElementType(layer);
  const protectedAttributes = ['id', 'geometry']; // Attributes that cannot be hidden
  ensureHiddenAttributeBucket(elementType);
  const hiddenAttrs = hiddenAttributesConfig[elementType] || [];
  
  let html = '';
  Object.keys(properties).forEach(key => {
    if (!protectedAttributes.includes(key)) {
      const isHidden = hiddenAttrs.includes(key);
      const eyeIcon = isHidden ? '🙈' : '👁️'; // Hidden eye vs open eye
      const statusText = isHidden ? 'Hidden' : 'Visible';
      const statusColor = isHidden ? '#dc3545' : '#28a745';
      
      html += `
        <div style="display: flex; align-items: center; padding: 12px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px; background: white;">
          <button class="toggle-visibility-btn" data-attr="${key}" style="
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            margin-right: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: ${isHidden ? '#fff2f2' : '#f2fff2'};
          ">${eyeIcon}</button>
          <span style="flex-grow: 1; font-weight: 500;">${key}</span>
          <span style="color: ${statusColor}; font-size: 12px; font-weight: bold;">${statusText}</span>
        </div>
      `;
    }
  });
  
  if (html === '') {
    html = '<p style="color: #666; text-align: center; padding: 20px;">No attributes available to hide.</p>';
  }
  
  return html;
}

function setupHideAttributeDialogEvents(overlay, layer, elementType) {
  ensureHiddenAttributeBucket(elementType);
  // Store original state for cancel functionality
  const originalHiddenAttributes = [...(hiddenAttributesConfig[elementType] || [])];
  
  // Save dialog
  document.getElementById('save-hide-dialog').onclick = function() {
    // Changes are already saved in hiddenAttributesConfig during toggle
    showTemporaryNotification(`Visibility settings saved for ${elementType}!`);
    document.body.removeChild(overlay);
  };
  
  // Cancel dialog - restore original state
  document.getElementById('cancel-hide-dialog').onclick = function() {
    hiddenAttributesConfig[elementType] = originalHiddenAttributes;
    console.log(`Canceled changes for ${elementType}, restored to:`, originalHiddenAttributes);
    document.body.removeChild(overlay);
  };
  
  // Close on overlay click (same as cancel)
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      hiddenAttributesConfig[elementType] = originalHiddenAttributes;
      document.body.removeChild(overlay);
    }
  };
  
  // Toggle visibility buttons (using event delegation)
  document.getElementById('hide-attribute-list').onclick = function(e) {
    if (e.target.classList.contains('toggle-visibility-btn')) {
      const attributeName = e.target.getAttribute('data-attr');
      
      toggleAttributeVisibility(elementType, attributeName);
      
      // Update the attribute list to reflect the change
      document.getElementById('hide-attribute-list').innerHTML = generateHideAttributeList(layer);
      
      refreshInfoOverlayContent(layer);
      refreshLayerPopupIfOpen(layer);
      refreshElementModal(layer);

      // Show confirmation message
      const isNowHidden = (hiddenAttributesConfig[elementType] || []).includes(attributeName);
      const action = isNowHidden ? 'hidden' : 'visible';
      
      // Create a temporary notification
      showTemporaryNotification(`Attribute "${attributeName}" is now ${action} in popups.`);
    }
  };
}

function toggleAttributeVisibility(elementType, attributeName) {
  ensureHiddenAttributeBucket(elementType);
  
  const hiddenAttrs = hiddenAttributesConfig[elementType];
  const index = hiddenAttrs.indexOf(attributeName);
  
  if (index === -1) {
    // Attribute is not hidden, hide it
    hiddenAttrs.push(attributeName);
  } else {
    // Attribute is hidden, show it
    hiddenAttrs.splice(index, 1);
  }
  
  console.log(`Toggled visibility for ${attributeName} in ${elementType}:`, hiddenAttrs);
  
  // Refresh current popup if it's open
  if (currentPopupLayer) {
    console.log('Refreshing current popup after attribute visibility change');
    refreshLayerPopupIfOpen(currentPopupLayer);
    refreshInfoOverlayContent(currentPopupLayer);
    refreshElementModal(currentPopupLayer);
  }
}

function showTemporaryNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 12px 20px;
    border-radius: 5px;
    z-index: 11000;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    font-weight: bold;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 3000);
}

function createAttributeManagementDialog(layer) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'attribute-management-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 25px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  const elementType = determineElementType(layer);
  
  dialog.innerHTML = `
    <h3 style="margin-top: 0; color: #333; text-align: center;">Attribute Management</h3>
    <p style="color: #666; text-align: center; margin-bottom: 20px;">Managing attributes for: <strong>${elementType || 'Unknown'}</strong></p>
    
    <div style="margin-bottom: 25px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h4 style="margin-top: 0; color: #333;">Add New Attribute</h4>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Attribute Name:</label>
        <input type="text" id="new-attr-name" placeholder="Enter attribute name" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Default Value:</label>
        <input type="text" id="new-attr-value" placeholder="Enter default value (or leave empty)" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
      </div>
      <button id="add-attr-confirm" style="
        background: #28a745;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      ">Add Attribute</button>
    </div>
    
    <div style="margin-bottom: 25px;">
      <h4 style="color: #333; margin-bottom: 15px;">Delete Attributes</h4>
      <button id="toggle-delete-mode" style="
        background: #dc3545;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        margin-bottom: 15px;
      ">Show Delete Options</button>
      <div id="delete-options" style="display: none;">
        <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Click the red X next to any attribute to delete it from all ${elementType || 'elements'}:</p>
        <div id="attribute-list" style="max-height: 200px; overflow-y: auto;">
          ${generateAttributeList(layer)}
        </div>
      </div>
    </div>
    
    <div style="text-align: center;">
      <button id="close-attr-dialog" style="
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
      ">Close</button>
    </div>
  `;
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Add event listeners
  setupAttributeDialogEvents(overlay, layer, elementType);
}

function generateAttributeList(layer) {
  const properties = layer.feature.properties;
  const elementType = determineElementType(layer);
  
  // Base protected attributes for all element types
  let protectedAttributes = ['id', 'geometry', 'Source'];
  
  // Add element-type specific protected attributes
  if (elementType === 'pipelines') {
    protectedAttributes = protectedAttributes.concat(['Length_km', 'Diameter_mm', 'Pressure_bar']);
  }
  
  let html = '';
  Object.keys(properties).forEach(key => {
    if (!protectedAttributes.includes(key)) {
      html += `
        <div style="display: flex; align-items: center; padding: 8px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px; background: white;">
          <button class="delete-attr-btn" data-attr="${key}" style="
            background: #dc3545;
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            margin-right: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
          ">×</button>
          <span style="flex-grow: 1; font-weight: 500;">${key}</span>
          <span style="color: #666; font-size: 12px;">(${typeof properties[key]})</span>
        </div>
      `;
    }
  });
  
  if (html === '') {
    html = '<p style="color: #666; text-align: center; padding: 20px;">No deletable attributes found.</p>';
  }
  
  return html;
}

function setupAttributeDialogEvents(overlay, layer, elementType) {
  // Close dialog
  document.getElementById('close-attr-dialog').onclick = function() {
    document.body.removeChild(overlay);
  };
  
  // Close on overlay click
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };
  
  const targetLayerGroup = findOwningLayerGroup(layer);
  const scopeLabelRaw = getLayerDisplayNameForFeature(layer) || targetLayerGroup?._qgasMeta?.legendName || elementType;
  const scopeLabel = scopeLabelRaw || 'the current selection';

  // Add attribute
  document.getElementById('add-attr-confirm').onclick = function() {
    const nameInput = document.getElementById('new-attr-name');
    const valueInput = document.getElementById('new-attr-value');
    
    const attributeName = nameInput.value.trim();
    if (!attributeName) {
      showInfoPopup('Please enter an attribute name.', '⚙️ Attributes');
      return;
    }
    
    // Check if attribute already exists
    if (layer.feature.properties.hasOwnProperty(attributeName)) {
      showErrorPopup('This attribute already exists!', '⚙️ Attributes');
      return;
    }
    
    const defaultValue = valueInput.value.trim() || '';
    
    // Add attribute to all elements
    const updatedCount = addAttributeToAllElements(elementType, attributeName, defaultValue, targetLayerGroup);
    if (!updatedCount) {
      showInfoPopup(`No elements in ${scopeLabel} were updated. Please ensure the layer is loaded and visible.`, '⚙️ Attributes');
      return;
    }
    
    // Update the attribute list
    document.getElementById('attribute-list').innerHTML = generateAttributeList(layer);
    
    // Clear inputs
    nameInput.value = '';
    valueInput.value = '';
    
    showInfoPopup(`Attribute "${attributeName}" added to ${updatedCount} element${updatedCount === 1 ? '' : 's'} in ${scopeLabel} with default value: "${defaultValue}"`, '⚙️ Attributes');

    refreshInfoOverlayContent(layer);
    refreshLayerPopupIfOpen(layer);
    refreshElementModal(layer);
  };
  
  // Toggle delete mode
  document.getElementById('toggle-delete-mode').onclick = function() {
    const deleteOptions = document.getElementById('delete-options');
    const button = this;
    
    if (deleteOptions.style.display === 'none') {
      deleteOptions.style.display = 'block';
      button.textContent = 'Hide Delete Options';
      button.style.background = '#6c757d';
    } else {
      deleteOptions.style.display = 'none';
      button.textContent = 'Show Delete Options';
      button.style.background = '#dc3545';
    }
  };
  
  // Delete attribute buttons (using event delegation)
  document.getElementById('attribute-list').onclick = function(e) {
    if (e.target.classList.contains('delete-attr-btn')) {
      const attributeName = e.target.getAttribute('data-attr');
      
      showCustomPopup(
        '⚠️ Delete Attribute',
        `<p style="text-align: center; margin: 15px 0;">Are you sure you want to delete the attribute "${attributeName}" from ${scopeLabel}?</p>`,
        [
          {
            text: 'Delete',
            type: 'primary',
            keepOpen: false,
            onClick: () => {
              const deletedCount = deleteAttributeFromAllElements(elementType, attributeName, targetLayerGroup);
              if (!deletedCount) {
                showCustomPopup(
                  'ℹ️ No Changes',
                  `<p style="text-align: center; margin: 15px 0;">No elements in ${scopeLabel} contained the attribute "${attributeName}".</p>`,
                  [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
                );
                return;
              }
              
              // Update the attribute list
              document.getElementById('attribute-list').innerHTML = generateAttributeList(layer);
              
              showCustomPopup(
                '✅ Success',
                `<p style="text-align: center; margin: 15px 0;">Attribute "${attributeName}" deleted from ${deletedCount} element${deletedCount === 1 ? '' : 's'} in ${scopeLabel}.</p>`,
                [{text: 'OK', type: 'primary', keepOpen: false, onClick: () => {}}]
              );

              refreshInfoOverlayContent(layer);
              refreshLayerPopupIfOpen(layer);
              refreshElementModal(layer);
            }
          },
          {text: 'Cancel', type: 'secondary', keepOpen: false, onClick: () => {}}
        ]
      );
    }
  };
}

function determineElementType(layer) {
  const metadata = resolveLayerMetadata(layer);
  if (metadata && metadata.elementKey) {
    return metadata.elementKey;
  }

  const legacyType = resolveLegacyElementType(layer);
  if (legacyType) {
    return legacyType;
  }

  if (layer && layer.feature && layer.feature.properties && layer.feature.properties.__elementKey) {
    return layer.feature.properties.__elementKey;
  }

  return getElementTypeFromProperties(layer);
}

function resolveLayerMetadata(layer) {
  if (!layer) return null;
  if (layer._qgasMeta) return layer._qgasMeta;
  const parentMeta = getLayerMetadataFromParents(layer);
  if (parentMeta) return parentMeta;
  if (layer.feature && layer.feature.properties && layer.feature.properties.__elementKey) {
    return getMetadataForElementKey(layer.feature.properties.__elementKey) || { elementKey: layer.feature.properties.__elementKey };
  }
  return null;
}

function resolveLegacyElementType(layer) {
  const legacyCandidates = [
    { key: 'pipelines', ref: pipelineLayer },
    { key: 'nodes', ref: nodeLayer },
    { key: 'compressors', ref: compressorsLayer },
    { key: 'powerplants', ref: powerplantsLayer },
    { key: 'storages', ref: storageLayer },
    { key: 'lng', ref: lngLayer },
    { key: 'consumption', ref: consumptionLayer },
    { key: 'shortPipes', ref: shortPipeLayer },
    { key: 'borderpoints', ref: borderpointsLayer },
    { key: 'demands', ref: demandsLayer },
    { key: 'productions', ref: productionsLayer },
    { key: 'hydrogenPipes', ref: hydrogenPipeLayer },
    { key: 'electrolyzers', ref: electrolyzersLayer }
  ];

  for (const candidate of legacyCandidates) {
    if (candidate.ref && candidate.ref.hasLayer && candidate.ref.hasLayer(layer)) {
      return candidate.key;
    }
  }

  if (drawnItems && drawnItems.hasLayer && drawnItems.hasLayer(layer)) {
    if (layer.feature && layer.feature.geometry) {
      const geomType = layer.feature.geometry.type;
      if (geomType === 'LineString' || geomType === 'MultiLineString') {
        return 'pipelines';
      }
      if (geomType === 'Point' || geomType === 'MultiPoint') {
        return getElementTypeFromProperties(layer);
      }
    }
  }
  return null;
}

function getElementTypeFromProperties(layer) {
  if (!layer || !layer.feature || !layer.feature.geometry) return null;
  const geomType = layer.feature.geometry.type;
  const typeProp = layer.feature.properties ? layer.feature.properties.Type : null;
  const normalizedType = typeProp ? typeProp.toLowerCase() : '';

  if (geomType === 'LineString' || geomType === 'MultiLineString') {
    if (normalizedType.includes('hydrogen')) return 'hydrogenPipes';
    if (normalizedType.includes('short')) return 'shortPipes';
    return 'pipelines';
  }

  if (geomType === 'Point' || geomType === 'MultiPoint') {
    if (!typeProp) return 'nodes';
    if (normalizedType.includes('node')) return 'nodes';
    if (normalizedType.includes('compressor')) return 'compressors';
    if (normalizedType.includes('lng')) return 'lng';
    if (normalizedType.includes('storage')) return 'storages';
    if (normalizedType.includes('power')) return 'powerplants';
    if (normalizedType.includes('consumption')) return 'consumption';
    if (normalizedType.includes('demand')) return 'demands';
    if (normalizedType.includes('production')) return 'productions';
    if (normalizedType.includes('border')) return 'borderpoints';
    if (normalizedType.includes('electroly')) return 'electrolyzers';
  }
  
  return null;
}

function findOwningLayerGroup(layer) {
  if (!layer) return null;
  if (layer._eventParents) {
    let fallback = null;
    for (const parentId in layer._eventParents) {
      if (!Object.prototype.hasOwnProperty.call(layer._eventParents, parentId)) continue;
      const parent = layer._eventParents[parentId];
      if (!parent) continue;
      if (parent._qgasMeta) {
        return parent;
      }
      if (!fallback && (parent instanceof L.LayerGroup || parent instanceof L.FeatureGroup || parent instanceof L.GeoJSON)) {
        fallback = parent;
      }
    }
    if (fallback) {
      return fallback;
    }
  }
  if (drawnItems && drawnItems.hasLayer && drawnItems.hasLayer(layer)) {
    return drawnItems;
  }
  return null;
}

function resolveAttributeTargetLayers(elementType, layerScope) {
  if (layerScope) {
    if (Array.isArray(layerScope)) {
      return layerScope.filter(candidate => candidate && typeof candidate.eachLayer === 'function');
    }
    if (layerScope && typeof layerScope.eachLayer === 'function') {
      return [layerScope];
    }
    console.warn('Provided layer scope does not implement eachLayer; falling back to element type scope.');
  }
  return getLayersForElementType(elementType) || [];
}

function addAttributeToAllElements(elementType, attributeName, defaultValue, layerScope = null) {
  if (!elementType && !layerScope) {
    console.warn('Cannot add attribute without a valid element type or layer scope');
    return 0;
  }

  const targetLayers = resolveAttributeTargetLayers(elementType, layerScope);
  if (!targetLayers || targetLayers.length === 0) {
    if (layerScope) {
      console.warn('No layers resolved for the selected layer scope');
    } else {
      console.warn(`No layers registered for element type "${elementType}"`);
    }
    return 0;
  }

  let count = 0;
  const visited = new Set();
  targetLayers.forEach(layerGroup => {
    if (!layerGroup || visited.has(layerGroup)) return;
    visited.add(layerGroup);
    if (typeof layerGroup.eachLayer !== 'function') return;
    layerGroup.eachLayer(layer => {
      if (layer && layer.feature && layer.feature.properties) {
        layer.feature.properties[attributeName] = defaultValue;
        layer.feature.properties.modified = true;
        count++;
      }
    });
  });
  console.log(`Added attribute "${attributeName}" to ${count} ${elementType} elements`);
  return count;
}

function deleteAttributeFromAllElements(elementType, attributeName, layerScope = null) {
  if (!elementType && !layerScope) {
    console.warn('Cannot delete attribute without a valid element type or layer scope');
    return 0;
  }

  const targetLayers = resolveAttributeTargetLayers(elementType, layerScope);
  if (!targetLayers || targetLayers.length === 0) {
    if (layerScope) {
      console.warn('No layers resolved for the selected layer scope');
    } else {
      console.warn(`No layers registered for element type "${elementType}"`);
    }
    return 0;
  }

  let count = 0;
  const visited = new Set();
  targetLayers.forEach(layerGroup => {
    if (!layerGroup || visited.has(layerGroup)) return;
    visited.add(layerGroup);
    if (typeof layerGroup.eachLayer !== 'function') return;
    layerGroup.eachLayer(layer => {
      if (layer && layer.feature && layer.feature.properties && Object.prototype.hasOwnProperty.call(layer.feature.properties, attributeName)) {
        delete layer.feature.properties[attributeName];
        layer.feature.properties.modified = true;
        count++;
      }
    });
  });
  return count;
}

// Hilfsfunktion: Hole die Attributnamen einer bestehenden Pipeline
function getDefaultPipelineAttributes(sourceLayer) {
  const attrs = {};
  const visitedLayers = new Set();

  const candidateSources = [
    sourceLayer,
    window.selectedPipelineLayer,
    pipelineLayer,
    ...(getLayersForElementType('pipelines') || []),
    drawnItems
  ];

  for (const candidate of candidateSources) {
    const customDefaults = getCustomLineDefaults(candidate);
    if (customDefaults) {
      return customDefaults;
    }
  }

  const collectFromLayer = (layer) => {
    if (!layer || visitedLayers.has(layer)) return false;
    visitedLayers.add(layer);

    if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON) {
      if (typeof layer.eachLayer === 'function') {
        let found = false;
        layer.eachLayer(child => {
          if (found) return;
          if (collectFromLayer(child)) {
            found = true;
          }
        });
        return found;
      }
      return false;
    }

    if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === 'LineString') {
      for (const key in layer.feature.properties) {
        if (key !== 'modified') attrs[key] = '';
      }
      return true;
    }
    return false;
  };

  candidateSources.some(src => collectFromLayer(src));

  return attrs;
}

function getDefaultPointAttributes(type) {
  const resolvedType = type || 'Custom Element';
  return {
    ID: '',
    Type: resolvedType,
    Node: ''
  };
}

// Contributor-Eingabefeld initialisieren
const contributorInput = document.getElementById('contributor-input');
contributorInput.value = 'Max Mustermann'; // Nur das rechte Feld bekommt den Standardwert

// Initialize contributor system
loadContributors();

// Store current layer for Add Attribute functionality
let currentPopupLayer = null;

// Global storage for hidden attributes per element type
const defaultHiddenAttributeKeys = ['pipelines', 'nodes', 'compressors', 'powerplants', 'storages', 'lng', 'consumption', 'shortPipes', 'borderpoints', 'demands', 'productions', 'hydrogenPipes', 'electrolyzers'];
window.hiddenAttributesConfig = window.hiddenAttributesConfig || {};
defaultHiddenAttributeKeys.forEach(key => {
  if (!window.hiddenAttributesConfig[key]) {
    window.hiddenAttributesConfig[key] = [];
  }
});

// Also make it available as local variable
const hiddenAttributesConfig = window.hiddenAttributesConfig;

function ensureHiddenAttributeBucket(elementType) {
  if (!elementType) return;
  if (!hiddenAttributesConfig[elementType]) {
    hiddenAttributesConfig[elementType] = [];
  }
}

// Universal attribute filter function
window.filterAttributes = function(properties, layer) {
  const staticHiddenAttributes = [
    'overlap_percentage', 'overlap_length', 'Owner', 'Parent',
    'Country_Start', 'Country_End', 'modified'
  ];

  const elementType = layer ? determineElementType(layer) : null;
  const dynamicHiddenAttributes = elementType ? (hiddenAttributesConfig[elementType] || []) : [];
  const allHiddenAttributes = [...staticHiddenAttributes, ...dynamicHiddenAttributes];

  const filtered = {};
  Object.keys(properties).forEach(key => {
    if (!allHiddenAttributes.includes(key)) {
      filtered[key] = properties[key];
    }
  });
  return filtered;
};

// Universal Add Attribute Button Handler with Event Delegation
document.addEventListener('click', function(event) {
  if (event.target && event.target.id === 'add-attribute-btn') {
    const targetLayer = currentPopupLayer || activeElement || activePipeline;

    if (targetLayer && targetLayer.feature && targetLayer.feature.properties) {
      if (targetLayer.closePopup) {
        targetLayer.closePopup();
      }

      const infoPopup = document.getElementById('info-popup');
      if (infoPopup) {
        infoPopup.style.display = 'none';
      }

      showAddAttributeDialog(targetLayer);
    } else {
      showInfoPopup('Could not determine which element to add attribute to. Please click on an element first.', '⚙️ Attributes');
    }

    event.preventDefault();
    event.stopPropagation();
  }
});

// Universal Delete Attribute Button Handler with Event Delegation
document.addEventListener('click', function(event) {
  if (event.target && event.target.id === 'delete-attribute-btn') {
    const targetLayer = currentPopupLayer || activeElement || activePipeline;

    if (targetLayer && targetLayer.feature && targetLayer.feature.properties) {
      if (targetLayer.closePopup) {
        targetLayer.closePopup();
      }

      const infoPopup = document.getElementById('info-popup');
      if (infoPopup) {
        infoPopup.style.display = 'none';
      }

      showDeleteAttributeDialog(targetLayer);
    } else {
      showInfoPopup('Could not determine which element to delete attributes from. Please click on an element first.', '⚙️ Attributes');
    }

    event.preventDefault();
    event.stopPropagation();
  }
});

// Universal Hide Attribute Button Handler with Event Delegation
document.addEventListener('click', function(event) {
  if (event.target && event.target.id === 'hide-attribute-btn') {
    const targetLayer = currentPopupLayer || activeElement || activePipeline;

    if (targetLayer && targetLayer.feature && targetLayer.feature.properties) {
      if (targetLayer.closePopup) {
        targetLayer.closePopup();
      }

      const infoPopup = document.getElementById('info-popup');
      if (infoPopup) {
        infoPopup.style.display = 'none';
      }

      showHideAttributeDialog(targetLayer);
    } else {
      showInfoPopup('Could not determine which element to hide attributes from. Please click on an element first.', '⚙️ Attributes');
    }

    event.preventDefault();
    event.stopPropagation();
  }
});

// Event-Listener für Contributor-Eingabe (rechtes Feld)
contributorInput.addEventListener('input', function() {
  const newName = this.value.trim();
  if (newName) {
    updateContributorInfo(newName);
  } else {
    contributorName = '';
    contributorInitials = '';
    localStorage.removeItem('contributorName');
    localStorage.removeItem('contributorInitials');
  }
});

// Contributor Form Event Handlers
let isSubmittingContributor = false;

document.getElementById('contributor-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Prevent multiple submissions
  if (isSubmittingContributor) {
    return;
  }
  
  const title = ''; // Removed title field
  const firstName = document.getElementById('contributor-firstname').value.trim();
  const surname = document.getElementById('contributor-surname').value.trim();
  const institution = document.getElementById('contributor-institution').value.trim();
  
  if (!firstName || !surname || !institution) {
    showInfoPopup('Please fill in all required fields.', '👤 Contributor');
    return;
  }
  
  // Set submitting state and disable button
  isSubmittingContributor = true;
  const submitButton = this.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Creating...';
  submitButton.style.background = '#ccc';
  
  try {
    // Add new contributor
    const contributor = addContributor(firstName, surname, institution);
    const fullName = contributor.fullName;
    
    // Set as current contributor
    document.getElementById('contributor-input').value = fullName;
    contributorName = fullName;
    contributorInitials = contributor.fullName.split(/\s+/).map(n => n[0] ? n[0].toUpperCase() : '').join('');
    
    // Update dropdown and select the new contributor
    populateContributorSelect();
    
    // Select the newly created contributor in the radio button list
    const radioButtons = document.querySelectorAll('input[name="contributor-select"]');
    radioButtons.forEach(radio => {
      if (radio.value === contributor.id) {
        radio.checked = true;
      }
    });
    
    // Close modal and popup
    closeNewContributorModal();
    document.getElementById('contributor-popup').style.display = 'none';
    
    console.log('New contributor created:', fullName);
  } catch (error) {
    console.error('Error creating contributor:', error);
    showErrorPopup('Error creating contributor. Please try again.', '👤 Contributor');
  } finally {
    // Reset submitting state and re-enable button
    isSubmittingContributor = false;
    submitButton.disabled = false;
    submitButton.textContent = originalText;
    submitButton.style.background = '#28a745';
  }
});

// Funktion zur Überprüfung des Contributor-Namens
/**
 * Check whether a valid contributor name has been entered.
 *
 * Reads the <code>#contributor-input</code> field and returns
 * <code>false</code> (showing a contributor dialog) when the value is
 * empty or still the default placeholder "Max Mustermann".
 * All editing tools call this guard before modifying map data to ensure
 * every change is attributed to a real contributor.
 *
 * @returns {boolean} <code>true</code> if a valid contributor name is
 *   present; <code>false</code> otherwise.
 */
function checkContributorName() {
  const currentName = document.getElementById('contributor-input').value.trim();
  if (currentName === 'Max Mustermann' || currentName === '') {
    showContributorDialog();
    return false;
  }
  return true;
}

function showContributorDialog() {
  const popup = document.getElementById('contributor-popup');
  const createBtn = document.getElementById('create-contributor-btn');
  const applyBtn = document.getElementById('contributor-apply-btn');
  
  if (popup) {
    // Load existing contributors
    loadContributors();
    populateContributorSelect();
    
    popup.style.display = 'flex';
    console.log('Contributor Dialog angezeigt');
  }
}

// Hilfsfunktion zur Berechnung der Pipeline-Länge in km
function calculatePipelineLength(layer) {
  const latlngs = layer.getLatLngs();
  let totalLength = 0;
  
  for (let i = 0; i < latlngs.length - 1; i++) {
    totalLength += latlngs[i].distanceTo(latlngs[i + 1]);
  }
  
  // Umrechnung von Metern in Kilometer
  return Number((totalLength / 1000).toFixed(2));
}

// Hilfsfunktion zum Prüfen und Löschen verwaister Nodes
function checkAndDeleteOrphanedNodes(nodeIds) {
  const nodeLayers = getAllNodeLayers();
  if (!nodeIds || nodeIds.length === 0 || !nodeLayers.length || !pipelineLayer) return;
  
  nodeIds.forEach(nodeId => {
    if (!nodeId) return;
    
    // Prüfen ob Node noch in anderen Pipelines verwendet wird
    let isUsed = false;
    pipelineLayer.eachLayer(pipelineLayer => {
      if (pipelineLayer.feature && pipelineLayer.feature.properties) {
        const props = pipelineLayer.feature.properties;
        if (props.Start_Node === nodeId || props.End_Node === nodeId) {
          isUsed = true;
        }
      }
    });
    
    // Auch in drawnItems prüfen
    if (!isUsed) {
      drawnItems.eachLayer(drawnLayer => {
        if (drawnLayer.feature && drawnLayer.feature.properties) {
          const props = drawnLayer.feature.properties;
          if (props.Start_Node === nodeId || props.End_Node === nodeId) {
            isUsed = true;
          }
        }
      });
    }
    
    // Node löschen falls nicht mehr verwendet
    if (!isUsed) {
      nodeLayers.forEach(layerGroup => {
        if (!layerGroup || typeof layerGroup.eachLayer !== 'function') return;
        layerGroup.eachLayer(nodeLayerItem => {
          if (nodeLayerItem.feature && nodeLayerItem.feature.properties.ID === nodeId && !nodeLayerItem._deletedInSession) {
            console.log('Lösche verwaisten Node:', nodeId);
            deletedNodes.push(nodeLayerItem.feature);
            try {
              if (typeof layerGroup.removeLayer === 'function') {
                layerGroup.removeLayer(nodeLayerItem);
              } else if (map.hasLayer(nodeLayerItem)) {
                map.removeLayer(nodeLayerItem);
              }
            } catch (err) {
              console.warn('Could not remove orphaned node marker:', err);
            }
            nodeLayerItem.off('click');
            nodeLayerItem._deletedInSession = true;
          }
        });
      });
    }
  });
}

// Hilfsfunktion zum Erstellen eines neuen Nodes
function findSampleNodeMarker(sourceLayer = null) {
  let sample = null;
  const layerGroup = sourceLayer || resolveNodeLayer();
  if (!layerGroup || typeof layerGroup.eachLayer !== 'function') {
    return sample;
  }

  const traverse = (layer) => {
    if (sample || !layer) {
      return;
    }
    const isGroup = layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON;
    if (isGroup && typeof layer.eachLayer === 'function') {
      layer.eachLayer(child => traverse(child));
      return;
    }
    if (layer instanceof L.CircleMarker || (layer.feature && layer.feature.geometry && layer.feature.geometry.type === 'Point')) {
      sample = layer;
    }
  };

  layerGroup.eachLayer(layer => traverse(layer));
  return sample;
}

function getDefaultNodeStyleOptions(preferredLayer = null) {
  const fallback = { pane: 'nodePane', radius: 6, fillColor: '#ff7800', color: '#000', weight: 1, opacity: 1, fillOpacity: 0.85 };
  const customSettings = preferredLayer?._customLayerSettings || null;
  if (customSettings && (customSettings.typeKey === 'Node' || customSettings.geometryClass === 'point')) {
    return {
      pane: customSettings.pane || fallback.pane,
      radius: customSettings.radius ?? customSettings.size ?? fallback.radius,
      fillColor: customSettings.color || fallback.fillColor,
      color: fallback.color,
      weight: fallback.weight,
      opacity: fallback.opacity,
      fillOpacity: fallback.fillOpacity
    };
  }
  const sample = findSampleNodeMarker(preferredLayer);

  if (sample && sample.options) {
    return {
      pane: sample.options.pane || fallback.pane,
      radius: sample.options.radius ?? fallback.radius,
      fillColor: sample.options.fillColor || fallback.fillColor,
      color: sample.options.color || fallback.color,
      weight: sample.options.weight ?? fallback.weight,
      opacity: sample.options.opacity ?? fallback.opacity,
      fillOpacity: sample.options.fillOpacity ?? fallback.fillOpacity
    };
  }

  if (Array.isArray(layerConfig)) {
    const nodeConfig = layerConfig.find(cfg => {
      const filename = (cfg.filename || '').toLowerCase();
      const typeHint = (cfg.type || '').toLowerCase();
      return filename.includes('node') || typeHint === 'node';
    });
    if (nodeConfig) {
      return {
        pane: 'nodePane',
        radius: nodeConfig.size || fallback.radius,
        fillColor: nodeConfig.color || fallback.fillColor,
        color: fallback.color,
        weight: fallback.weight,
        opacity: fallback.opacity,
        fillOpacity: fallback.fillOpacity
      };
    }
  }

  return { ...fallback };
}

/**
 * Create and register a new node marker on the map.
 *
 * Creates a Leaflet CircleMarker at <code>latlng</code> with the default
 * node style, attaches a GeoJSON feature with <code>Type: 'Node'</code>
 * and the provided <code>nodeId</code>, and adds it to the appropriate
 * node layer (determined via <code>options.targetLayer</code> or the
 * global <code>nodeLayer</code>). Wires up mode-aware click handlers for
 * info display and pipeline-connection callbacks.
 *
 * @param {L.LatLng} latlng - Geographic position for the new node.
 * @param {string} nodeId - Unique identifier to assign to the node
 *   feature (<code>properties.ID</code>).
 * @param {Object} [options={}] - Optional configuration.
 * @param {L.LayerGroup|null} [options.targetLayer=null] - Target layer
 *   group; falls back to the global <code>nodeLayer</code>.
 * @returns {L.CircleMarker} The created node marker.
 * @example
 * // Place a node on the default node layer
 * const marker = createNewNode(L.latLng(48.21, 16.37), 'N_MQ_001');
 *
 * // Place a node on a specific layer (e.g. hydrogen nodes)
 * const h2marker = createNewNode(L.latLng(48.21, 16.37), 'N_MQ_002', {
 *   targetLayer: hydrogenNodeLayer
 * });
 */
function createNewNode(latlng, nodeId, options = {}) {
  const targetLayer = options.targetLayer || null;
  const nodeStyle = getDefaultNodeStyleOptions(targetLayer);
  const nodeMarker = L.circleMarker(latlng, nodeStyle);
  captureOriginalMarkerStyle(nodeMarker, 'default');
  
  const defaultAttrs = getDefaultPointAttributes('Node');
  const properties = { ...defaultAttrs, Type: 'Node', ID: nodeId, modified: true };
  
  // Feature-Eigenschaft an Marker binden
  nodeMarker.feature = {
    type: "Feature",
    properties: properties,
    geometry: { type: "Point", coordinates: [latlng.lng, latlng.lat] }
  };
  
  // Klick-Handler an Marker binden
  const clickHandler = function(e) {
    console.log('Node click handler called, currentMode:', currentMode, 'hasCallback:', !!window.nodeSelectionCallback);
    console.log('Clicked on node:', this.feature ? this.feature.properties.ID : 'no feature');
    if (currentMode === 'info') {
      console.log('Node geklickt:', this.feature.properties.ID);
      
      // Element hervorheben
      highlightElement(this);
      
      // Modal mit Node-Details anzeigen
      const content = createModalPopupContent(this.feature.properties, this);
      const title = `Node: ${this.feature.properties.ID || this.feature.properties.Name || 'Unnamed'}`;
      showElementModal(title, content, this);
      
      setTimeout(() => rebindModalAttributeControls(this), 100);
    } else if (currentMode === 'add-pipeline' && window.nodeSelectionCallback) {
      console.log('Node für Pipeline ausgewählt:', this.feature.properties.ID);
      window.nodeSelectionCallback(this.feature.properties.ID, this.getLatLng());
      e.stopPropagation();
    }
  };
  
  nodeMarker.on('click', clickHandler);

  if (targetLayer && targetLayer._qgasMeta) {
    assignMetadataToLayer(nodeMarker, targetLayer._qgasMeta);
  }
  
  const destinationLayer = targetLayer || resolveNodeLayer({ createIfMissing: true });
  if (destinationLayer && typeof destinationLayer.addLayer === 'function') {
    destinationLayer.addLayer(nodeMarker);
  } else {
    nodeMarker.addTo(map);
  }
  nodeMarker._parentNodeLayer = destinationLayer || null;
  console.log('Neuer Node erstellt:', nodeId);
  return nodeMarker;
}

// Manuelle Infrastructure Placement (OHNE Leaflet.Draw!)
function activateManualInfrastructurePlacement() {
  // Cursor ändern
  map.getContainer().style.cursor = 'crosshair';

  const showLayerSelection = (latlng) => {
    const pointLayerOptions = buildPointLayerOptions();

    if (!pointLayerOptions.length) {
      showCustomPopup(
        '⚠️ No Point Layers',
        '<p style="text-align: center; margin: 15px 0;">No point-based layers are available. Please load or create a point layer first.</p>',
        [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => { currentMode = 'info'; activateInfoMode(); } }]
      );
      return;
    }

    const selectId = 'infrastructure-layer-select';
    const optionsHtml = pointLayerOptions.map(option => `<option value="${option.id}">${option.label}</option>`).join('');
    const selectionContent = `
      <div style="display:flex; flex-direction:column; gap:12px; margin:10px 0; text-align:left;">
        <p style="margin:0; text-align:center;">Choose the layer that should receive the new infrastructure point.</p>
        <div>
          <label for="${selectId}" style="display:block; font-weight:600; margin-bottom:6px;">Target Layer</label>
          <select id="${selectId}" style="width: 100%; padding: 12px; border: 1px solid #d0d5dd; border-radius: 6px; background: #f8fafc; font-size: 14px;">
            ${optionsHtml}
          </select>
        </div>
      </div>
    `;

    showCustomPopup(
      '🏗️ Select Target Layer',
      selectionContent,
      [
        {
          text: 'Next',
          type: 'primary',
          keepOpen: true,
          onClick: () => {
            const selectEl = document.getElementById(selectId);
            const selectedId = selectEl ? selectEl.value : null;
            const selectedOption = pointLayerOptions.find(opt => opt.id === selectedId);
            if (!selectedOption) {
              showInfoPopup('Please select a layer.', '🏗️ Select Target Layer');
              return;
            }
            showIdDialog(latlng, selectedOption);
          }
        },
        {
          text: 'Cancel',
          type: 'secondary',
          keepOpen: false,
          onClick: () => {
            currentMode = 'info';
            activateInfoMode();
          }
        }
      ]
    );
  };

  const showIdDialog = (latlng, layerOption) => {
    const defaultAttrs = getDefaultAttributesForLayerOption(layerOption);
    const autoId = generateInfrastructureAutoId(layerOption);
    const content = `
      <div style="display:flex; flex-direction:column; gap:12px; margin:10px 0; text-align:center; align-items:center;">
        <p style="margin:0;">Provide an ID for the new element in <strong>${layerOption.label}</strong>.</p>
        <div style="width:100%; max-width:320px; margin:0 auto; text-align:left;">
          <label for="infrastructure-id-input" style="display:block; font-weight:600; margin-bottom:6px;">Element ID</label>
          <input type="text" id="infrastructure-id-input" value="${autoId}" style="width: 100%; padding: 12px; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 14px; text-align: center; box-sizing: border-box; display: block;" />
        </div>
      </div>
    `;

    showCustomPopup(
      '🆔 Configure Element',
      content,
      [
        {
          text: 'Create',
          type: 'primary',
          keepOpen: false,
          onClick: () => {
            const input = document.getElementById('infrastructure-id-input');
            const userId = input ? input.value.trim() : '';
            if (!userId) {
              showCustomPopup(
                '❌ Error',
                '<p style="text-align: center; margin: 15px 0;">ID is required!</p>',
                [{ text: 'OK', type: 'primary', keepOpen: false, onClick: () => {} }]
              );
              return;
            }
            createInfrastructurePoint(userId, layerOption, latlng, defaultAttrs);
          }
        },
        {
          text: 'Back',
          type: 'secondary',
          keepOpen: false,
          onClick: () => {
            showLayerSelection(latlng);
          }
        }
      ]
    );
  };

  // Einmaliger Map-Click-Handler
  map.once('click', function(e) {
    const latlng = e.latlng;
    
    // Cursor zurücksetzen
    map.getContainer().style.cursor = '';
    
    showLayerSelection(latlng);
  });
}

// Funktion zum Erstellen des Infrastructure Points
function createInfrastructurePoint(userId, layerOption, latlng, defaultAttrs) {
  const selectedType = layerOption?.typeKey || layerOption?.label || 'Custom Element';
  const geometryHint = (getLayerGeometryClassHint(layerOption?.layer) || layerOption?.geometryClass || '').toLowerCase();
  const isInlineLayer = geometryHint === 'inline' || (layerOption?.layer?._customLayerSettings?.geometryClass === 'inline');

  const findNearbyNodes = (center, toleranceMeters = 50) => {
    const matches = [];
    if (!center || !map) return matches;
    getAllNodeLayers().forEach(layerGroup => {
      if (!layerGroup) return;
      layerGroup.eachLayer(marker => {
        const id = marker.feature?.properties?.ID;
        const ll = marker.getLatLng?.();
        if (!id || !ll) return;
        const dist = map.distance(center, ll);
        if (dist <= toleranceMeters) {
          matches.push({ id, marker, dist });
        }
      });
    });
    // Sort by distance, keep unique IDs
    const seen = new Set();
    return matches
      .sort((a, b) => a.dist - b.dist)
      .filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
  };

  // Properties setzen
  const properties = { ...defaultAttrs, ID: userId, modified: true };
  if (!('Type' in properties) || !properties.Type) {
    properties.Type = selectedType;
  }
  
  // Node-Verbindung hinzufügen falls vorhanden
  if (window.selectedNodeForInfrastructure) {
    properties.Node = window.selectedNodeForInfrastructure;
    console.log('Node-Verbindung hinzugefügt:', window.selectedNodeForInfrastructure);
    window.selectedNodeForInfrastructure = null;
  }

  // Inline-Elemente automatisch mit benachbarten Nodes verknüpfen
  if (isInlineLayer) {
    const nearby = findNearbyNodes(latlng, 50);
    if (nearby.length >= 2) {
      properties.Start_Node = nearby[0].id;
      properties.End_Node = nearby[1].id;
      properties.Node = '';
    } else if (nearby.length === 1) {
      properties.Node = nearby[0].id;
      properties.Start_Node = '';
      properties.End_Node = '';
    }
  }
  
  let marker;
  
  // For Nodes, use the createNewNode function to ensure consistency
  if (selectedType === 'Node') {
    marker = createNewNode(latlng, userId, { targetLayer: layerOption?.layer });
    // Update properties on the marker
    marker.feature.properties = properties;
    marker.feature.properties.modified = true;
    marker.isNew = true;
  } else {
    // For other infrastructure, create a simple CircleMarker
    const style = layerOption?.style ? { ...layerOption.style, pane: layerOption.style.pane || 'nodePane' } : derivePointLayerStyle(layerOption?.layer);
    marker = L.circleMarker(latlng, style);
    captureOriginalMarkerStyle(marker, 'default');
    marker.feature = {
      type: "Feature",
      properties: properties,
      geometry: { type: "Point", coordinates: [latlng.lng, latlng.lat] }
    };
    marker.isNew = true;
  }
  
  if (selectedType !== 'Node') {
    const targetLayer = layerOption?.layer;
    if (targetLayer && typeof targetLayer.addLayer === 'function') {
      targetLayer.addLayer(marker);
      // Assign parent layer metadata to the newly created feature
      if (targetLayer._qgasMeta) {
        assignMetadataToLayer(marker, targetLayer._qgasMeta);
      }
    } else {
      marker.addTo(map);
    }
  }
  
  updateStatistics();
  
  console.log('Infrastructure point created:', selectedType, userId);
  
  // Callback aufrufen um Tool zu benachrichtigen
  if (window.onInfrastructurePointCreated && typeof window.onInfrastructurePointCreated === 'function') {
    window.onInfrastructurePointCreated();
  }
}

// Mapping FacilityType → Kürzel
const facilityTypeMap = {};

function sanitizePrefixSource(name) {
  if (!name) return '';
  return `${name}`.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function isPrefixInUse(prefix, ignoreType = null) {
  if (!prefix) return false;
  const candidate = prefix.toUpperCase();
  return Object.entries(facilityTypeMap).some(([typeKey, value]) => {
    if (!value) return false;
    if (ignoreType && typeKey === ignoreType) return false;
    return value.toUpperCase() === candidate;
  });
}

function generatePrefixFromName(name, ignoreType = null) {
  const cleaned = sanitizePrefixSource(name);
  if (!cleaned) return 'X';
  for (let len = 1; len <= cleaned.length; len++) {
    const candidate = cleaned.substring(0, len);
    if (!isPrefixInUse(candidate, ignoreType)) {
      return candidate;
    }
  }
  let suffix = 2;
  while (suffix < 1000) {
    const candidate = `${cleaned}${suffix}`;
    if (!isPrefixInUse(candidate, ignoreType)) {
      return candidate;
    }
    suffix++;
  }
  return cleaned.substring(0, Math.min(3, cleaned.length)) || 'X';
}

/**
 * Return the GeoJSON type prefix string for a given element type.
 *
 * Looks up the internal <code>facilityTypeMap</code> for a registered
 * prefix; if none exists, derives one from the type name via
 * {@link generatePrefixFromName} and registers it. Used to construct
 * standardised element IDs (<code>PREFIX_CONTRIBUTOR_NNN</code>).
 *
 * @param {string} type - Element type name (e.g., <code>'Pipeline'</code>,
 *   <code>'Node'</code>, <code>'Compressor'</code>).
 * @returns {string} Two-to-three-character prefix string
 *   (e.g., <code>'PL'</code>, <code>'N'</code>, <code>'C'</code>).
 */
function getFacilityPrefix(type) {
  const resolvedType = (type && type.trim()) || 'Element';
  if (!facilityTypeMap[resolvedType]) {
    facilityTypeMap[resolvedType] = generatePrefixFromName(resolvedType, resolvedType);
  }
  return facilityTypeMap[resolvedType];
}

function resolveFacilityTypeAlias(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  const keys = Object.keys(facilityTypeMap);
  const directMatch = keys.find(key => key.toLowerCase() === normalized);
  if (directMatch) return directMatch;
  if (normalized.endsWith('es')) {
    const singularEs = trimmed.slice(0, -2);
    const matchEs = keys.find(key => key.toLowerCase() === singularEs.toLowerCase());
    if (matchEs) return matchEs;
  }
  if (normalized.endsWith('s')) {
    const singular = trimmed.slice(0, -1);
    const singularMatch = keys.find(key => key.toLowerCase() === singular.toLowerCase());
    if (singularMatch) return singularMatch;
  }
  return null;
}

['Pipeline', 'Storage', 'Node', 'Power plant', 'LNG Terminal', 'Compressor'].forEach(baseType => {
  getFacilityPrefix(baseType);
});

// Hilfsfunktion: nächste freie Nummer für diesen Typ finden
/**
 * Return the next available sequential ID number for a given element type.
 *
 * Scans all layers of the specified type to collect existing numeric
 * suffixes matching the pattern <code>PREFIX_CONTRIBUTOR_NNN</code> and
 * returns the lowest unused positive integer. Accepts an optional
 * <code>layerOverride</code> to restrict scanning to a specific layer.
 *
 * @param {string} type - Element type (e.g., <code>'Pipeline'</code>).
 * @param {L.LayerGroup|null} [layerOverride=null] - Optional specific
 *   layer to scan; if <code>null</code> all layers are searched.
 * @returns {number} Next unused sequential number (always ≥ 1).
 */
function getNextIdNumber(type, layerOverride = null) {
  const existingNumbers = new Set();
  const typePrefix = getFacilityPrefix(type);
  const contributorPart = (contributorInitials && contributorInitials.trim()) ? contributorInitials.trim().toUpperCase() : 'XX';
  const regexNew = new RegExp(`^${typePrefix}_${contributorPart}_(\\d+)$`, 'i');
  const regexLegacy = new RegExp(`^${contributorPart}_${typePrefix}_(\\d+)$`, 'i');

  const recordMatch = (idValue) => {
    if (!idValue) return;
    const id = `${idValue}`.toUpperCase();
    let match = id.match(regexNew);
    if (!match) {
      match = id.match(regexLegacy);
    }
    if (match) {
      existingNumbers.add(parseInt(match[1], 10));
    }
  };

  // Funktion zum Sammeln von IDs aus einem Layer
  const collectIdsFromLayer = (layer) => {
    if (!layer) return;
    if (layer.feature && layer.feature.properties && layer.feature.properties.ID) {
      recordMatch(layer.feature.properties.ID);
    }
    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(subLayer => {
        if (subLayer && subLayer.feature && subLayer.feature.properties && subLayer.feature.properties.ID) {
          recordMatch(subLayer.feature.properties.ID);
        }
        if (subLayer && typeof subLayer.eachLayer === 'function') {
          subLayer.eachLayer(grandSubLayer => {
            if (grandSubLayer && grandSubLayer.feature && grandSubLayer.feature.properties && grandSubLayer.feature.properties.ID) {
              recordMatch(grandSubLayer.feature.properties.ID);
            }
          });
        }
      });
    }
  };

  // Sammle IDs aus drawnItems
  collectIdsFromLayer(drawnItems);

  if (layerOverride) {
    collectIdsFromLayer(layerOverride);
  } else {
    // Sammle IDs aus den entsprechenden ursprünglichen Layern
    switch(type) {
      case 'Storage':
        collectIdsFromLayer(storageLayer);
        break;
      case 'LNG Terminal':
        collectIdsFromLayer(lngLayer);
        break;
      case 'Power plant':
        collectIdsFromLayer(powerplantsLayer);
        break;
      case 'Node':
        collectIdsFromLayer(nodeLayer);
        break;
      case 'Pipeline':
        collectIdsFromLayer(pipelineLayer);
        break;
    }
  }

  // Finde die niedrigste verfügbare Nummer (beginnend bei 1)
  let nextNum = 1;
  while (existingNumbers.has(nextNum)) {
    nextNum++;
  }

  return nextNum;
}

function layerHasPointGeometry(layer) {
  let hasPoint = false;
  if (!layer || typeof layer.eachLayer !== 'function') {
    return false;
  }

  const inspect = candidate => {
    if (!candidate || hasPoint) return;
    if (candidate instanceof L.LayerGroup || candidate instanceof L.FeatureGroup || candidate instanceof L.GeoJSON) {
      candidate.eachLayer(child => inspect(child));
      return;
    }
    if (candidate.feature && candidate.feature.geometry && candidate.feature.geometry.type === 'Point') {
      hasPoint = true;
    }
  };

  layer.eachLayer(inspect);
  return hasPoint;
}

function getLayerDisplayLabel(layer, fallbackName = '') {
  if (!layer) return fallbackName || '';
  if (layer._customLayerName) return layer._customLayerName;
  if (layer._customLayerSettings && layer._customLayerSettings.label) {
    return layer._customLayerSettings.label;
  }
  if (layer._qgasMeta && layer._qgasMeta.legendName) {
    return layer._qgasMeta.legendName;
  }
  return fallbackName || '';
}

function layerRepresentsNodeCategory(layer, fallbackName = '') {
  if (!layer) return false;
  if (layer === nodeLayer) return true;
  const label = getLayerDisplayLabel(layer, fallbackName).toLowerCase();
  if (label.includes('node') || label.includes('junction')) return true;
  if (layer._qgasMeta && layer._qgasMeta.type && layer._qgasMeta.type.toLowerCase().includes('node')) {
    return true;
  }
  if (layer._qgasMeta && layer._qgasMeta.elementKey && layer._qgasMeta.elementKey.toLowerCase().includes('node')) {
    return true;
  }
  const geometryClass = (getLayerGeometryClassHint(layer) || '').toLowerCase();
  return geometryClass === 'node';
}

function shouldHideLayerInEditMode(name, layer) {
  if (!layer || layer === nodeLayer) return false;
  if (!layerHasPointGeometry(layer)) return false;
  const geometryHint = (getLayerGeometryClassHint(layer) || '').toLowerCase();
  if (geometryHint === 'inline') return false;
  if (layerHasInlineGeometry(layer)) return false;
  if (layerRepresentsNodeCategory(layer, name)) return false;
  return true;
}

function layerHasInlineGeometry(layer) {
  let inlineDetected = false;
  const checkCandidate = candidate => {
    if (inlineDetected || !candidate) return;
    const meta = resolveLayerMetadata(candidate.layer || candidate._layer || candidate) || candidate._customLayerSettings;
    const geomHint = (meta?.geometryClass || '').toLowerCase();
    if (geomHint === 'inline') {
      inlineDetected = true;
      return;
    }
    const typeVal = (candidate.feature?.properties?.Type || '').toLowerCase();
    if (typeVal.includes('inline') || typeVal.includes('in-line')) {
      inlineDetected = true;
      return;
    }
    const nameVal = (layer?._customLayerName || '').toLowerCase();
    if (nameVal.includes('inline')) {
      inlineDetected = true;
    }
  };

  try {
    traverseLayerRecursively(layer, checkCandidate);
  } catch (err) {
    console.warn('Inline detection failed for layer', err);
  }
  return inlineDetected;
}

function gatherPointLayersForEditVisibility() {
  const layers = [];
  const baseLayers = [
    powerplantsLayer,
    compressorsLayer,
    lngLayer,
    storageLayer,
    consumptionLayer,
    borderpointsLayer,
    demandsLayer,
    productionsLayer,
    electrolyzersLayer
  ];

  baseLayers.forEach(layer => {
    if (!layer) return;
    const name = layer._customLayerName || layer._qgasMeta?.legendName || '';
    if (shouldHideLayerInEditMode(name, layer)) {
      layers.push(layer);
    }
  });

  if (dynamicLayers && typeof dynamicLayers === 'object') {
    Object.entries(dynamicLayers).forEach(([name, layer]) => {
      if (shouldHideLayerInEditMode(name, layer)) {
        layers.push(layer);
      }
    });
  }

  if (window.customLayers && typeof window.customLayers === 'object') {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      if (shouldHideLayerInEditMode(name, layer)) {
        layers.push(layer);
      }
    });
  }

  return layers;
}

function applyEditGeometryVisibility(restrictToLinesOnly) {
  if (!map) return;
  if (restrictToLinesOnly) {
    if (editGeometryVisibilityActive) return;
    editGeometryVisibilityActive = true;
    const candidates = gatherPointLayersForEditVisibility();
    candidates.forEach(layer => {
      if (layer && map.hasLayer(layer)) {
        try {
          map.removeLayer(layer);
          editModeHiddenPointLayers.add(layer);
        } catch (error) {
          console.error('Error hiding layer for edit mode:', error);
        }
      }
    });
  } else {
    if (!editGeometryVisibilityActive) return;
    editModeHiddenPointLayers.forEach(layer => {
      if (!layer) return;
      try {
        if (!map.hasLayer(layer) && typeof layer.addTo === 'function') {
          layer.addTo(map);
        }
      } catch (error) {
        console.error('Error restoring layer after edit mode:', error);
      }
    });
    editModeHiddenPointLayers.clear();
    editGeometryVisibilityActive = false;
  }
}

function getLayerGeometryClassHint(layer) {
  if (!layer) return null;
  if (layer._customLayerSettings && layer._customLayerSettings.geometryClass) {
    return layer._customLayerSettings.geometryClass;
  }
  if (layer._qgasMeta && layer._qgasMeta.geometryClass) {
    return layer._qgasMeta.geometryClass;
  }
  return null;
}

function isSelectablePointLayer(layer) {
  if (!layer) return false;
  const geometryHint = (getLayerGeometryClassHint(layer) || '').toLowerCase();
  if (geometryHint === 'line') return false;
  const hasPoints = layerHasPointGeometry(layer);
  const isEmpty = typeof layer.getLayers === 'function' && layer.getLayers().length === 0;
  if (hasPoints) return true;
  if (isEmpty && (!geometryHint || geometryHint === 'point' || geometryHint === 'inline')) {
    return true;
  }
  return false;
}

function traverseLayerRecursively(layer, visitor) {
  if (!layer || typeof visitor !== 'function') return;
  if (layer instanceof L.LayerGroup || layer instanceof L.FeatureGroup || layer instanceof L.GeoJSON) {
    if (typeof layer.eachLayer === 'function') {
      layer.eachLayer(child => traverseLayerRecursively(child, visitor));
    }
    return;
  }
  visitor(layer);
}

function isPointGeometryType(type) {
  return type === 'Point' || type === 'MultiPoint';
}

function getDefaultAttributesForLayerOption(option) {
  if (!option) return {};
  const resolvedType = option.typeKey || option.label || 'Custom Element';
  const layerTemplate = option.layer ? buildAttributeTemplateFromLayer(option.layer) : null;
  const attrs = (layerTemplate && Object.keys(layerTemplate).length > 0)
    ? { ...layerTemplate }
    : { ...getDefaultPointAttributes(resolvedType) };

  if (!('Type' in attrs) || !attrs.Type) {
    attrs.Type = resolvedType;
  }
  if (!('ID' in attrs)) {
    attrs.ID = '';
  }
  if (!('Node' in attrs)) {
    attrs.Node = '';
  }

  return attrs;
}

function buildAttributeTemplateFromLayer(layer) {
  if (!layer) return null;
  let template = null;
  traverseLayerRecursively(layer, candidate => {
    if (template || !candidate || !candidate.feature || !candidate.feature.properties) return;
    const props = candidate.feature.properties;
    template = {};
    Object.keys(props).forEach(key => {
      if (key === 'modified') return;
      template[key] = '';
    });
  });
  return template;
}

function applyGenericPointInfoHandlers(layerGroup, label) {
  if (!layerGroup || currentMode !== 'info') return;
  const titleLabel = label || 'Element';
  traverseLayerRecursively(layerGroup, candidate => {
    if (!candidate || !candidate.feature || !candidate.feature.geometry) return;
    if (!isPointGeometryType(candidate.feature.geometry.type)) return;
    candidate.off('click');
    if (typeof candidate.unbindPopup === 'function') {
      candidate.unbindPopup();
    }
    candidate.on('click', function () {
      highlightElement(candidate);
      const content = createModalPopupContent(candidate.feature.properties, candidate);
      const title = `${titleLabel}: ${candidate.feature.properties.ID || candidate.feature.properties.Name || 'Unnamed'}`;
      showElementModal(title, content, candidate);
      setTimeout(() => rebindModalAttributeControls(candidate), 100);
    });
  });
}

function attachInfoHandlersForAdditionalPointLayers(skipLayers = new Set()) {
  if (currentMode !== 'info') return;
  const processed = new Set();
  const considerLayer = (layer, label) => {
    if (!layer || processed.has(layer) || skipLayers.has(layer)) return;
    processed.add(layer);
    applyGenericPointInfoHandlers(layer, label);
  };

  if (dynamicLayers && typeof dynamicLayers === 'object') {
    Object.entries(dynamicLayers).forEach(([name, layer]) => {
      if (!layer) return;
      const geometryClass = (getLayerGeometryClassHint(layer) || '').toLowerCase();
      if (geometryClass === 'line') return;
      considerLayer(layer, (layer._qgasMeta && layer._qgasMeta.legendName) || name);
    });
  }

  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      if (!layer) return;
      const geometryClass = (getLayerGeometryClassHint(layer) || '').toLowerCase();
      if (geometryClass === 'line') return;
      considerLayer(layer, name);
    });
  }
}

function derivePointLayerStyle(layer, fallbackColor = '#3388ff', fallbackSize = 6) {
  const defaultStyle = {
    pane: 'nodePane',
    radius: fallbackSize,
    fillColor: fallbackColor,
    color: '#000',
    weight: 1,
    opacity: 1,
    fillOpacity: 0.85
  };

  if (!layer || typeof layer.eachLayer !== 'function') {
    return { ...defaultStyle };
  }

  let sample = null;
  layer.eachLayer(candidate => {
    if (sample || !candidate || !candidate.options) return;
    if (candidate instanceof L.CircleMarker) {
      sample = candidate;
      return;
    }
    if (candidate.eachLayer) {
      candidate.eachLayer(inner => {
        if (!sample && inner instanceof L.CircleMarker) sample = inner;
      });
    }
  });

  if (sample && sample.options) {
    return {
      pane: sample.options.pane || 'nodePane',
      radius: sample.options.radius ?? fallbackSize,
      fillColor: sample.options.fillColor || fallbackColor,
      color: sample.options.color || '#000',
      weight: sample.options.weight ?? 1,
      opacity: sample.options.opacity ?? 1,
      fillOpacity: sample.options.fillOpacity ?? 0.85
    };
  }

  return { ...defaultStyle };
}

function inferTypeKeyFromConfig(config) {
  const filename = (config.filename || '').toLowerCase();
  if (filename.includes('node')) return 'Node';
  if (filename.includes('lng')) return 'LNG Terminal';
  if (filename.includes('storage')) return 'Storage';
  if (filename.includes('power')) return 'Power plant';
  if (filename.includes('compressor')) return 'Compressor';
  if (filename.includes('demand')) return 'Demand';
  if (filename.includes('production')) return 'Production';
  if (filename.includes('border')) return 'Border Point';
  return config.legendName || config.filename?.replace('.geojson', '') || 'Custom Layer';
}

function buildPointLayerOptions() {
  const options = [];
  const seen = new Set();

  const addOption = (option) => {
    if (!option || !option.layer) return;
    option.id = option.id || `${option.label}-${options.length}`;
    const key = `${option.layer._leaflet_id || option.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    option.style = option.style || derivePointLayerStyle(option.layer, option.color, option.size);
    option.typeKey = option.typeKey || option.label;
    options.push(option);
  };

  const nodeEntries = getNodeLayerEntries();
  if (nodeEntries.length) {
    nodeEntries.forEach(entry => {
      if (!entry.layer || !isSelectablePointLayer(entry.layer)) return;
      addOption({
        id: `core:nodes:${entry.id}`,
        label: entry.name,
        layer: entry.layer,
        typeKey: 'Node',
        color: entry.metadata?.color || '#ff7800',
        style: getDefaultNodeStyleOptions(entry.layer)
      });
    });
  } else {
    const nodeLayerRef = resolveNodeLayer({ createIfMissing: true });
    if (nodeLayerRef && isSelectablePointLayer(nodeLayerRef)) {
      addOption({
        id: 'core:nodes',
        label: 'Nodes',
        layer: nodeLayerRef,
        typeKey: 'Node',
        color: '#ff7800',
        style: getDefaultNodeStyleOptions(nodeLayerRef)
      });
    }
  }
  if (lngLayer && isSelectablePointLayer(lngLayer)) addOption({ id: 'core:lng', label: 'LNG Terminals', layer: lngLayer, typeKey: 'LNG Terminal', color: '#00CED1' });
  if (storageLayer && isSelectablePointLayer(storageLayer)) addOption({ id: 'core:storage', label: 'Storages', layer: storageLayer, typeKey: 'Storage', color: '#9370DB' });
  if (powerplantsLayer && isSelectablePointLayer(powerplantsLayer)) addOption({ id: 'core:powerplants', label: 'Power Plants', layer: powerplantsLayer, typeKey: 'Power plant', color: '#8B4513' });
  if (compressorsLayer && isSelectablePointLayer(compressorsLayer)) addOption({ id: 'core:compressors', label: 'Compressors', layer: compressorsLayer, typeKey: 'Compressor', color: '#FF6347' });

  if (Array.isArray(layerConfig)) {
    layerConfig.forEach(config => {
      if (!config || isLineLayerType(config.type)) return;
      const layerName = config.filename.replace('.geojson', '').replace(/[^a-zA-Z0-9]/g, '') + 'Layer';
      const targetLayer = dynamicLayers[layerName];
      if (!targetLayer) return;
      if (!isSelectablePointLayer(targetLayer)) return;
      addOption({
        id: `config:${layerName}`,
        label: config.legendName || config.filename.replace('.geojson', ''),
        layer: targetLayer,
        typeKey: inferTypeKeyFromConfig(config),
        color: config.color,
        size: config.size
      });
    });
  }

  if (window.customLayers) {
    Object.entries(window.customLayers).forEach(([name, layer]) => {
      if (!layer) return;
      if (!isSelectablePointLayer(layer)) return;
      addOption({ id: `custom:${name}`, label: name, layer: layer, typeKey: name });
    });
  }

  return options;
}

function generateInfrastructureAutoId(option) {
  const targetLayer = option?.layer || null;
  const typeKey = option?.typeKey || option?.label || 'Custom';
  const context = getLayerIdContext(targetLayer);
  const prefix = context.prefix || getFacilityPrefix(typeKey);
  const resolvedTypeKey = context.typeKey || typeKey;
  const nextNumber = getNextIdNumber(resolvedTypeKey, targetLayer);
  return formatElementId(prefix, contributorInitials, nextNumber);
}

const SHORT_PIPE_CONFIG_DEFAULTS = Object.freeze({
  filename: 'Short_Pipes.geojson',
  legendName: 'Short-Pipes',
  color: '#ff8800',
  size: 4,
  type: 'ShortPipe'
});

function getShortPipeConfigTemplate() {
  return {
    filename: SHORT_PIPE_CONFIG_DEFAULTS.filename,
    legendName: SHORT_PIPE_CONFIG_DEFAULTS.legendName,
    color: SHORT_PIPE_CONFIG_DEFAULTS.color,
    markerType: 'line',
    size: SHORT_PIPE_CONFIG_DEFAULTS.size,
    type: SHORT_PIPE_CONFIG_DEFAULTS.type,
    enabled: true,
    parentFilename: '',
    elementKey: 'shortPipes',
    geometryClass: 'line'
  };
}

function isShortPipeConfigEntry(config) {
  if (!config) return false;
  if (config.elementKey === 'shortPipes') return true;
  if (isShortPipeTypeLabel(config.type)) return true;
  const normalized = normalizeFilenameReference(config.filename || '');
  return normalized.includes('short') && normalized.includes('pipe');
}

function getConfiguredShortPipeConfig() {
  if (!Array.isArray(layerConfig)) return null;
  return layerConfig.find(isShortPipeConfigEntry) || null;
}

function shortPipeLayerHasFeatures() {
  if (!shortPipeLayer) return false;
  if (typeof shortPipeLayer.getLayers === 'function') {
    return shortPipeLayer.getLayers().length > 0;
  }
  if (typeof shortPipeLayer.eachLayer === 'function') {
    let count = 0;
    shortPipeLayer.eachLayer(() => {
      count++;
    });
    return count > 0;
  }
  return false;
}


function initializeFallbackShortPipeLayer() {
  if (shortPipeLayer) {
    return shortPipeLayer;
  }
  shortPipeLayer = L.featureGroup().addTo(map);
  shortPipeLayer._isFallback = true;
  shortPipeLayer._customLineColor = '#ff8800';
  shortPipeLayer._customLineWeight = 4;
  shortPipeLayer._customLayerName = 'Short Pipes';
  shortPipeLayer._qgasMeta = {
    elementKey: 'shortPipes',
    legendName: 'Short-Pipes',
    geometryClass: 'line'
  };
  rememberLayerInstanceForElementKey('shortPipes', shortPipeLayer);
  registerLegacyLayerReference('shortPipes', shortPipeLayer);
  registerLineColorUsage('#ff8800');
  originalShortPipeLayer = shortPipeLayer;
  return shortPipeLayer;
}

function syncPathStyle(layer, style = {}) {
  if (!layer || !layer._path) return;
  if (Object.prototype.hasOwnProperty.call(style, 'color') && style.color) {
    layer._path.style.stroke = style.color;
  }
  if (Object.prototype.hasOwnProperty.call(style, 'weight')) {
    const weight = typeof style.weight === 'number' ? style.weight : parseFloat(style.weight);
    if (!Number.isNaN(weight)) {
      layer._path.style.strokeWidth = `${weight}px`;
    }
  }
  if (Object.prototype.hasOwnProperty.call(style, 'opacity')) {
    const opacity = typeof style.opacity === 'number' ? style.opacity : parseFloat(style.opacity);
    if (!Number.isNaN(opacity)) {
      layer._path.style.opacity = `${opacity}`;
    }
  }
  if (Object.prototype.hasOwnProperty.call(style, 'dashArray')) {
    layer._path.style.strokeDasharray = style.dashArray ? style.dashArray : '';
  }
}

function getShortPipeSelectionStyle() {
  return {
    color: shortPipeLayer?._customLineColor || '#ff8800',
    weight: shortPipeLayer?._customLineWeight || 4,
    dashArray: null,
    opacity: 1
  };
}


const shortpipes = [];
if (shortPipeLayer) {
  shortPipeLayer.eachLayer(layer => {
    if (layer.feature) {
      shortpipes.push(layer.feature);
    }
  });
}


const START_NODE_KEYS = ['Start_Node', 'start_node', 'StartNode', 'startnode', 'START_NODE'];
const END_NODE_KEYS = ['End_Node', 'end_node', 'EndNode', 'endnode', 'END_NODE'];

// ==================== End of Pipeline Grouping Functions ====================


// Funktion zum Hinzufügen von Funktions-Buttons
function addFunctionBtn(label, onClick) {
  console.log('Versuche Button zu erstellen:', label);
  const btnContainer = document.getElementById('function-btns');
  if (!btnContainer) {
    console.error('Button container nicht gefunden! Element function-btns existiert nicht.');
    return null;
  }
  
  console.log('Button container gefunden, erstelle Button:', label);
  const btn = document.createElement('button');
  btn.className = 'function-btn';
  btn.textContent = label;
  btn.onclick = function () {
    console.log('Button geklickt:', label);
    setActiveBtn(btn);
    onClick();
  };
  btnContainer.appendChild(btn);
  console.log('Button erfolgreich hinzugefügt:', label);
  return btn;
}

// Highlight active button
function setActiveBtn(activeBtn) {
  document.querySelectorAll('.function-btn').forEach(btn => {
    btn.classList.toggle('active', btn === activeBtn);
  });
}

// Standardmäßig alle Modi deaktivieren
deactivateAllModes();

// Funktion zum Aktivieren des Bearbeitungsmodus für bestehende Features
/**
 * Deactivate all active editing modes and return to a clean state.
 *
 * Disables any open Leaflet Draw tool, closes popups, ends the current
 * node-position edit, clears pending delete selections, removes transient
 * UI overlays (direction buttons, save/discard strips), and resets all
 * mode-specific state variables. Called as a prerequisite by every
 * tool-activation function to prevent mode conflicts.
 *
 * @returns {void}
 */
function deactivateAllModes() {
  try {
    console.log('Deaktiviere alle Modi');
    applyEditGeometryVisibility(false);
    
    // Draw-Tools deaktivieren
    if (window.polylineDrawer && window.polylineDrawer._enabled) window.polylineDrawer.disable();
    if (window.markerDrawer && window.markerDrawer._enabled) window.markerDrawer.disable();
    
    // Popups schließen
    map.closePopup();

    if (typeof cleanupDeleteBoxSelection === 'function') {
      cleanupDeleteBoxSelection();
    }
    
    // Edit-Modus beenden
    if (editingLayer && editingLayer.editing) {
      editingLayer.editing.disable();
      editingLayer = null;
    }
    
    // Node-Positionsmodus verlassen falls aktiv
    if (nodePositionEditActive) {
      cleanupNodeEdit();
    }
    
    // Change Direction Pfeile entfernen
    if (pipelineLayer) {
      pipelineLayer.eachLayer(layer => {
        if (layer._arrowDecorator) {
          map.removeLayer(layer._arrowDecorator);
          delete layer._arrowDecorator;
        }
        if (layer.feature && layer.feature.geometry && layer.feature.geometry.type === 'LineString') {
          resetPipelineStyle(layer);
        }
      });
    }
    
    // Save/Leave Buttons entfernen
    const saveBtn = document.getElementById('save-edit-btn');
    if (saveBtn) saveBtn.remove();
    const discardBtn = document.getElementById('discard-edit-btn');
    if (discardBtn) discardBtn.remove();
    const saveDeleteBtn = document.getElementById('save-delete-btn');
    if (saveDeleteBtn) saveDeleteBtn.remove();
    const discardDeleteBtn = document.getElementById('discard-delete-btn');
    if (discardDeleteBtn) discardDeleteBtn.remove();
    const leaveBtn = document.getElementById('leave-delete-btn');
    if (leaveBtn) leaveBtn.remove();
    const shortpipeBtn = document.getElementById('shortpipe-save-btn');
    if (shortpipeBtn) shortpipeBtn.remove();
    const shortpipeDiscard = document.getElementById('shortpipe-discard-btn');
    if (shortpipeDiscard) shortpipeDiscard.remove();
    
    // Direction Change Buttons entfernen
    removeDirectionButtons();
    
    // Pipeline Division Modus beenden
    if (divisionMode) {
      divisionMode = false;
      divisionAwaitingLocation = false;
      if (selectedPipelineForDivision) {
        restoreDivisionBaseStyle(selectedPipelineForDivision);
      }
      selectedPipelineForDivision = null;
      selectedDivisionParentLayer = null;
      if (divisionLineGroups.length) {
        divisionLineGroups.forEach(group => {
          forEachPolylineFeature(group, layer => {
            restoreDivisionBaseStyle(layer);
            layer.off('click');
            setPipelineInteraction(layer, 'info');
          });
        });
      }
      divisionLineGroups = [];
      clearSupportPointMarkers();
    }
    
    // Alle Node-Event-Handler entfernen
    forEachNodeMarker(layer => {
      layer.off('click');
    });
    
    // Alle Infrastructure-Event-Handler entfernen
    [powerplantsLayer, lngLayer, storageLayer].forEach(elementLayer => {
      if (elementLayer) {
        elementLayer.eachLayer(layer => {
          layer.off('click');
        });
      }
    });
    
    // NICHT automatisch zum Info Mode wechseln - das macht selectTool
    // activateInfoMode();
    
    // Info Mode Button als aktiv markieren
    const infoBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Info Mode');
    if (infoBtn) {
      setActiveBtn(infoBtn);
      console.log('Info Mode Button als aktiv markiert');
    }
  } catch (error) {
    console.error('Error in deactivateAllModes:', error);
    // Fallback: Wenigstens Info Mode setzen
    currentMode = 'info';
  }
}

// Leave Edit Button
function showLeaveDeleteBtn() {
  removeLeaveDeleteBtn();
  const btn = document.createElement('button');
  btn.id = 'leave-delete-btn';
  btn.textContent = 'Leave Delete Mode';
  btn.style.position = 'fixed';
  btn.style.top = '30px';
  btn.style.left = '50%';
  btn.style.transform = 'translateX(-50%)';
  btn.style.zIndex = 2000;
  btn.style.padding = '10px 32px';
  btn.style.background = '#0070f3';
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.borderRadius = '5px';
  btn.style.fontSize = '16px';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  document.body.appendChild(btn);

  btn.onclick = function () {
    deactivateAllModes();
    activateInfoMode(); // Zurück zum Info Mode
    removeLeaveDeleteBtn();
  };
}

  function removeLeaveDeleteBtn() {
  const btn = document.getElementById('leave-delete-btn');
  if (btn) btn.remove();
}

// Legend Drag and Drop Funktionen
function makeLegendDraggable(element) {
  // Avoid double-binding
  if (element._dragHandlers) return;

  element.classList.add('draggable');
  
  // Find the parent Leaflet control container
  let controlContainer = element;
  while (controlContainer && !controlContainer.classList.contains('leaflet-control')) {
    controlContainer = controlContainer.parentElement;
  }
  
  // If we found the Leaflet control container, make it draggable and ensure it's visible
  const draggableElement = controlContainer || element;
  
  // Force the Leaflet control container to be visible
  if (controlContainer) {
    controlContainer.style.display = 'block';
    controlContainer.style.visibility = 'visible';
  }
  
  // Ensure the element is visible
  element.style.display = 'block';
  element.style.visibility = 'visible';
  
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;
  
  // Get current position
  const rect = draggableElement.getBoundingClientRect();
  xOffset = rect.left;
  yOffset = rect.top;
  
  console.log('Making legend draggable at position:', xOffset, yOffset);
  console.log('Draggable element:', draggableElement);
  console.log('Control container:', controlContainer);
  
  // Store original styles
  const originalPosition = draggableElement.style.position;
  const originalTop = draggableElement.style.top;
  const originalLeft = draggableElement.style.left;
  const originalRight = draggableElement.style.right;
  const originalBottom = draggableElement.style.bottom;
  const originalDisplay = draggableElement.style.display;

  element._originalStyles = {
    position: originalPosition,
    top: originalTop,
    left: originalLeft,
    right: originalRight,
    bottom: originalBottom,
    display: originalDisplay
  };
  
  // Convert to fixed positioning
  draggableElement.style.position = 'fixed';
  draggableElement.style.top = yOffset + 'px';
  draggableElement.style.left = xOffset + 'px';
  draggableElement.style.right = 'auto';
  draggableElement.style.zIndex = '1000';
  draggableElement.style.display = 'block';
  
  function dragStart(e) {
    if (e.type === 'touchstart') {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }
    
    if (e.target === element || element.contains(e.target)) {
      isDragging = true;
      e.preventDefault();
    }
  }
  
  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      
      if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }
      
      xOffset = currentX;
      yOffset = currentY;
      
      setTranslate(currentX, currentY, draggableElement);
    }
  }
  
  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }
  
  function setTranslate(xPos, yPos, el) {
    el.style.left = xPos + 'px';
    el.style.top = yPos + 'px';
  }
  
  // Store handlers and draggable element for cleanup
  element._dragHandlers = {
    dragStart,
    drag,
    dragEnd
  };
  element._draggableElement = draggableElement;
  element._controlContainer = controlContainer;
  
  element.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  element.addEventListener('touchstart', dragStart, { passive: false });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', dragEnd);
}

function removeLegendDraggable(element) {
  element.classList.remove('draggable');
  
  if (element._dragHandlers) {
    element.removeEventListener('mousedown', element._dragHandlers.dragStart);
    document.removeEventListener('mousemove', element._dragHandlers.drag);
    document.removeEventListener('mouseup', element._dragHandlers.dragEnd);
    element.removeEventListener('touchstart', element._dragHandlers.dragStart);
    document.removeEventListener('touchmove', element._dragHandlers.drag);
    document.removeEventListener('touchend', element._dragHandlers.dragEnd);
    delete element._dragHandlers;
  }
  
  // Reset position styles on the draggable element to return to Leaflet's positioning
  if (element._draggableElement) {
    if (element._originalStyles) {
      element._draggableElement.style.position = element._originalStyles.position;
      element._draggableElement.style.top = element._originalStyles.top;
      element._draggableElement.style.left = element._originalStyles.left;
      element._draggableElement.style.right = element._originalStyles.right;
      element._draggableElement.style.bottom = element._originalStyles.bottom;
      element._draggableElement.style.display = element._originalStyles.display;
    } else {
      element._draggableElement.style.position = '';
      element._draggableElement.style.top = '';
      element._draggableElement.style.left = '';
      element._draggableElement.style.right = '';
      element._draggableElement.style.bottom = '';
      element._draggableElement.style.display = '';
    }
    delete element._draggableElement;
  }
  
  // Reset control container display
  if (element._controlContainer) {
    element._controlContainer.style.display = '';
    delete element._controlContainer;
  }
  
  delete element._originalStyles;
}

function showTimeSeriesChart(properties) {
  console.log('Properties:', properties);
  
  // Extrahiere Ländercode aus den Properties
  let countryCode = null;
  
  // Suche nach Ländercode in verschiedenen möglichen Feldern
  if (properties.Country_Code) {
    countryCode = properties.Country_Code;
  } else if (properties.CNTR_CODE) {
    countryCode = properties.CNTR_CODE;
  } else if (properties.Country) {
    countryCode = properties.Country;
  } else if (properties.country) {
    countryCode = properties.country;
  } else if (properties.CC) {
    countryCode = properties.CC;
  } else if (properties.ISO) {
    countryCode = properties.ISO;
  }
  
  console.log('Found country code:', countryCode);
  
  if (!countryCode) {
    showErrorPopup('Country code not found in properties. Available fields: ' + Object.keys(properties).join(', '), '📈 Consumption Profile');
    return;
  }
  
  // Stelle sicher, dass es ein 2-stelliger Code ist
  if (countryCode.length > 2) {
    countryCode = countryCode.substring(0, 2);
  }
  
  const fileName = `Input/${countryCode.toUpperCase()}_Consumption_Profile_GWh.xlsx?v=${Date.now()}`;
  console.log('Trying to load file:', fileName);
  console.log('Country code:', countryCode);
  console.log('Properties:', properties);
  
  // Lade Excel-Datei
  fetch(fileName)
    .then(response => {
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Could not load file: ${fileName} (Status: ${response.status})`);
      }
      return response.arrayBuffer();
    })
    .then(data => {
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[1]; // Sheet 2 (Index 1)
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      
      // Extrahiere Zeitstempel und Werte
      const timestamps = [];
      const values = [];
      
      // Hole Population_Share für Skalierung
      const populationShare = parseFloat(properties.Population_Share) || 1;
      
      for (let i = 1; i < jsonData.length; i++) { // Überspringe Header-Zeile
        if (jsonData[i][0] && jsonData[i][1]) {
          timestamps.push(jsonData[i][0]);
          // Skaliere mit Population_Share
          values.push(parseFloat(jsonData[i][1]) * populationShare);
        }
      }
      
      // Zeige Chart
      displayChart(countryCode, timestamps, values, properties);
    })
    .catch(error => {
      showErrorPopup(`Error loading consumption profile: ${error.message}`, '📈 Consumption Profile');
    });
}

// Funktion zum Anzeigen des Charts
function displayChart(countryCode, timestamps, values, properties) {
  // Entferne vorhandenes Chart-Modal
  const existingModal = document.getElementById('chart-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Erstelle Modal für Chart
  const modal = document.createElement('div');
  modal.id = 'chart-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
  modal.style.zIndex = '10000';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  
  const chartContainer = document.createElement('div');
  chartContainer.style.backgroundColor = 'white';
  chartContainer.style.padding = '20px';
  chartContainer.style.borderRadius = '10px';
  chartContainer.style.width = '80%';
  chartContainer.style.height = '70%';
  chartContainer.style.position = 'relative';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '15px';
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'transparent';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => modal.remove();
  
  const title = document.createElement('h3');
  title.textContent = `Consumption Profile - ${properties.NUTS_ID || properties.NUTS3_ID || properties.NUTS_CODE || countryCode}`;
  title.style.marginTop = '0';
  title.style.textAlign = 'center';
  
  const canvas = document.createElement('canvas');
  canvas.id = 'consumption-chart';
  canvas.style.width = '100%';
  canvas.style.height = 'calc(100% - 60px)';
  
  chartContainer.appendChild(closeBtn);
  chartContainer.appendChild(title);
  chartContainer.appendChild(canvas);
  modal.appendChild(chartContainer);
  document.body.appendChild(modal);
  
  // Erstelle Chart mit Zoom-Funktionalität
  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: [{
        label: 'Consumption (GWh)',
        data: values,
        borderColor: '#ff8800',
        backgroundColor: 'rgba(255, 136, 0, 0.1)',
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Consumption (GWh)'
          }
        }
      },
      plugins: {
        legend: {
          display: true
        },
        zoom: {
          limits: {
            x: {min: 'original', max: 'original'}
          },
          pan: {
            enabled: false,
            mode: 'x'
          },
          zoom: {
            wheel: {
              enabled: true
            },
            pinch: {
              enabled: true
            },
            mode: 'x',
            drag: {
              enabled: false
            }
          }
        }
      }
    }
  });
  
  // Pan-Button hinzufügen (Hand-Symbol)
  const panBtn = document.createElement('button');
  panBtn.innerHTML = '✋';
  panBtn.style.position = 'absolute';
  panBtn.style.top = '50px';
  panBtn.style.right = '115px';
  panBtn.style.padding = '8px 12px';
  panBtn.style.border = 'none';
  panBtn.style.background = '#17a2b8';
  panBtn.style.color = 'white';
  panBtn.style.borderRadius = '4px';
  panBtn.style.cursor = 'pointer';
  panBtn.style.fontSize = '16px';
  panBtn.title = 'Click to enable pan mode';
  
  let panMode = false;
  panBtn.onclick = () => {
    panMode = !panMode;
    if (panMode) {
      // Pan aktivieren, Zoom deaktivieren
      chart.options.plugins.zoom.pan.enabled = true;
      chart.options.plugins.zoom.zoom.drag.enabled = false;
      chart.options.plugins.zoom.zoom.wheel.enabled = false;
      panBtn.style.background = '#28a745';
      panBtn.title = 'Pan mode enabled - drag to move timeline';
      // Zoom-Modus deaktivieren falls aktiv
      if (zoomMode) {
        zoomMode = false;
        zoomBtn.style.background = '#007bff';
        zoomBtn.title = 'Click to enable zoom selection';
      }
    } else {
      chart.options.plugins.zoom.pan.enabled = false;
      chart.options.plugins.zoom.zoom.wheel.enabled = true;
      panBtn.style.background = '#17a2b8';
      panBtn.title = 'Click to enable pan mode';
    }
    chart.update();
  };
  
  // Zoom-Button hinzufügen
  const zoomBtn = document.createElement('button');
  zoomBtn.innerHTML = '🔍';
  zoomBtn.style.position = 'absolute';
  zoomBtn.style.top = '50px';
  zoomBtn.style.right = '15px';
  zoomBtn.style.padding = '8px 12px';
  zoomBtn.style.border = 'none';
  zoomBtn.style.background = '#007bff';
  zoomBtn.style.color = 'white';
  zoomBtn.style.borderRadius = '4px';
  zoomBtn.style.cursor = 'pointer';
  zoomBtn.style.fontSize = '16px';
  zoomBtn.title = 'Click to enable zoom selection';
  
  let zoomMode = false;
  zoomBtn.onclick = () => {
    zoomMode = !zoomMode;
    if (zoomMode) {
      chart.options.plugins.zoom.zoom.drag.enabled = true;
      chart.options.plugins.zoom.pan.enabled = false;
      chart.options.plugins.zoom.zoom.wheel.enabled = false;
      zoomBtn.style.background = '#28a745';
      zoomBtn.title = 'Zoom mode enabled - drag to select area';
      // Pan-Modus deaktivieren falls aktiv
      if (panMode) {
        panMode = false;
        panBtn.style.background = '#17a2b8';
        panBtn.title = 'Click to enable pan mode';
      }
    } else {
      chart.options.plugins.zoom.zoom.drag.enabled = false;
      chart.options.plugins.zoom.zoom.wheel.enabled = true;
      zoomBtn.style.background = '#007bff';
      zoomBtn.title = 'Click to enable zoom selection';
    }
    chart.update();
  };
  
  // Reset-Zoom-Button hinzufügen
  const resetBtn = document.createElement('button');
  resetBtn.innerHTML = '↺';
  resetBtn.style.position = 'absolute';
  resetBtn.style.top = '50px';
  resetBtn.style.right = '65px';
  resetBtn.style.padding = '8px 12px';
  resetBtn.style.border = 'none';
  resetBtn.style.background = '#6c757d';
  resetBtn.style.color = 'white';
  resetBtn.style.borderRadius = '4px';
  resetBtn.style.cursor = 'pointer';
  resetBtn.style.fontSize = '16px';
  resetBtn.title = 'Reset zoom';
  resetBtn.onclick = () => {
    chart.resetZoom();
  };
  
  chartContainer.appendChild(panBtn);
  chartContainer.appendChild(zoomBtn);
  chartContainer.appendChild(resetBtn);
}// Funktions-Buttons mit einfacherer Logik (Fehlerbehandlung)
try {
  console.log('Erstelle Buttons...');
  
  addFunctionBtn('Info Mode', () => {
    try {
      console.log('Info Mode geklickt');
      currentMode = 'info';
      activateInfoMode();
      // Button-Highlighting wird automatisch durch onClick in addFunctionBtn gemacht
    } catch (error) {
      console.error('Error in Info Mode:', error);
    }
  });

  addFunctionBtn('Edit Geometry', () => {
    try {
      if (!checkContributorName()) return;
      console.log('Edit Mode geklickt');
      // Button wird automatisch durch onClick in addFunctionBtn hervorgehoben
      activateEditMode(); // Edit Mode aktivieren
      showInfoPopup('Edit Mode - Move the pipeline support points via drag and drop!\nChanges are confirmed by clicking "Save Changes".', '✏️ Edit Geometry');
    } catch (error) {
      console.error('Error in Edit Mode:', error);
    }
  });

  addFunctionBtn('🗑️ Delete', () => {
    try {
      if (!checkContributorName()) return;
      console.log('Delete Mode geklickt');
      // Button wird automatisch durch onClick in addFunctionBtn hervorgehoben
      activateDeleteMode(); // Delete Mode aktivieren
      showInfoPopup("🗑️ Delete mode active. Click elements to mark or unmark them. Use 'Delete Elements' to confirm or 'Discard Changes' to cancel.", '🗑️ Delete Mode');
      showSaveDeleteButton();
      showDiscardDeleteButton();
    } catch (error) {
      console.error('Error in Delete Mode:', error);
    }
  });

  addFunctionBtn('Split Node', () => {
    try {
      if (!checkContributorName()) return;
      console.log('Split Node geklickt');
      deactivateAllModes();
      const splitBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Split Node');
      if (splitBtn) setActiveBtn(splitBtn);
      currentMode = 'split-node';
      startSplitNode();
    } catch (error) {
      console.error('Error in Split Node:', error);
    }
  });

  addFunctionBtn('Add Pipeline', () => {
    console.log('*** ADD PIPELINE BUTTON CLICKED ***');
    try {
      if (!checkContributorName()) return;
      deactivateAllModes();
      const addPipelineBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Add Pipeline');
      if (addPipelineBtn) setActiveBtn(addPipelineBtn);
      currentMode = 'add-pipeline';
      promptPipelineLayerSelection(() => {
        try {
          proceedWithAddPipeline();
        } catch (error) {
          console.error('Error in Add Pipeline workflow:', error);
        }
      }, () => {
        currentMode = 'info';
        activateInfoMode();
      });
    } catch (error) {
      console.error('Error in Add Pipeline:', error);
    }
  });

  addFunctionBtn('Add Infrastructure', () => {
    try {
      if (!checkContributorName()) return;
      console.log('Add Infrastructure geklickt');
      deactivateAllModes();
      const addInfraBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Add Infrastructure');
      if (addInfraBtn) setActiveBtn(addInfraBtn);
      currentMode = 'add-infrastructure';
      const beginInfrastructureFlow = (connectToNode) => {
        if (connectToNode) {
          window.selectedNodeForInfrastructure = null;
          const availableNodeLayers = getAllNodeLayers();
          if (!availableNodeLayers.length) {
            showErrorPopup('Node layer is not available. Please load nodes before connecting infrastructure.', '🏗️ Add Infrastructure');
            currentMode = 'info';
            activateInfoMode();
            return;
          }
          showInfoPopup('Please click on a node to connect the infrastructure to it.', '🏗️ Add Infrastructure');
          setNodeSelectionHandlers(marker => {
            window.selectedNodeForInfrastructure = marker.feature?.properties?.ID;
            console.log('Node ausgewählt:', window.selectedNodeForInfrastructure);
            clearNodeSelectionHandlers();
            showCustomPopup(
              '✅ Node Selected',
              `<p style="text-align:center; margin: 10px 0;">Node <strong>${window.selectedNodeForInfrastructure}</strong> selected.<br>Click anywhere on the map to place the new infrastructure element.</p>`,
              [
                {
                  text: 'OK',
                  type: 'primary',
                  keepOpen: false,
                  onClick: () => {
                    activateManualInfrastructurePlacement();
                  }
                }
              ]
            );
          });
        } else {
          window.selectedNodeForInfrastructure = null;
          activateManualInfrastructurePlacement();
        }
      };

      showConfirmationPopup({
        title: '🏗️ Add Infrastructure',
        message: 'Connect the new infrastructure to an existing node?',
        confirmText: 'Select Node',
        cancelText: 'Place Freely',
        onConfirm: () => beginInfrastructureFlow(true),
        onCancel: () => beginInfrastructureFlow(false)
      });
    } catch (error) {
      console.error('Error in Add Infrastructure:', error);
    }
  });

  addFunctionBtn('Mark as Short-Pipe', () => {
    try {
      if (!checkContributorName()) return;
      console.log('Short-Pipe geklickt');
      deactivateAllModes();
      const shortPipeBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Mark as Short-Pipe');
      if (shortPipeBtn) setActiveBtn(shortPipeBtn);
      currentMode = 'shortpipe';
      startShortPipeSelection();
    } catch (error) {
      console.error('Error in Short-Pipe:', error);
    }
  });

  addFunctionBtn('Change Direction', () => {
    try {
      if (!checkContributorName()) return;
      console.log('Change Direction geklickt');
      deactivateAllModes();
      const changeDirectionBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Change Direction');
      if (changeDirectionBtn) setActiveBtn(changeDirectionBtn);
      currentMode = 'change-direction';
      const activated = activateChangeDirectionMode();
      if (!activated) {
        currentMode = 'info';
        activateInfoMode();
        const infoBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent === 'Info Mode');
        if (infoBtn) setActiveBtn(infoBtn);
        return;
      }
      showInfoPopup('Change Direction Mode active.\nClick on line elements to reverse their direction.\nUse Save or Discard buttons when finished.', '🔄 Change Direction');
      showSaveDirectionButton();
      showDiscardDirectionButton();
    } catch (error) {
      console.error('Error in Change Direction:', error);
    }
  });

  console.log('Alle Buttons erstellt');
} catch (error) {
  console.error('Critical error creating buttons:', error);
}

// Robust automatische Aktivierung des Info Mode beim Start
// Versucht wiederholt, bis der Button, die Funktion und alle wichtigen Layer verfügbar sind (avoids fragile timeouts)
function tryActivateInfoModeWhenReady(maxAttempts = 30, delay = 300) {
  if (window._infoAutoActivated) return;
  let attempts = 0;
  const id = setInterval(() => {
    attempts++;
    try {
      const infoBtn = Array.from(document.querySelectorAll('.function-btn')).find(btn => btn.textContent && btn.textContent.trim() === 'Info Mode');
      // Warte auch auf alle wichtigen Layer
      const layersReady = pipelineLayer && getAllNodeLayers().length && powerplantsLayer && compressorsLayer && lngLayer && storageLayer && consumptionLayer;
      if (infoBtn && typeof activateInfoMode === 'function' && layersReady) {
        console.log('Info Button und alle Layer gefunden nach', attempts, 'Versuchen – aktiviere Info Mode');
        try { setActiveBtn(infoBtn); } catch (e) { console.warn('setActiveBtn failed:', e); }
        try { activateInfoMode(); } catch (e) { console.error('activateInfoMode failed:', e); }
        window._infoAutoActivated = true;
        clearInterval(id);
        return;
      }
    } catch (err) {
      console.error('Error while trying to auto-activate Info Mode:', err);
    }
    if (attempts >= maxAttempts) {
      clearInterval(id);
      console.warn('Info Mode konnte nicht automatisch aktiviert werden (Button, Funktion oder Layer nicht gefunden).');
    }
  }, delay);
}

// Starte sofort den Versuch, Info Mode zu aktivieren
tryActivateInfoModeWhenReady(20, 300);

let deletedPipelines = [];
let deletedNodes = [];
let deletedCompressors = [];
let deletedStorages = [];
let deletedLNGs = [];
let deletedPowerplants = [];
let deletedCustomElements = [];
let deletedDrawnItems = [];
let pendingPipelineDeletions = [];
let pendingNodeDeletions = [];
let pendingCompressorDeletions = [];
let pendingStorageDeletions = [];
let pendingLNGDeletions = [];
let pendingPowerplantDeletions = [];
let pendingCustomDeletions = [];
let pendingDrawnItemDeletions = [];

// Modal-System Funktionen
let currentLayer = null;

/**
 * Display the element details modal.
 *
 * Stores the active layer reference, injects the provided title and HTML
 * content into the modal DOM elements, and makes the modal visible.
 * The modal remains open until {@link closeElementModal} is called.
 *
 * @param {string} title - Heading text for the modal.
 * @param {string} content - HTML string for the modal body (typically
 *   generated by {@link createModalPopupContent}).
 * @param {L.Layer} layer - Leaflet layer instance associated with the
 *   displayed element.
 * @returns {void}
 */
function showElementModal(title, content, layer) {
  currentLayer = layer;
  currentPopupLayer = layer;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('element-modal').style.display = 'flex';
}

/**
 * Close the element details modal.
 *
 * Hides the modal overlay and resets the highlight styles of any
 * previously highlighted pipeline or point-element layer. Clears the
 * internal <code>currentLayer</code>, <code>activePipeline</code>, and
 * <code>activeElement</code> references.
 *
 * @returns {void}
 */
function closeElementModal() {
  const modal = document.getElementById('element-modal');
  modal.style.display = 'none';
  
  // Pipeline-Highlight zurücksetzen
  if (currentLayer && activePipeline) {
    resetPipelineStyle(activePipeline);
    activePipeline = null;
  }
  
  // Element-Highlight zurücksetzen
  if (currentLayer && activeElement) {
    resetElementStyle(activeElement);
    activeElement = null;
  }
  
  currentLayer = null;
}

// ESC-Taste schließt Modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeElementModal();
    closeOptionsModal();
    closeColorPickerModal();
    closeStylePickerModal();
    closeSizePickerModal();
    closeLineTypePickerModal();
  }
});

// Klick außerhalb des Modals schließt es
document.getElementById('element-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeElementModal();
  }
});

document.getElementById('options-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeOptionsModal();
  }
});

document.getElementById('color-picker-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeColorPickerModal();
  }
});

document.getElementById('style-picker-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeStylePickerModal();
  }
});


// [EXTRACTED to module] Lines 233513-234803

// [EXTRACTED to module] Lines 234803-235413

// [EXTRACTED to module] Lines 235413-273543

// [EXTRACTED to module] Lines 273543-305419

// ==================== Additional Datasets Loading ====================

/**
 * Load supplementary GeoJSON datasets from the <code>Additional Datasets/</code>
 * server directory.
 *
 * Iterates a hardcoded list of dataset filenames and calls
 * {@link loadSingleDatasetWithCallback} for each. Loaded datasets are
 * added to the map as hidden layers and stored in the
 * <code>additionalDatasets</code> registry, making them available for
 * the integrate-dataset tool.
 *
 * @returns {void}
 */
function loadAdditionalDatasets() {
  const datasetFiles = [
    'INET_PipeSegments.geojson',
    // Neue Dateien können hier hinzugefügt werden:
    // 'MyCustomDataset.geojson',
    // 'AnotherPipeline.geojson'
  ];

  datasetFiles.forEach(filename => {
    loadSingleDatasetWithCallback(filename, () => {});
  });
}

function tryAutoDetectDatasets() {
  return new Promise((resolve, reject) => {
    // Versuche Directory-Listing über verschiedene Methoden
    const methods = [
      () => fetch('Additional Datasets/').then(r => r.text()).then(parseDirectoryListing),
      () => fetch('./Additional Datasets/').then(r => r.text()).then(parseDirectoryListing),
      () => Promise.reject('No auto-detection available')
    ];
    
    tryMethods(methods, 0, resolve, reject);
  });
  
  function tryMethods(methods, index, resolve, reject) {
    if (index >= methods.length) {
      reject('All auto-detection methods failed');
      return;
    }
    
    methods[index]().then(resolve).catch(() => {
      tryMethods(methods, index + 1, resolve, reject);
    });
  }
}

function parseDirectoryListing(html) {
  const files = [];
  const regex = /href="([^"]*\.geojson)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    files.push(match[1]);
  }
  return files;
}

function loadSingleDataset(filename) {
  loadSingleDatasetWithCallback(filename, () => {});
}

function loadSingleDatasetWithCallback(filename, callback) {
  const possiblePaths = [
    `Additional%20Datasets/${filename}?v=${Date.now()}`,
    `Additional Datasets/${filename}?v=${Date.now()}`,
    `./Additional%20Datasets/${filename}?v=${Date.now()}`,
    `./Additional Datasets/${filename}?v=${Date.now()}`
  ];
  
  console.log(`=== Loading dataset: ${filename} ===`);
  console.log('Trying paths:', possiblePaths);
  
  tryLoadPath(possiblePaths, 0);
  
  function tryLoadPath(paths, index) {
    if (index >= paths.length) {
      console.error(`❌ All paths failed for: ${filename}`);
      callback(false);
      return;
    }
    
    const currentPath = paths[index];
    console.log(`🔄 Trying path ${index + 1}/${paths.length}: ${currentPath}`);
    
    fetch(currentPath)
      .then(response => {
        console.log(`📡 Response for ${currentPath}:`, response.status, response.statusText);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
      })
      .then(data => {
        console.log(`✅ Successfully loaded JSON for: ${filename}`);
        console.log('Features count:', data.features ? data.features.length : 'No features array');
        createDatasetLayer(filename, data);
        callback(true);
      })
      .catch(error => {
        console.log(`❌ Failed path ${currentPath}:`, error.message);
        // Nächsten Pfad versuchen
        tryLoadPath(paths, index + 1);
      });
  }
}

function formatFeatureProperties(properties) {
  let html = '<table style="width:100%; border-collapse: collapse; font-size: 12px;">';
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined || value === '') continue;
    const safeKey = String(key).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeVal = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html += `<tr><td style="padding:2px 6px; font-weight:bold; white-space:nowrap;">${safeKey}</td><td style="padding:2px 6px;">${safeVal}</td></tr>`;
  }
  html += '</table>';
  return html;
}

function createDatasetLayer(filename, data) {
  // Layer erstellen (unsichtbar)
  const layer = L.geoJSON(data, {
    style: {
      color: '#ff6600',
      weight: 4,
      opacity: 0.8
    },
    onEachFeature: function(feature, layer) {
      // Popup für Info
      if (feature.properties) {
        let popupContent = `<div style="max-width: 350px;">`;
        popupContent += `<h4 style="margin: 0 0 10px 0; color: #ff6600;">${filename.replace('.geojson', '')}</h4>`;
        popupContent += formatFeatureProperties(feature.properties);
        popupContent += '</div>';
        
        layer.bindPopup(popupContent, {maxWidth: 400});
      }
    }
  });
  
  // Layer zur Karte hinzufügen aber unsichtbar machen
  layer.addTo(map);
  layer.setStyle({opacity: 0, fillOpacity: 0});
  
  // In additionalDatasets speichern
  additionalDatasets[filename] = {
    layer: layer,
    data: data,
    visible: false
  };
  
  console.log(`Dataset ${filename} loaded and hidden`);
}

// ==================== Dataset Integration Functions ====================


// ===== Global layer helper functions (added for modular tools) =====
// Tools modules rely on these to work across *all* configured layers.
/**
 * Return all node-type Leaflet layers currently registered in the project.
 *
 * First queries <code>layerConfig</code> for entries with
 * <code>Type === 'node'</code>, then performs a fallback heuristic scan
 * of <code>dynamicLayers</code> using metadata type hints and key names.
 * Both the primary and fallback result sets are deduplicated.
 *
 * @returns {Array<L.LayerGroup>} Array of Leaflet layer groups whose
 *   features represent network nodes.
 * @example
 * // Count all node markers across the project
 * let count = 0;
 * getAllNodeLayers().forEach(lg => lg.eachLayer(() => count++));
 * console.log('Total nodes:', count);
 */
function getAllNodeLayers() {
  try {
    const layers = [];
    // Prefer configuration if available
    if (Array.isArray(layerConfig) && layerConfig.length && dynamicLayers) {
      layerConfig.forEach(cfg => {
        const type = String(cfg.Type || cfg.type || '').toLowerCase();
        const name = cfg.Filename || cfg.filename || cfg.File || cfg.file || '';
        const layer = dynamicLayers[name] || dynamicLayers[cfg.LayerName || cfg.layerName || name] || null;
        if (!layer) return;
        if (type === 'node' || type === 'nodes' || type.includes('node')) {
          layers.push(layer);
        }
      });
    }
    // Fallback: heuristic scan dynamicLayers
    if (dynamicLayers) {
      Object.keys(dynamicLayers).forEach(key => {
        const layer = dynamicLayers[key];
        if (!layer) return;
        const meta = (typeof resolveLayerMetadata === 'function') ? resolveLayerMetadata(layer) : null;
        const hint = String((meta && (meta.typeHint || meta.elementType)) || '').toLowerCase();
        if (hint.includes('node') || String(key).toLowerCase().includes('node')) {
          if (!layers.includes(layer)) layers.push(layer);
        }
      });
    }
    return layers;
  } catch (e) {
    console.error('getAllNodeLayers failed:', e);
    return [];
  }
}

/**
 * Return all line-type Leaflet layers currently registered in the project.
 *
 * Queries <code>layerConfig</code> for entries with
 * <code>Type === 'line'</code> or <code>'pipeline'</code>, then performs
 * a heuristic scan of <code>dynamicLayers</code>. If metadata hints are
 * unavailable, samples the first feature geometry of each layer to
 * determine whether it is a <code>LineString</code> or
 * <code>MultiLineString</code>.
 *
 * @returns {Array<L.LayerGroup>} Array of Leaflet layer groups whose
 *   features represent pipeline or line-string infrastructure.
 */
function getAllLineLayers() {
  try {
    const layers = [];
    if (Array.isArray(layerConfig) && layerConfig.length && dynamicLayers) {
      layerConfig.forEach(cfg => {
        const type = String(cfg.Type || cfg.type || '').toLowerCase();
        const name = cfg.Filename || cfg.filename || cfg.File || cfg.file || '';
        const layer = dynamicLayers[name] || dynamicLayers[cfg.LayerName || cfg.layerName || name] || null;
        if (!layer) return;
        if (type === 'line' || type === 'lines' || type.includes('line') || type.includes('pipeline')) {
          layers.push(layer);
        }
      });
    }
    if (dynamicLayers) {
      Object.keys(dynamicLayers).forEach(key => {
        const layer = dynamicLayers[key];
        if (!layer) return;
        const meta = (typeof resolveLayerMetadata === 'function') ? resolveLayerMetadata(layer) : null;
        const hint = String((meta && (meta.typeHint || meta.elementType)) || '').toLowerCase();
        // Identify GeoJSON line layers by sampling first feature when possible
        let isLine = hint.includes('line') || hint.includes('pipeline') || String(key).toLowerCase().includes('pipe');
        if (!isLine && typeof layer.eachLayer === 'function') {
          let decided = false;
          layer.eachLayer(ch => {
            if (decided) return;
            if (ch && ch.feature && ch.feature.geometry && (ch.feature.geometry.type === 'LineString' || ch.feature.geometry.type === 'MultiLineString')) {
              isLine = true;
              decided = true;
            }
          });
        }
        if (isLine) {
          if (!layers.includes(layer)) layers.push(layer);
        }
      });
    }
    return layers;
  } catch (e) {
    console.error('getAllLineLayers failed:', e);
    return [];
  }
}

// Expose helpers globally for tool modules
window.__coreGetAllNodeLayers = getAllNodeLayers;
window.getAllNodeLayers = getAllNodeLayers;
window.getAllLineLayers = getAllLineLayers;


// --- Restored from original GUI.html to support modular tools ---
// activateInfoMode moved to info_mode.js module


// --- Restored from original GUI.html (used after layer load) ---
function linkInlineElementsToNearbyNodes(toleranceMeters = 50) {
    if (!map) return;
    const inlineLayers = getAllInlineLayers();
    const nodeLayers = getAllNodeLayers();
    if (!inlineLayers.length || !nodeLayers.length) return;

    const nodeIndex = [];
    nodeLayers.forEach(layerGroup => {
      if (!layerGroup) return;
      layerGroup.eachLayer(marker => {
        const id = marker.feature?.properties?.ID;
        const ll = marker.getLatLng?.();
        if (!id || !ll) return;
        nodeIndex.push({ id, latlng: ll });
      });
    });

    const findClosestNodes = (latlng) => {
      if (!latlng) return [];
      return nodeIndex
        .map(entry => ({
          id: entry.id,
          dist: map.distance(latlng, entry.latlng)
        }))
        .filter(n => n.dist <= toleranceMeters)
        .sort((a, b) => a.dist - b.dist);
    };

    inlineLayers.forEach(layerGroup => {
      layerGroup.eachLayer(marker => {
        const props = marker.feature?.properties || {};
        if (props.Start_Node || props.End_Node || props.Node) return;
        const latlng = marker.getLatLng?.();
        const nearby = findClosestNodes(latlng);
        if (nearby.length >= 2) {
          props.Start_Node = nearby[0].id;
          props.End_Node = nearby[1].id;
          props.Node = '';
        } else if (nearby.length === 1) {
          props.Node = nearby[0].id;
          props.Start_Node = '';
          props.End_Node = '';
        }
      });
    });
  }
