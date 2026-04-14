<div class="breadcrumb">QGas / API / JavaScript</div>
<h1>JavaScript Modules</h1>
<p>This page is generated automatically from the module headers and JSDoc annotations in <code>js/</code> on every build.</p>
<p class="api-scope-note"><strong>API Scope:</strong> The functions documented here are primarily designed for internal module interaction within QGas. A stable subset is intentionally exposed on the global <code>window</code> object for cross-module use; these are the recommended integration points for any downstream tooling. Functions labelled <em>Internal Helpers</em> are implementation details and may change between releases.</p>
<details class="tool-section">
<summary><code>core.js</code></summary>
<div class="module-header">
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
</div>
</details>
<details class="tool-section">
<summary><code>options.js</code></summary>
<div class="module-header">
<p>No module header found.</p>
</div>
</details>
<details class="tool-section">
<summary><code>screenshot.js</code></summary>
<div class="module-header">
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
</div>
</details>
<details class="tool-section">
<summary><code>reconnect_infrastructure.js</code></summary>
<div class="module-header">
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
<p>No module header found.</p>
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
