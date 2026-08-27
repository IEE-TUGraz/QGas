<div class="breadcrumb">QGas / Developer / Project Structure</div>
<h1>Project Structure</h1>

<h2>Overview</h2>

<div class="codehilite">
<pre><span></span><code>QGas/
|-- GUI.html                       # Web-interface entry point
|-- Server.py                      # Desktop launcher and local HTTP/API server
|-- environment.yml               # Conda environment
|-- mkdocs.yml                     # Documentation configuration
|-- README.md
|-- Images/                        # Application branding and loading assets
|-- Input/
|   |-- &lt;ProjectName&gt;/             # One folder per QGas project
|   |-- Additional Datasets/       # Optional datasets for integration
|   `-- Lego_Template/             # Shared LEGO Excel export templates
|-- Plans/                         # Infrastructure-plan image resources
|-- js/
|   |-- core.js                    # Map, layers, project state and shared logic
|   |-- shared/
|   |   `-- node_layers.js         # Shared node-layer discovery
|   `-- ui/
|       |-- logs.js                # Per-session logs client
|       |-- export.js              # GeoJSON and CSV export workflows
|       |-- filter.js              # Country filtering and layer synchronization
|       |-- groups.js              # Pipeline-group panel
|       |-- legend.js              # Layer visibility and legend management
|       |-- options.js             # Layer and map styling
|       |-- screenshot.js          # Clean screenshot mode
|       |-- search.js              # Find-by-ID, centering and highlighting
|       |-- statistics.js          # Dataset statistics
|       |-- tools.js               # Toolbox registration and activation
|       |-- undo.js                # Selective in-memory undo history
|       `-- tools/
|           |-- add_infrastructure.js
|           |-- add_new_element.js
|           |-- add_pipeline.js
|           |-- add_plan.js
|           |-- change_direction.js
|           |-- create_compressor.js
|           |-- delete.js
|           |-- divide_pipeline.js
|           |-- edit_geometry.js
|           |-- group_pipelines.js
|           |-- info_mode.js
|           |-- integrate_dataset.js
|           |-- reconnect_infrastructure.js
|           |-- short_pipe.js
|           |-- split_node.js
|           |-- switch_sublayer.js
|           `-- topology_checker.js
`-- docs/
    |-- api/                        # Generated Python/JavaScript API reference
    |-- assets/                     # Documentation images and styling
    |-- dev/                        # Developer guide
    |-- ref/                        # Citation/reference pages
    |-- tools/                      # Documentation-generation helpers
    `-- user/                       # User guide
</code></pre>
</div>

<h2>Key Entry Points</h2>

<ul>
<li><strong><code>Server.py</code></strong> starts the desktop launcher, serves the web application and project files, and provides local endpoints such as log persistence.</li>
<li><strong><code>GUI.html</code></strong> defines the map interface and loads the JavaScript modules in dependency order.</li>
<li><strong><code>js/core.js</code></strong> owns shared map state, configured/dynamic layer registries, feature creation, change tracking, and common interaction helpers.</li>
<li><strong><code>js/ui/</code></strong> contains independent interface services. Editing workflows are kept under <code>js/ui/tools/</code>.</li>
<li><strong><code>docs/</code></strong> contains the MkDocs documentation source. <code>docs/api/js-modules.md</code> is generated from JavaScript module headers and JSDoc.</li>
<li><strong><code>Input/Lego_Template/</code></strong> contains shared workbook and mapping templates used by the LEGO export. It is support data and is excluded from project-selection lists.</li>
</ul>

<h2>Project Data Structure</h2>

<p>Each selectable project lives under <strong><code>Input/&lt;ProjectName&gt;/</code></strong>. Layer filenames are not fixed; <code>config.xlsx</code> defines which files are loaded and how they appear.</p>

<div class="codehilite">
<pre><span></span><code>Input/&lt;ProjectName&gt;/
|-- config.xlsx
|-- license.txt
|-- pipelines.geojson
|-- nodes.geojson
|-- compressors.geojson
|-- storages.geojson
|-- valves.geojson
|-- ...                            # Further configured GeoJSON/CSV layers
|-- logs/
|   `-- Session_&lt;session ID&gt;.txt
`-- plans/                        # Optional project-specific plans
</code></pre>
</div>

<h3>Layer Configuration</h3>

<p><code>config.xlsx</code> contains the backing filename, legend label, color, marker or line style, size, layer type, and optional parent-layer relationship. QGas supports line, point, node, and in-line layers. Runtime references are held in <code>dynamicLayers</code> and synchronized with legacy references such as <code>pipelineLayer</code>, <code>nodeLayer</code>, and <code>compressorsLayer</code>.</p>

<h3>Original and Filtered Layers</h3>

<p>Country filtering keeps original layer groups and creates active filtered groups containing the matching Leaflet features. Editing tools that create or replace topology elements must synchronize both representations. Export and topology analysis apply the active country rules explicitly so stale or hidden original groups do not leak into filtered results.</p>

<h3>Logs and Undo</h3>

<p><code>js/ui/logs.js</code> buffers committed changes and writes them through the local server to <code>Input/&lt;ProjectName&gt;/logs/</code>. <code>js/ui/undo.js</code> is separate: it retains affected before/after feature snapshots in browser memory, limited to 50 actions and 25 MB. Undo state is not persisted across application restarts.</p>
