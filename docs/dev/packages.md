<div class="breadcrumb">QGas / Developer / Dependencies and Packages</div>
<h1>Dependencies and Packages</h1>

<p>QGas is built on a combination of Python backend tools and JavaScript frontend libraries. This document provides a comprehensive overview of all dependencies, their purposes, and version requirements.</p>

<h2>Python Dependencies</h2>

<p>The Python environment is managed via Conda and defined in <code>environment.yml</code>.</p>

<h3>Core Python</h3>

<table>
<thead>
<tr>
<th>Package</th>
<th>Version</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>python</strong></td>
<td>3.11.5+</td>
<td>Base Python interpreter. Version 3.11 required for modern features and performance.</td>
</tr>
</tbody>
</table>

<h3>GUI and Image Processing</h3>

<table>
<thead>
<tr>
<th>Package</th>
<th>Version</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>tkinter</strong></td>
<td>Built-in</td>
<td>Desktop GUI framework. Included with Python, used for server control interface.</td>
</tr>
<tr>
<td><strong>Pillow</strong></td>
<td>10.0.0+</td>
<td>Python Imaging Library. Used for logo display in GUI and image processing for georeferencing.</td>
</tr>
</tbody>
</table>

<h3>HTTP Communication</h3>

<table>
<thead>
<tr>
<th>Package</th>
<th>Version</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>http.server</strong></td>
<td>Built-in</td>
<td>Standard library HTTP server for serving static files and JSON endpoints.</td>
</tr>
<tr>
<td><strong>socketserver</strong></td>
<td>Built-in</td>
<td>TCP server infrastructure with address reuse for quick restarts.</td>
</tr>
</tbody>
</table>

<h3>Utilities</h3>

<table>
<thead>
<tr>
<th>Package</th>
<th>Version</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>json</strong></td>
<td>Built-in</td>
<td>JSON parsing and serialization for GeoJSON data handling.</td>
</tr>
<tr>
<td><strong>gzip</strong></td>
<td>Built-in</td>
<td>Data compression for efficient transfer of large GeoJSON files.</td>
</tr>
<tr>
<td><strong>threading</strong></td>
<td>Built-in</td>
<td>Server execution in background threads.</td>
</tr>
<tr>
<td><strong>concurrent.futures</strong></td>
<td>Built-in</td>
<td>Thread pool executor for parallel processing of data operations.</td>
</tr>
</tbody>
</table>

<h2>JavaScript Dependencies (Frontend)</h2>

<p>JavaScript libraries are loaded via CDN in the browser. No local installation required.</p>

<h3>Mapping and Visualization</h3>

<table>
<thead>
<tr>
<th>Library</th>
<th>Version</th>
<th>Purpose</th>
<th>Source</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Leaflet.js</strong></td>
<td>1.9.4</td>
<td>Core interactive mapping library. Provides map rendering, layer management, and interaction handling.</td>
<td>unpkg.com</td>
</tr>
<tr>
<td><strong>Leaflet Draw</strong></td>
<td>1.0.4</td>
<td>Drawing tools plugin for Leaflet. Enables interactive geometry creation and editing.</td>
<td>cdn.jsdelivr.net</td>
</tr>
<tr>
<td><strong>Leaflet PolylineDecorator</strong></td>
<td>1.6.0</td>
<td>Arrow decorators for pipelines. Shows flow direction on pipeline segments.</td>
<td>cdn.jsdelivr.net</td>
</tr>
<tr>
<td><strong>OpenStreetMap Tiles</strong></td>
<td>Current</td>
<td>Background map tiles. Requires internet connection during use.</td>
<td>openstreetmap.org</td>
</tr>
</tbody>
</table>

<h3>Data Processing</h3>

<table>
<thead>
<tr>
<th>Library</th>
<th>Version</th>
<th>Purpose</th>
<th>Source</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>JSZip</strong></td>
<td>3.10.1</td>
<td>ZIP file creation in browser. Used for packaging exports.</td>
<td>cdnjs.cloudflare.com</td>
</tr>
<tr>
<td><strong>SheetJS (xlsx)</strong></td>
<td>0.18.5</td>
<td>Excel file handling. Enables Excel export functionality.</td>
<td>cdnjs.cloudflare.com</td>
</tr>
</tbody>
</table>

<h3>Charting and Statistics</h3>

<table>
<thead>
<tr>
<th>Library</th>
<th>Version</th>
<th>Purpose</th>
<th>Source</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Chart.js</strong></td>
<td>Latest</td>
<td>Interactive charts for statistics window. Renders bar charts, pie charts, histograms.</td>
<td>cdn.jsdelivr.net</td>
</tr>
<tr>
<td><strong>chartjs-plugin-zoom</strong></td>
<td>Latest</td>
<td>Chart.js plugin for zooming and panning in statistical charts.</td>
<td>cdn.jsdelivr.net</td>
</tr>
</tbody>
</table>

<h2>Development Tools (Optional)</h2>

<p>These tools are recommended for development but not required for running QGas:</p>

<table>
<thead>
<tr>
<th>Tool</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>VS Code</strong></td>
<td>Recommended IDE with Python and JavaScript support</td>
</tr>
<tr>
<td><strong>Python Extension</strong></td>
<td>VS Code Python language support and debugging</td>
</tr>
<tr>
<td><strong>Git</strong></td>
<td>Version control</td>
</tr>
</tbody>
</table>

<h2>Browser Requirements</h2>

<p>QGas requires a modern web browser with ES6+ JavaScript support:</p>

<h3>Recommended Browsers</h3>
<ul>
<li><strong>Microsoft Edge</strong> (Latest) - Recommended, tested extensively</li>
<li><strong>Google Chrome</strong> (Latest) - Full support</li>
<li><strong>Mozilla Firefox</strong> (Latest) - Full support</li>
</ul>

<h3>Required Browser Features</h3>
<ul>
<li>ES6 Module support</li>
<li>Fetch API</li>
<li>Canvas API (for charts)</li>
<li>File API (for exports)</li>
<li>localStorage</li>
</ul>

<h2>Network Ports</h2>

<p>QGas requires the following ports to be available:</p>

<table>
<thead>
<tr>
<th>Port</th>
<th>Protocol</th>
<th>Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>8000</strong></td>
<td>HTTP</td>
<td>Static file server and API endpoints</td>
</tr>
</tbody>
</table>

<p>Ensure these ports are not blocked by firewall or used by other applications.</p>

<h2>Installation via Conda</h2>

<p>All Python dependencies are automatically installed when creating the Conda environment:</p>

<div class="codehilite">
<pre><span></span><code>conda env create -f environment.yml
conda activate QGas
</code></pre>
</div>

<p>This ensures:</p>
<ul>
<li>Correct Python version</li>
<li>All required packages installed</li>
<li>Isolated environment (no conflicts with system Python)</li>
<li>Reproducible setup across different machines</li>
</ul>

<h2>Dependency Management</h2>

<h3>Adding New Python Dependencies</h3>

<p>To add a new Python package:</p>
<ol>
<li>Add it to <code>environment.yml</code> under <code>dependencies</code></li>
<li>Update the environment: <code>conda env update -f environment.yml</code></li>
<li>Document it in this file</li>
</ol>

<h3>Adding New JavaScript Libraries</h3>

<p>To add a new JavaScript library:</p>
<ol>
<li>Add CDN link in <code>GUI.html</code> header</li>
<li>Ensure it's loaded before scripts that use it</li>
<li>Document it in this file</li>
<li>Consider fallback for offline scenarios if critical</li>
</ol>

<h2>Version Pinning Strategy</h2>

<ul>
<li><strong>Python Core:</strong> Major.minor pinned (e.g., 3.11.5)</li>
<li><strong>Critical Libraries:</strong> Minimum version specified (e.g., 10.0.0)</li>
<li><strong>JavaScript CDN:</strong> Exact version specified for stability</li>
<li><strong>Development Tools:</strong> Latest version recommended</li>
</ul>

<div class="callout">
<b>Note on Updates</b><br>
Before updating major versions of Leaflet or other core libraries, thoroughly test all functionality as API changes may break existing tools.
</div>

<hr>
