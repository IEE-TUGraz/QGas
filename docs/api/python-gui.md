<div class="breadcrumb">QGas / API / Python</div>
<h1>Python API: Server.py</h1>
<p>This page is generated automatically from <code>Server.py</code> during docs builds.</p>
<h2>Module Overview</h2>
<pre><span></span><code>QGas – Interactive Map Interface
================================

Academic Software Description
-----------------------------

This application provides an interactive web-based visualization interface for
European gas pipeline infrastructure data. The system serves processed pipeline
network data through an integrated web server with real-time updates.

Key Functionalities
-------------------
- Interactive web-based visualization with Folium mapping interface
- Local HTTP server for serving map data
- Data caching and compression for optimized performance
- Manual change management for pipeline data

Technical Implementation
------------------------
The system uses a tkinter-based GUI with an integrated HTTP server for serving
interactive maps. Data is cached in memory for performance and can be updated
through the web interface.

Development Information
------------------------
- Authors: Marco Quantschnig, Yannick Werner, Sonja Wogrin and Thomas Klatzer
- Institution: Institute of Electricity Economics and Energy Innovation (IEE), Graz University of
Technology, Inffeldgasse 18, Graz, 8010, Austria
- License: See LICENSE file
- Disclaimer: AI-assisted tools were used to support development and documentation.

Inputs
------
- Runtime environment: Python 3.x with Tkinter.
- Local project folders (Input/ and related assets).
- Map HTML entry point: GUI.html served over the local HTTP server.</code></pre>
<h2>Classes</h2>
<details class="tool-section">
<summary><code>CombinedGUI</code></summary>
<div class="module-header">
<details class="api-functions-section">
<summary><strong>Methods</strong><span class="api-func-count"> (28)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>__init__(root)</code></summary>
<div class="api-func-body">
<p class="api-desc">Initialize the QGas application GUI. Configures the main window geometry, determines the application base path (supporting both script and PyInstaller frozen-exe execution), initializes the HTTP server state variables, and builds all UI widgets.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>root</code></td><td><code>tk.Tk</code></td><td>The root Tkinter window instance created by ``main()``.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>ensure_directories()</code></summary>
<div class="api-func-body">
<p class="api-desc">Create any missing required directories for the application. Since we now use Input project folders, Output directories are no longer needed.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>create_widgets()</code></summary>
<div class="api-func-body">
<p class="api-desc">Create the main GUI layout with the QGas Interactive Map interface. Modern design with logo and tile-based layout optimized for larger window.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>create_header(parent)</code></summary>
<div class="api-func-body">
<p class="api-desc">Create the header section with logo, application title, and LED server-status indicator. Attempts to load ``Images/QGas_Logo.png`` (requires Pillow); falls back to a text emoji placeholder if the image is unavailable. The LED indicator in the top-right corner is updated by ``update_status()`` whenever the server state changes.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>parent</code></td><td><code>tk.Frame</code></td><td>Parent container frame that the header is packed into.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>create_control_tiles(parent)</code></summary>
<div class="api-func-body">
<p class="api-desc">Create the tile-based control interface with Start, Open Map, and Stop action tiles. Arranges three action tiles in a responsive 3-column grid (row 0) and an information tile spanning all columns below (row 1). Row weights are set so action tiles receive three times more vertical space than the info tile.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>parent</code></td><td><code>tk.Frame</code></td><td>Parent container frame for the tile grid.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>create_action_tile(parent, title, description, icon, button_text, command, color, row, column)</code></summary>
<div class="api-func-body">
<p class="api-desc">Create a single action tile widget and place it in the given grid cell. Each tile contains a large emoji icon, a heading, a short description and a colored action button. Hover effects darken the button color using ``darken_color()``.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>parent</code></td><td><code>tk.Frame</code></td><td>Parent grid container.</td></tr>
<tr><td><code>title</code></td><td><code>str</code></td><td>Heading text displayed inside the tile.</td></tr>
<tr><td><code>description</code></td><td><code>str</code></td><td>Longer description text shown below the heading.</td></tr>
<tr><td><code>icon</code></td><td><code>str</code></td><td>Unicode emoji used as the tile icon (e.g. ``&quot;🚀&quot;``).</td></tr>
<tr><td><code>button_text</code></td><td><code>str</code></td><td>Label text of the action button.</td></tr>
<tr><td><code>command</code></td><td><code>callable</code></td><td>Callback invoked when the button is clicked.</td></tr>
<tr><td><code>color</code></td><td><code>str</code></td><td>Hex color code for the button background (e.g. ``&quot;#28a745&quot;``).</td></tr>
<tr><td><code>row</code></td><td><code>int</code></td><td>Grid row index for tile placement.</td></tr>
<tr><td><code>column</code></td><td><code>int</code></td><td>Grid column index for tile placement.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>create_info_tile(parent)</code></summary>
<div class="api-func-body">
<p class="api-desc">Create the compact information tile that spans all three columns. Displays static server metadata in a 3-column grid: map file name, HTTP port, server URL, working directory, and a feature summary.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>parent</code></td><td><code>tk.Frame</code></td><td>Parent container whose grid row 1 receives the tile.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>darken_color(color)</code></summary>
<div class="api-func-body">
<p class="api-desc">Utility function to darken colors for hover effects</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>color</code></td><td><code>str</code></td><td>Hex color code</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>str</code> — Darker version of the color</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>update_status(status, is_running=False)</code></summary>
<div class="api-func-body">
<p class="api-desc">Update the header LED indicator to reflect server status</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>status</code></td><td><code>str</code></td><td>Status text (e.g., &quot;Running&quot;, &quot;Stopped&quot;)</td></tr>
<tr><td><code>is_running</code></td><td><code>bool</code></td><td>True if server is running, False otherwise</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>create_map_tab(parent)</code></summary>
<div class="api-func-body">
<p class="api-desc">Legacy method for map tab creation Now handled by create_widgets for unified interface</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>start_server()</code></summary>
<div class="api-func-body">
<p class="api-desc">Start the HTTP server for map visualization</p>
<p><strong>Features:</strong></p>
<ul>
  <li>Serves static files (HTML, JS, CSS)</li>
  <li>Provides API endpoints for dynamic data</li>
  <li>Handles GeoJSON with compression</li>
  <li>Dynamic project path routing</li>
</ul>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>show_project_selection_after_start()</code></summary>
<div class="api-func-body">
<p class="api-desc">Scan the ``Input/`` folder and auto-select or prompt for a project after server start. If only one sub-folder exists it is selected automatically. If multiple folders exist the user is shown the project selection dialog. Falls back to ``&quot;Standard&quot;`` on any error.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>get_cached_layer_data(layer_name, bbox=None)</code></summary>
<div class="api-func-body">
<p class="api-desc">Load layer data with caching and optional bounding box filtering</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>layer_name</code></td><td><code>str</code></td><td>Name of the layer to load</td></tr>
<tr><td><code>bbox</code></td><td><code>str, optional</code></td><td>Bounding box string &quot;minX,minY,maxX,maxY&quot;</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>dict</code> — GeoJSON FeatureCollection</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>filter_data_by_bbox(geojson_data, bbox_str)</code></summary>
<div class="api-func-body">
<p class="api-desc">Filter GeoJSON data by bounding box for viewport optimization</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>geojson_data</code></td><td><code>dict</code></td><td>GeoJSON FeatureCollection</td></tr>
<tr><td><code>bbox_str</code></td><td><code>str</code></td><td>Bounding box &quot;minX,minY,maxX,maxY&quot;</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>dict</code> — Filtered GeoJSON FeatureCollection</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>update_layer_feature(layer_name, feature)</code></summary>
<div class="api-func-body">
<p class="api-desc">Update a feature in the layer data Note: Currently logs the update. Extend this method to persist changes to files or database as needed.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>layer_name</code></td><td><code>str</code></td><td>Name of the layer</td></tr>
<tr><td><code>feature</code></td><td><code>dict</code></td><td>Updated GeoJSON feature</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>bool</code> — True if update was successful</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>stop_server()</code></summary>
<div class="api-func-body">
<p class="api-desc">Stop all running servers and cleanup resources</p>
<p><strong>Actions:</strong></p>
<ul>
  <li>Shutdown HTTP server</li>
  <li>Clear data cache</li>
  <li>Reset UI status</li>
  <li>Reset selected project</li>
</ul>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>open_browser()</code></summary>
<div class="api-func-body">
<p class="api-desc">Open the interactive map in web browser with project selection</p>
<p><strong>Features:</strong></p>
<ul>
  <li>Project selection dialog before opening</li>
  <li>Automatic URL parameter injection with selected project</li>
  <li>Preference for Microsoft Edge browser</li>
  <li>Fallback to default browser if Edge unavailable</li>
</ul>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>select_project()</code></summary>
<div class="api-func-body">
<p class="api-desc">Show project selection dialog if multiple projects exist</p>
<p class="api-returns"><strong>Returns:</strong> <code>bool</code> — True if project selected or default used, False if cancelled</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>show_project_selection_dialog(projects)</code></summary>
<div class="api-func-body">
<p class="api-desc">Display a modal project-selection dialog with a dropdown and project-creation support. Defaults to ``&quot;Standard&quot;`` in the dropdown if that folder exists.  The dialog also exposes a *Create New Project* button that calls ``prompt_new_project_dialog()`` before returning.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>projects</code></td><td><code>list[str]</code></td><td>Sorted list of available project folder names.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>str | None</code> — The selected or newly created project name, or ``None`` if the user cancelled the dialog.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>prompt_new_project_dialog(parent, projects)</code></summary>
<div class="api-func-body">
<p class="api-desc">Show a secondary modal dialog to collect a new project name and create it on disk. Validates the name with ``validate_project_name()`` and then calls ``create_project_from_template()`` to scaffold the folder structure.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>parent</code></td><td><code>tk.Toplevel</code></td><td>Parent dialog window used as the transient owner.</td></tr>
<tr><td><code>projects</code></td><td><code>list[str]</code></td><td>Existing project names used for duplicate detection.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>str | None</code> — The validated new project name on success, or ``None`` if the user cancelled or validation failed.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>validate_project_name(name, projects)</code></summary>
<div class="api-func-body">
<p class="api-desc">Validate a proposed project name against Windows filesystem and uniqueness rules. Checks for empty input, forbidden characters (``&lt; &gt; : / \ | ? * &quot;``), reserved names (``&quot;.&quot;`` / ``&quot;..&quot;``), trailing spaces or dots, and case-insensitive duplicates in *projects*. Displays an error dialog for each violation.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>name</code></td><td><code>str</code></td><td>Raw name string entered by the user.</td></tr>
<tr><td><code>projects</code></td><td><code>list[str]</code></td><td>Existing project folder names for duplicate checking.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>str | None</code> — The validated name if all checks pass, ``None`` otherwise.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>create_project_from_template(project_name)</code></summary>
<div class="api-func-body">
<p class="api-desc">Scaffold a new project folder under ``Input/`` with minimal required files. Creates ``Input/&lt;project_name&gt;/`` and populates it with: - ``PL_Pipelines.geojson`` — empty feature collection (schema from Standard) - ``N_Nodes.geojson`` — empty feature collection (schema from Standard) - ``config.xlsx`` — minimal configuration workbook - ``license.txt`` — empty placeholder</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>project_name</code></td><td><code>str</code></td><td>Validated name for the new project folder.</td></tr>
</tbody></table>
<p class="api-returns"><strong>Returns:</strong> <code>bool</code> — ``True`` if the project was created successfully, ``False`` on error.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>write_empty_geojson(template_path, dest_path)</code></summary>
<div class="api-func-body">
<p class="api-desc">Write an empty GeoJSON FeatureCollection to *dest_path*. Preserves the ``name`` and ``crs`` fields from *template_path* if it exists; otherwise writes a minimal FeatureCollection whose ``name`` is derived from the destination filename stem.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>template_path</code></td><td><code>str</code></td><td>Path to an existing GeoJSON used as schema source. If the file does not exist, a bare FeatureCollection is created.</td></tr>
<tr><td><code>dest_path</code></td><td><code>str</code></td><td>Absolute or relative output path for the new GeoJSON file.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>write_minimal_configuration_xlsx(dest_path)</code></summary>
<div class="api-func-body">
<p class="api-desc">Write a minimal OOXML ``.xlsx`` workbook to *dest_path* without requiring openpyxl. The workbook contains a single ``Input_Files`` sheet pre-populated with header row and two data rows (pipelines and nodes) matching the expected QGas configuration schema.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>dest_path</code></td><td><code>str</code></td><td>Absolute or relative path where the ``.xlsx`` file is written.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>update_map_paths(project_name)</code></summary>
<div class="api-func-body">
<p class="api-desc">Rewrite ``fetch()`` URLs in ``GUI.html`` to point to ``Input/&lt;project_name&gt;/``. First normalises any pre-existing ``Input/&lt;old_project&gt;/`` prefix to plain ``Input/`` (prevents double-nesting on repeated calls), then replaces all ``fetch(&#x27;Input/`` occurrences with ``fetch(&#x27;Input/&lt;project_name&gt;/``.</p>
<table class="api-params">
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead><tbody>
<tr><td><code>project_name</code></td><td><code>str</code></td><td>Name of the project folder to activate in the map.</td></tr>
</tbody></table>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>reset_map_paths()</code></summary>
<div class="api-func-body">
<p class="api-desc">Revert all ``fetch(&#x27;Input/&lt;project&gt;/``) URLs in ``GUI.html`` back to ``fetch(&#x27;Output/``. Intended as a cleanup step when the application shuts down or when the user reverts to the legacy Output-folder layout.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>clear_browser_cache()</code></summary>
<div class="api-func-body">
<p class="api-desc">Add or update a ``?v=&lt;timestamp&gt;`` cache-busting query parameter in ``GUI.html``. Scans all ``.geojson`` fetch URLs in the HTML and replaces or appends a ``v`` parameter set to the current Unix timestamp so the browser fetches fresh data on the next page load.</p>
</div></details>
<details class="api-func">
<summary class="api-sig"><code>on_closing()</code></summary>
<div class="api-func-body">
<p class="api-desc">Handle application shutdown gracefully. Stops the map server if running and cleans up any background processes before closing the application window.</p>
</div></details>
</div></details>
</div></details>
<h2>Module-level Functions</h2>
<details class="api-functions-section" open>
<summary><strong>Functions</strong><span class="api-func-count"> (1)</span></summary>
<div class="api-functions">
<details class="api-func">
<summary class="api-sig"><code>main()</code></summary>
<div class="api-func-body">
<p class="api-desc">Main entry point for the QGas Interactive Map application. Initializes the Tkinter GUI, creates the application instance, and starts the main event loop. Includes error handling for startup issues.</p>
</div></details>
</div></details>
<hr>
