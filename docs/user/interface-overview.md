<div class="breadcrumb">QGas / User Guide / Interface Overview</div>
<h1>Interface Overview</h1>

<p>QGas consists of a <strong>Desktop GUI</strong> for server management and a <strong>web-based map interface</strong> for data visualization and editing. This overview provides a brief description of each interface element.</p>

<h2>Desktop GUI</h2>

<p><img src="/assets/GUI.jpg" alt="QGas Desktop GUI" style="max-width:100%; height:auto;"></p>

<p><strong>QGas Logo and Branding</strong> - Displays TU Graz and IEE logos with version information.</p>

<p><strong>Server Status LED</strong> - Real-time indicator showing server status (red = stopped, green = running).</p>

<p><strong>Start Server Button</strong> - Initializes the HTTP server on port 8000.</p>

<p><strong>Open Map Button</strong> - Launches the interactive map interface in the default web browser.</p>

<p><strong>Stop Server Button</strong> - Safely shuts down all server connections.</p>

<p><strong>Information Panel</strong> - Displays technical details including ports, URLs, and working directory.</p>

<p><strong>Project Selection Dialog</strong> - Dropdown menu to select from available projects in the Input/ folder.</p>

<h2>Web Interface</h2>

<p><img src="/assets/Interface.jpg" alt="QGas Web Interface" style="max-width:100%; height:auto;"></p>

<p><strong>Interactive Map</strong> - Leaflet.js-based map with OpenStreetMap tiles for panning and zooming.</p>

<p><strong>Logos (Top-Left)</strong> - Visual branding elements for QGas, TU Graz, and IEE.</p>

<p><strong>Cite This Project Button</strong> - Opens citation information dialog.</p>

<p><strong>Data and Licensing Button</strong> - Displays licensing information for the current project.</p>

<p><strong>Documentation Button</strong> - Opens this documentation in a new browser tab.</p>

<p><strong>Tools Button</strong> - Opens the comprehensive toolbox popup with 15+ specialized editing tools.</p>

<p><strong>Active Tool Display</strong> - Shows the currently selected tool below the Tools button.</p>

<p><strong>Screenshot Button</strong> - Activates clean screenshot mode by hiding all UI elements.</p>

<p><strong>Export Button</strong> - Opens export dialog with three modes: complete dataset, filtered data, or changes only.</p>

<p><strong>Groups Button</strong> - Opens panel to view and manage grouped pipeline segments.</p>

<p><strong>Filter Button</strong> - Opens panel to filter data by country or other geographical attributes.</p>

<p><strong>Options Button</strong> - Opens customization panel for colors, sizes, and map styling.</p>

<p><strong>Legend Panel</strong> - Shows all infrastructure types with checkboxes to toggle visibility.</p>

<p><strong>Select All Button</strong> - Toggles all legend layers on or off simultaneously.</p>

<p><strong>Statistics Button</strong> - Opens statistical overview window with element counts and pipeline analytics.</p>

<p><strong>Contributor Input Box</strong> - Text field to enter contributor name for tracking changes.</p>

<p><strong>OSM Attribution</strong> - OpenStreetMap copyright notice in the bottom-right corner.</p>

<h2>Keyboard Shortcuts</h2>

<ul>
<li><strong>ESC</strong> - Exit current mode (screenshot, tool, etc.)</li>
<li><strong>Ctrl + Mouse Wheel</strong> - Zoom map</li>
<li><strong>Ctrl + F5</strong> - Hard refresh (clear cache)</li>
</ul>

<div class="callout">
<b>Tip for New Users</b><br>
Start with <strong>Info Mode</strong> to explore the dataset. Click on various elements to see their attributes and understand the data structure before making modifications.
</div>
