<div class="breadcrumb">QGas / API / JavaScript</div>
<h1>JavaScript Modules</h1>
<p>This page is generated automatically from the module headers in <code>js/</code> on every build.</p>
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
</div>
</details>
<hr>
