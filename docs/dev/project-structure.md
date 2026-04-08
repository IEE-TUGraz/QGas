<div class="breadcrumb">QGas / Developer / Project Structure</div>
<h1>Project Structure</h1>

<h2>Overview</h2>

<div class="codehilite">
<pre><span></span><code>QGas/
├── Conda-Activation-Scripts/
├── docs/
│   ├── api/
│   ├── assets/
│   ├── dev/
│   └── user/
│   ├── docs_md_theme/
├── Images/
│   ├── Loading_Screen.png
│   ├── Logo_IEE.png
│   ├── QGas_Logo.png
│   └── TU_Graz.png
├── Input/
│   ├── SciGrid_IGGIELGNC_1/
│   └── Additional Datasets/
├── js/
│   ├── core.js
│   ├── shared/
│   │   └── node_layers.js
│   └── ui/
│       ├── export.js
│       ├── filter.js
│       ├── group.js
│       ├── legend.js
│       ├── options.js
│       ├── screenshot.js
│       ├── statistics.js
│       ├── tools.js
│       └── tools/
│           ├── add_infrastructure.js
│           ├── add_new_element.js
│           ├── add_pipeline.js
│           ├── add_plan.js
│           ├── change_direction.js
│           ├── delete.js
│           ├── distribute_compressors.js
│           ├── divide_pipeline.js
│           ├── edit_geometry.js
│           ├── group_pipelines.js
│           ├── info_mode.js
│           ├── integrate_dataset.js
│           ├── reconnect_infrastructure.js
│           ├── short_pipe.js
│           ├── split_node.js
│           ├── switch_sublayer.js
│           └── topology_check.js
├── Plans/
│   └── Image Infrastructure Plans
├── environment.yml
├── Server.py
├── GUI.html
└── readme.md
</code></pre>
</div>

<h2>Key Entry Points</h2>

<ul>
<li><strong><code>Server.py</code></strong>: Desktop GUI + HTTP server</li>
<li><strong><code>GUI.html</code></strong>: Entry point for the web interface</li>
<li><strong><code>js/core.js</code></strong>: Core front-end logic</li>
<li><strong><code>docs/</code></strong>: Documentation source (MkDocs)</li>
</ul>

<h2>Example Project Structure</h2>

<p>Each project lives under <strong><code>Input/&lt;ProjectName&gt;/</code></strong>:</p>

<div class="codehilite">
<pre><span></span><code>Input/&lt;ProjectName&gt;/
├── license.txt
├── config.xlsx
├── pipelines.geojson
├── nodes.geojson
├── Additional_Layers.geojson
└── Infrastructure_Plans/   # optional
</code></pre>
</div>

<h3>Layer Files</h3>

<ul>
<li><code>pipelines.geojson</code> - Main pipeline network (LineString). Edit geometry and attributes via the tools.</li>
<li><code>nodes.geojson</code> - Network nodes and junctions (Point). Edit positions and attributes as needed.</li>
<li><code>Additional_Layers.geojson</code> - Container for extra layers beyond pipelines and nodes. Use this for project-specific point or line layers.</li>
</ul>

<h3>Project Metadata</h3>

<ul>
<li><code>license.txt</code> - Data sources, licensing, and notes. This is plain text and can be edited freely.</li>
<li><code>config.xlsx</code> - Layer configuration used by the UI (layer names, colors, type, and styling). You can edit the legend names, colors, marker type, size, and which files are loaded.</li>
</ul>
