<div class="breadcrumb">QGas / API / JavaScript</div>
<h1>JavaScript Modules</h1>
<p>This page is generated automatically from the module headers and JSDoc annotations in <code>js/</code> on every build.</p>
<p class="api-scope-note"><strong>API Scope:</strong> The functions documented here are primarily designed for internal module interaction within QGas. A stable subset is intentionally exposed on the global <code>window</code> object for cross-module use; these are the recommended integration points for any downstream tooling. Functions labelled <em>Internal Helpers</em> are implementation details and may change between releases.</p>
<details class="tool-section">
<summary><code>core.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
  <li>Created: August 2025</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Inputs:</strong></p>
<ul>
  <li>DOM containers and UI elements declared in GUI.html.</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (20)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>sanitizeProjectName(name)</code></summary>
<div class="api-func-body">
<p class="api-desc">Sanitize project name to prevent injection and ensure filesystem compatibility</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>name</code></td><td><code>string</code></td><td>Raw project name</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Sanitized project name (alphanumeric, underscore, hyphen only)</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>persistProjectSelection(projectName)</code></summary>
<div class="api-func-body">
<p class="api-desc">Persist the selected project to browser localStorage for future sessions</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>projectName</code></td><td><code>string</code></td><td>Project name to save</td></tr>
</tbody></table>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>getStoredProjectSelection()</code></summary>
<div class="api-func-body">
<p class="api-desc">Retrieve the stored project selection from localStorage</p>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Stored project name or empty string if not found</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>getProjectFromQuery()</code></summary>
<div class="api-func-body">
<p class="api-desc">Extract project name from URL query parameters</p>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Project name from URL or empty string</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>fetchProjectFromServer()</code></summary>
<div class="api-func-body">
<p class="api-desc">Fetch current project from the server API</p>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;string&gt;</code> — Project name from server or empty string</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>determineProjectContext()</code></summary>
<div class="api-func-body">
<p class="api-desc">Determine the active project context from multiple sources Priority: URL query &gt; Server API &gt; LocalStorage &gt; Default</p>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;string&gt;</code> — Resolved project name</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>normalizeColorHex(color)</code></summary>
<div class="api-func-body">
<p class="api-desc">Normalize color values to lowercase hex format (#rrggbb) Handles short hex (#rgb) and values without # prefix</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>color</code></td><td><code>string</code></td><td>Input color value</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Normalized hex color or empty string</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>registerLineColorUsage(color)</code></summary>
<div class="api-func-body">
<p class="api-desc">Track usage of a line color for statistics and recommendations</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>color</code></td><td><code>string</code></td><td>Color hex value to register</td></tr>
</tbody></table>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>formatElementId(prefix, contributor, number)</code></summary>
<div class="api-func-body">
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
</details>
<details class="api-func">
<summary class="api-sig"><code>openInfoOverlay(layer)</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the attribute info overlay for a pipeline feature. Highlights the clicked pipeline layer, stores it as the active popup layer for attribute editing, generates the attribute form via <code>createAttributeForm</code>, and binds Save, Add Attribute, and Delete action handlers. The overlay remains visible until the user dismisses it or selects another element.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>layer</code></td><td><code>L.Path</code></td><td>The Leaflet polyline layer whose attributes should be displayed.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>checkContributorName()</code></summary>
<div class="api-func-body">
<p class="api-desc">Check whether a valid contributor name has been entered. Reads the <code>#contributor-input</code> field and returns <code>false</code> (showing a contributor dialog) when the value is empty or still the default placeholder &quot;Max Mustermann&quot;. All editing tools call this guard before modifying map data to ensure every change is attributed to a real contributor.</p>
<p class="api-returns"><strong>Returns:</strong> <code>boolean</code> — <code>true</code> if a valid contributor name is present; <code>false</code> otherwise.</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>createNewNode(latlng, nodeId, options = {})</code></summary>
<div class="api-func-body">
<p class="api-desc">Create and register a new node marker on the map. Creates a Leaflet CircleMarker at <code>latlng</code> with the default node style, attaches a GeoJSON feature with <code>Type: &#x27;Node&#x27;</code> and the provided <code>nodeId</code>, and adds it to the appropriate node layer (determined via <code>options.targetLayer</code> or the global <code>nodeLayer</code>). Wires up mode-aware click handlers for info display and pipeline-connection callbacks.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>latlng</code></td><td><code>L.LatLng</code></td><td>Geographic position for the new node.</td></tr>
<tr><td><code>nodeId</code></td><td><code>string</code></td><td>Unique identifier to assign to the node feature (<code>properties.ID</code>).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>L.CircleMarker</code> — The created node marker.</p>
<div class="api-example">
<p><strong>Example:</strong></p>
<pre><code class="language-javascript">// Place a node on the default node layer
const marker = createNewNode(L.latLng(48.21, 16.37), &#x27;N_MQ_001&#x27;);

// Place a node on a specific layer (e.g. hydrogen nodes)
const h2marker = createNewNode(L.latLng(48.21, 16.37), &#x27;N_MQ_002&#x27;, {
targetLayer: hydrogenNodeLayer
});</code></pre>
</div>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>getFacilityPrefix(type)</code></summary>
<div class="api-func-body">
<p class="api-desc">Return the GeoJSON type prefix string for a given element type. Looks up the internal <code>facilityTypeMap</code> for a registered prefix; if none exists, derives one from the type name via <code>generatePrefixFromName</code> and registers it. Used to construct standardised element IDs (<code>PREFIX_CONTRIBUTOR_NNN</code>).</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>type</code></td><td><code>string</code></td><td>Element type name (e.g., <code>&#x27;Pipeline&#x27;</code>, <code>&#x27;Node&#x27;</code>, <code>&#x27;Compressor&#x27;</code>).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>string</code> — Two-to-three-character prefix string (e.g., <code>&#x27;PL&#x27;</code>, <code>&#x27;N&#x27;</code>, <code>&#x27;C&#x27;</code>).</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>getNextIdNumber(type, layerOverride = null)</code></summary>
<div class="api-func-body">
<p class="api-desc">Return the next available sequential ID number for a given element type. Scans all layers of the specified type to collect existing numeric suffixes matching the pattern <code>PREFIX_CONTRIBUTOR_NNN</code> and returns the lowest unused positive integer. Accepts an optional <code>layerOverride</code> to restrict scanning to a specific layer.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>type</code></td><td><code>string</code></td><td>Element type (e.g., <code>&#x27;Pipeline&#x27;</code>).</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>number</code> — Next unused sequential number (always ≥ 1).</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>deactivateAllModes()</code></summary>
<div class="api-func-body">
<p class="api-desc">Deactivate all active editing modes and return to a clean state. Disables any open Leaflet Draw tool, closes popups, ends the current node-position edit, clears pending delete selections, removes transient UI overlays (direction buttons, save/discard strips), and resets all mode-specific state variables. Called as a prerequisite by every tool-activation function to prevent mode conflicts.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>showElementModal(title, content, layer)</code></summary>
<div class="api-func-body">
<p class="api-desc">Display the element details modal. Stores the active layer reference, injects the provided title and HTML content into the modal DOM elements, and makes the modal visible. The modal remains open until <code>closeElementModal</code> is called.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>title</code></td><td><code>string</code></td><td>Heading text for the modal.</td></tr>
<tr><td><code>content</code></td><td><code>string</code></td><td>HTML string for the modal body (typically generated by <code>createModalPopupContent</code>).</td></tr>
<tr><td><code>layer</code></td><td><code>L.Layer</code></td><td>Leaflet layer instance associated with the displayed element.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>closeElementModal()</code></summary>
<div class="api-func-body">
<p class="api-desc">Close the element details modal. Hides the modal overlay and resets the highlight styles of any previously highlighted pipeline or point-element layer. Clears the internal <code>currentLayer</code>, <code>activePipeline</code>, and <code>activeElement</code> references.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>loadAdditionalDatasets()</code></summary>
<div class="api-func-body">
<p class="api-desc">Load supplementary GeoJSON datasets from the <code>Additional Datasets/</code> server directory. Iterates a hardcoded list of dataset filenames and calls <code>loadSingleDatasetWithCallback</code> for each. Loaded datasets are added to the map as hidden layers and stored in the <code>additionalDatasets</code> registry, making them available for the integrate-dataset tool.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>getAllNodeLayers()</code></summary>
<div class="api-func-body">
<p class="api-desc">Return all node-type Leaflet layers currently registered in the project. First queries <code>layerConfig</code> for entries with <code>Type === &#x27;node&#x27;</code>, then performs a fallback heuristic scan of <code>dynamicLayers</code> using metadata type hints and key names. Both the primary and fallback result sets are deduplicated.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array&lt;L.LayerGroup&gt;</code> — Array of Leaflet layer groups whose features represent network nodes.</p>
<div class="api-example">
<p><strong>Example:</strong></p>
<pre><code class="language-javascript">// Count all node markers across the project
let count = 0;
getAllNodeLayers().forEach(lg =&gt; lg.eachLayer(() =&gt; count++));
console.log(&#x27;Total nodes:&#x27;, count);</code></pre>
</div>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>getAllLineLayers()</code></summary>
<div class="api-func-body">
<p class="api-desc">Return all line-type Leaflet layers currently registered in the project. Queries <code>layerConfig</code> for entries with <code>Type === &#x27;line&#x27;</code> or <code>&#x27;pipeline&#x27;</code>, then performs a heuristic scan of <code>dynamicLayers</code>. If metadata hints are unavailable, samples the first feature geometry of each layer to determine whether it is a <code>LineString</code> or <code>MultiLineString</code>.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array&lt;L.LayerGroup&gt;</code> — Array of Leaflet layer groups whose features represent pipeline or line-string infrastructure.</p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>node_layers.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (2)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>getAllNodeLayers()</code></summary>
<div class="api-func-body">
<p class="api-desc">Get all node layers from the system Attempts to use core functions first, falls back to scanning if unavailable</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of all node/point layer objects</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>getNodeLayerEntries()</code></summary>
<div class="api-func-body">
<p class="api-desc">Get detailed node layer entries with metadata Returns an array of objects containing key, label, layer reference, and metadata</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of node layer entry objects {key, label, layer, meta}</p>
</div>
</details>
</div>
</details>
<details class="api-functions-section api-internal-section">
<summary><strong>Internal Helpers</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>fallbackScan()</code></summary>
<div class="api-func-body">
<p class="api-desc">Fallback scan for node layers when core functions are not yet available. Searches through dynamicLayers and legacy layer references.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of node layer objects</p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>export.js</code></summary>
<div class="module-header">
<p><strong>QGas - Export Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Handles export workflows for changed, filtered, and complete datasets, including ZIP assembly and Excel configuration generation.</p>
<p>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin Institution: Institute of Electricity Economics and Energy Innovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (4)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>exportChanges()</code></summary>
<div class="api-func-body">
<p class="api-desc">Export all modified and deleted elements as GeoJSON files in a ZIP archive. Collects every layer feature marked with <code>modified: true</code> and all entries in the soft-deletion registry. Organises the output into GeoJSON files per infrastructure type (pipelines, nodes, compressors, storages, power-plants, etc.) and triggers a browser download of the resulting ZIP archive (<code>changes.zip</code>).</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>exportFilteredData(folderName)</code></summary>
<div class="api-func-body">
<p class="api-desc">Export the currently filtered dataset as a ZIP archive. Iterates all active layer configurations, applies the current attribute filter state, and serialises each layer to a GeoJSON file. Supplementary files (Excel configuration workbook, short-pipe definitions) are appended and the archive is offered for browser download as <code>&lt;folderName&gt;.zip</code>.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>folderName</code></td><td><code>string</code></td><td>Name used for the top-level ZIP folder and the downloaded filename.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;void&gt;</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>exportCompleteDataset()</code></summary>
<div class="api-func-body">
<p class="api-desc">Export the complete current dataset as a ZIP archive. Serialises all registered dynamic layers — including layers that have no unsaved modifications — together with the Excel configuration workbook and short-pipe definitions. The archive is downloaded as <code>complete_dataset.zip</code>. Useful for creating a full project snapshot or preparing input for a fresh run.</p>
<p class="api-returns"><strong>Returns:</strong> <code>Promise&lt;void&gt;</code></p>
<div class="api-example">
<p><strong>Example:</strong></p>
<pre><code class="language-javascript">// Trigger a full project snapshot download
exportCompleteDataset().then(() =&gt; {
console.log(&#x27;complete_dataset.zip downloaded&#x27;);
});</code></pre>
</div>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>openExportDialog()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the export type selection dialog. Presents a modal popup with three export options: changes only, filtered data (prompts for a folder name), and the complete dataset. Delegates to <code>exportChanges</code>, <code>showFolderNameDialog</code>, or <code>exportCompleteDataset</code> on confirmation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>filter.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (8)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>openFilterModal()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the main filter selection modal. Makes the primary filter modal visible by setting its CSS display property to <code>flex</code>. The modal lists available filter categories (e.g., country-based filtering) and acts as the entry point for all spatial filtering operations.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>closeFilterModal()</code></summary>
<div class="api-func-body">
<p class="api-desc">Close the main filter selection modal. Hides the primary filter modal without discarding any pending selection. May be called programmatically, e.g., before transitioning to the country-filter sub-modal.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>openCountryFilterModal()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the country-specific filter modal. Closes the main filter modal, populates the country selection list by calling <code>populateCountryList</code>, and displays the country-filter sub-modal. Previously selected countries are preserved between invocations.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>closeCountryFilterModal()</code></summary>
<div class="api-func-body">
<p class="api-desc">Close the country filter modal. Hides the country-filter sub-modal. Any countries that were checked remain selected in memory until <code>applyCountryFilter</code> is called or the selection is explicitly cleared.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>clearAllFilters()</code></summary>
<div class="api-func-body">
<p class="api-desc">Clear all active filters and restore the original layer state. Calls <code>restoreAllOriginalLayers</code> to put back the unfiltered Leaflet layer objects, empties the <code>selectedCountries</code> set, and closes the filter modal. This is the single authoritative reset point for all spatial filter state.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>populateCountryList()</code></summary>
<div class="api-func-body">
<p class="api-desc">Populate the country list UI with checkboxes for all European countries Restores previously selected countries from the selectedCountries Set</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>applyCountryFilter()</code></summary>
<div class="api-func-body">
<p class="api-desc">Apply the current country selection as a geographic filter. Snapshots each unfiltered layer reference if not already cached, then either restores all layers (when no countries are selected) or delegates to <code>filterAllElementsByCountries</code> to rebuild each layer with only the features whose country-code property matches an entry in <code>selectedCountries</code>. Closes the country-filter modal on completion.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>toggleFilterPanel()</code></summary>
<div class="api-func-body">
<p class="api-desc">Toggle (open) the filter panel from a toolbar button. Thin error-guarded alias of <code>openFilterModal</code> used by the main-screen toolbar button. Wraps the call in a try/catch so that a misconfigured DOM state surfaces as an info popup rather than a silent failure.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>groups.js</code></summary>
<div class="module-header">
<p><strong>QGas - Pipeline Groups Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Supports visualizing and highlighting pipeline groups created in the UI.</p>
<p>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin Institution: Institute of Electricity Economics and Energy Innovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (3)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>highlightGroup(index)</code></summary>
<div class="api-func-body">
<p class="api-desc">Highlight all pipelines belonging to a saved pipeline group. Resets any existing group highlights, then applies a red stroke (<code>#ff2b2b</code>, weight 6) to every pipeline whose ID is listed in the specified group. The map viewport is automatically fitted to the bounding box of the highlighted elements with 80 px padding.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>index</code></td><td><code>number</code></td><td>Zero-based index of the pipeline group in the global <code>pipelineGroups</code> array.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>openGroupsPanel()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the pipeline groups panel. Displays a scrollable modal popup listing all saved pipeline groups. Each group entry shows the group name, pipeline count, and total length. Clicking an entry calls <code>highlightGroup</code> to visualise the group on the map. If no groups exist yet the user is informed with a guidance message.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>unhighlightAllGroups()</code></summary>
<div class="api-func-body">
<p class="api-desc">Remove all group highlights from the map. Iterates every pipeline in all active line layers and resets their Leaflet path styles to the defaults defined in the layer configuration. Should be called before applying a new group highlight or when the groups panel is closed.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>legend.js</code></summary>
<div class="module-header">
<p><strong>QGas - Legend UI Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Maintains the legend controls, visibility toggles, and synchronization between legend state and map layers.</p>
<p>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin Institution: Institute of Electricity Economics and Energy Innovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
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
</div>
</details>
<details class="tool-section">
<summary><code>options.js</code></summary>
<div class="module-header">
<p><strong>QGas - Options UI Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Manages the options dialog for styling layers, including color, size, and line style controls, while keeping a global scope for UI compatibility.</p>
<p>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin Institution: Institute of Electricity Economics and Energy Innovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
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
</div>
</details>
<details class="tool-section">
<summary><code>screenshot.js</code></summary>
<div class="module-header">
<p><strong>QGas - Screenshot Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Provides a screenshot mode for highlighting elements and preparing the map for manual capture.</p>
<p>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin Institution: Institute of Electricity Economics and Energy Innovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (3)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>openScreenshotMode()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the screenshot mode dialog. Presents a modal popup that explains the screenshot workflow and offers the user a single-click entry into screenshot mode. No map state is altered until the user confirms by pressing &quot;Activate Screenshot Mode&quot;.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>activateScreenshotMode()</code></summary>
<div class="api-func-body">
<p class="api-desc">Enter screenshot mode. Hides all UI chrome (menus, toolbars, export buttons, contributor box) and strips the map legend down to only the currently visible layers. Enables element highlighting on click and registers an Escape-key listener that calls <code>exitScreenshotMode</code>. Intended to produce a clean, publication-ready map view without interactive controls.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>exitScreenshotMode()</code></summary>
<div class="api-func-body">
<p class="api-desc">Exit screenshot mode and restore the full UI. Re-displays all previously hidden interface elements (menus, toolbars, contributor box, logos, export and screenshot buttons) and restores the original legend HTML. Removes the Escape-key listener registered by <code>activateScreenshotMode</code>. Safe to call even if screenshot mode is not currently active.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>statistics.js</code></summary>
<div class="module-header">
<p><strong>QGas - Statistics Module</strong></p>
<p><strong>Module Description:</strong></p>
<p>Computes and displays infrastructure statistics in a modal dialog, including counts and aggregated metrics.</p>
<p>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin Institution: Institute of Electricity Economics and Energy Innovation, TU Graz Disclaimer: AI-assisted tools were used to support development and documentation.</p>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (3)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>openStatisticsModal()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the statistics modal dialog. Triggers a full recomputation of infrastructure statistics via <code>updateStatistics</code> before making the modal visible. This ensures that all displayed values reflect the current map state at the time of opening.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>closeStatisticsModal()</code></summary>
<div class="api-func-body">
<p class="api-desc">Close the statistics modal dialog. Hides the statistics modal by setting its CSS display property to <code>none</code>. No statistical data is cleared; subsequent calls to <code>openStatisticsModal</code> will recompute and re-display updated values.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>updateStatistics()</code></summary>
<div class="api-func-body">
<p class="api-desc">Recompute and render all infrastructure statistics. Calculates aggregate metrics (pipeline counts, total lengths, node counts, storage capacities, etc.) from the current map layers and renders the results into the statistics modal. The computed statistics object is also cached in <code>window.cachedStatistics</code> for subsequent use by other modules without redundant recalculation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>tools.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (4)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>updateActiveToolDisplay(mode)</code></summary>
<div class="api-func-body">
<p class="api-desc">Update the active tool display in the UI</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>mode</code></td><td><code>string</code></td><td>Tool mode identifier</td></tr>
</tbody></table>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>openToolsPopup()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the tools selection popup Displays all available tools and highlights the currently active one</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>closeToolsPopup()</code></summary>
<div class="api-func-body">
<p class="api-desc">Close the tools selection popup</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>selectTool(mode)</code></summary>
<div class="api-func-body">
<p class="api-desc">Select and activate a specific tool mode</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>mode</code></td><td><code>string</code></td><td>Tool identifier (e.g., &#x27;info&#x27;, &#x27;edit&#x27;, &#x27;add-pipeline&#x27;)</td></tr>
</tbody></table>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>add_infrastructure.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateAddInfrastructureTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the Add Infrastructure tool. Verifies that a contributor name has been set, deactivates any active editing mode, and sets the application mode to <code>&#x27;add-infrastructure&#x27;</code>. The user is first prompted to choose whether the new element should be connected to an existing node. After confirmation, the user selects the target infrastructure layer (compressor, storage, LNG terminal, power plant, or custom type) and clicks a map location to place the point. An auto-generated ID incorporating contributor initials is assigned, and the tool allows continuous placement until the user opts to stop.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>add_new_element.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateAddNewElementTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the Add New Element tool. Deactivates any currently active editing mode, sets the application mode to <code>&#x27;add-new-element&#x27;</code>, and launches the custom-layer creation dialog. The dialog allows the user to select a layer geometry type (line, point, in-line, or node) and provide a user-defined name. On confirmation, an empty GeoJSON layer is created, registered in the <code>customLayers</code> registry, added to the map, and integrated into the legend — enabling immediate element placement.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>add_pipeline.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (2)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>getAvailablePipelineLayers()</code></summary>
<div class="api-func-body">
<p class="api-desc">Get all available pipeline layers from the system Scans dynamic layers, legacy layers, and custom layers for line geometry</p>
<p class="api-returns"><strong>Returns:</strong> <code>Array</code> — Array of layer objects with name, layer reference, and metadata</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>proceedWithAddPipeline()</code></summary>
<div class="api-func-body">
<p class="api-desc">Launch the interactive pipeline-creation workflow. Sets <code>currentMode</code> to <code>&#x27;add-pipeline&#x27;</code>, resolves the target pipeline layer, and opens a modal dialog asking whether the pipeline starts at an existing node or a free map location. Subsequent steps guide the user through endpoint selection (start and end), live polyline drawing between selected points, and finally saving the new pipeline feature with auto-generated ID and default attributes to the target layer.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
<details class="api-functions-section api-internal-section">
<summary><strong>Internal Helpers</strong><span class="api-func-count"> (3)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>forEachNodeMarker(callback)</code></summary>
<div class="api-func-body">
<p class="api-desc">Iterate every node marker across all active node layers. Traverses the full layer tree of each group returned by <code>getAllNodeLayers</code>, descending into nested <code>LayerGroup</code> and <code>FeatureGroup</code> instances, and invokes <code>callback</code> for every individual point-feature marker found. Internal structure layers are skipped.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>callback</code></td><td><code>Function</code></td><td>Function called with each node <code>L.CircleMarker</code> or <code>L.Marker</code> as its sole argument.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>setNodeSelectionHandlers(handler)</code></summary>
<div class="api-func-body">
<p class="api-desc">Attach a unified click handler to all node markers. Removes any existing click listeners from every node marker (via <code>forEachNodeMarker</code>) and registers <code>handler</code> as the new listener. The handler receives the marker instance and the Leaflet click event. Event propagation to the map is suppressed. Used during pipeline-drawing mode so that clicking a node acts as a pipeline endpoint selection rather than opening an info popup.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>handler</code></td><td><code>Function</code></td><td>Callback invoked with <code>(marker, event)</code> when a node is clicked.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>clearNodeSelectionHandlers()</code></summary>
<div class="api-func-body">
<p class="api-desc">Remove all node click handlers registered during pipeline drawing. Iterates every node marker via <code>forEachNodeMarker</code> and removes all <code>&#x27;click&#x27;</code> listeners. Called when the pipeline-drawing workflow ends (after save or discard) to restore normal info-mode click behaviour.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>add_plan.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>startAddInfrastructurePlan()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the file-picker dialog to begin the plan georeferencing workflow. Initialises the georeferencing UI via <code>initializePlanGeorefUI</code> and programmatically triggers the browser file-input dialog so the user can select a JPG or PNG plan image. Called automatically by <code>activateAddPlanTool</code> and by the retry button inside the georeferencing panel.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>change_direction.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateChangeDirectionMode()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the change-direction editing mode. Resets all pipeline highlights, clears internal direction state, and attaches click handlers to every polyline in all active line-layer groups. Each click toggles the geometric direction of the selected pipeline (reverses the coordinate array) and updates the directional arrow decorator. A Save/Discard toolbar strip is shown for confirmation. Exits automatically on Escape key or explicit user discard.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>delete.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (2)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>clearPendingDeletionSelections()</code></summary>
<div class="api-func-body">
<p class="api-desc">Clear all pending deletion selections without committing any deletions. Iterates every pending-deletion list (pipelines, nodes, compressors, storages, LNG terminals, power-plants, custom elements, drawn items) and restores the original visual style of each marked element. All pending lists are emptied and the toolbar button state is refreshed. Useful for resetting the selection before exiting delete mode.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>activateDeleteMode()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the element deletion mode. Disables any active drawing tools, captures a snapshot of the current map state for undo support, and attaches click handlers to every deletable element (pipelines, nodes, compressors, storages, LNG terminals, power-plants, custom layers). Clicking an element marks it for deletion (visual cue: red overlay) without immediately removing it. A Save/Discard toolbar strip is shown; confirming commits all pending deletions to the soft-delete registry.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
<details class="api-functions-section api-internal-section">
<summary><strong>Internal Helpers</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>showSaveDeleteButton()</code></summary>
<div class="api-func-body">
<p class="api-desc">Show the save/confirm delete button in the UI. Creates a button that executes batch deletion of all marked elements.</p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>distribute_compressors.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (2)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>startDistributeCompressors()</code></summary>
<div class="api-func-body">
<p class="api-desc">Start the compressor distribution workflow. Initialises distribution state, hides all map layers except pipelines and compressors to reduce visual clutter, and activates click handlers on every compressor marker. The user selects a source compressor, then specifies how many sub-compressors to place along pipeline segments. Sub-compressor positions are computed geometrically on the selected pipeline and persisted via the standard layer write-back mechanism.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>exitDistributeMode()</code></summary>
<div class="api-func-body">
<p class="api-desc">Exit distribute-compressor mode and restore normal map state. Re-adds any layers that were hidden during distribution (power-plants, storages, nodes, etc.), removes all temporary connection-line polylines and sub-compressor markers from the map, and resets all internal distribution state variables. Safe to call both after a completed distribution and after an explicit cancellation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>divide_pipeline.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateDividePipelineTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the pipeline divide tool. Entry point for the divide-pipeline workflow. Delegates to <code>startPipelineDivision</code>, which guides the user through selecting a pipeline segment and clicking the desired split point. The original pipeline feature is replaced by two new child features whose coordinate arrays cover each half; attributes are inherited with a sequence suffix appended to the ID. A node marker is automatically inserted at the division point.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>edit_geometry.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateEditModeForExisting()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate edit mode for existing drawn items Binds click handlers to enable editing on selected features</p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>group_pipelines.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>startPipelineGrouping()</code></summary>
<div class="api-func-body">
<p class="api-desc">Start the pipeline grouping workflow. Deactivates all active modes, prompts the user to enter a group name, and then guides them through selecting a set of pipeline segments and optionally specifying a start and end node. The resulting group is stored in the <code>pipelineGroups</code> array with metadata (name, pipeline IDs, total length, element count) and persisted to the project state. The group can later be highlighted via <code>highlightGroup</code>.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>info_mode.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (2)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateInfoTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate info tool (wrapper with contributor check)</p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>activateInfoMode(force = false)</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate info mode</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>force</code></td><td><code>boolean</code></td><td>Force reactivation even if already in info mode</td></tr>
</tbody></table>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>integrate_dataset.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (5)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateIntegrateDatasetTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the integrate-dataset tool. Validates that a contributor name has been entered, deactivates all other editing modes, and launches the dataset integration workflow via <code>startDatasetIntegration</code>. The workflow guides the user through selecting a GeoJSON source (preloaded server dataset or local file upload) and creating pairwise element-equivalence links between the integration dataset and the currently loaded QGas layers.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>loadPreloadedDataset()</code></summary>
<div class="api-func-body">
<p class="api-desc">Load and activate a preloaded server-side dataset for integration. Reads the selected value from the <code>#preloaded-select</code> dropdown element rendered inside the current popup and calls <code>setupIntegrationModeWithPreloaded</code> with the chosen filename. Shows an info popup if no selection has been made.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>loadFileDataset()</code></summary>
<div class="api-func-body">
<p class="api-desc">Load a user-supplied GeoJSON file and activate it for integration. Reads the file selected in <code>#dataset-file-input</code>, parses it as JSON, and registers the resulting feature collection under the original filename key in the integration dataset registry. Then calls <code>setupIntegrationModeWithPreloaded</code> to activate the integration workflow. Shows an error popup if parsing fails or no file is selected.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>finishIntegration()</code></summary>
<div class="api-func-body">
<p class="api-desc">Finish the integration session and export the equivalence list. Serialises the current <code>equivalenceList</code> array to a JSON file (<code>integration_equivalences.json</code>) and triggers a browser download. After the download is initiated, the integration overlay is cleaned up and a success summary popup is shown.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>cancelIntegration()</code></summary>
<div class="api-func-body">
<p class="api-desc">Cancel the integration session and clean up all temporary state. Delegates to <code>cleanupIntegrationMode</code> to remove the integration overlay, restore hidden layers, and clear all pending equivalences. Shows a brief cancellation info popup.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>reconnect_infrastructure.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateReconnectInfrastructureTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the Reconnect Infrastructure tool. Deactivates any currently active editing mode, sets the application mode to <code>&#x27;reconnect-infrastructure&#x27;</code>, and initiates the two-step reconnection workflow. In the first step the user selects an existing infrastructure element (storage, LNG terminal, power plant, or compressor); in the second step the user clicks a target node, and the element&#x27;s node-reference property is updated accordingly. Layer visibility is temporarily adjusted during the workflow and restored upon completion or cancellation.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>short_pipe.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>startShortPipeSelection()</code></summary>
<div class="api-func-body">
<p class="api-desc">Start the short-pipe selection workflow. Activates short-pipe selection mode and attaches click handlers to all polyline features in every active line layer. Clicking a pipeline segment toggles its short-pipe status (visual cue: orange dashed stroke). A save button at the top of the map commits the selection as short-pipe entries in the dataset; a discard button resets all styles and exits the mode without saving.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>split_node.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (7)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateSplitNodeTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Activate the split-node tool. Deactivates all other active editing modes, sets <code>currentMode</code> to <code>&#x27;split-node&#x27;</code>, and starts the interactive node-splitting workflow. The user selects a node to split; the tool then creates a duplicate node offset from the original and reassigns a user-selected subset of the connected pipelines to the new node, thereby restructuring the network topology.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>showCustomPopup(title, content, buttons, extraElement = null)</code></summary>
<div class="api-func-body">
<p class="api-desc">Display a fully configurable modal popup. Renders a modal dialog with a title, arbitrary HTML content, an optional extra DOM element appended below the content, and one or more action buttons. Each button carries an <code>onClick</code> callback; setting <code>keepOpen: true</code> on a button prevents the popup from closing after the callback executes. Errors thrown inside button callbacks are caught and shown as a secondary error popup.</p>
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
</details>
<details class="api-func">
<summary class="api-sig"><code>closeCustomPopup()</code></summary>
<div class="api-func-body">
<p class="api-desc">Close the currently open custom popup. Hides the popup overlay and container and resets the docking state. Safe to call even when no popup is currently displayed.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>showInfoPopup(message, title = &#x27;ℹ️ Notice&#x27;, buttonText = &#x27;OK&#x27;)</code></summary>
<div class="api-func-body">
<p class="api-desc">Show a simple informational popup. Convenience wrapper around <code>showCustomPopup</code> that renders a centred message paragraph and a single OK button.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>message</code></td><td><code>string</code></td><td>Plain text or newline-separated message to display. Newlines are converted to <code>&amp;lt;br&amp;gt;</code>.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>showErrorPopup(message, title = &#x27;⚠️ Error&#x27;, buttonText = &#x27;OK&#x27;)</code></summary>
<div class="api-func-body">
<p class="api-desc">Show an error popup with visually distinct styling. Convenience wrapper around <code>showCustomPopup</code> that renders the message in red and uses a single OK button for dismissal.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>message</code></td><td><code>string</code></td><td>Error description text.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>showConfirmationPopup(options = {})</code></summary>
<div class="api-func-body">
<p class="api-desc">Show a two-button confirmation popup. Presents a message with a Cancel and a Confirm button. Executes <code>options.onConfirm</code> when confirmed or <code>options.onCancel</code> when cancelled.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
<details class="api-func">
<summary class="api-sig"><code>showInputPrompt(options = {})</code></summary>
<div class="api-func-body">
<p class="api-desc">Show a modal prompt with a text or numeric input field. Renders a popup with an input element pre-filled with <code>options.defaultValue</code>. Optional validator callback is invoked on confirm; if it returns a non-empty string the value is treated as an error message and the popup remains open. On successful confirmation <code>options.onConfirm</code> receives the trimmed input value.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>switch_sublayer.js</code></summary>
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
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
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
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>startSublayerSwitchFlow()</code></summary>
<div class="api-func-body">
<p class="api-desc">Begin the sublayer-switching workflow. Validates that at least one eligible parent layer is loaded, then presents a selection dialog that lets the user choose a parent layer and a destination sublayer. After confirmation, click handlers are attached to every matching element so the user can mark features for transfer. Completes by moving the selected elements to the destination sublayer and updating the legend.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<details class="tool-section">
<summary><code>topology_check.js</code></summary>
<div class="module-header">
<p><strong>QGas - Topology Check Tool</strong></p>
<p>Analyzes network connectivity to identify unconnected nodes, unconnected lines, and disconnected network islands. Provides clickable results that focus the map on the selected element or isolate a specific network component.</p>
<p><strong>Development Information:</strong></p>
<ul>
  <li>Authors: Marco Quantschnig, Yannick Werner, Thomas Klatzer and Sonja Wogrin</li>
  <li>Institution: Institute of Electricity Economics and Energy Innovation, TU Graz</li>
  <li>Created: March 2026</li>
  <li>License: See LICENSE file</li>
  <li>Disclaimer: AI-assisted tools were used to support development and documentation.</li>
</ul>
<p><strong>Public API:</strong></p>
<ul>
  <li>activateTopologyCheckTool(): Run topology analysis and open results popup.</li>
</ul>
<details class="api-functions-section">
<summary><strong>Public API Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>activateTopologyCheckTool()</code></summary>
<div class="api-func-body">
<p class="api-desc">Run the network topology analysis and display results. Resets all active editing modes, performs a full topological analysis of the loaded node and line layers (via <code>buildTopologyAnalysis</code>), and renders the results in a popup. The analysis identifies: (a) isolated nodes not connected to any pipeline, (b) pipelines not connected at either endpoint to a node, (c) disconnected network sub-graphs (islands). Each result entry is clickable and pans/zooms the map to the offending element.</p>
<p class="api-returns"><strong>Returns:</strong> <code>void</code></p>
</div>
</details>
</div>
</details>
</div>
</details>
<hr>
