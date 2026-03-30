<div class="breadcrumb">QGas / API / JavaScript</div>
<h1>JavaScript Modules</h1>
<p>This page is generated automatically from the module headers and JSDoc annotations in <code>js/</code> on every build.</p>
<details class="tool-section">
<summary><code>js/core.js</code></summary>
<div class="module-header">
<p><strong>QGas - Core Application Module</strong></p>
<p>This is the main JavaScript module for the QGas Interactive Gas Infrastructure Toolkit. It handles map initialization, data loading, user interactions, and all core functionality for visualizing and editing pipeline infrastructure.</p>
<p><strong>Key Responsibilities:</strong></p>
<ul>
  <li>Map initialization and layer management (Leaflet.js)</li>
  <li>Dynamic layer loading and registry management</li>
  <li>Project context management</li>
  <li>Contributor tracking system</li>
  <li>Infrastructure element CRUD operations</li>
  <li>Interactive editing modes (add, edit, delete pipelines/nodes)</li>
  <li>Styling and visual customization</li>
  <li>Data persistence and synchronization</li>
  <li>Element attribute management</li>
  <li>Filter and search functionality</li>
</ul>
<p><strong>Technical Stack:</strong></p>
<ul>
  <li>Leaflet.js for interactive mapping</li>
  <li>GeoJSON for infrastructure data</li>
  <li>LocalStorage for client-side persistence</li>
</ul>
<p><strong>Module Structure:</strong></p>
<ul>
  <li>Global state variables and configuration</li>
  <li>Layer management and registry</li>
  <li>Map initialization</li>
  <li>Data loading and processing</li>
  <li>Interactive tools and modes</li>
  <li>Element management (CRUD operations)</li>
  <li>UI helpers and utilities</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>DOM containers and UI elements declared in Map.html.</li>
  <li>External libraries: Leaflet, Leaflet.Draw, JSZip, XLSX, Chart.js.</li>
  <li>Global runtime state (layerConfig, dynamicLayers, contributorInitials).</li>
</ul>
<p><strong>Public API (selected):</strong></p>
<ul>
  <li>formatElementId(prefix, contributor, number): Build a standardized element ID.</li>
  <li>getFacilityPrefix(type): Resolve or register a facility prefix.</li>
  <li>getNextIdNumber(type, layerOverride): Compute the next sequential ID number.</li>
  <li>createNewNode(latlng, nodeId, options): Create and register a node marker.</li>
  <li>getAllNodeLayers(): Return active node layers.</li>
  <li>getAllLineLayers(): Return active line layers.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>sanitizeProjectName(name)</code></p>
<p class="api-desc">QGas - Core Application Module This is the main JavaScript module for the QGas Interactive Gas Infrastructure Toolkit. It handles map initialization, data loading, user interactions, and all core functionality for visualizing and editing pipeline infrastructure. Key Responsibilities: - Map initialization and layer management (Leaflet.js) - Dynamic layer loading and registry management - Project context management - Contributor tracking system - Infrastructure element CRUD operations - Interactive editing modes (add, edit, delete pipelines/nodes) - Styling and visual customization - Data persistence and synchronization - Element attribute management - Filter and search functionality Technical Stack: - Leaflet.js for interactive mapping - GeoJSON for infrastructure data - LocalStorage for client-side persistence Module Structure: - Global state variables and configuration - Layer management and registry - Map initialization - Data loading and processing - Interactive tools and modes - Element management (CRUD operations) - UI helpers and utilities Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - DOM containers and UI elements declared in Map.html. - External libraries: Leaflet, Leaflet.Draw, JSZip, XLSX, Chart.js. - Global runtime state (layerConfig, dynamicLayers, contributorInitials). Public API (selected): - formatElementId(prefix, contributor, number): Build a standardized element ID. - getFacilityPrefix(type): Resolve or register a facility prefix. - getNextIdNumber(type, layerOverride): Compute the next sequential ID number. - createNewNode(latlng, nodeId, options): Create and register a node marker. - getAllNodeLayers(): Return active node layers. - getAllLineLayers(): Return active line layers. / /* ================================================================================ GLOBAL STATE - CONTRIBUTOR SYSTEM Top-level declarations required for contributor attribution. / let contributorName = &#x27;&#x27;; let contributorInitials = &#x27;&#x27;; let contributors = []; /* ================================================================================ GLOBAL STATE - PROJECT MANAGEMENT The current dataset folder that scopes layer discovery and persistence. / /* Default project selection used when no other context is resolved. */ let currentProject = &#x27;Standard&#x27;; /* ================================================================================ GLOBAL STATE - LAYER MANAGEMENT Dynamic layer registries and caches for infrastructure visualization. / /* Layer configuration entries loaded from Excel or fallback defaults. */ let layerConfig = []; /* Registry for dynamically loaded layers keyed by layer name. */ let dynamicLayers = {}; /* Layer metadata (type, style, and legend conventions). */ const layerMetadataRegistry = {}; /* Index mapping element keys to their metadata records. */ const elementKeyMetadataIndex = {}; /* Mapping from element keys to their layer instances. */ const elementTypeLayerMap = {}; /* Layer groups holding deleted elements for undo or audit workflows. */ const deletedLayerRegistry = {}; /* Cache of layers eligible for styling controls. */ let styleableLayerRegistry = new Map(); /* Dirty flag to force rebuilding the styleable layer cache. */ let styleableLayerRegistryDirty = true; /* Temporary store of point layers hidden during edit geometry mode. */ const editModeHiddenPointLayers = new Set(); /* Toggle that tracks the edit-geometry visibility state. */ let editGeometryVisibilityActive = false; /* ================================================================================ GLOBAL STATE - STYLING AND COLORS Centralized color registries and palettes for styling elements. / const customLineColorPalette = [ &#x27;#1f77b4&#x27;, &#x27;#ff7f0e&#x27;, &#x27;#2ca02c&#x27;, &#x27;#d62728&#x27;, &#x27;#9467bd&#x27;, &#x27;#8c564b&#x27;, &#x27;#e377c2&#x27;, &#x27;#7f7f7f&#x27;, &#x27;#bcbd22&#x27;, &#x27;#17becf&#x27;, &#x27;#ff6f61&#x27;, &#x27;#60a917&#x27;, &#x27;#0099c6&#x27;, &#x27;#dd4477&#x27;, &#x27;#66aa00&#x27;, &#x27;#b82e2e&#x27;, &#x27;#316395&#x27;, &#x27;#994499&#x27; ]; /* Tracks line colors currently assigned to line layers. */ const usedLineColors = new Map(); /* Predefined color schemes for quick selection. */ const quickColorCollections = [ { title: &#x27;Pipeline essentials&#x27;, description: &#x27;High-contrast line colors&#x27;, colors: [&#x27;#FF5E5B&#x27;, &#x27;#FFB400&#x27;, &#x27;#1F77B4&#x27;, &#x27;#2ECC71&#x27;, &#x27;#B52B65&#x27;, &#x27;#333652&#x27;] }, { title: &#x27;Bright nodes&#x27;, description: &#x27;Vivid point colors&#x27;, colors: [&#x27;#E63946&#x27;, &#x27;#F4A261&#x27;, &#x27;#2A9D8F&#x27;, &#x27;#3A86FF&#x27;, &#x27;#8338EC&#x27;, &#x27;#FF006E&#x27;] }, { title: &#x27;Soft overlays&#x27;, description: &#x27;Pastel background layers&#x27;, colors: [&#x27;#FFCDB2&#x27;, &#x27;#FFAFCC&#x27;, &#x27;#BDE0FE&#x27;, &#x27;#C7F9CC&#x27;, &#x27;#F4E285&#x27;, &#x27;#E0AAFF&#x27;] } ]; /* Recent color history for UI recall. */ const recentColorSelections = []; /* Maximum number of recent colors to retain. */ const MAX_RECENT_COLORS = 6; /* ================================================================================ PROJECT PERSISTENCE LocalStorage keys and defaults for persisting project context. / const PROJECT_STORAGE_KEY = &#x27;qgasSelectedProject&#x27;; const DEFAULT_PROJECT = &#x27;Standard&#x27;; /** Sanitize project name to prevent injection and ensure filesystem compatibility</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>name</code></td><td><code>string</code></td><td>Raw project name</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Sanitized project name (alphanumeric, underscore, hyphen only)</p>
</div>
<div class="api-func">
<p class="api-sig"><code>persistProjectSelection(projectName)</code></p>
<p class="api-desc">Persist the selected project to browser localStorage for future sessions</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>projectName</code></td><td><code>string</code></td><td>Project name to save</td></tr>
</tbody></table>
</div>
<div class="api-func">
<p class="api-sig"><code>getStoredProjectSelection()</code></p>
<p class="api-desc">Retrieve the stored project selection from localStorage</p>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Stored project name or empty string if not found</p>
</div>
<div class="api-func">
<p class="api-sig"><code>getProjectFromQuery()</code></p>
<p class="api-desc">Extract project name from URL query parameters</p>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Project name from URL or empty string</p>
</div>
<div class="api-func">
<p class="api-sig"><code>fetchProjectFromServer()</code></p>
<p class="api-desc">Fetch current project from the server API</p>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;string&gt;</code> — Project name from server or empty string</p>
</div>
<div class="api-func">
<p class="api-sig"><code>determineProjectContext()</code></p>
<p class="api-desc">Determine the active project context from multiple sources Priority: URL query &gt; Server API &gt; LocalStorage &gt; Default</p>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;string&gt;</code> — Resolved project name</p>
</div>
<div class="api-func">
<p class="api-sig"><code>normalizeColorHex(color)</code></p>
<p class="api-desc">Normalize color values to lowercase hex format (#rrggbb) Handles short hex (#rgb) and values without # prefix</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>color</code></td><td><code>string</code></td><td>Input color value</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Normalized hex color or empty string</p>
</div>
<div class="api-func">
<p class="api-sig"><code>registerLineColorUsage(color)</code></p>
<p class="api-desc">Track usage of a line color for statistics and recommendations</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>color</code></td><td><code>string</code></td><td>Color hex value to register</td></tr>
</tbody></table>
</div>
<div class="api-func">
<p class="api-sig"><code>formatElementId(prefix, contributor, number)</code></p>
<p class="api-desc">Format a standardized element ID with prefix, contributor initials, and number</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>prefix</code></td><td><code>string</code></td><td>Element type prefix (e.g., &#x27;PL&#x27; for pipeline)</td></tr>
<tr><td><code>contributor</code></td><td><code>string</code></td><td>Contributor initials</td></tr>
<tr><td><code>number</code></td><td><code>number</code></td><td>Sequential number</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Formatted ID (e.g., &#x27;PL_ABC_001&#x27;)</p>
</div>
<div class="api-func">
<p class="api-sig"><code>openInfoOverlay(layer)</code></p>
<p class="api-desc">Open the attribute info overlay for a pipeline feature. Highlights the clicked pipeline layer, stores it as the active popup layer for attribute editing, generates the attribute form via {@link createAttributeForm}, and binds Save, Add Attribute, and Delete action handlers. The overlay remains visible until the user dismisses it or selects another element.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>layer</code></td><td><code>L.Path</code></td><td>The Leaflet polyline layer whose attributes should be displayed.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>checkContributorName()</code></p>
<p class="api-desc">Check whether a valid contributor name has been entered. Reads the &lt;code&gt;#contributor-input&lt;/code&gt; field and returns &lt;code&gt;false&lt;/code&gt; (showing a contributor dialog) when the value is empty or still the default placeholder &lt;em&gt;&quot;Max Mustermann&quot;&lt;/em&gt;. All editing tools call this guard before modifying map data to ensure every change is attributed to a real contributor.</p>
<p class="api-returns"><strong>Returns:</strong> <code>boolean</code> — &lt;code&gt;true&lt;/code&gt; if a valid contributor name is present; &lt;code&gt;false&lt;/code&gt; otherwise.</p>
</div>
<div class="api-func">
<p class="api-sig"><code>createNewNode(latlng, nodeId, options = {})</code></p>
<p class="api-desc">Create and register a new node marker on the map. Creates a Leaflet CircleMarker at &lt;code&gt;latlng&lt;/code&gt; with the default node style, attaches a GeoJSON feature with &lt;code&gt;Type: &#x27;Node&#x27;&lt;/code&gt; and the provided &lt;code&gt;nodeId&lt;/code&gt;, and adds it to the appropriate node layer (determined via &lt;code&gt;options.targetLayer&lt;/code&gt; or the global &lt;code&gt;nodeLayer&lt;/code&gt;). Wires up mode-aware click handlers for info display and pipeline-connection callbacks.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>latlng</code></td><td><code>L.LatLng</code></td><td>Geographic position for the new node.</td></tr>
<tr><td><code>nodeId</code></td><td><code>string</code></td><td>Unique identifier to assign to the node feature (&lt;code&gt;properties.ID&lt;/code&gt;).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>L.CircleMarker</code> — The created node marker.</p>
</div>
<div class="api-func">
<p class="api-sig"><code>getFacilityPrefix(type)</code></p>
<p class="api-desc">Return the GeoJSON type prefix string for a given element type. Looks up the internal &lt;code&gt;facilityTypeMap&lt;/code&gt; for a registered prefix; if none exists, derives one from the type name via {@link generatePrefixFromName} and registers it. Used to construct standardised element IDs (&lt;code&gt;PREFIX_CONTRIBUTOR_NNN&lt;/code&gt;).</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>type</code></td><td><code>string</code></td><td>Element type name (e.g., &lt;code&gt;&#x27;Pipeline&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;Node&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;Compressor&#x27;&lt;/code&gt;).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Two-to-three-character prefix string (e.g., &lt;code&gt;&#x27;PL&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;N&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;C&#x27;&lt;/code&gt;).</p>
</div>
<div class="api-func">
<p class="api-sig"><code>getNextIdNumber(type, layerOverride = null)</code></p>
<p class="api-desc">Return the next available sequential ID number for a given element type. Scans all layers of the specified type to collect existing numeric suffixes matching the pattern &lt;code&gt;PREFIX_CONTRIBUTOR_NNN&lt;/code&gt; and returns the lowest unused positive integer. Accepts an optional &lt;code&gt;layerOverride&lt;/code&gt; to restrict scanning to a specific layer.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>type</code></td><td><code>string</code></td><td>Element type (e.g., &lt;code&gt;&#x27;Pipeline&#x27;&lt;/code&gt;).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>number</code> — Next unused sequential number (always ≥ 1).</p>
</div>
<div class="api-func">
<p class="api-sig"><code>deactivateAllModes()</code></p>
<p class="api-desc">Deactivate all active editing modes and return to a clean state. Disables any open Leaflet Draw tool, closes popups, ends the current node-position edit, clears pending delete selections, removes transient UI overlays (direction buttons, save/discard strips), and resets all mode-specific state variables. Called as a prerequisite by every tool-activation function to prevent mode conflicts.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>showElementModal(title, content, layer)</code></p>
<p class="api-desc">Display the element details modal. Stores the active layer reference, injects the provided title and HTML content into the modal DOM elements, and makes the modal visible. The modal remains open until {@link closeElementModal} is called.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>title</code></td><td><code>string</code></td><td>Heading text for the modal.</td></tr>
<tr><td><code>content</code></td><td><code>string</code></td><td>HTML string for the modal body (typically generated by {@link createModalPopupContent}).</td></tr>
<tr><td><code>layer</code></td><td><code>L.Layer</code></td><td>Leaflet layer instance associated with the displayed element.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>closeElementModal()</code></p>
<p class="api-desc">Close the element details modal. Hides the modal overlay and resets the highlight styles of any previously highlighted pipeline or point-element layer. Clears the internal &lt;code&gt;currentLayer&lt;/code&gt;, &lt;code&gt;activePipeline&lt;/code&gt;, and &lt;code&gt;activeElement&lt;/code&gt; references.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>loadAdditionalDatasets()</code></p>
<p class="api-desc">Load supplementary GeoJSON datasets from the &lt;code&gt;Additional Datasets/&lt;/code&gt; server directory. Iterates a hardcoded list of dataset filenames and calls {@link loadSingleDatasetWithCallback} for each. Loaded datasets are added to the map as hidden layers and stored in the &lt;code&gt;additionalDatasets&lt;/code&gt; registry, making them available for the integrate-dataset tool.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>getAllNodeLayers()</code></p>
<p class="api-desc">Return all node-type Leaflet layers currently registered in the project. First queries &lt;code&gt;layerConfig&lt;/code&gt; for entries with &lt;code&gt;Type === &#x27;node&#x27;&lt;/code&gt;, then performs a fallback heuristic scan of &lt;code&gt;dynamicLayers&lt;/code&gt; using metadata type hints and key names. Both the primary and fallback result sets are deduplicated.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array&lt;L.LayerGroup&gt;</code> — Array of Leaflet layer groups whose features represent network nodes.</p>
</div>
<div class="api-func">
<p class="api-sig"><code>getAllLineLayers()</code></p>
<p class="api-desc">Return all line-type Leaflet layers currently registered in the project. Queries &lt;code&gt;layerConfig&lt;/code&gt; for entries with &lt;code&gt;Type === &#x27;line&#x27;&lt;/code&gt; or &lt;code&gt;&#x27;pipeline&#x27;&lt;/code&gt;, then performs a heuristic scan of &lt;code&gt;dynamicLayers&lt;/code&gt;. If metadata hints are unavailable, samples the first feature geometry of each layer to determine whether it is a &lt;code&gt;LineString&lt;/code&gt; or &lt;code&gt;MultiLineString&lt;/code&gt;.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array&lt;L.LayerGroup&gt;</code> — Array of Leaflet layer groups whose features represent pipeline or line-string infrastructure.</p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/shared/node_layers.js</code></summary>
<div class="module-header">
<p><strong>QGas - Node Layers Shared Module</strong></p>
<p>Provides centralized utilities for discovering and managing node layers across the application. This module is loaded early in the initialization sequence to ensure tools and other modules can reliably access node layer information.</p>
<p><strong>Key Responsibilities:</strong></p>
<ul>
  <li>Discover all node/point layers in the system</li>
  <li>Provide unified interface for node layer queries</li>
  <li>Support both dynamic and legacy layer systems</li>
  <li>Handle fallback scenarios gracefully</li>
</ul>
<p><strong>Usage:</strong></p>
<ul>
  <li>getAllNodeLayers() - Returns array of all node layer objects</li>
  <li>getNodeLayerEntries() - Returns detailed node layer entries with metadata</li>
</ul>
<p>This module uses an IIFE (Immediately Invoked Function Expression) to avoid polluting the global scope while exposing necessary functions.</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Global layer registries (dynamicLayers, layerMetadataRegistry).</li>
  <li>Legacy layer references (nodeLayer, hydrogenNodeLayer).</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>getAllNodeLayers(): Return all discovered node layers.</li>
  <li>getNodeLayerEntries(): Return node layer entries with metadata.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>fallbackScan()</code></p>
<p class="api-desc">QGas - Node Layers Shared Module Provides centralized utilities for discovering and managing node layers across the application. This module is loaded early in the initialization sequence to ensure tools and other modules can reliably access node layer information. Key Responsibilities: - Discover all node/point layers in the system - Provide unified interface for node layer queries - Support both dynamic and legacy layer systems - Handle fallback scenarios gracefully Usage: - getAllNodeLayers() - Returns array of all node layer objects - getNodeLayerEntries() - Returns detailed node layer entries with metadata This module uses an IIFE (Immediately Invoked Function Expression) to avoid polluting the global scope while exposing necessary functions. Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Global layer registries (dynamicLayers, layerMetadataRegistry). - Legacy layer references (nodeLayer, hydrogenNodeLayer). Public API: - getAllNodeLayers(): Return all discovered node layers. - getNodeLayerEntries(): Return node layer entries with metadata. / /* Shared helper loaded early so tools can call getAllNodeLayers() reliably. / (function () { /** Fallback scan for node layers when core functions are not yet available Searches through dynamicLayers and legacy layer references</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of node layer objects</p>
</div>
<div class="api-func">
<p class="api-sig"><code>getAllNodeLayers()</code></p>
<p class="api-desc">Get all node layers from the system Attempts to use core functions first, falls back to scanning if unavailable</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of all node/point layer objects</p>
</div>
<div class="api-func">
<p class="api-sig"><code>getNodeLayerEntries()</code></p>
<p class="api-desc">Get detailed node layer entries with metadata Returns an array of objects containing key, label, layer reference, and metadata</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of node layer entry objects {key, label, layer, meta}</p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/export.js</code></summary>
<div class="module-header">
<p><strong>QGas - Export Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Handles export workflows for changed, filtered, and complete datasets, including ZIP assembly and Excel configuration generation.</p>
<p>Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
<p><strong>Inputs:</strong></p>
<ul>
  <li>In-memory layer state (dynamicLayers, layerConfig, deleted registry).</li>
  <li>External libraries: JSZip, XLSX.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>exportChanges(): Export modified and deleted elements.</li>
  <li>exportFilteredData(folderName): Export filtered datasets to ZIP.</li>
  <li>exportCompleteDataset(): Export the full current dataset to ZIP.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>exportChanges()</code></p>
<p class="api-desc">QGas - Export Module Module Description: Handles export workflows for changed, filtered, and complete datasets, including ZIP assembly and Excel configuration generation. Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - In-memory layer state (dynamicLayers, layerConfig, deleted registry). - External libraries: JSZip, XLSX. Public API: - exportChanges(): Export modified and deleted elements. - exportFilteredData(folderName): Export filtered datasets to ZIP. - exportCompleteDataset(): Export the full current dataset to ZIP. / /* Extracted export logic from core.js (v5). / /** Export all modified and deleted elements as GeoJSON files in a ZIP archive. Collects every layer feature marked with &lt;code&gt;modified: true&lt;/code&gt; and all entries in the soft-deletion registry. Organises the output into GeoJSON files per infrastructure type (pipelines, nodes, compressors, storages, power-plants, etc.) and triggers a browser download of the resulting ZIP archive (&lt;code&gt;changes.zip&lt;/code&gt;).</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>exportFilteredData(folderName)</code></p>
<p class="api-desc">Export the currently filtered dataset as a ZIP archive. Iterates all active layer configurations, applies the current attribute filter state, and serialises each layer to a GeoJSON file. Supplementary files (Excel configuration workbook, short-pipe definitions) are appended and the archive is offered for browser download as &lt;code&gt;&amp;lt;folderName&amp;gt;.zip&lt;/code&gt;.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>folderName</code></td><td><code>string</code></td><td>Name used for the top-level ZIP folder and the downloaded filename.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;void&gt;</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>exportCompleteDataset()</code></p>
<p class="api-desc">Export the complete current dataset as a ZIP archive. Serialises all registered dynamic layers — including layers that have no unsaved modifications — together with the Excel configuration workbook and short-pipe definitions. The archive is downloaded as &lt;code&gt;complete_dataset.zip&lt;/code&gt;. Useful for creating a full project snapshot or preparing input for a fresh run.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;void&gt;</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>openExportDialog()</code></p>
<p class="api-desc">Open the export type selection dialog. Presents a modal popup with three export options: changes only, filtered data (prompts for a folder name), and the complete dataset. Delegates to {@link exportChanges}, {@link showFolderNameDialog}, or {@link exportCompleteDataset} on confirmation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/filter.js</code></summary>
<div class="module-header">
<p><strong>QGas - Filter UI Module</strong></p>
<p>Manages the geographic filtering system for infrastructure visualization. Allows users to filter displayed elements by European country codes.</p>
<p><strong>Key Responsibilities:</strong></p>
<ul>
  <li>Filter modal UI management</li>
  <li>Country selection interface</li>
  <li>Layer filtering by country code</li>
  <li>Filter state management</li>
  <li>Original layer state preservation</li>
</ul>
<p><strong>Filtering Approach:</strong></p>
<ul>
  <li>Preserves original layers before filtering</li>
  <li>Creates filtered copies based on country selection</li>
  <li>Supports multiple country selection</li>
  <li>Provides &quot;Clear All&quot; functionality</li>
</ul>
<p><strong>Supported Countries:</strong></p>
<ul>
  <li>All EU member states</li>
  <li>United Kingdom</li>
  <li>Uses ISO 3166-1 alpha-2 country codes</li>
</ul>
<p>Global Scope: This module maintains global scope for compatibility with inline HTML event handlers.</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>DOM elements for the filter modal and country selection UI.</li>
  <li>Map layer registries and country metadata embedded in features.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>openFilterModal(): Open the filter dialog.</li>
  <li>applyCountryFilter(): Apply the selected country filter.</li>
  <li>clearAllFilters(): Reset to unfiltered layers.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>openFilterModal()</code></p>
<p class="api-desc">QGas - Filter UI Module Manages the geographic filtering system for infrastructure visualization. Allows users to filter displayed elements by European country codes. Key Responsibilities: - Filter modal UI management - Country selection interface - Layer filtering by country code - Filter state management - Original layer state preservation Filtering Approach: - Preserves original layers before filtering - Creates filtered copies based on country selection - Supports multiple country selection - Provides &quot;Clear All&quot; functionality Supported Countries: - All EU member states - United Kingdom - Uses ISO 3166-1 alpha-2 country codes Global Scope: This module maintains global scope for compatibility with inline HTML event handlers. Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - DOM elements for the filter modal and country selection UI. - Map layer registries and country metadata embedded in features. Public API: - openFilterModal(): Open the filter dialog. - applyCountryFilter(): Apply the selected country filter. - clearAllFilters(): Reset to unfiltered layers. / /* ================================================================================ FILTER MODAL FUNCTIONS / /** Open the main filter selection modal. Makes the primary filter modal visible by setting its CSS display property to &lt;code&gt;flex&lt;/code&gt;. The modal lists available filter categories (e.g., country-based filtering) and acts as the entry point for all spatial filtering operations.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>closeFilterModal()</code></p>
<p class="api-desc">Close the main filter selection modal. Hides the primary filter modal without discarding any pending selection. May be called programmatically, e.g., before transitioning to the country-filter sub-modal.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>openCountryFilterModal()</code></p>
<p class="api-desc">Open the country-specific filter modal. Closes the main filter modal, populates the country selection list by calling {@link populateCountryList}, and displays the country-filter sub-modal. Previously selected countries are preserved between invocations.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>closeCountryFilterModal()</code></p>
<p class="api-desc">Close the country filter modal. Hides the country-filter sub-modal. Any countries that were checked remain selected in memory until {@link applyCountryFilter} is called or the selection is explicitly cleared.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>clearAllFilters()</code></p>
<p class="api-desc">Clear all active filters and restore the original layer state. Calls {@link restoreAllOriginalLayers} to put back the unfiltered Leaflet layer objects, empties the &lt;code&gt;selectedCountries&lt;/code&gt; set, and closes the filter modal. This is the single authoritative reset point for all spatial filter state.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>populateCountryList()</code></p>
<p class="api-desc">Populate the country list UI with checkboxes for all European countries Restores previously selected countries from the selectedCountries Set</p>
</div>
<div class="api-func">
<p class="api-sig"><code>applyCountryFilter()</code></p>
<p class="api-desc">Apply the current country selection as a geographic filter. Snapshots each unfiltered layer reference if not already cached, then either restores all layers (when no countries are selected) or delegates to {@link filterAllElementsByCountries} to rebuild each layer with only the features whose country-code property matches an entry in &lt;code&gt;selectedCountries&lt;/code&gt;. Closes the country-filter modal on completion.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>toggleFilterPanel()</code></p>
<p class="api-desc">Toggle (open) the filter panel from a toolbar button. Thin error-guarded alias of {@link openFilterModal} used by the main-screen toolbar button. Wraps the call in a try/catch so that a misconfigured DOM state surfaces as an info popup rather than a silent failure.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/groups.js</code></summary>
<div class="module-header">
<p><strong>QGas - Pipeline Groups Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Supports visualizing and highlighting pipeline groups created in the UI.</p>
<p>Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Pipeline group definitions and layer registries.</li>
  <li>Map instance for pan/zoom and style updates.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>highlightGroup(index): Highlight a saved pipeline group.</li>
  <li>unhighlightAllGroups(): Clear group highlights.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>highlightGroup(index)</code></p>
<p class="api-desc">QGas - Pipeline Groups Module Module Description: Supports visualizing and highlighting pipeline groups created in the UI. Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Pipeline group definitions and layer registries. - Map instance for pan/zoom and style updates. Public API: - highlightGroup(index): Highlight a saved pipeline group. - unhighlightAllGroups(): Clear group highlights. / /* Extracted groups panel logic from core.js (v5). / /** Highlight all pipelines belonging to a saved pipeline group. Resets any existing group highlights, then applies a red stroke (&lt;code&gt;#ff2b2b&lt;/code&gt;, weight 6) to every pipeline whose ID is listed in the specified group. The map viewport is automatically fitted to the bounding box of the highlighted elements with 80 px padding.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>index</code></td><td><code>number</code></td><td>Zero-based index of the pipeline group in the global &lt;code&gt;pipelineGroups&lt;/code&gt; array.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>openGroupsPanel()</code></p>
<p class="api-desc">Open the pipeline groups panel. Displays a scrollable modal popup listing all saved pipeline groups. Each group entry shows the group name, pipeline count, and total length. Clicking an entry calls {@link highlightGroup} to visualise the group on the map. If no groups exist yet the user is informed with a guidance message.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>unhighlightAllGroups()</code></p>
<p class="api-desc">Remove all group highlights from the map. Iterates every pipeline in all active line layers and resets their Leaflet path styles to the defaults defined in the layer configuration. Should be called before applying a new group highlight or when the groups panel is closed.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/legend.js</code></summary>
<div class="module-header">
<p><strong>QGas - Legend UI Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Maintains the legend controls, visibility toggles, and synchronization between legend state and map layers.</p>
<p>Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
<p><strong>Inputs:</strong></p>
<ul>
  <li>DOM legend container and checkbox elements.</li>
  <li>Map layer references and visibility state.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>updateLegendControl(): Rebuild and refresh the legend UI.</li>
  <li>updateLegendSymbols(): Refresh legend swatches after style updates.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>registerLegendToggle({ checkbox, resolveLayers, elementKey })</code></p>
<p class="api-desc">QGas - Legend UI Module Module Description: Maintains the legend controls, visibility toggles, and synchronization between legend state and map layers. Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - DOM legend container and checkbox elements. - Map layer references and visibility state. Public API: - updateLegendControl(): Rebuild and refresh the legend UI. - updateLegendSymbols(): Refresh legend swatches after style updates. / const legendToggleRegistry = new Map(); function unregisterLegendToggle(elementKey) { if (!elementKey || !legendToggleRegistry.has(elementKey)) return; const entry = legendToggleRegistry.get(elementKey); const { checkbox, handler } = entry || {}; if (checkbox &amp;&amp; handler) { checkbox.removeEventListener(&#x27;change&#x27;, handler); } legendToggleRegistry.delete(elementKey); } /** Register a checkbox-driven layer toggle in the legend. Attaches a &lt;code&gt;change&lt;/code&gt; event listener to &lt;code&gt;checkbox&lt;/code&gt; that resolves the associated Leaflet layer(s) via &lt;code&gt;resolveLayers&lt;/code&gt; and adds them to or removes them from the map. Previously registered handlers for the same &lt;code&gt;elementKey&lt;/code&gt; are unregistered first to prevent duplicates. The handler is fired once immediately to synchronise the initial visibility state.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>options</code></td><td><code>Object</code></td><td>Configuration object.</td></tr>
<tr><td><code>options</code></td><td><code>HTMLInputElement</code></td><td>.checkbox - The legend checkbox element.</td></tr>
<tr><td><code>options</code></td><td><code>Function</code></td><td>.resolveLayers - Callback that returns the Leaflet layer or array of layers to control.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string|symbol|null</code> — The registry key used, or &lt;code&gt;null&lt;/code&gt; if registration failed.</p>
</div>
<div class="api-func">
<p class="api-sig"><code>addPlanLayerToLegend(planConfig, overlay)</code></p>
<p class="api-desc">Add a plan overlay entry to the map legend. Creates a labelled checkbox in the legend control for the given infrastructure plan and wires it to show or hide the Leaflet &lt;code&gt;overlay&lt;/code&gt; layer. The checkbox is inserted above the &quot;Select All&quot; button if present, otherwise appended at the bottom.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>planConfig</code></td><td><code>Object</code></td><td>Infrastructure plan configuration object.</td></tr>
<tr><td><code>planConfig</code></td><td><code>string</code></td><td>.id - Unique plan identifier used as the toggle registry key.</td></tr>
<tr><td><code>planConfig</code></td><td><code>string</code></td><td>.name - Human-readable plan name shown in the legend.</td></tr>
<tr><td><code>overlay</code></td><td><code>Object</code></td><td>Leaflet layer instance to show/hide.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>initLegendControl(mapInstance)</code></p>
<p class="api-desc">Initialise the map legend control. Creates a Leaflet custom control in the top-right corner of &lt;code&gt;mapInstance&lt;/code&gt; containing layer-visibility checkboxes, a statistics button, and a &quot;Select All&quot; toggle. Event handlers for the checkboxes are bound after a 2-second delay to ensure all GeoJSON layers have finished loading.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>mapInstance</code></td><td><code>L.Map</code></td><td>The initialised Leaflet map instance to which the legend control will be added.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/options.js</code></summary>
<div class="module-header">
<p><strong>QGas - Options UI Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Manages the options dialog for styling layers, including color, size, and line style controls, while keeping a global scope for UI compatibility.</p>
<p>Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
<p><strong>Inputs:</strong></p>
<ul>
  <li>DOM elements for options, color, size, and line-type modals.</li>
  <li>Layer registries and styling helpers from core modules.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>openOptionsModal(): Open the layer options dialog.</li>
  <li>closeOptionsModal(): Close the layer options dialog.</li>
  <li>updateLayerColor(layerKey, newColor): Apply color updates to a layer.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>openOptionsModal()</code></p>
<p class="api-desc">QGas - Options UI Module Module Description: Manages the options dialog for styling layers, including color, size, and line style controls, while keeping a global scope for UI compatibility. Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - DOM elements for options, color, size, and line-type modals. - Layer registries and styling helpers from core modules. Public API: - openOptionsModal(): Open the layer options dialog. - closeOptionsModal(): Close the layer options dialog. - updateLayerColor(layerKey, newColor): Apply color updates to a layer. / /* UI Options module (extracted from core.js). Maintains global scope for UI compatibility. / document.getElementById(&#x27;size-picker-modal&#x27;).addEventListener(&#x27;click&#x27;, function(e) { if (e.target === this) { closeSizePickerModal(); } }); document.getElementById(&#x27;linetype-picker-modal&#x27;).addEventListener(&#x27;click&#x27;, function(e) { if (e.target === this) { closeLineTypePickerModal(); } }); /* Options modal state and handlers. / let currentLayerBeingChanged = null; /** Open the layer options modal. Populates the layer list by calling {@link populateLayerList} and then makes the options modal visible. Users can change colours, point shapes, line types, and sizes for all registered styleable layers.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>closeOptionsModal()</code></p>
<p class="api-desc">Close the layer options modal. Hides the options modal overlay without saving any unsaved changes in sub-pickers (colour, shape, size, line-type). Sub-pickers must be closed separately before or after this call.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>openColorPicker(layerKey)</code></p>
<p class="api-desc">Open the colour picker sub-modal for a specific layer. Stores the target layer key, loads its current colour into the native colour input and custom-hex input fields, populates the colour palette highlights, and shows the colour-picker modal.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>layerKey</code></td><td><code>string</code></td><td>Registry key of the layer whose colour should be edited (e.g., &lt;code&gt;&#x27;pipelines&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;compressors&#x27;&lt;/code&gt;).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateLayerColor(layerKey, newColor)</code></p>
<p class="api-desc">Apply a new colour to all visual representations of a layer. Retrieves the styleable-layer entry for &lt;code&gt;layerKey&lt;/code&gt;, resolves all associated Leaflet layer refs (including custom overlay layers), and applies the colour via {@link applyColorToLineLayer} (polylines) or {@link applyColorToPointLayer} (circle markers / custom icons).</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>layerKey</code></td><td><code>string</code></td><td>Registry key identifying the target layer.</td></tr>
<tr><td><code>newColor</code></td><td><code>string</code></td><td>Hex colour string (e.g., &lt;code&gt;&#x27;#2563eb&#x27;&lt;/code&gt;).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateLayerShape(layerKey, newShape)</code></p>
<p class="api-desc">Apply a new marker shape to all point features of a layer. Iterates through all layer refs registered under &lt;code&gt;layerKey&lt;/code&gt; and recreates each point marker using the specified shape symbol. Only operates on point-geometry layers; line layers are silently ignored.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>layerKey</code></td><td><code>string</code></td><td>Registry key identifying the target layer.</td></tr>
<tr><td><code>newShape</code></td><td><code>string</code></td><td>Shape identifier: &lt;code&gt;&#x27;circle&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;square&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;triangle&#x27;&lt;/code&gt;, or &lt;code&gt;&#x27;diamond&#x27;&lt;/code&gt;.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateLineType(layerKey, newLineType)</code></p>
<p class="api-desc">Apply a new dash style to all polylines of a line layer. Updates the &lt;code&gt;lineStyle&lt;/code&gt; property of the registry entry and all associated configuration references, then calls {@link applyLinePattern} on every resolved polyline layer. Only operates on line-geometry layers.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>layerKey</code></td><td><code>string</code></td><td>Registry key identifying the target layer.</td></tr>
<tr><td><code>newLineType</code></td><td><code>string</code></td><td>Line dash style: &lt;code&gt;&#x27;solid&#x27;&lt;/code&gt;, &lt;code&gt;&#x27;dotted&#x27;&lt;/code&gt;, or &lt;code&gt;&#x27;segmented&#x27;&lt;/code&gt;.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateLayerSize(layerKey, newSize)</code></p>
<p class="api-desc">Apply a new size value to all features of a layer. Dispatches to {@link applyWidthToLineLayer} for polylines or {@link applySizeToPointLayer} for point markers, depending on the layer geometry class. Updates the registry entry and all configuration references so the new size persists across re-renders.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>layerKey</code></td><td><code>string</code></td><td>Registry key identifying the target layer.</td></tr>
<tr><td><code>newSize</code></td><td><code>number</code></td><td>Pixel size value. For line layers this sets stroke weight; for point layers it sets marker radius.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateLegendSymbols()</code></p>
<p class="api-desc">Synchronise all legend icon elements with current layer style settings. Iterates every styleable layer entry and updates the corresponding legend DOM elements: polyline legend strips are resized and recoloured; point legend icons are regenerated via {@link generateLegendIcon}. Should be called after any colour, shape, size, or line-type change.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>createModalPopupContent(properties, layer)</code></p>
<p class="api-desc">Build the HTML content for an element attribute edit popup. Constructs an editable attribute table from the provided GeoJSON feature properties, honouring both static and user-configured hidden-attribute lists. The table includes text inputs for each visible attribute and action buttons (Save, Add Attribute, Delete, Hide).</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>properties</code></td><td><code>Object</code></td><td>GeoJSON feature property object.</td></tr>
<tr><td><code>layer</code></td><td><code>Object</code></td><td>Leaflet layer instance used to determine the element type for dynamic hidden-attribute lookup.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — HTML string representing the popup content.</p>
</div>
<div class="api-func">
<p class="api-sig"><code>toggleOptionsPanel()</code></p>
<p class="api-desc">Toggle (open) the options panel from a toolbar button. Alias of {@link openOptionsModal} used by the main-screen toolbar. Ensures consistent entry point for toolbar-driven interactions.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/screenshot.js</code></summary>
<div class="module-header">
<p><strong>QGas - Screenshot Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Provides a screenshot mode for highlighting elements and preparing the map for manual capture.</p>
<p>Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
<p><strong>Inputs:</strong></p>
<ul>
  <li>DOM elements for tool controls and legend.</li>
  <li>Map layers for highlight toggling.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>openScreenshotMode(): Launch the screenshot mode dialog.</li>
  <li>activateScreenshotMode(): Enter screenshot mode.</li>
  <li>deactivateScreenshotMode(): Exit screenshot mode.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>openScreenshotMode()</code></p>
<p class="api-desc">QGas - Screenshot Module Module Description: Provides a screenshot mode for highlighting elements and preparing the map for manual capture. Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - DOM elements for tool controls and legend. - Map layers for highlight toggling. Public API: - openScreenshotMode(): Launch the screenshot mode dialog. - activateScreenshotMode(): Enter screenshot mode. - deactivateScreenshotMode(): Exit screenshot mode. / /* Extracted screenshot logic from core.js (v5). / /** Open the screenshot mode dialog. Presents a modal popup that explains the screenshot workflow and offers the user a single-click entry into screenshot mode. No map state is altered until the user confirms by pressing &quot;Activate Screenshot Mode&quot;.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>activateScreenshotMode()</code></p>
<p class="api-desc">Enter screenshot mode. Hides all UI chrome (menus, toolbars, export buttons, contributor box) and strips the map legend down to only the currently visible layers. Enables element highlighting on click and registers an Escape-key listener that calls {@link exitScreenshotMode}. Intended to produce a clean, publication-ready map view without interactive controls.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>exitScreenshotMode()</code></p>
<p class="api-desc">Exit screenshot mode and restore the full UI. Re-displays all previously hidden interface elements (menus, toolbars, contributor box, logos, export and screenshot buttons) and restores the original legend HTML. Removes the Escape-key listener registered by {@link activateScreenshotMode}. Safe to call even if screenshot mode is not currently active.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/statistics.js</code></summary>
<div class="module-header">
<p><strong>QGas - Statistics Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Computes and displays infrastructure statistics in a modal dialog, including counts and aggregated metrics.</p>
<p>Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Map layers and feature properties for aggregation.</li>
  <li>DOM elements for statistics modal and charts.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>openStatisticsModal(): Show the statistics modal.</li>
  <li>closeStatisticsModal(): Hide the statistics modal.</li>
  <li>updateStatistics(): Recompute and render statistics.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>openStatisticsModal()</code></p>
<p class="api-desc">QGas - Statistics Module Module Description: Computes and displays infrastructure statistics in a modal dialog, including counts and aggregated metrics. Author: Dipl.-Ing. Marco Quantschnig Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Map layers and feature properties for aggregation. - DOM elements for statistics modal and charts. Public API: - openStatisticsModal(): Show the statistics modal. - closeStatisticsModal(): Hide the statistics modal. - updateStatistics(): Recompute and render statistics. / /** Open the statistics modal dialog. Triggers a full recomputation of infrastructure statistics via {@link updateStatistics} before making the modal visible. This ensures that all displayed values reflect the current map state at the time of opening.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>closeStatisticsModal()</code></p>
<p class="api-desc">Close the statistics modal dialog. Hides the statistics modal by setting its CSS display property to {@code none}. No statistical data is cleared; subsequent calls to {@link openStatisticsModal} will recompute and re-display updated values.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateStatistics()</code></p>
<p class="api-desc">Recompute and render all infrastructure statistics. Calculates aggregate metrics (pipeline counts, total lengths, node counts, storage capacities, etc.) from the current map layers and renders the results into the statistics modal. The computed statistics object is also cached in {@link window.cachedStatistics} for subsequent use by other modules without redundant recalculation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools.js</code></summary>
<div class="module-header">
<p><strong>QGas - Tools UI Module</strong></p>
<p>Manages the tools popup interface and dispatches tool activation commands. This module provides the user interface for selecting and switching between different editing and interaction modes in the QGas application.</p>
<p><strong>Key Responsibilities:</strong></p>
<ul>
  <li>Tool popup UI management (open/close)</li>
  <li>Active tool state tracking and display</li>
  <li>Tool selection and mode switching</li>
  <li>Contributor name validation</li>
  <li>Tool dispatcher for various editing modes</li>
</ul>
<p><strong>Available Tools:</strong></p>
<ul>
  <li>Info Mode: View element information</li>
  <li>Edit Geometry: Modify element positions</li>
  <li>Add Pipeline: Create new pipeline segments</li>
  <li>Add Infrastructure: Place new infrastructure points</li>
  <li>Change Direction: Reverse pipeline flow direction</li>
  <li>Short Pipe: Create short connecting pipes</li>
  <li>Delete: Remove elements from the map</li>
  <li>Group Pipelines: Combine multiple pipelines</li>
  <li>Switch Sublayer: Change element layer assignment</li>
  <li>Add Plan: Manage infrastructure plans</li>
  <li>Divide Pipeline: Split pipelines at points</li>
  <li>Add New Element: Create custom elements</li>
  <li>Integrate Dataset: Import external data</li>
  <li>Split Node: Divide nodes for network restructuring</li>
  <li>Reconnect Infrastructure: Update element connections</li>
  <li>Distribute Compressors: Auto-place compressors</li>
</ul>
<p>Global Scope: This module maintains global scope for compatibility with inline HTML event handlers (e.g., onclick=&quot;openToolsPopup()&quot;)</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>DOM elements for the tools popup and tiles.</li>
  <li>Global tool activation functions (e.g., activateInfoTool).</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>openToolsPopup(): Open the tools selection overlay.</li>
  <li>closeToolsPopup(): Close the tools selection overlay.</li>
  <li>selectTool(mode): Activate a tool by mode identifier.</li>
  <li>updateActiveToolDisplay(mode): Update the active tool label.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>updateActiveToolDisplay(mode)</code></p>
<p class="api-desc">QGas - Tools UI Module Manages the tools popup interface and dispatches tool activation commands. This module provides the user interface for selecting and switching between different editing and interaction modes in the QGas application. Key Responsibilities: - Tool popup UI management (open/close) - Active tool state tracking and display - Tool selection and mode switching - Contributor name validation - Tool dispatcher for various editing modes Available Tools: - Info Mode: View element information - Edit Geometry: Modify element positions - Add Pipeline: Create new pipeline segments - Add Infrastructure: Place new infrastructure points - Change Direction: Reverse pipeline flow direction - Short Pipe: Create short connecting pipes - Delete: Remove elements from the map - Group Pipelines: Combine multiple pipelines - Switch Sublayer: Change element layer assignment - Add Plan: Manage infrastructure plans - Divide Pipeline: Split pipelines at points - Add New Element: Create custom elements - Integrate Dataset: Import external data - Split Node: Divide nodes for network restructuring - Reconnect Infrastructure: Update element connections - Distribute Compressors: Auto-place compressors Global Scope: This module maintains global scope for compatibility with inline HTML event handlers (e.g., onclick=&quot;openToolsPopup()&quot;) Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - DOM elements for the tools popup and tiles. - Global tool activation functions (e.g., activateInfoTool). Public API: - openToolsPopup(): Open the tools selection overlay. - closeToolsPopup(): Close the tools selection overlay. - selectTool(mode): Activate a tool by mode identifier. - updateActiveToolDisplay(mode): Update the active tool label. / /* ================================================================================ ACTIVE TOOL STATE Tracks the active tool for UI highlighting and mode management. / let currentActiveTool = &#x27;info&#x27;; /** Update the active tool display in the UI</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>mode</code></td><td><code>string</code></td><td>Tool mode identifier</td></tr>
</tbody></table>
</div>
<div class="api-func">
<p class="api-sig"><code>openToolsPopup()</code></p>
<p class="api-desc">Open the tools selection popup Displays all available tools and highlights the currently active one</p>
</div>
<div class="api-func">
<p class="api-sig"><code>closeToolsPopup()</code></p>
<p class="api-desc">Close the tools selection popup</p>
</div>
<div class="api-func">
<p class="api-sig"><code>selectTool(mode)</code></p>
<p class="api-desc">Select and activate a specific tool mode</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>mode</code></td><td><code>string</code></td><td>Tool identifier (e.g., &#x27;info&#x27;, &#x27;edit&#x27;, &#x27;add-pipeline&#x27;)</td></tr>
</tbody></table>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/add_infrastructure.js</code></summary>
<div class="module-header">
<p><strong>QGas - Add Infrastructure Tool</strong></p>
<p>Enables placement of new infrastructure points (compressors, storages, LNG terminals, power plants, etc.) on the map with optional node connectivity.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive point placement via map click</li>
  <li>Optional connection to existing nodes</li>
  <li>Automatic ID generation with contributor tracking</li>
  <li>Support for multiple infrastructure types</li>
  <li>Continuous placement workflow (add multiple points)</li>
  <li>Confirmation dialogs with user-friendly prompts</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User activates tool and chooses connection preference 2. Selects infrastructure type from available layers 3. Clicks map to place point 4. Point is created with auto-generated ID 5. Optional: Continue placing more points or return to info mode</p>
<p><strong>Infrastructure Types:</strong></p>
<ul>
  <li>Compressors</li>
  <li>Storage facilities</li>
  <li>LNG terminals</li>
  <li>Power plants</li>
  <li>Custom infrastructure types from dynamic layers</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Map clicks and optional node selection.</li>
  <li>Active infrastructure layers and contributor initials.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateAddInfrastructureTool(): Start the add-infrastructure workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateAddInfrastructureTool()</code></p>
<p class="api-desc">QGas - Add Infrastructure Tool Enables placement of new infrastructure points (compressors, storages, LNG terminals, power plants, etc.) on the map with optional node connectivity. Key Features: - Interactive point placement via map click - Optional connection to existing nodes - Automatic ID generation with contributor tracking - Support for multiple infrastructure types - Continuous placement workflow (add multiple points) - Confirmation dialogs with user-friendly prompts Workflow: 1. User activates tool and chooses connection preference 2. Selects infrastructure type from available layers 3. Clicks map to place point 4. Point is created with auto-generated ID 5. Optional: Continue placing more points or return to info mode Infrastructure Types: - Compressors - Storage facilities - LNG terminals - Power plants - Custom infrastructure types from dynamic layers Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Map clicks and optional node selection. - Active infrastructure layers and contributor initials. Public API: - activateAddInfrastructureTool(): Start the add-infrastructure workflow. / /* Add Infrastructure tool module. / (function(){ /** Activate the Add Infrastructure tool. Verifies that a contributor name has been set, deactivates any active editing mode, and sets the application mode to {@code &#x27;add-infrastructure&#x27;}. The user is first prompted to choose whether the new element should be connected to an existing node. After confirmation, the user selects the target infrastructure layer (compressor, storage, LNG terminal, power plant, or custom type) and clicks a map location to place the point. An auto-generated ID incorporating contributor initials is assigned, and the tool allows continuous placement until the user opts to stop.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/add_new_element.js</code></summary>
<div class="module-header">
<p><strong>QGas - Add New Element Tool</strong></p>
<p>Creates entirely new custom layer types for specialized infrastructure elements not covered by standard layers.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Custom layer creation</li>
  <li>Layer type selection (line/point/inline/node)</li>
  <li>User-defined layer names</li>
  <li>Automatic legend integration</li>
  <li>Layer metadata generation</li>
  <li>Drawing tool integration</li>
</ul>
<p><strong>Layer Types:</strong></p>
<ul>
  <li>Pipeline (Line Layer): For linear infrastructure</li>
  <li>Infrastructure (Point Layer): For point-based facilities</li>
  <li>In-Line Element Layer: For elements positioned along pipelines</li>
  <li>Node Layer: For standard node handling</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects layer type 2. Enters layer name 3. System creates empty layer 4. Layer added to map and legend 5. User can begin adding elements to new layer</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Registers layer in customLayers registry</li>
  <li>Creates layer metadata</li>
  <li>Initializes with appropriate geometry type</li>
  <li>Sets up interaction handlers</li>
  <li>Configures default styling</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>User-selected layer type and name.</li>
  <li>Map instance and layer registries.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateAddNewElementTool(): Start the custom-layer creation flow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateAddNewElementTool()</code></p>
<p class="api-desc">QGas - Add New Element Tool Creates entirely new custom layer types for specialized infrastructure elements not covered by standard layers. Key Features: - Custom layer creation - Layer type selection (line/point/inline/node) - User-defined layer names - Automatic legend integration - Layer metadata generation - Drawing tool integration Layer Types: - Pipeline (Line Layer): For linear infrastructure - Infrastructure (Point Layer): For point-based facilities - In-Line Element Layer: For elements positioned along pipelines - Node Layer: For standard node handling Workflow: 1. User selects layer type 2. Enters layer name 3. System creates empty layer 4. Layer added to map and legend 5. User can begin adding elements to new layer Technical Details: - Registers layer in customLayers registry - Creates layer metadata - Initializes with appropriate geometry type - Sets up interaction handlers - Configures default styling Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - User-selected layer type and name. - Map instance and layer registries. Public API: - activateAddNewElementTool(): Start the custom-layer creation flow. / (function () { /** Activate the Add New Element tool. Deactivates any currently active editing mode, sets the application mode to {@code &#x27;add-new-element&#x27;}, and launches the custom-layer creation dialog. The dialog allows the user to select a layer geometry type (line, point, in-line, or node) and provide a user-defined name. On confirmation, an empty GeoJSON layer is created, registered in the {@code customLayers} registry, added to the map, and integrated into the legend — enabling immediate element placement.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/add_pipeline.js</code></summary>
<div class="module-header">
<p><strong>QGas - Add Pipeline Tool</strong></p>
<p>Provides functionality for adding new pipeline segments to the infrastructure network. Supports interactive drawing, node snapping, and automatic ID generation.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive pipeline drawing with map clicks</li>
  <li>Automatic node detection and snapping</li>
  <li>Support for multiple pipeline layer types</li>
  <li>Contributor tracking and attribution</li>
  <li>Automatic ID generation with prefixes</li>
  <li>Length calculation</li>
  <li>Custom attribute support</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects target pipeline layer 2. Clicks map to define start point (snaps to existing node or creates new) 3. Clicks map to define end point 4. Pipeline is created with auto-generated ID 5. Pipeline is added to selected layer</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Map clicks for node and pipeline placement.</li>
  <li>Active node and line layer selections.</li>
  <li>Contributor initials for ID generation.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>promptPipelineLayerSelection(onComplete, onCancel): Choose a target line layer.</li>
  <li>proceedWithAddPipeline(): Start the add-pipeline workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>getAvailablePipelineLayers()</code></p>
<p class="api-desc">QGas - Add Pipeline Tool Provides functionality for adding new pipeline segments to the infrastructure network. Supports interactive drawing, node snapping, and automatic ID generation. Key Features: - Interactive pipeline drawing with map clicks - Automatic node detection and snapping - Support for multiple pipeline layer types - Contributor tracking and attribution - Automatic ID generation with prefixes - Length calculation - Custom attribute support Workflow: 1. User selects target pipeline layer 2. Clicks map to define start point (snaps to existing node or creates new) 3. Clicks map to define end point 4. Pipeline is created with auto-generated ID 5. Pipeline is added to selected layer Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Map clicks for node and pipeline placement. - Active node and line layer selections. - Contributor initials for ID generation. Public API: - promptPipelineLayerSelection(onComplete, onCancel): Choose a target line layer. - proceedWithAddPipeline(): Start the add-pipeline workflow. / /** Get all available pipeline layers from the system Scans dynamic layers, legacy layers, and custom layers for line geometry</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of layer objects with name, layer reference, and metadata</p>
</div>
<div class="api-func">
<p class="api-sig"><code>forEachNodeMarker(callback)</code></p>
<p class="api-desc">Iterate every node marker across all active node layers. Traverses the full layer tree of each group returned by {@link getAllNodeLayers}, descending into nested &lt;code&gt;LayerGroup&lt;/code&gt; and &lt;code&gt;FeatureGroup&lt;/code&gt; instances, and invokes &lt;code&gt;callback&lt;/code&gt; for every individual point-feature marker found. Internal structure layers are skipped.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>callback</code></td><td><code>Function</code></td><td>Function called with each node &lt;code&gt;L.CircleMarker&lt;/code&gt; or &lt;code&gt;L.Marker&lt;/code&gt; as its sole argument.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>setNodeSelectionHandlers(handler)</code></p>
<p class="api-desc">Attach a unified click handler to all node markers. Removes any existing click listeners from every node marker (via {@link forEachNodeMarker}) and registers &lt;code&gt;handler&lt;/code&gt; as the new listener. The handler receives the marker instance and the Leaflet click event. Event propagation to the map is suppressed. Used during pipeline-drawing mode so that clicking a node acts as a pipeline endpoint selection rather than opening an info popup.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>handler</code></td><td><code>Function</code></td><td>Callback invoked with &lt;code&gt;(marker, event)&lt;/code&gt; when a node is clicked.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>clearNodeSelectionHandlers()</code></p>
<p class="api-desc">Remove all node click handlers registered during pipeline drawing. Iterates every node marker via {@link forEachNodeMarker} and removes all &lt;code&gt;&#x27;click&#x27;&lt;/code&gt; listeners. Called when the pipeline-drawing workflow ends (after save or discard) to restore normal info-mode click behaviour.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>proceedWithAddPipeline()</code></p>
<p class="api-desc">Launch the interactive pipeline-creation workflow. Sets &lt;code&gt;currentMode&lt;/code&gt; to &lt;code&gt;&#x27;add-pipeline&#x27;&lt;/code&gt;, resolves the target pipeline layer, and opens a modal dialog asking whether the pipeline starts at an existing node or a free map location. Subsequent steps guide the user through endpoint selection (start and end), live polyline drawing between selected points, and finally saving the new pipeline feature with auto-generated ID and default attributes to the target layer.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/add_plan.js</code></summary>
<div class="module-header">
<p><strong>QGas - Add Infrastructure Plans Tool</strong></p>
<p>Enables georeferencing and overlay of infrastructure plan images (JPG/PNG) onto the interactive map. Users can align scanned plans with geographic coordinates through control point matching.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Image file upload (JPG/PNG)</li>
  <li>Interactive georeferencing with control points</li>
  <li>Visual overlay on map</li>
  <li>Opacity control</li>
  <li>Plan metadata management</li>
  <li>Multiple plan support</li>
  <li>Control point validation</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User uploads infrastructure plan image 2. Selects matching points on image and map 3. System calculates transformation matrix 4. Image is georeferenced and overlaid on map 5. Plan can be toggled, adjusted, or removed</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Requires minimum 3 control points</li>
  <li>Uses affine transformation for georeferencing</li>
  <li>Stores plan data in infrastructure_plans layer</li>
  <li>Supports interactive opacity adjustment</li>
  <li>Maintains plan metadata (name, bounds, control points)</li>
</ul>
<p>Note: Functions exposed in global scope for cross-module compatibility</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Image files (JPG/PNG) and control point pairs.</li>
  <li>Map instance for georeferenced overlays.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateAddPlanTool(): Start the infrastructure plan workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>startAddInfrastructurePlan()</code></p>
<p class="api-desc">QGas - Add Infrastructure Plans Tool Enables georeferencing and overlay of infrastructure plan images (JPG/PNG) onto the interactive map. Users can align scanned plans with geographic coordinates through control point matching. Key Features: - Image file upload (JPG/PNG) - Interactive georeferencing with control points - Visual overlay on map - Opacity control - Plan metadata management - Multiple plan support - Control point validation Workflow: 1. User uploads infrastructure plan image 2. Selects matching points on image and map 3. System calculates transformation matrix 4. Image is georeferenced and overlaid on map 5. Plan can be toggled, adjusted, or removed Technical Details: - Requires minimum 3 control points - Uses affine transformation for georeferencing - Stores plan data in infrastructure_plans layer - Supports interactive opacity adjustment - Maintains plan metadata (name, bounds, control points) Note: Functions exposed in global scope for cross-module compatibility Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Image files (JPG/PNG) and control point pairs. - Map instance for georeferenced overlays. Public API: - activateAddPlanTool(): Start the infrastructure plan workflow. / /** Start the add-infrastructure-plan workflow. Initialises the georeferencing UI (if not already initialised) and programmatically triggers the hidden file input to open the OS file-selection dialog. The selected JPEG or PNG image is then loaded into the georeferencing overlay where the user defines at least three ground-control-point pairs before the plan is projected onto the map.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>addPlanOverlayFromConfig(planConfig, options = {})</code></p>
<p class="api-desc">Create and add a georeferenced plan image overlay to the map. Instantiates a &lt;code&gt;PlanImageLayer&lt;/code&gt; from a pre-built plan configuration object that must contain at least three ground-control pairs. The overlay is added to the map, registered in &lt;code&gt;planLayers&lt;/code&gt;, inserted into the legend, and recorded in &lt;code&gt;loadedPlanIds&lt;/code&gt; to prevent duplicate loading. Returns the existing overlay layer if this plan ID was loaded earlier.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>planConfig</code></td><td><code>Object</code></td><td>Plan configuration object.</td></tr>
<tr><td><code>planConfig</code></td><td><code>string</code></td><td>.id - Unique plan identifier.</td></tr>
<tr><td><code>planConfig</code></td><td><code>string</code></td><td>.name - Human-readable plan name.</td></tr>
<tr><td><code>planConfig</code></td><td><code>Array&lt;Object&gt;</code></td><td>.controlPairs - Array of at least three ground-control-pair objects &lt;code&gt;{image: {x,y}, map: {lat,lng}}&lt;/code&gt;.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>PlanImageLayer|null</code> — The created or existing Leaflet overlay layer, or &lt;code&gt;null&lt;/code&gt; if the configuration is insufficient.</p>
</div>
<div class="api-func">
<p class="api-sig"><code>loadPersistedInfrastructurePlans()</code></p>
<p class="api-desc">Load all persisted infrastructure plans from the project manifest. Fetches the plan manifest (list of saved plan descriptors) from the server, then sequentially loads each plan entry by fetching its configuration JSON and image data. Already-loaded plan IDs are skipped. Uses a singleton promise so that concurrent calls do not trigger multiple parallel manifest fetches. Called automatically on project load.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;void&gt;</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>activateAddPlanTool()</code></p>
<p class="api-desc">Activate the add-infrastructure-plan tool. Public entry point registered on &lt;code&gt;window&lt;/code&gt;. Verifies that a contributor name is set, deactivates all other editing modes, and delegates to {@link startAddInfrastructurePlan} to open the georeferencing workflow.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/change_direction.js</code></summary>
<div class="module-header">
<p><strong>QGas - Change Direction Tool</strong></p>
<p>Enables users to reverse the flow direction of pipeline segments by swapping their Start_Node and End_Node references.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Visual direction indicators (arrows)</li>
  <li>Interactive pipeline selection</li>
  <li>Batch direction reversal</li>
  <li>Property-based direction tracking</li>
  <li>Confirmation before applying changes</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User activates tool 2. Direction arrows appear on all pipelines 3. User clicks pipelines to mark for reversal 4. Selected pipelines show reversed arrows 5. Confirmation dialog saves all changes</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Uses Leaflet PolylineDecorator for arrow visualization</li>
  <li>Tracks state in directionChangeState Map</li>
  <li>Swaps Start_Node and End_Node properties</li>
  <li>Updates all connected references</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Selected pipeline features and their Start_Node/End_Node attributes.</li>
  <li>Map layer references for visual arrows.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateChangeDirectionMode(): Begin direction-change workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateChangeDirectionMode()</code></p>
<p class="api-desc">QGas - Change Direction Tool Enables users to reverse the flow direction of pipeline segments by swapping their Start_Node and End_Node references. Key Features: - Visual direction indicators (arrows) - Interactive pipeline selection - Batch direction reversal - Property-based direction tracking - Confirmation before applying changes Workflow: 1. User activates tool 2. Direction arrows appear on all pipelines 3. User clicks pipelines to mark for reversal 4. Selected pipelines show reversed arrows 5. Confirmation dialog saves all changes Technical Details: - Uses Leaflet PolylineDecorator for arrow visualization - Tracks state in directionChangeState Map - Swaps Start_Node and End_Node properties - Updates all connected references Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Selected pipeline features and their Start_Node/End_Node attributes. - Map layer references for visual arrows. Public API: - activateChangeDirectionMode(): Begin direction-change workflow. / /* ================================================================================ STATE MANAGEMENT / const directionChangeState = new Map(); const reversedDirectionLayers = new Set(); /** Activate the change-direction editing mode. Resets all pipeline highlights, clears internal direction state, and attaches click handlers to every polyline in all active line-layer groups. Each click toggles the geometric direction of the selected pipeline (reverses the coordinate array) and updates the directional arrow decorator. A Save/Discard toolbar strip is shown for confirmation. Exits automatically on Escape key or explicit user discard.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/delete.js</code></summary>
<div class="module-header">
<p><strong>QGas - Delete Tool</strong></p>
<p>Manages element deletion functionality with visual feedback and undo support. Allows users to mark elements for deletion and batch-delete them with confirmation.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Visual marking of elements pending deletion</li>
  <li>Batch deletion with single confirmation</li>
  <li>Automatic orphaned node cleanup</li>
  <li>Undo functionality (elements stored in deleted registries)</li>
  <li>Support for all element types (pipelines, nodes, infrastructure)</li>
  <li>Parent layer tracking for proper removal</li>
</ul>
<p><strong>Deletion Process:</strong></p>
<p>1. User activates delete mode 2. Clicks elements to mark for deletion (visual feedback) 3. Clicks &quot;Delete Elements&quot; button to confirm 4. Elements are removed from map and stored in deletion registries 5. Orphaned nodes are automatically cleaned up</p>
<p><strong>Supported Element Types:</strong></p>
<ul>
  <li>Pipelines (including short pipes, hydrogen pipes)</li>
  <li>Nodes</li>
  <li>Compressors</li>
  <li>Storages</li>
  <li>LNG terminals</li>
  <li>Power plants</li>
  <li>Custom elements</li>
  <li>Drawn items</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>User selections (click or box selection).</li>
  <li>Layer registries and deletion identity tracker.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateDeleteMode(): Enter delete workflow.</li>
  <li>finalizeDeletion(): Confirm and apply deletions.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>showSaveDeleteButton()</code></p>
<p class="api-desc">QGas - Delete Tool Manages element deletion functionality with visual feedback and undo support. Allows users to mark elements for deletion and batch-delete them with confirmation. Key Features: - Visual marking of elements pending deletion - Batch deletion with single confirmation - Automatic orphaned node cleanup - Undo functionality (elements stored in deleted registries) - Support for all element types (pipelines, nodes, infrastructure) - Parent layer tracking for proper removal Deletion Process: 1. User activates delete mode 2. Clicks elements to mark for deletion (visual feedback) 3. Clicks &quot;Delete Elements&quot; button to confirm 4. Elements are removed from map and stored in deletion registries 5. Orphaned nodes are automatically cleaned up Supported Element Types: - Pipelines (including short pipes, hydrogen pipes) - Nodes - Compressors - Storages - LNG terminals - Power plants - Custom elements - Drawn items Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - User selections (click or box selection). - Layer registries and deletion identity tracker. Public API: - activateDeleteMode(): Enter delete workflow. - finalizeDeletion(): Confirm and apply deletions. / /** Show the save/confirm delete button in the UI Creates a button that executes batch deletion of all marked elements</p>
</div>
<div class="api-func">
<p class="api-sig"><code>clearPendingDeletionSelections()</code></p>
<p class="api-desc">Clear all pending deletion selections without committing any deletions. Iterates every pending-deletion list (pipelines, nodes, compressors, storages, LNG terminals, power-plants, custom elements, drawn items) and restores the original visual style of each marked element. All pending lists are emptied and the toolbar button state is refreshed. Useful for resetting the selection before exiting delete mode.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>activateDeleteMode()</code></p>
<p class="api-desc">Activate the element deletion mode. Disables any active drawing tools, captures a snapshot of the current map state for undo support, and attaches click handlers to every deletable element (pipelines, nodes, compressors, storages, LNG terminals, power-plants, custom layers). Clicking an element marks it for deletion (visual cue: red overlay) without immediately removing it. A Save/Discard toolbar strip is shown; confirming commits all pending deletions to the soft-delete registry.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/distribute_compressors.js</code></summary>
<div class="module-header">
<p><strong>QGas - Distribute Compressors Tool</strong></p>
<p>Distributes a single compressor into multiple sub-compressors along pipelines. Useful for representing distributed compression infrastructure.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive compressor selection</li>
  <li>Automatic distribution count input</li>
  <li>Visual connection lines</li>
  <li>Sub-compressor auto-placement</li>
  <li>Pipeline splitting at placement points</li>
  <li>Node generation for connections</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects compressor to distribute 2. Enters number of sub-compressors 3. Clicks pipeline locations for placement 4. Visual connection lines show relationships 5. Original compressor replaced with distributed units</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Creates sub-nodes at compressor positions</li>
  <li>Splits pipelines at insertion points</li>
  <li>Generates unique IDs for sub-compressors (e.g., C_01A, C_01B)</li>
  <li>Maintains visual connection to original location</li>
  <li>Updates topology automatically</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Selected compressor feature and target pipeline locations.</li>
  <li>User-entered distribution counts.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateDistributeCompressors(): Start compressor distribution workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>startDistributeCompressors()</code></p>
<p class="api-desc">QGas - Distribute Compressors Tool Distributes a single compressor into multiple sub-compressors along pipelines. Useful for representing distributed compression infrastructure. Key Features: - Interactive compressor selection - Automatic distribution count input - Visual connection lines - Sub-compressor auto-placement - Pipeline splitting at placement points - Node generation for connections Workflow: 1. User selects compressor to distribute 2. Enters number of sub-compressors 3. Clicks pipeline locations for placement 4. Visual connection lines show relationships 5. Original compressor replaced with distributed units Technical Details: - Creates sub-nodes at compressor positions - Splits pipelines at insertion points - Generates unique IDs for sub-compressors (e.g., C_01A, C_01B) - Maintains visual connection to original location - Updates topology automatically Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Selected compressor feature and target pipeline locations. - User-entered distribution counts. Public API: - activateDistributeCompressors(): Start compressor distribution workflow. / (function () { let distributeMode = false; let selectedCompressor = null; let distributionCount = 0; let subCompressors = []; let connectionLines = []; let mapClickHandler = null; let originalCompressorStyle = {}; let originalPipelineVisibility = {}; let cachedCompressorMarkerStyle = null; function _getPipelineGroupsForDistribute() { const out = []; const seen = new Set(); function add(group) { if (!group) return; if (seen.has(group)) return; seen.add(group); out.push(group); } /* Prefer the currently selected pipeline layer, if available. */ try { add(window.selectedPipelineLayer); } catch (e) {} /* Legacy global fallback. */ try { add(pipelineLayer); } catch (e) {} /* Dynamically loaded pipeline-like layers (PL_*.geojson). */ try { if (typeof dynamicLayers === &#x27;object&#x27; &amp;&amp; dynamicLayers) { Object.keys(dynamicLayers).forEach(k =&gt; { if (!k) return; if (/^PL_/i.test(k) &amp;&amp; dynamicLayers[k]) add(dynamicLayers[k]); }); } } catch (e) {} return out; } function _findOwningPipelineGroup(featureLayer) { const groups = _getPipelineGroupsForDistribute(); for (let i = 0; i &lt; groups.length; i++) { const g = groups[i]; try { if (g &amp;&amp; typeof g.hasLayer === &#x27;function&#x27; &amp;&amp; g.hasLayer(featureLayer)) return g; } catch (e) {} } return null; } function getCompressorMarkerStyle() { const fallback = { radius: 6, fillColor: &#x27;#009&#x27;, color: &#x27;#000&#x27;, weight: 1, opacity: 1, fillOpacity: 0.85, pane: &#x27;overlayPane&#x27; }; let sample = null; if (compressorsLayer) { compressorsLayer.eachLayer(layer =&gt; { if (!sample &amp;&amp; layer &amp;&amp; layer.options) { sample = layer; } }); } if (!sample) return { ...fallback }; return { radius: sample.options.radius ?? fallback.radius, fillColor: sample.options.fillColor ?? sample.options.color ?? fallback.fillColor, color: sample.options.color ?? fallback.color, weight: sample.options.weight ?? fallback.weight, opacity: sample.options.opacity ?? fallback.opacity, fillOpacity: sample.options.fillOpacity ?? fallback.fillOpacity, pane: sample.options.pane ?? fallback.pane }; } /** Start the compressor distribution workflow. Initialises distribution state, hides all map layers except pipelines and compressors to reduce visual clutter, and activates click handlers on every compressor marker. The user selects a source compressor, then specifies how many sub-compressors to place along pipeline segments. Sub-compressor positions are computed geometrically on the selected pipeline and persisted via the standard layer write-back mechanism.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>exitDistributeMode()</code></p>
<p class="api-desc">Exit distribute-compressor mode and restore normal map state. Re-adds any layers that were hidden during distribution (power-plants, storages, nodes, etc.), removes all temporary connection-line polylines and sub-compressor markers from the map, and resets all internal distribution state variables. Safe to call both after a completed distribution and after an explicit cancellation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/divide_pipeline.js</code></summary>
<div class="module-header">
<p><strong>QGas - Divide Pipeline Tool</strong></p>
<p>Splits a single pipeline segment into multiple segments at specified points. Creates new intermediate nodes and updates topology automatically.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive point selection for division</li>
  <li>Visual support point markers</li>
  <li>Automatic node creation at division points</li>
  <li>Geometry preservation</li>
  <li>Property inheritance for new segments</li>
  <li>Multi-point division support</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects pipeline to divide 2. Clicks map to add division points 3. Support markers appear at each point 4. Confirmation creates new segments and nodes 5. Original pipeline replaced with segmented version</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Creates new node IDs for division points</li>
  <li>Splits coordinates at each division point</li>
  <li>Generates new pipeline segments with proper Start/End nodes</li>
  <li>Updates all layer references</li>
  <li>Maintains attribute consistency across segments</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Selected pipeline and user-defined division points.</li>
  <li>Node and pipeline layers for updates.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateDividePipelineTool(): Begin pipeline division workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateDividePipelineTool()</code></p>
<p class="api-desc">QGas - Divide Pipeline Tool Splits a single pipeline segment into multiple segments at specified points. Creates new intermediate nodes and updates topology automatically. Key Features: - Interactive point selection for division - Visual support point markers - Automatic node creation at division points - Geometry preservation - Property inheritance for new segments - Multi-point division support Workflow: 1. User selects pipeline to divide 2. Clicks map to add division points 3. Support markers appear at each point 4. Confirmation creates new segments and nodes 5. Original pipeline replaced with segmented version Technical Details: - Creates new node IDs for division points - Splits coordinates at each division point - Generates new pipeline segments with proper Start/End nodes - Updates all layer references - Maintains attribute consistency across segments Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Selected pipeline and user-defined division points. - Node and pipeline layers for updates. Public API: - activateDividePipelineTool(): Begin pipeline division workflow. / /** Activate the pipeline divide tool. Entry point for the divide-pipeline workflow. Delegates to {@link startPipelineDivision}, which guides the user through selecting a pipeline segment and clicking the desired split point. The original pipeline feature is replaced by two new child features whose coordinate arrays cover each half; attributes are inherited with a sequence suffix appended to the ID. A node marker is automatically inserted at the division point.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/edit_geometry.js</code></summary>
<div class="module-header">
<p><strong>QGas - Edit Geometry Tool</strong></p>
<p>Provides interactive geometry editing capabilities for infrastructure elements. Allows users to modify positions of nodes and reshape pipeline routes.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Node position editing with drag-and-drop</li>
  <li>Pipeline route editing (vertex manipulation)</li>
  <li>Endpoint locking to preserve connections</li>
  <li>Visual feedback during editing</li>
  <li>Split node support with offset tracking</li>
  <li>Save and discard actions</li>
  <li>Automatic geometry updates</li>
  <li>Contributor tracking</li>
</ul>
<p><strong>Editing Modes:</strong></p>
<ul>
  <li>Node Editing: Drag nodes to new positions</li>
  <li>Pipeline Editing: Add, move, and remove vertices</li>
  <li>Locked Endpoints: Pipeline start/end points remain connected to nodes</li>
</ul>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Uses Leaflet.Editable for geometry manipulation</li>
  <li>Tracks original geometry for discard functionality</li>
  <li>Updates all connected elements when nodes move</li>
  <li>Maintains split node offsets during zoom/pan</li>
  <li>Prevents simultaneous editing of multiple elements</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Map interactions for geometry edits.</li>
  <li>Target layers for nodes and pipelines.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateEditMode(): Enter geometry editing mode.</li>
  <li>updateAllElementInteractions(): Refresh info handlers.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateEditModeForExisting()</code></p>
<p class="api-desc">QGas - Edit Geometry Tool Provides interactive geometry editing capabilities for infrastructure elements. Allows users to modify positions of nodes and reshape pipeline routes. Key Features: - Node position editing with drag-and-drop - Pipeline route editing (vertex manipulation) - Endpoint locking to preserve connections - Visual feedback during editing - Split node support with offset tracking - Save and discard actions - Automatic geometry updates - Contributor tracking Editing Modes: - Node Editing: Drag nodes to new positions - Pipeline Editing: Add, move, and remove vertices - Locked Endpoints: Pipeline start/end points remain connected to nodes Technical Details: - Uses Leaflet.Editable for geometry manipulation - Tracks original geometry for discard functionality - Updates all connected elements when nodes move - Maintains split node offsets during zoom/pan - Prevents simultaneous editing of multiple elements Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Map interactions for geometry edits. - Target layers for nodes and pipelines. Public API: - activateEditMode(): Enter geometry editing mode. - updateAllElementInteractions(): Refresh info handlers. / /** Activate edit mode for existing drawn pipeline features. Attaches per-feature click handlers to all line-string features in the &lt;code&gt;drawnItems&lt;/code&gt; layer group. Clicking a feature opens Leaflet Draw editing for that feature, locks its endpoints to preserve node connectivity, and shows Save/Discard toolbar buttons. Only one feature can be edited at a time; selecting a new one automatically disables the previously active edit session.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateSplitNodeOffsets()</code></p>
<p class="api-desc">Recalculate and apply positional offsets for split-node sub-markers. Iterates all node markers that carry a &lt;code&gt;_splitOffset&lt;/code&gt; pixel offset (assigned during a node-split operation) and recomputes their geographic position after map pan/zoom using Leaflet’s layer-point conversion. Called automatically on &lt;code&gt;zoomend&lt;/code&gt; and &lt;code&gt;moveend&lt;/code&gt; map events.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>updateAllElementInteractions()</code></p>
<p class="api-desc">Rebind all element click and popup handlers for the current mode. Clears existing event listeners on every node, power-plant, compressor, LNG terminal, storage, consumption, and other point-layer feature, then re-attaches the appropriate handler for the active &lt;code&gt;currentMode&lt;/code&gt;. Must be called after any operation that changes node markers (e.g., shape changes, icon replacement) to restore interactivity.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>activateEditMode()</code></p>
<p class="api-desc">Activate the full geometry editing mode. Disables any active drawing tools, closes open popups, and releases any in-progress Leaflet Draw edit session. Binds per-layer click handlers for node-position editing (click to select, drag to reposition) and pipeline routing editing (via {@link activatePipelineRouteEdit}). Connected pipelines are updated in real time as nodes are dragged. Save and Discard buttons are shown for each edit session.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/group_pipelines.js</code></summary>
<div class="module-header">
<p><strong>QGas - Group Pipelines Tool</strong></p>
<p>Allows users to logically group multiple pipeline segments into named groups for organizational and analytical purposes.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Named pipeline groups</li>
  <li>Visual selection with color coding</li>
  <li>Automatic total length calculation</li>
  <li>Start/end point tracking</li>
  <li>Group metadata storage</li>
  <li>Multi-segment selection</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User enters group name 2. Selects multiple pipeline segments by clicking 3. Selected pipelines show visual highlight 4. Group is saved with metadata (name, length, endpoints) 5. Group data available for export and analysis</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Calculates total length from all segments</li>
  <li>Tracks first start point and last end point</li>
  <li>Stores group information in pipelineGroups array</li>
  <li>Maintains visual feedback during selection</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Selected pipeline segments and group naming.</li>
  <li>Map layers for selection highlighting.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateGroupPipelinesTool(): Begin grouping workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>startPipelineGrouping()</code></p>
<p class="api-desc">QGas - Group Pipelines Tool Allows users to logically group multiple pipeline segments into named groups for organizational and analytical purposes. Key Features: - Named pipeline groups - Visual selection with color coding - Automatic total length calculation - Start/end point tracking - Group metadata storage - Multi-segment selection Workflow: 1. User enters group name 2. Selects multiple pipeline segments by clicking 3. Selected pipelines show visual highlight 4. Group is saved with metadata (name, length, endpoints) 5. Group data available for export and analysis Technical Details: - Calculates total length from all segments - Tracks first start point and last end point - Stores group information in pipelineGroups array - Maintains visual feedback during selection Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Selected pipeline segments and group naming. - Map layers for selection highlighting. Public API: - activateGroupPipelinesTool(): Begin grouping workflow. / /* ================================================================================ STATE MANAGEMENT / let groupingMode = false; let currentGroupName = &#x27;&#x27;; let selectedPipelinesForGroup = []; function __computeLineLengthKm(layer) { try { if (!layer) return 0; const props = (layer.feature &amp;&amp; layer.feature.properties) ? layer.feature.properties : {}; const raw = (props.Length_km ?? props.length_km ?? props.LENGTH_KM ?? null); const num = raw !== null ? parseFloat(raw) : NaN; if (!isNaN(num) &amp;&amp; isFinite(num)) return num; if (typeof layer.getLatLngs === &#x27;function&#x27; &amp;&amp; typeof map !== &#x27;undefined&#x27; &amp;&amp; map &amp;&amp; typeof map.distance === &#x27;function&#x27;) { const latlngs = layer.getLatLngs(); const flatten = (arr) =&gt; Array.isArray(arr) ? arr.flat(Infinity) : []; const pts = flatten(latlngs).filter(p =&gt; p &amp;&amp; typeof p.lat === &#x27;number&#x27; &amp;&amp; typeof p.lng === &#x27;number&#x27;); let meters = 0; for (let i = 1; i &lt; pts.length; i++) { meters += map.distance(pts[i-1], pts[i]); } return meters / 1000; } return 0; } catch (e) { console.error(&#x27;Group Pipelines: length calc failed&#x27;, e); return 0; } } let groupStartPoint = null; let groupEndPoint = null; /** Start the pipeline grouping workflow. Deactivates all active modes, prompts the user to enter a group name, and then guides them through selecting a set of pipeline segments and optionally specifying a start and end node. The resulting group is stored in the &lt;code&gt;pipelineGroups&lt;/code&gt; array with metadata (name, pipeline IDs, total length, element count) and persisted to the project state. The group can later be highlighted via {@link highlightGroup}.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/info_mode.js</code></summary>
<div class="module-header">
<p><strong>QGas - Info Mode Tool</strong></p>
<p>Default interaction mode for viewing element information without editing. Displays element attributes, metadata, and allows navigation between features.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>View element properties in info overlays</li>
  <li>Click elements to see detailed information</li>
  <li>Non-destructive interaction (read-only)</li>
  <li>Automatic cleanup of edit mode artifacts</li>
  <li>Reset all temporary highlights and selections</li>
  <li>Restore normal layer visibility</li>
</ul>
<p><strong>Functionality:</strong></p>
<ul>
  <li>Deactivates all editing tools</li>
  <li>Removes edit-mode UI elements (save/discard buttons)</li>
  <li>Resets pipeline and node highlights</li>
  <li>Clears pending deletion selections</li>
  <li>Restores standard info popup handlers</li>
  <li>Shows full layer visibility (no edit-mode hiding)</li>
</ul>
<p>This is the safe default mode that users return to after completing editing operations.</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Map click events and feature properties.</li>
  <li>Modal UI helpers for info display.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateInfoTool(): Activate info tool with contributor checks.</li>
  <li>activateInfoMode(force): Bind info handlers for the map.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateInfoTool()</code></p>
<p class="api-desc">QGas - Info Mode Tool Default interaction mode for viewing element information without editing. Displays element attributes, metadata, and allows navigation between features. Key Features: - View element properties in info overlays - Click elements to see detailed information - Non-destructive interaction (read-only) - Automatic cleanup of edit mode artifacts - Reset all temporary highlights and selections - Restore normal layer visibility Functionality: - Deactivates all editing tools - Removes edit-mode UI elements (save/discard buttons) - Resets pipeline and node highlights - Clears pending deletion selections - Restores standard info popup handlers - Shows full layer visibility (no edit-mode hiding) This is the safe default mode that users return to after completing editing operations. Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Map click events and feature properties. - Modal UI helpers for info display. Public API: - activateInfoTool(): Activate info tool with contributor checks. - activateInfoMode(force): Bind info handlers for the map. / /* Info Mode tool module. / (function(){ /** Activate info tool (wrapper with contributor check)</p>
</div>
<div class="api-func">
<p class="api-sig"><code>activateInfoMode(force = false)</code></p>
<p class="api-desc">Activate info mode</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>force</code></td><td><code>boolean</code></td><td>Force reactivation even if already in info mode</td></tr>
</tbody></table>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/integrate_dataset.js</code></summary>
<div class="module-header">
<p><strong>QGas - Integrate Dataset Tool</strong></p>
<p>Enables integration of external GeoJSON datasets into the current map. Supports both preloaded datasets and file upload.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Preloaded dataset selection</li>
  <li>GeoJSON file upload</li>
  <li>Interactive element-to-pipeline mapping</li>
  <li>Data validation</li>
  <li>Layer creation for new datasets</li>
  <li>Automatic legend integration</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects dataset source (preloaded or file) 2. Dataset is loaded and validated 3. If needed, user maps elements to pipelines 4. Dataset is integrated as new layer 5. Legend updated with new layer</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Validates GeoJSON structure</li>
  <li>Creates appropriate layer types (point/line)</li>
  <li>Handles feature properties</li>
  <li>Supports pipeline association</li>
  <li>Registers in layer metadata</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>User-selected datasets and file paths.</li>
  <li>Map instance for temporary layer previews.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateIntegrateDatasetTool(): Start dataset integration workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateIntegrateDatasetTool()</code></p>
<p class="api-desc">QGas - Integrate Dataset Tool Enables integration of external GeoJSON datasets into the current map. Supports both preloaded datasets and file upload. Key Features: - Preloaded dataset selection - GeoJSON file upload - Interactive element-to-pipeline mapping - Data validation - Layer creation for new datasets - Automatic legend integration Workflow: 1. User selects dataset source (preloaded or file) 2. Dataset is loaded and validated 3. If needed, user maps elements to pipelines 4. Dataset is integrated as new layer 5. Legend updated with new layer Technical Details: - Validates GeoJSON structure - Creates appropriate layer types (point/line) - Handles feature properties - Supports pipeline association - Registers in layer metadata Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - User-selected datasets and file paths. - Map instance for temporary layer previews. Public API: - activateIntegrateDatasetTool(): Start dataset integration workflow. / /** Activate the integrate-dataset tool. Validates that a contributor name has been entered, deactivates all other editing modes, and launches the dataset integration workflow via {@link startDatasetIntegration}. The workflow guides the user through selecting a GeoJSON source (preloaded server dataset or local file upload) and creating pairwise element-equivalence links between the integration dataset and the currently loaded QGas layers.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>loadPreloadedDataset()</code></p>
<p class="api-desc">Load and activate a preloaded server-side dataset for integration. Reads the selected value from the &lt;code&gt;#preloaded-select&lt;/code&gt; dropdown element rendered inside the current popup and calls {@link setupIntegrationModeWithPreloaded} with the chosen filename. Shows an info popup if no selection has been made.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>loadFileDataset()</code></p>
<p class="api-desc">Load a user-supplied GeoJSON file and activate it for integration. Reads the file selected in &lt;code&gt;#dataset-file-input&lt;/code&gt;, parses it as JSON, and registers the resulting feature collection under the original filename key in the integration dataset registry. Then calls {@link setupIntegrationModeWithPreloaded} to activate the integration workflow. Shows an error popup if parsing fails or no file is selected.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>finishIntegration()</code></p>
<p class="api-desc">Finish the integration session and export the equivalence list. Serialises the current &lt;code&gt;equivalenceList&lt;/code&gt; array to a JSON file (&lt;code&gt;integration_equivalences.json&lt;/code&gt;) and triggers a browser download. After the download is initiated, the integration overlay is cleaned up and a success summary popup is shown.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>cancelIntegration()</code></p>
<p class="api-desc">Cancel the integration session and clean up all temporary state. Delegates to {@link cleanupIntegrationMode} to remove the integration overlay, restore hidden layers, and clear all pending equivalences. Shows a brief cancellation info popup.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/reconnect_infrastructure.js</code></summary>
<div class="module-header">
<p><strong>QGas - Reconnect Infrastructure Tool</strong></p>
<p>Allows users to change the node connection of infrastructure elements (storages, LNG terminals, power plants, compressors) by selecting a new connection node.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive infrastructure element selection</li>
  <li>Visual node selection</li>
  <li>Connection reassignment</li>
  <li>Property update automation</li>
  <li>Layer visibility management</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects infrastructure element to reconnect 2. Other layers temporarily hidden for clarity 3. User clicks new target node 4. Connection updated in properties 5. Visual feedback confirms change</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Updates node reference properties</li>
  <li>Maintains element geometry</li>
  <li>Preserves all other attributes</li>
  <li>Restores layer visibility after completion</li>
  <li>Supports all infrastructure types</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Node and infrastructure selections.</li>
  <li>Map layers for connection updates.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateReconnectInfrastructureTool(): Start reconnection workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateReconnectInfrastructureTool()</code></p>
<p class="api-desc">QGas - Reconnect Infrastructure Tool Allows users to change the node connection of infrastructure elements (storages, LNG terminals, power plants, compressors) by selecting a new connection node. Key Features: - Interactive infrastructure element selection - Visual node selection - Connection reassignment - Property update automation - Layer visibility management Workflow: 1. User selects infrastructure element to reconnect 2. Other layers temporarily hidden for clarity 3. User clicks new target node 4. Connection updated in properties 5. Visual feedback confirms change Technical Details: - Updates node reference properties - Maintains element geometry - Preserves all other attributes - Restores layer visibility after completion - Supports all infrastructure types Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Node and infrastructure selections. - Map layers for connection updates. Public API: - activateReconnectInfrastructureTool(): Start reconnection workflow. / (function () { let reconnectMode = false; let selectedInfrastructureElement = null; let originalLayerVisibility = {}; function startReconnectInfrastructure() { reconnectMode = true; selectedInfrastructureElement = null; /* Capture layer visibility so we can restore it after reconnection. / originalLayerVisibility = { powerplants: powerplantsLayer &amp;&amp; map.hasLayer(powerplantsLayer), compressors: compressorsLayer &amp;&amp; map.hasLayer(compressorsLayer), storages: storageLayer &amp;&amp; map.hasLayer(storageLayer), lng: lngLayer &amp;&amp; map.hasLayer(lngLayer), consumption: consumptionLayer &amp;&amp; map.hasLayer(consumptionLayer), shortPipe: shortPipeLayer &amp;&amp; map.hasLayer(shortPipeLayer) }; /* Activate click handlers for infrastructure elements. / setupInfrastructureClickHandlers(); showCustomPopup( &#x27;🔌 Reconnect Infrastructure - Step 1&#x27;, &#x27;&lt;p style=&quot;text-align: center; margin: 15px 0;&quot;&gt;Click on a Storage, LNG Terminal, Powerplant, or Compressor to reconnect it to a different node.&lt;/p&gt;&#x27;, [ { text: &#x27;Start Selection&#x27;, type: &#x27;primary&#x27;, onClick: () =&gt; { closeCustomPopup(); } }, { text: &#x27;Cancel&#x27;, type: &#x27;secondary&#x27;, onClick: () =&gt; { exitReconnectMode(); } } ] ); } function setupInfrastructureClickHandlers() { /* Storage layer selection handlers. */ if (storageLayer) { storageLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); if (layer.unbindPopup) layer.unbindPopup(); layer.on(&#x27;click&#x27;, function(e) { if (reconnectMode &amp;&amp; !selectedInfrastructureElement) { selectInfrastructureForReconnect(layer); e.stopPropagation(); } }); }); } /* LNG layer selection handlers. */ if (lngLayer) { lngLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); if (layer.unbindPopup) layer.unbindPopup(); layer.on(&#x27;click&#x27;, function(e) { if (reconnectMode &amp;&amp; !selectedInfrastructureElement) { selectInfrastructureForReconnect(layer); e.stopPropagation(); } }); }); } /* Powerplants layer selection handlers. */ if (powerplantsLayer) { powerplantsLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); if (layer.unbindPopup) layer.unbindPopup(); layer.on(&#x27;click&#x27;, function(e) { if (reconnectMode &amp;&amp; !selectedInfrastructureElement) { selectInfrastructureForReconnect(layer); e.stopPropagation(); } }); }); } /* Compressors layer selection handlers. */ if (compressorsLayer) { compressorsLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); if (layer.unbindPopup) layer.unbindPopup(); layer.on(&#x27;click&#x27;, function(e) { if (reconnectMode &amp;&amp; !selectedInfrastructureElement) { selectInfrastructureForReconnect(layer); e.stopPropagation(); } }); }); } } function selectInfrastructureForReconnect(infrastructureLayer) { selectedInfrastructureElement = infrastructureLayer; /* Highlight the selected infrastructure element. */ if (infrastructureLayer.setStyle) { infrastructureLayer.setStyle({ fillColor: &#x27;#ffff00&#x27;, color: &#x27;#ff0000&#x27;, weight: 3, fillOpacity: 0.7 }); } /* Hide other infrastructure elements to focus the selection. */ hideOtherInfrastructureElements(); /* Ensure nodes render above pipelines for precise selection. */ if (nodeLayer &amp;&amp; pipelineLayer) { if (map.hasLayer(nodeLayer)) map.removeLayer(nodeLayer); if (map.hasLayer(pipelineLayer)) map.removeLayer(pipelineLayer); /* Add pipelines first, then nodes so nodes appear on top. */ pipelineLayer.addTo(map); nodeLayer.addTo(map); } /* Activate node click handlers for reconnection. */ setupNodeClickHandlers(); const infrastructureName = getInfrastructureName(infrastructureLayer); const currentNode = infrastructureLayer.feature.properties.Node || &#x27;No node assigned&#x27;; showCustomPopup( &#x27;🔌 Reconnect Infrastructure - Step 2&#x27;, `&lt;p style=&quot;text-align: center; margin: 15px 0;&quot;&gt;&lt;strong&gt;Selected:&lt;/strong&gt; ${infrastructureName}&lt;br&gt;&lt;strong&gt;Current Node:&lt;/strong&gt; ${currentNode}&lt;br&gt;&lt;br&gt;Now click on a node to reconnect this infrastructure element.&lt;/p&gt;`, [ { text: &#x27;Continue Selection&#x27;, type: &#x27;primary&#x27;, onClick: () =&gt; { closeCustomPopup(); } }, { text: &#x27;Cancel&#x27;, type: &#x27;secondary&#x27;, onClick: () =&gt; { exitReconnectMode(); } } ] ); } function hideOtherInfrastructureElements() { /* Hide all infrastructure elements except the selected one. */ if (storageLayer) { storageLayer.eachLayer(layer =&gt; { if (layer !== selectedInfrastructureElement) { if (layer.setStyle) { layer.setStyle({opacity: 0, fillOpacity: 0}); } } }); } if (lngLayer) { lngLayer.eachLayer(layer =&gt; { if (layer !== selectedInfrastructureElement) { if (layer.setStyle) { layer.setStyle({opacity: 0, fillOpacity: 0}); } } }); } if (powerplantsLayer) { powerplantsLayer.eachLayer(layer =&gt; { if (layer !== selectedInfrastructureElement) { if (layer.setStyle) { layer.setStyle({opacity: 0, fillOpacity: 0}); } } }); } if (compressorsLayer) { compressorsLayer.eachLayer(layer =&gt; { if (layer !== selectedInfrastructureElement) { if (layer.setStyle) { layer.setStyle({opacity: 0, fillOpacity: 0}); } } }); } /* Hide non-target layers entirely during reconnection. */ if (consumptionLayer &amp;&amp; map.hasLayer(consumptionLayer)) { map.removeLayer(consumptionLayer); } if (shortPipeLayer &amp;&amp; map.hasLayer(shortPipeLayer)) { map.removeLayer(shortPipeLayer); } } function setupNodeClickHandlers() { if (!nodeLayer) { return; } forEachNodeMarker(layer =&gt; { layer.off(&#x27;click&#x27;); if (layer.unbindPopup) layer.unbindPopup(); layer.on(&#x27;click&#x27;, function(e) { if (reconnectMode &amp;&amp; selectedInfrastructureElement) { reconnectToNode(layer); if (e) { L.DomEvent.stopPropagation(e); } } }); }); } function reconnectToNode(nodeLayer) { const nodeId = nodeLayer.feature.properties.ID; const nodeName = nodeLayer.feature.properties.Name || nodeId; const infrastructureName = getInfrastructureName(selectedInfrastructureElement); /* Update the node reference in the infrastructure element. */ selectedInfrastructureElement.feature.properties.Node = nodeId; selectedInfrastructureElement.feature.properties.modified = true; /* Show a confirmation popup for the reconnection. */ showCustomPopup( &#x27;✅ Reconnection Successful&#x27;, `&lt;p style=&quot;text-align: center; margin: 15px 0;&quot;&gt;&lt;strong&gt;${infrastructureName}&lt;/strong&gt; has been reconnected to node &lt;strong&gt;${nodeName}&lt;/strong&gt; (ID: ${nodeId})&lt;/p&gt;`, [ { text: &#x27;Continue Reconnecting&#x27;, type: &#x27;primary&#x27;, onClick: () =&gt; { /* Return to the first step to reconnect another element. */ restoreInfrastructureVisibility(); selectedInfrastructureElement = null; setupInfrastructureClickHandlers(); showCustomPopup( &#x27;🔌 Reconnect Infrastructure - Step 1&#x27;, &#x27;&lt;p style=&quot;text-align: center; margin: 15px 0;&quot;&gt;Click on another Storage, LNG Terminal, Powerplant, or Compressor to reconnect it to a different node.&lt;/p&gt;&#x27;, [ { text: &#x27;Continue Selection&#x27;, type: &#x27;primary&#x27;, onClick: () =&gt; { closeCustomPopup(); } }, { text: &#x27;Finish&#x27;, type: &#x27;secondary&#x27;, onClick: () =&gt; { exitReconnectMode(); } } ] ); } }, { text: &#x27;Finish&#x27;, type: &#x27;secondary&#x27;, onClick: () =&gt; { exitReconnectMode(); } } ] ); } function getInfrastructureName(infrastructureLayer) { const props = infrastructureLayer.feature.properties; return props.Name || props.Plant_name || props.Terminal_name || props.Storage_name || props.ID || &#x27;Unknown Infrastructure&#x27;; } function restoreInfrastructureVisibility() { /* Restore visibility for all infrastructure elements. */ if (storageLayer) { storageLayer.eachLayer(layer =&gt; { if (layer.setStyle) { layer.setStyle({ opacity: 0.8, fillOpacity: 0.6, color: &#x27;#990&#x27;, fillColor: &#x27;#990&#x27; }); } }); } if (lngLayer) { lngLayer.eachLayer(layer =&gt; { if (layer.setStyle) { layer.setStyle({ opacity: 0.8, fillOpacity: 0.6, color: &#x27;#099&#x27;, fillColor: &#x27;#099&#x27; }); } }); } if (powerplantsLayer) { powerplantsLayer.eachLayer(layer =&gt; { if (layer.setStyle) { layer.setStyle({ opacity: 0.8, fillOpacity: 0.6, color: &#x27;#090&#x27;, fillColor: &#x27;#090&#x27; }); } }); } if (compressorsLayer) { compressorsLayer.eachLayer(layer =&gt; { if (layer.setStyle) { layer.setStyle({ opacity: 0.8, fillOpacity: 0.6, color: &#x27;#009&#x27;, fillColor: &#x27;#009&#x27; }); } }); } } function exitReconnectMode() { reconnectMode = false; selectedInfrastructureElement = null; /* Restore visibility for all infrastructure elements. */ restoreInfrastructureVisibility(); /* Restore original layer visibility. */ if (originalLayerVisibility.consumption &amp;&amp; consumptionLayer) { consumptionLayer.addTo(map); } if (originalLayerVisibility.shortPipe &amp;&amp; shortPipeLayer) { shortPipeLayer.addTo(map); } /* Reset click handlers to default behavior. */ resetInfrastructureClickHandlers(); /* Switch back to info mode. */ currentMode = &#x27;info&#x27;; activateInfoMode(); selectTool(&#x27;info&#x27;); resetNodeClickHandlers(); activateInfoMode(); closeCustomPopup(); } function resetInfrastructureClickHandlers() { if (storageLayer) { storageLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); }); } if (lngLayer) { lngLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); }); } if (powerplantsLayer) { powerplantsLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); }); } if (compressorsLayer) { compressorsLayer.eachLayer(layer =&gt; { layer.off(&#x27;click&#x27;); }); } } function resetNodeClickHandlers() { forEachNodeMarker(layer =&gt; { layer.off(&#x27;click&#x27;); }); } /** Activate the Reconnect Infrastructure tool. Deactivates any currently active editing mode, sets the application mode to {@code &#x27;reconnect-infrastructure&#x27;}, and initiates the two-step reconnection workflow. In the first step the user selects an existing infrastructure element (storage, LNG terminal, power plant, or compressor); in the second step the user clicks a target node, and the element&#x27;s node-reference property is updated accordingly. Layer visibility is temporarily adjusted during the workflow and restored upon completion or cancellation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/short_pipe.js</code></summary>
<div class="module-header">
<p><strong>QGas - Short Pipe Tool</strong></p>
<p>Converts standard pipeline segments into short-pipe elements with distinct styling and layer assignment. Used for creating simplified connection segments.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive pipeline selection</li>
  <li>Visual selection feedback</li>
  <li>Layer reassignment (from pipeline to short-pipe layer)</li>
  <li>Batch selection support</li>
  <li>Confirmation before applying changes</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User activates tool 2. Clicks pipeline segments to mark as short pipes 3. Selected segments show highlighted styling 4. Confirmation moves segments to short-pipe layer 5. Properties and styling updated automatically</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Maintains original geometry</li>
  <li>Updates layer membership</li>
  <li>Preserves all attributes except layer assignment</li>
  <li>Uses distinct visual style for identification</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Map clicks for short pipe placement.</li>
  <li>Node selection and layer context.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateShortPipeMode(): Start short pipe workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>startShortPipeSelection()</code></p>
<p class="api-desc">QGas - Short Pipe Tool Converts standard pipeline segments into short-pipe elements with distinct styling and layer assignment. Used for creating simplified connection segments. Key Features: - Interactive pipeline selection - Visual selection feedback - Layer reassignment (from pipeline to short-pipe layer) - Batch selection support - Confirmation before applying changes Workflow: 1. User activates tool 2. Clicks pipeline segments to mark as short pipes 3. Selected segments show highlighted styling 4. Confirmation moves segments to short-pipe layer 5. Properties and styling updated automatically Technical Details: - Maintains original geometry - Updates layer membership - Preserves all attributes except layer assignment - Uses distinct visual style for identification Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Map clicks for short pipe placement. - Node selection and layer context. Public API: - activateShortPipeMode(): Start short pipe workflow. / /* ================================================================================ STATE MANAGEMENT / let shortPipeSelectionActive = false; let selectedShortPipes = []; function captureShortPipeBaseStyle(layer) { if (!layer || layer._shortPipeBaseStyle) return; const options = layer.options || {}; layer._shortPipeBaseStyle = { color: options.color || layer._originalColor || &#x27;#3388ff&#x27;, weight: typeof options.weight === &#x27;number&#x27; ? options.weight : (layer._originalWeight ?? 3), dashArray: Object.prototype.hasOwnProperty.call(options, &#x27;dashArray&#x27;) ? options.dashArray : (layer._originalDashArray ?? null), opacity: typeof options.opacity === &#x27;number&#x27; ? options.opacity : (layer._originalOpacity ?? 1) }; } function restoreShortPipeBaseStyle(layer) { if (!layer || !layer._shortPipeBaseStyle) return; layer.setStyle(layer._shortPipeBaseStyle); syncPathStyle(layer, layer._shortPipeBaseStyle); delete layer._shortPipeBaseStyle; } function applyShortPipeSelectionStyle(layer) { if (!layer) return; captureShortPipeBaseStyle(layer); const selectionStyle = getShortPipeSelectionStyle(); layer.setStyle(selectionStyle); syncPathStyle(layer, selectionStyle); if (typeof layer.bringToFront === &#x27;function&#x27;) { layer.bringToFront(); } } function resetLayerAfterShortPipeInteraction(layer) { if (!layer) return; restoreShortPipeBaseStyle(layer); layer.off(&#x27;click&#x27;); setPipelineInteraction(layer, &#x27;info&#x27;); } function resetPipelineLayersAfterShortPipeMode() { const lineLayers = (typeof getAllLineLayers === &#x27;function&#x27; ? getAllLineLayers() : (typeof pipelineLayer !== &#x27;undefined&#x27; &amp;&amp; pipelineLayer ? [pipelineLayer] : [])); lineLayers.forEach(group =&gt; { if (!group) return; forEachPolylineFeature(group, layer =&gt; { resetLayerAfterShortPipeInteraction(layer); }); }); } /** Start the short-pipe selection workflow. Activates short-pipe selection mode and attaches click handlers to all polyline features in every active line layer. Clicking a pipeline segment toggles its short-pipe status (visual cue: orange dashed stroke). A save button at the top of the map commits the selection as short-pipe entries in the dataset; a discard button resets all styles and exits the mode without saving.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/split_node.js</code></summary>
<div class="module-header">
<p><strong>QGas - Split Node Tool</strong></p>
<p>Enables splitting a single node into multiple subnodes while maintaining pipeline connectivity. Useful for representing multiple parallel connections or separating infrastructure at complex junction points.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive node selection for splitting</li>
  <li>Visual subnode creation with offset positioning</li>
  <li>Automatic pipeline reassignment to subnodes</li>
  <li>Maintains network topology</li>
  <li>Generates unique IDs for subnodes (e.g., N_01A, N_01B)</li>
  <li>Preserves node attributes on subnodes</li>
  <li>Interactive pipeline selection for reassignment</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects parent node to split 2. Creates subnodes with visual offset 3. Assigns connected pipelines to appropriate subnodes 4. Original node can be kept or deleted 5. Network topology is automatically updated</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Subnodes positioned with pixel offsets from parent</li>
  <li>Offsets maintained during map zoom/pan</li>
  <li>Start_Node/End_Node references updated in pipeline properties</li>
  <li>Supports multiple subnode creation from single parent</li>
  <li>Interactive highlighting for pipeline selection</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Selected node and connected pipelines.</li>
  <li>Map interactions for split confirmation.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateSplitNodeTool(): Begin node split workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateSplitNodeTool()</code></p>
<p class="api-desc">QGas - Split Node Tool Enables splitting a single node into multiple subnodes while maintaining pipeline connectivity. Useful for representing multiple parallel connections or separating infrastructure at complex junction points. Key Features: - Interactive node selection for splitting - Visual subnode creation with offset positioning - Automatic pipeline reassignment to subnodes - Maintains network topology - Generates unique IDs for subnodes (e.g., N_01A, N_01B) - Preserves node attributes on subnodes - Interactive pipeline selection for reassignment Workflow: 1. User selects parent node to split 2. Creates subnodes with visual offset 3. Assigns connected pipelines to appropriate subnodes 4. Original node can be kept or deleted 5. Network topology is automatically updated Technical Details: - Subnodes positioned with pixel offsets from parent - Offsets maintained during map zoom/pan - Start_Node/End_Node references updated in pipeline properties - Supports multiple subnode creation from single parent - Interactive highlighting for pipeline selection Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Selected node and connected pipelines. - Map interactions for split confirmation. Public API: - activateSplitNodeTool(): Begin node split workflow. / /* Split Node Tool Extracted from core.js to keep tool logic modular. / /** Activate the split-node tool. Deactivates all other active editing modes, sets &lt;code&gt;currentMode&lt;/code&gt; to &lt;code&gt;&#x27;split-node&#x27;&lt;/code&gt;, and starts the interactive node-splitting workflow. The user selects a node to split; the tool then creates a duplicate node offset from the original and reassigns a user-selected subset of the connected pipelines to the new node, thereby restructuring the network topology.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>showCustomPopup(title, content, buttons, extraElement = null)</code></p>
<p class="api-desc">Display a fully configurable modal popup. Renders a modal dialog with a title, arbitrary HTML content, an optional extra DOM element appended below the content, and one or more action buttons. Each button carries an &lt;code&gt;onClick&lt;/code&gt; callback; setting &lt;code&gt;keepOpen: true&lt;/code&gt; on a button prevents the popup from closing after the callback executes. Errors thrown inside button callbacks are caught and shown as a secondary error popup.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>title</code></td><td><code>string</code></td><td>Popup heading text.</td></tr>
<tr><td><code>content</code></td><td><code>string</code></td><td>HTML string for the popup body.</td></tr>
<tr><td><code>buttons</code></td><td><code>Array&lt;Object&gt;</code></td><td>Array of button descriptors.</td></tr>
<tr><td><code>buttons</code></td><td><code>string</code></td><td>[].text - Button label.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>closeCustomPopup()</code></p>
<p class="api-desc">Close the currently open custom popup. Hides the popup overlay and container and resets the docking state. Safe to call even when no popup is currently displayed.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>showInfoPopup(message, title = &#x27;ℹ️ Notice&#x27;, buttonText = &#x27;OK&#x27;)</code></p>
<p class="api-desc">Show a simple informational popup. Convenience wrapper around {@link showCustomPopup} that renders a centred message paragraph and a single OK button.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>message</code></td><td><code>string</code></td><td>Plain text or newline-separated message to display. Newlines are converted to &lt;code&gt;&amp;lt;br&amp;gt;&lt;/code&gt;.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>showErrorPopup(message, title = &#x27;⚠️ Error&#x27;, buttonText = &#x27;OK&#x27;)</code></p>
<p class="api-desc">Show an error popup with visually distinct styling. Convenience wrapper around {@link showCustomPopup} that renders the message in red and uses a single OK button for dismissal.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>message</code></td><td><code>string</code></td><td>Error description text.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>showConfirmationPopup(options = {})</code></p>
<p class="api-desc">Show a two-button confirmation popup. Presents a message with a Cancel and a Confirm button. Executes &lt;code&gt;options.onConfirm&lt;/code&gt; when confirmed or &lt;code&gt;options.onCancel&lt;/code&gt; when cancelled.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>showInputPrompt(options = {})</code></p>
<p class="api-desc">Show a modal prompt with a text or numeric input field. Renders a popup with an input element pre-filled with &lt;code&gt;options.defaultValue&lt;/code&gt;. Optional validator callback is invoked on confirm; if it returns a non-empty string the value is treated as an error message and the popup remains open. On successful confirmation &lt;code&gt;options.onConfirm&lt;/code&gt; receives the trimmed input value.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/switch_sublayer.js</code></summary>
<div class="module-header">
<p><strong>QGas - Switch Sublayer Tool</strong></p>
<p>Enables moving infrastructure elements between different sublayers while maintaining geometry and attributes. Useful for reorganizing data and managing infrastructure plans.</p>
<p><strong>Key Features:</strong></p>
<ul>
  <li>Interactive element selection</li>
  <li>Layer-to-layer transfer</li>
  <li>Attribute preservation</li>
  <li>Visual feedback during selection</li>
  <li>Batch element transfer</li>
  <li>Parent layer selection</li>
</ul>
<p><strong>Workflow:</strong></p>
<p>1. User selects source (parent) layer 2. Chooses destination sublayer 3. Selects elements to transfer (by clicking) 4. Confirmation moves elements to new layer 5. Layer metadata updated automatically</p>
<p><strong>Technical Details:</strong></p>
<ul>
  <li>Preserves all GeoJSON properties</li>
  <li>Updates layer membership</li>
  <li>Maintains visual styling</li>
  <li>Handles both line and point geometries</li>
  <li>Updates legend automatically</li>
</ul>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>Parent and target sublayer selection from layerConfig.</li>
  <li>Map interactions for feature selection.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateSwitchSublayerTool(): Start sublayer switching workflow.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>startSublayerSwitchFlow()</code></p>
<p class="api-desc">QGas - Switch Sublayer Tool Enables moving infrastructure elements between different sublayers while maintaining geometry and attributes. Useful for reorganizing data and managing infrastructure plans. Key Features: - Interactive element selection - Layer-to-layer transfer - Attribute preservation - Visual feedback during selection - Batch element transfer - Parent layer selection Workflow: 1. User selects source (parent) layer 2. Chooses destination sublayer 3. Selects elements to transfer (by clicking) 4. Confirmation moves elements to new layer 5. Layer metadata updated automatically Technical Details: - Preserves all GeoJSON properties - Updates layer membership - Maintains visual styling - Handles both line and point geometries - Updates legend automatically Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: August 2025 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Inputs: - Parent and target sublayer selection from layerConfig. - Map interactions for feature selection. Public API: - activateSwitchSublayerTool(): Start sublayer switching workflow. / /** Start the sublayer switching workflow. Retrieves all layer configurations that declare sublayer children, presents a selection dialog for the parent layer, and then guides the user through selecting individual features to reassign to a sublayer. Selected elements are moved from the parent layer to the target sublayer (creating the sublayer on demand if it does not yet exist) and the legend is updated to reflect the new layer.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
<div class="api-func">
<p class="api-sig"><code>activateSwitchSublayerTool()</code></p>
<p class="api-desc">Activate the switch-to-sublayer tool. Public entry point registered on &lt;code&gt;window&lt;/code&gt;. Deactivates all other editing modes, sets &lt;code&gt;currentMode&lt;/code&gt; to &lt;code&gt;&#x27;switch-sublayer&#x27;&lt;/code&gt;, and delegates to {@link startSublayerSwitchFlow} to run the interactive layer-transfer workflow.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<details class="tool-section">
<summary><code>js/ui/tools/topology_check.js</code></summary>
<div class="module-header">
<p><strong>QGas - Topology Check Tool</strong></p>
<p>Analyzes network connectivity to identify unconnected nodes, unconnected lines, and disconnected network islands. Provides clickable results that focus the map on the selected element or isolate a specific network component.</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Author: Dipl.-Ing. Marco Quantschnig</li>
  <li>Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz</li>
  <li>Created: March 2026</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateTopologyCheckTool(): Run topology analysis and open results popup.</li>
</ul>
<div class="api-functions">
<h3>Public API Functions</h3>
<div class="api-func">
<p class="api-sig"><code>activateTopologyCheckTool()</code></p>
<p class="api-desc">QGas - Topology Check Tool Analyzes network connectivity to identify unconnected nodes, unconnected lines, and disconnected network islands. Provides clickable results that focus the map on the selected element or isolate a specific network component. Development Information: - Author: Dipl.-Ing. Marco Quantschnig - Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz - Created: March 2026 - License: See LICENSE file - Disclaimer: AI-assisted tools were used to support development and documentation. Public API: - activateTopologyCheckTool(): Run topology analysis and open results popup. / (function () { const topologyState = { hiddenMarkers: new Map(), hiddenLines: new Map(), filterActive: false, results: null }; function normalizeId(value) { if (value === null || typeof value === &#x27;undefined&#x27;) return &#x27;&#x27;; return String(value).trim().toLowerCase(); } function escapeHtml(value) { if (value === null || typeof value === &#x27;undefined&#x27;) return &#x27;&#x27;; return String(value) .replace(/&amp;/g, &#x27;&amp;amp;&#x27;) .replace(/&lt;/g, &#x27;&amp;lt;&#x27;) .replace(/&gt;/g, &#x27;&amp;gt;&#x27;) .replace(/&quot;/g, &#x27;&amp;quot;&#x27;) .replace(/&#x27;/g, &#x27;&amp;#39;&#x27;); } function getNodeId(marker) { const props = marker?.feature?.properties || {}; return props.ID || props.Id || props.id || props.Name || props.name || &#x27;&#x27;; } function getPropertyValueCaseInsensitive(props, keys) { if (!props || !keys || !keys.length) return &#x27;&#x27;; for (const key of keys) { if (Object.prototype.hasOwnProperty.call(props, key)) { const value = props[key]; if (value !== undefined &amp;&amp; value !== null &amp;&amp; String(value).trim()) { return String(value).trim(); } } } return &#x27;&#x27;; } function collectLineLayerGroups() { const groups = []; const seen = new Set(); const add = (layer) =&gt; { if (!layer || seen.has(layer)) return; seen.add(layer); groups.push(layer); }; try { const discovered = (typeof getAllLineLayers === &#x27;function&#x27;) ? getAllLineLayers() : []; discovered.forEach(add); } catch (e) {} [ window.pipelineLayer, window.estimatedPipelinesLayer, window.shortPipeLayer, window.hydrogenPipeLayer, window.drawnItems ].forEach(add); if (window.dynamicLayers) { Object.values(window.dynamicLayers).forEach(layer =&gt; { const hint = (typeof getLayerGeometryClassHint === &#x27;function&#x27; ? getLayerGeometryClassHint(layer) : &#x27;&#x27;).toLowerCase(); if (hint === &#x27;line&#x27;) add(layer); }); } if (window.customLayers) { Object.values(window.customLayers).forEach(layer =&gt; { const hint = (typeof getLayerGeometryClassHint === &#x27;function&#x27; ? getLayerGeometryClassHint(layer) : &#x27;&#x27;).toLowerCase(); if (hint === &#x27;line&#x27;) add(layer); }); } return groups; } function collectInlineLayerGroups() { if (typeof getAllInlineLayers === &#x27;function&#x27;) { try { return getAllInlineLayers() || []; } catch (e) { return []; } } return []; } function traverseLineLayers(groups, callback) { if (!Array.isArray(groups) || typeof callback !== &#x27;function&#x27;) return; groups.forEach(group =&gt; { if (!group) return; if (typeof forEachPolylineFeature === &#x27;function&#x27;) { forEachPolylineFeature(group, layer =&gt; callback(layer, group)); return; } if (typeof group.eachLayer === &#x27;function&#x27;) { group.eachLayer(layer =&gt; { if (!layer?.feature?.geometry) return; const geomType = layer.feature.geometry.type; if (geomType !== &#x27;LineString&#x27; &amp;&amp; geomType !== &#x27;MultiLineString&#x27;) return; callback(layer, group); }); } }); } function traversePointLayers(groups, callback) { if (!Array.isArray(groups) || typeof callback !== &#x27;function&#x27;) return; groups.forEach(group =&gt; { if (!group || typeof group.eachLayer !== &#x27;function&#x27;) return; group.eachLayer(layer =&gt; { if (!layer?.feature?.geometry) return; const geomType = layer.feature.geometry.type; if (geomType !== &#x27;Point&#x27; &amp;&amp; geomType !== &#x27;MultiPoint&#x27;) return; callback(layer, group); }); }); } function buildTopologyAnalysis() { const nodeMap = new Map(); const nodeList = []; const lineList = []; const lineMap = new Map(); const unconnectedLines = []; const referencedNodes = new Set(); const adjacency = new Map(); const startKeys = Array.isArray(window.START_NODE_KEYS) ? window.START_NODE_KEYS : [&#x27;Start_Node&#x27;, &#x27;start_node&#x27;, &#x27;StartNode&#x27;, &#x27;startnode&#x27;, &#x27;START_NODE&#x27;]; const endKeys = Array.isArray(window.END_NODE_KEYS) ? window.END_NODE_KEYS : [&#x27;End_Node&#x27;, &#x27;end_node&#x27;, &#x27;EndNode&#x27;, &#x27;endnode&#x27;, &#x27;END_NODE&#x27;]; forEachNodeMarker(marker =&gt; { const id = getNodeId(marker); if (!id) return; const normId = normalizeId(id); if (!normId) return; if (!nodeMap.has(normId)) { const layerName = (typeof getLayerGroupDisplayName === &#x27;function&#x27;) ? getLayerGroupDisplayName(marker._parentNodeLayer) : &#x27;&#x27;; const entry = { id, normId, marker, layerName }; nodeMap.set(normId, entry); nodeList.push(entry); } }); const lineGroups = collectLineLayerGroups(); const inlineGroups = collectInlineLayerGroups(); let lineIndex = 1; traverseLineLayers(lineGroups, (layer, group) =&gt; { const props = layer?.feature?.properties || {}; const id = props.ID || props.Id || props.id || props.Name || props.name || `Line ${lineIndex}`; const startIdRaw = getPropertyValueCaseInsensitive(props, startKeys); const endIdRaw = getPropertyValueCaseInsensitive(props, endKeys); const nodeIdRaw = getPropertyValueCaseInsensitive(props, [&#x27;Node&#x27;, &#x27;node&#x27;, &#x27;NODE&#x27;]); const startNorm = normalizeId(startIdRaw); const endNorm = normalizeId(endIdRaw); const nodeNorm = normalizeId(nodeIdRaw); if (startNorm) referencedNodes.add(startNorm); if (endNorm) referencedNodes.add(endNorm); if (nodeNorm) referencedNodes.add(nodeNorm); const hasStart = startNorm &amp;&amp; nodeMap.has(startNorm); const hasEnd = endNorm &amp;&amp; nodeMap.has(endNorm); const hasNode = nodeNorm &amp;&amp; nodeMap.has(nodeNorm); const isConnected = Boolean(hasStart &amp;&amp; hasEnd); const key = `line-${lineIndex}`; const layerName = (typeof getLayerGroupDisplayName === &#x27;function&#x27;) ? getLayerGroupDisplayName(group) : &#x27;&#x27;; const label = `${id}`; const lineEntry = { key, id, label, layer, group, layerName, startIdRaw, endIdRaw, nodeIdRaw, startNorm, endNorm, nodeNorm, isConnected, isInline: false }; lineList.push(lineEntry); lineMap.set(key, lineEntry); if (!isConnected) { const reasons = []; if (!startIdRaw) { reasons.push(&#x27;missing start node&#x27;); } else if (!hasStart) { reasons.push(`start node not found: ${startIdRaw}`); } if (!endIdRaw) { reasons.push(&#x27;missing end node&#x27;); } else if (!hasEnd) { reasons.push(`end node not found: ${endIdRaw}`); } unconnectedLines.push({ key, label, layerName, reason: reasons.join(&#x27;, &#x27;) || &#x27;missing node connection&#x27; }); } else { if (!adjacency.has(startNorm)) adjacency.set(startNorm, new Set()); if (!adjacency.has(endNorm)) adjacency.set(endNorm, new Set()); adjacency.get(startNorm).add(endNorm); adjacency.get(endNorm).add(startNorm); } lineIndex += 1; }); const inlineLayerSet = new Set(); const addInlineEntry = (marker, group) =&gt; { const props = marker?.feature?.properties || {}; const id = props.ID || props.Id || props.id || props.Name || props.name || `Inline ${lineIndex}`; const startIdRaw = getPropertyValueCaseInsensitive(props, startKeys); const endIdRaw = getPropertyValueCaseInsensitive(props, endKeys); const subStartIdRaw = getPropertyValueCaseInsensitive(props, [&#x27;SubNode_A&#x27;, &#x27;Subnode_A&#x27;, &#x27;SubNodeA&#x27;, &#x27;SubnodeA&#x27;, &#x27;Sub_Node_A&#x27;, &#x27;subnode_a&#x27;, &#x27;sub_node_a&#x27;]); const subEndIdRaw = getPropertyValueCaseInsensitive(props, [&#x27;SubNode_B&#x27;, &#x27;Subnode_B&#x27;, &#x27;SubNodeB&#x27;, &#x27;SubnodeB&#x27;, &#x27;Sub_Node_B&#x27;, &#x27;subnode_b&#x27;, &#x27;sub_node_b&#x27;]); const nodeIdRaw = getPropertyValueCaseInsensitive(props, [&#x27;Node&#x27;, &#x27;node&#x27;, &#x27;NODE&#x27;]); const startNorm = normalizeId(startIdRaw); const endNorm = normalizeId(endIdRaw); const subStartNorm = normalizeId(subStartIdRaw); const subEndNorm = normalizeId(subEndIdRaw); const nodeNorm = normalizeId(nodeIdRaw); const hasStart = startNorm &amp;&amp; nodeMap.has(startNorm); const hasEnd = endNorm &amp;&amp; nodeMap.has(endNorm); const hasNode = nodeNorm &amp;&amp; nodeMap.has(nodeNorm); let effectiveStartRaw = startIdRaw; let effectiveEndRaw = endIdRaw; let effectiveStartNorm = startNorm; let effectiveEndNorm = endNorm; if (subStartIdRaw || subEndIdRaw) { effectiveStartRaw = subStartIdRaw; effectiveEndRaw = subEndIdRaw; effectiveStartNorm = subStartNorm; effectiveEndNorm = subEndNorm; } const effectiveHasStart = effectiveStartNorm &amp;&amp; nodeMap.has(effectiveStartNorm); const effectiveHasEnd = effectiveEndNorm &amp;&amp; nodeMap.has(effectiveEndNorm); if (effectiveStartNorm) referencedNodes.add(effectiveStartNorm); if (effectiveEndNorm) referencedNodes.add(effectiveEndNorm); if (nodeNorm) referencedNodes.add(nodeNorm); const isConnected = Boolean((effectiveHasStart &amp;&amp; effectiveHasEnd) || hasNode); const key = `inline-${lineIndex}`; const layerName = (typeof getLayerGroupDisplayName === &#x27;function&#x27;) ? getLayerGroupDisplayName(group) : &#x27;&#x27;; const label = `${id}`; const lineEntry = { key, id, label, marker, layer: marker, group, layerName, startIdRaw: effectiveStartRaw, endIdRaw: effectiveEndRaw, nodeIdRaw, startNorm: effectiveStartNorm, endNorm: effectiveEndNorm, nodeNorm, isConnected, isInline: true }; lineList.push(lineEntry); lineMap.set(key, lineEntry); if (!isConnected) { const reasons = []; if (!effectiveStartRaw &amp;&amp; !effectiveEndRaw &amp;&amp; !nodeIdRaw) { reasons.push(&#x27;missing node reference&#x27;); } else { if (effectiveStartRaw &amp;&amp; !effectiveHasStart) reasons.push(`start node not found: ${effectiveStartRaw}`); if (effectiveEndRaw &amp;&amp; !effectiveHasEnd) reasons.push(`end node not found: ${effectiveEndRaw}`); if (nodeIdRaw &amp;&amp; !hasNode) reasons.push(`node not found: ${nodeIdRaw}`); } unconnectedLines.push({ key, label, layerName, reason: reasons.join(&#x27;, &#x27;) || &#x27;missing node connection&#x27; }); } else if (effectiveHasStart &amp;&amp; effectiveHasEnd) { if (!adjacency.has(effectiveStartNorm)) adjacency.set(effectiveStartNorm, new Set()); if (!adjacency.has(effectiveEndNorm)) adjacency.set(effectiveEndNorm, new Set()); adjacency.get(effectiveStartNorm).add(effectiveEndNorm); adjacency.get(effectiveEndNorm).add(effectiveStartNorm); } lineIndex += 1; }; inlineGroups.forEach(group =&gt; { if (!group || typeof group.eachLayer !== &#x27;function&#x27;) return; group.eachLayer(marker =&gt; { inlineLayerSet.add(marker); addInlineEntry(marker, group); }); }); const isInlineCandidate = (props) =&gt; { if (!props) return false; if (getPropertyValueCaseInsensitive(props, startKeys) || getPropertyValueCaseInsensitive(props, endKeys)) return true; if (getPropertyValueCaseInsensitive(props, [&#x27;SubNode_A&#x27;, &#x27;Subnode_A&#x27;, &#x27;SubNodeA&#x27;, &#x27;SubnodeA&#x27;, &#x27;Sub_Node_A&#x27;, &#x27;subnode_a&#x27;, &#x27;sub_node_a&#x27;])) return true; if (getPropertyValueCaseInsensitive(props, [&#x27;SubNode_B&#x27;, &#x27;Subnode_B&#x27;, &#x27;SubNodeB&#x27;, &#x27;SubnodeB&#x27;, &#x27;Sub_Node_B&#x27;, &#x27;subnode_b&#x27;, &#x27;sub_node_b&#x27;])) return true; if (getPropertyValueCaseInsensitive(props, [&#x27;Node&#x27;, &#x27;node&#x27;, &#x27;NODE&#x27;])) return true; const typeValue = String(props.Type || props.type || &#x27;&#x27;).toLowerCase(); return typeValue.includes(&#x27;inline&#x27;) || typeValue.includes(&#x27;in-line&#x27;); }; traversePointLayers(lineGroups, (marker, group) =&gt; { if (inlineLayerSet.has(marker)) return; const props = marker?.feature?.properties || {}; if (!isInlineCandidate(props)) return; inlineLayerSet.add(marker); addInlineEntry(marker, group); }); const unconnectedNodes = nodeList .filter(entry =&gt; !referencedNodes.has(entry.normId)) .map(entry =&gt; ({ id: entry.id, normId: entry.normId, layerName: entry.layerName, marker: entry.marker })); const networks = []; const visited = new Set(); adjacency.forEach((_, nodeId) =&gt; { if (visited.has(nodeId)) return; const queue = [nodeId]; const component = new Set(); visited.add(nodeId); while (queue.length) { const current = queue.shift(); component.add(current); const neighbors = adjacency.get(current) || new Set(); neighbors.forEach(next =&gt; { if (!visited.has(next)) { visited.add(next); queue.push(next); } }); } if (component.size) { const lineKeys = new Set(); lineList.forEach(lineEntry =&gt; { if (!lineEntry.isConnected) return; if (lineEntry.isInline) { if (lineEntry.nodeNorm &amp;&amp; component.has(lineEntry.nodeNorm)) { lineKeys.add(lineEntry.key); return; } } if (lineEntry.startNorm &amp;&amp; lineEntry.endNorm &amp;&amp; component.has(lineEntry.startNorm) &amp;&amp; component.has(lineEntry.endNorm)) { lineKeys.add(lineEntry.key); } }); networks.push({ nodeIds: component, lineKeys, nodeCount: component.size, lineCount: lineKeys.size }); } }); return { nodeMap, nodeList, lineList, lineMap, unconnectedNodes, unconnectedLines, networks }; } function snapshotMarkerStyle(marker) { if (!marker) return null; if (typeof marker.getLatLng === &#x27;function&#x27; &amp;&amp; typeof marker.setStyle === &#x27;function&#x27;) { if (typeof captureOriginalMarkerStyle === &#x27;function&#x27; &amp;&amp; !marker._defaultMarkerStyle) { captureOriginalMarkerStyle(marker, &#x27;default&#x27;); } const style = marker._defaultMarkerStyle || { color: marker.options?.color, weight: marker.options?.weight, fillColor: marker.options?.fillColor, fillOpacity: marker.options?.fillOpacity, opacity: marker.options?.opacity, radius: marker.options?.radius }; return { type: &#x27;circle&#x27;, style }; } if (typeof marker.setOpacity === &#x27;function&#x27;) { return { type: &#x27;marker&#x27;, opacity: marker.options?.opacity ?? 1 }; } return null; } function hideMarker(marker) { if (!marker || topologyState.hiddenMarkers.has(marker)) return; const snapshot = snapshotMarkerStyle(marker); if (snapshot) topologyState.hiddenMarkers.set(marker, snapshot); if (typeof marker.setStyle === &#x27;function&#x27;) { marker.setStyle({ opacity: 0, fillOpacity: 0 }); } else if (typeof marker.setOpacity === &#x27;function&#x27;) { marker.setOpacity(0); } } function restoreMarker(marker) { const snapshot = topologyState.hiddenMarkers.get(marker); if (!snapshot) return; if (snapshot.type === &#x27;circle&#x27; &amp;&amp; typeof marker.setStyle === &#x27;function&#x27;) { marker.setStyle(snapshot.style); if (typeof marker.setRadius === &#x27;function&#x27; &amp;&amp; snapshot.style?.radius !== undefined) { marker.setRadius(snapshot.style.radius); } } else if (snapshot.type === &#x27;marker&#x27; &amp;&amp; typeof marker.setOpacity === &#x27;function&#x27;) { marker.setOpacity(snapshot.opacity); } topologyState.hiddenMarkers.delete(marker); } function snapshotLineStyle(layer) { if (!layer) return null; if (typeof getPathStyleSnapshot === &#x27;function&#x27;) { return getPathStyleSnapshot(layer); } const opts = layer.options || {}; return { color: opts.color || layer._originalColor || &#x27;#3388ff&#x27;, weight: typeof opts.weight === &#x27;number&#x27; ? opts.weight : (layer._originalWeight ?? 3), opacity: typeof opts.opacity === &#x27;number&#x27; ? opts.opacity : (layer._originalOpacity ?? 0.8), dashArray: Object.prototype.hasOwnProperty.call(opts, &#x27;dashArray&#x27;) ? opts.dashArray : (layer._originalDashArray ?? null) }; } function hideLine(layer) { if (!layer || topologyState.hiddenLines.has(layer)) return; const snapshot = snapshotLineStyle(layer); topologyState.hiddenLines.set(layer, snapshot); if (typeof layer.setStyle === &#x27;function&#x27;) { layer.setStyle({ opacity: 0, weight: 0, dashArray: null, color: &#x27;transparent&#x27; }); } if (layer._path) { layer._path.style.opacity = &#x27;0&#x27;; layer._path.style.stroke = &#x27;transparent&#x27;; layer._path.style.strokeWidth = &#x27;0px&#x27;; } if (layer._clickLayer &amp;&amp; layer._clickLayer.getLayers) { const clickLayer = layer._clickLayer.getLayers()[0]; if (clickLayer?.setStyle) { clickLayer.setStyle({ opacity: 0, weight: 0, color: &#x27;transparent&#x27; }); } } } function restoreLine(layer) { const snapshot = topologyState.hiddenLines.get(layer); if (!snapshot) return; if (typeof layer.setStyle === &#x27;function&#x27;) { layer.setStyle(snapshot); } if (typeof syncPathStyle === &#x27;function&#x27;) { syncPathStyle(layer, snapshot); } if (layer._path) { layer._path.style.opacity = String(snapshot.opacity ?? 0.8); layer._path.style.stroke = snapshot.color || &#x27;#3388ff&#x27;; layer._path.style.strokeWidth = `${snapshot.weight ?? 3}px`; layer._path.style.strokeDasharray = snapshot.dashArray ? snapshot.dashArray : &#x27;&#x27;; } if (layer._clickLayer &amp;&amp; layer._clickLayer.getLayers) { const clickLayer = layer._clickLayer.getLayers()[0]; if (clickLayer?.setStyle) { clickLayer.setStyle({ color: &#x27;transparent&#x27;, weight: 12, opacity: 0, dashArray: null }); } } topologyState.hiddenLines.delete(layer); } function clearTopologyNetworkFilter() { if (!topologyState.filterActive) return; topologyState.hiddenMarkers.forEach((_, marker) =&gt; restoreMarker(marker)); topologyState.hiddenLines.forEach((_, layer) =&gt; restoreLine(layer)); topologyState.hiddenMarkers.clear(); topologyState.hiddenLines.clear(); topologyState.filterActive = false; } function focusNode(entry) { if (!entry || !entry.marker || !topologyState.results) return; clearTopologyNetworkFilter(); resetAllPipelineHighlights(); resetAllElementHighlights(); const { nodeList, lineList } = topologyState.results; nodeList.forEach(node =&gt; { if (node.marker !== entry.marker) { hideMarker(node.marker); } }); lineList.forEach(lineEntry =&gt; { if (lineEntry.isInline) { if (lineEntry.layer !== entry.marker) { hideMarker(lineEntry.layer); } } else { hideLine(lineEntry.layer); } }); topologyState.filterActive = true; highlightElement(entry.marker); if (typeof entry.marker.bringToFront === &#x27;function&#x27;) { entry.marker.bringToFront(); } const latlng = entry.marker.getLatLng ? entry.marker.getLatLng() : null; if (latlng &amp;&amp; window.map) { window.map.setView(latlng, Math.max(window.map.getZoom(), 10), { animate: true }); } } function focusLine(entry) { if (!entry || !entry.layer || !topologyState.results) return; clearTopologyNetworkFilter(); resetAllPipelineHighlights(); resetAllElementHighlights(); const { nodeList, lineList } = topologyState.results; nodeList.forEach(node =&gt; hideMarker(node.marker)); lineList.forEach(lineEntry =&gt; { if (lineEntry.key === entry.key) return; if (lineEntry.isInline) { hideMarker(lineEntry.layer); } else { hideLine(lineEntry.layer); } }); topologyState.filterActive = true; if (entry.isInline) { highlightElement(entry.layer); if (typeof entry.layer.bringToFront === &#x27;function&#x27;) { entry.layer.bringToFront(); } const latlng = entry.layer.getLatLng ? entry.layer.getLatLng() : null; if (latlng &amp;&amp; window.map) { window.map.setView(latlng, Math.max(window.map.getZoom(), 10), { animate: true }); } return; } highlightPipeline(entry.layer); if (typeof entry.layer.bringToFront === &#x27;function&#x27;) { entry.layer.bringToFront(); } if (entry.layer.getBounds &amp;&amp; window.map) { window.map.fitBounds(entry.layer.getBounds(), { padding: [30, 30] }); } } function applyNetworkFilter(network) { if (!network || !topologyState.results) return; clearTopologyNetworkFilter(); const { nodeList, lineList } = topologyState.results; nodeList.forEach(node =&gt; { if (!network.nodeIds.has(node.normId)) { hideMarker(node.marker); } }); lineList.forEach(lineEntry =&gt; { if (!network.lineKeys.has(lineEntry.key)) { if (lineEntry.isInline) { hideMarker(lineEntry.layer); } else { hideLine(lineEntry.layer); } } }); topologyState.filterActive = true; const bounds = window.L?.latLngBounds ? window.L.latLngBounds([]) : null; if (bounds) { nodeList.forEach(node =&gt; { if (network.nodeIds.has(node.normId) &amp;&amp; node.marker?.getLatLng) { bounds.extend(node.marker.getLatLng()); } }); lineList.forEach(lineEntry =&gt; { if (!network.lineKeys.has(lineEntry.key)) return; if (lineEntry.isInline &amp;&amp; lineEntry.layer?.getLatLng) { bounds.extend(lineEntry.layer.getLatLng()); return; } if (lineEntry.layer?.getBounds) { bounds.extend(lineEntry.layer.getBounds()); } }); if (bounds.isValid() &amp;&amp; window.map) { window.map.fitBounds(bounds, { padding: [35, 35] }); } } } function renderTopologyPopup(results) { const summaryHtml = ` &lt;div style=&quot;display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 12px;&quot;&gt; &lt;div style=&quot;background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;&quot;&gt; &lt;div style=&quot;font-size:12px; color:#64748b;&quot;&gt;Unconnected Nodes&lt;/div&gt; &lt;div style=&quot;font-size:18px; font-weight:700; color:#0f172a;&quot;&gt;${results.unconnectedNodes.length}&lt;/div&gt; &lt;/div&gt; &lt;div style=&quot;background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;&quot;&gt; &lt;div style=&quot;font-size:12px; color:#64748b;&quot;&gt;Unconnected Lines&lt;/div&gt; &lt;div style=&quot;font-size:18px; font-weight:700; color:#0f172a;&quot;&gt;${results.unconnectedLines.length}&lt;/div&gt; &lt;/div&gt; &lt;div style=&quot;background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; text-align:center;&quot;&gt; &lt;div style=&quot;font-size:12px; color:#64748b;&quot;&gt;Networks&lt;/div&gt; &lt;div style=&quot;font-size:18px; font-weight:700; color:#0f172a;&quot;&gt;${results.networks.length}&lt;/div&gt; &lt;/div&gt; &lt;/div&gt; `; const nodeItems = results.unconnectedNodes.map(node =&gt; { const subtitle = node.layerName ? `&lt;div style=&quot;font-size:12px; color:#64748b;&quot;&gt;${escapeHtml(node.layerName)}&lt;/div&gt;` : &#x27;&#x27;; return ` &lt;button class=&quot;topology-item&quot; data-type=&quot;node&quot; data-id=&quot;${escapeHtml(node.normId)}&quot; style=&quot;width:100%; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; margin-bottom:6px;&quot;&gt; &lt;div style=&quot;font-weight:600; color:#1f2937;&quot;&gt;${escapeHtml(node.id)}&lt;/div&gt; ${subtitle} &lt;/button&gt; `; }).join(&#x27;&#x27;); const lineItems = results.unconnectedLines.map(line =&gt; { const subtitle = line.layerName ? `${line.layerName} · ${line.reason}` : line.reason; return ` &lt;button class=&quot;topology-item&quot; data-type=&quot;line&quot; data-id=&quot;${escapeHtml(line.key)}&quot; style=&quot;width:100%; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; margin-bottom:6px;&quot;&gt; &lt;div style=&quot;font-weight:600; color:#1f2937;&quot;&gt;${escapeHtml(line.label)}&lt;/div&gt; &lt;div style=&quot;font-size:12px; color:#64748b;&quot;&gt;${escapeHtml(subtitle)}&lt;/div&gt; &lt;/button&gt; `; }).join(&#x27;&#x27;); const networkItems = results.networks.map((network, index) =&gt; { const label = `Network ${index + 1}`; const subtitle = `${network.nodeCount} nodes · ${network.lineCount} lines`; return ` &lt;button class=&quot;topology-item&quot; data-type=&quot;network&quot; data-id=&quot;${index}&quot; style=&quot;width:100%; text-align:left; padding:8px 10px; border:1px solid #e2e8f0; background:#fff; border-radius:6px; cursor:pointer; margin-bottom:6px;&quot;&gt; &lt;div style=&quot;font-weight:600; color:#1f2937;&quot;&gt;${escapeHtml(label)}&lt;/div&gt; &lt;div style=&quot;font-size:12px; color:#64748b;&quot;&gt;${escapeHtml(subtitle)}&lt;/div&gt; &lt;/button&gt; `; }).join(&#x27;&#x27;); const content = ` ${summaryHtml} &lt;div style=&quot;margin-bottom: 14px;&quot;&gt; &lt;h4 style=&quot;margin: 0 0 8px; font-size: 14px; color:#1f2937;&quot;&gt;Unconnected Nodes&lt;/h4&gt; ${nodeItems || &#x27;&lt;div style=&quot;font-size:13px; color:#64748b;&quot;&gt;No unconnected nodes found.&lt;/div&gt;&#x27;} &lt;/div&gt; &lt;div style=&quot;margin-bottom: 14px;&quot;&gt; &lt;h4 style=&quot;margin: 0 0 8px; font-size: 14px; color:#1f2937;&quot;&gt;Unconnected Lines&lt;/h4&gt; ${lineItems || &#x27;&lt;div style=&quot;font-size:13px; color:#64748b;&quot;&gt;No unconnected lines found.&lt;/div&gt;&#x27;} &lt;/div&gt; &lt;div&gt; &lt;h4 style=&quot;margin: 0 0 8px; font-size: 14px; color:#1f2937;&quot;&gt;Networks&lt;/h4&gt; ${networkItems || &#x27;&lt;div style=&quot;font-size:13px; color:#64748b;&quot;&gt;No connected networks found.&lt;/div&gt;&#x27;} &lt;/div&gt; `; showCustomPopup( &#x27;🧭 Topology Check&#x27;, content, [ { text: &#x27;Refresh&#x27;, type: &#x27;secondary&#x27;, keepOpen: true, onClick: () =&gt; { closeCustomPopup(); activateTopologyCheckTool(); } }, { text: &#x27;Show All&#x27;, type: &#x27;secondary&#x27;, keepOpen: true, onClick: () =&gt; clearTopologyNetworkFilter() }, { text: &#x27;Close&#x27;, type: &#x27;primary&#x27;, onClick: () =&gt; { clearTopologyNetworkFilter(); } } ] ); if (typeof dockCustomPopupBottomRight === &#x27;function&#x27;) { dockCustomPopupBottomRight(); } setTimeout(() =&gt; bindTopologyHandlers(results), 0); } function bindTopologyHandlers(results) { const container = document.getElementById(&#x27;custom-popup-content&#x27;); if (!container) return; container.querySelectorAll(&#x27;.topology-item&#x27;).forEach(item =&gt; { item.addEventListener(&#x27;click&#x27;, () =&gt; { const type = item.getAttribute(&#x27;data-type&#x27;); const id = item.getAttribute(&#x27;data-id&#x27;); if (type === &#x27;node&#x27;) { const entry = results.nodeMap.get(String(id)); focusNode(entry); } else if (type === &#x27;line&#x27;) { const entry = results.lineMap.get(String(id)); focusLine(entry); } else if (type === &#x27;network&#x27;) { const index = parseInt(id, 10); const network = results.networks[index]; applyNetworkFilter(network); } }); }); } /** Run the network topology analysis and display results. Resets all active editing modes, performs a full topological analysis of the loaded node and line layers (via {@link buildTopologyAnalysis}), and renders the results in a popup. The analysis identifies: (a) isolated nodes not connected to any pipeline, (b) pipelines not connected at either endpoint to a node, (c) disconnected network sub-graphs (islands). Each result entry is clickable and pans/zooms the map to the offending element.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</div>
</div>
</details>
<hr>
