<div class="breadcrumb">QGas / User Guide / Main Screen</div>
<h1>Main Screen</h1>

<p>After the startup process, the user lands on the main screen. The web-based map interface provides an interactive Leaflet.js-based map with comprehensive editing tools. This page describes all major interface elements and their functionality in detail.</p>

<p><img src="../../assets/Interface.png" alt="QGas Web Interface" style="max-width:100%; height:auto;"></p>

<h2>Map View</h2>

<p>The central element is an interactive map powered by Leaflet.js with OpenStreetMap tiles. Users can pan the map by clicking and dragging, and zoom using the mouse wheel or pinch gestures. The background uses OpenStreetMap standard tiles, which require an internet connection to load.</p>

<h2>Top-Left: Logo and Quick Actions</h2>

<p>In the top-left corner, you'll find the QGas, TU Graz, and IEE logos for visual identification. Below the logos are three important buttons:</p>

<ul>
<li><strong>Cite This Project</strong> - Opens a dialog with citation information for academic and professional use.</li>
<li><strong>Data and Licensing</strong> - Displays licensing information specific to the current project, loaded from the project's data licensing file.</li>
<li><strong>Documentation</strong> - Opens this documentation in a new browser tab for quick reference.</li>
</ul>

<h2>Bottom-Left: Main Control Panel</h2>

<p>The main control panel provides access to all major features through a series of buttons and displays.</p>

<h3>Tools Section</h3>

<p><strong>Tools Button</strong> - Clicking this button opens a comprehensive toolbox popup containing 15+ specialized editing tools. The tools are organized in a grid layout and include options for viewing, editing, creating, modifying, and integrating infrastructure data. All tools are described in detail in the Toolkit / Tools section of this documentation.</p>

<p><strong>Active Tool Display</strong> - Below the Tools button, the currently selected tool is displayed (e.g., "Info Mode"). This provides immediate feedback about which tool is active.</p>

<h3>Main Action Buttons</h3>

<p><strong>Screenshot</strong> - Activates clean screenshot mode, which hides all UI elements, control panels, and the legend. This mode is designed to generate clean maps suitable for publications or presentations. Press ESC to exit screenshot mode.</p>

<p><strong>Export</strong> - Opens the export dialog, which offers three export modes:</p>
<ol>
<li><strong>Export Complete Dataset</strong> - Exports the entire project as a ZIP file, including all GeoJSON files while preserving the directory structure.</li>
<li><strong>Export Filtered Data</strong> - Exports only the currently visible or filtered elements, useful for extracting country-specific data.</li>
<li><strong>Export Changes</strong> - Exports only modified elements with contributor information, useful for tracking and reviewing edits.</li>
</ol>

<p><strong>Groups</strong> - Opens the Groups panel, which provides an overview of all grouped pipeline elements. When clicking on a group in this panel, all corresponding elements are highlighted and centered on the screen. The panel shows the total length and member count for each group.</p>

<p><strong>Filter</strong> - Opens the Filter panel, which allows filtering the dataset based on geographical features such as country information. Users can select countries using multi-select checkboxes. The panel includes Clear Filters and Apply buttons for managing filter states.</p>

<p><strong>Options</strong> - Opens the Options panel for customizing the visual appearance of infrastructure types. This includes:</p>
<ul>
<li><strong>Color Picker</strong> - Change colors for each infrastructure layer</li>
<li><strong>Size Controls</strong> - Adjust marker sizes for point elements</li>
<li><strong>Line Width</strong> - Modify pipeline thickness</li>
<li><strong>Pattern Selection</strong> - Choose line styles (solid, dashed, dotted)</li>
<li><strong>Monochromatic Mode</strong> - Toggle grayscale background map, useful for presentations or printing</li>
</ul>

<h2>Right Side: Legend</h2>

<p>The Legend panel lists all available layers for the currently selected project. Each layer has a checkbox to toggle its visibility on the map. Layers added through <strong>Add New Element</strong>, <strong>Switch to Sublayer</strong>, <strong>Integrate Dataset</strong>, or <strong>Add Infrastructure Plans</strong> also appear here automatically.</p>

<p>At the bottom of the legend there is a row of four buttons arranged in a 2×2 grid:</p>

<ul>
<li><strong>Select All</strong> – Toggles all infrastructure layers on or off simultaneously.</li>
<li><strong>Statistics</strong> – Opens the analytics window (see below).</li>
<li><strong>Remove</strong> – Activates <em>Remove Mode</em>. While active, each legend entry shows a red ✕ indicator. Clicking an entry permanently removes that layer and all its elements from the project. Click <strong>Remove</strong> again to exit the mode.</li>
<li><strong>Rename</strong> – Activates <em>Rename Mode</em>. While active, clicking on any layer name opens an inline text field to change the display name. Confirm with Enter or by clicking away. Click <strong>Rename</strong> again to exit the mode.</li>
</ul>

<p>The legend updates in real-time.</p>

<h3>Statistics Button</h3>

<p>Located directly below the legend, the <strong>Statistics</strong> button opens a comprehensive analytics window showing:</p>

<h4>Element Counts</h4>
<ul>
<li>Number of pipelines, nodes, and facilities broken down by infrastructure type</li>
<li>Breakdown by infrastructure category</li>
</ul>

<h4>Pipeline Statistics</h4>
<ul>
<li><strong>Total Length</strong> - Sum of all pipeline lengths in the project</li>
<li><strong>Length by Type</strong> - Breakdown by pipeline category</li>
<li><strong>Attribute Coverage</strong> - Percentage of elements with key attributes such as diameter availability, maximum pressure availability, and other custom attributes</li>
</ul>

<h4>Visual Charts</h4>
<ul>
<li>Bar charts for element distribution</li>
<li>Pie charts for attribute completeness</li>
<li>Length distribution histograms</li>
</ul>

<p>The statistics update automatically when changes are made to the underlying dataset, such as adding new elements or modifying pipeline lengths.</p>

<h2>Bottom-Right: Contributor Box and Attribution</h2>

<p><strong>Contributor Input Box</strong> - Text field where users can enter their name to track who made which changes. Each modification is tagged with the entered contributor name, enabling proper attribution and change tracking.</p>

<p><strong>OSM Attribution</strong> - OpenStreetMap copyright notice, which is always visible as required by the OpenStreetMap license.</p>

<h2>Tools Popup</h2>

<p>Clicking the Tools button opens a comprehensive toolbox with 15+ specialized tools organized in a grid. The tools are categorized as follows:</p>

<h3>Basic Tools</h3>
<ul>
<li><strong>Info Mode</strong> - View and edit element attributes in a popup dialog</li>
<li><strong>Edit Geometry</strong> - Move nodes or reshape pipeline routes by dragging vertices</li>
</ul>

<h3>Creation Tools</h3>
<ul>
<li><strong>Add Pipeline</strong> - Draw new pipeline segments by placing vertices</li>
<li><strong>Add Infrastructure</strong> - Place new facilities such as LNG terminals, storage units, or power plants</li>
<li><strong>Add New Element</strong> - Create entirely new layer types with custom attributes</li>
</ul>

<h3>Modification Tools</h3>
<ul>
<li><strong>Change Direction</strong> - Reverse pipeline flow direction by swapping start and end nodes</li>
<li><strong>Short-Pipe</strong> - Mark short connecting pipes with special attributes (9999mm diameter, 0m length)</li>
<li><strong>Delete</strong> - Remove selected elements from the dataset</li>
<li><strong>Divide Pipeline</strong> - Split a single pipeline into multiple segments</li>
</ul>

<h3>Advanced Tools</h3>
<ul>
<li><strong>Group Pipelines</strong> - Virtually group different segments of a single physical pipeline for coordinated management</li>
<li><strong>Switch to Sublayer</strong> - Move elements from a parent layer to a sublayer (e.g., for hydrogen repurposing scenarios)</li>
<li><strong>Split Node</strong> - Separate overlapping connections by creating multiple sub-nodes at the same location</li>
<li><strong>Reconnect Infrastructure</strong> - Change which network node an infrastructure element is connected to</li>
<li><strong>Distribute Compressors</strong> - Split aggregated compressor stations into multiple substations with averaged power values</li>
</ul>

<h3>Integration Tools</h3>
<ul>
<li><strong>Add Infrastructure Plans</strong> - Import infrastructure plan images, georeference them using control points, and use them as a semi-transparent background for tracing</li>
<li><strong>Integrate Dataset</strong> - Import a full QGas project or a single GeoJSON layer into the active project (with interactive layer mapping and attribute merging), or interactively pair pipeline segments between two datasets for attribute transfer</li>
</ul>

<p>Each tool provides specific prompts and visual feedback to guide users through the editing process. Detailed descriptions of all tools are available in the Toolkit / Tools section.</p>


<h2>Keyboard Shortcuts</h2>

<ul>
<li><strong>ESC</strong> - Exit current mode (screenshot mode, tool mode, etc.)</li>
<li><strong>Ctrl + Mouse Wheel</strong> - Zoom the map</li>
<li><strong>Ctrl + F5</strong> - Hard refresh to clear browser cache</li>
</ul>

