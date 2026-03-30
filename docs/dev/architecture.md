<div class="breadcrumb">QGas / Developer / Architecture</div>
<h1>Architecture Notes</h1>

<h2>Runtime Components</h2>

<ol>
<li><strong>Python GUI (Server_Control.py)</strong> - Project selection, start/stop, server</li>
<li><strong>Web App (Map.html + js/)</strong> - Leaflet UI, tools, export, statistics, ...</li>
<li><strong>Data Storage</strong> - GeoJSON files in project folder, synchronization via server</li>
</ol>

<h2>Code Navigation</h2>

<ul>
<li>Web app entry: <code>Map.html</code> -&gt; <code>js/core.js</code></li>
<li>UI: <code>js/ui/</code></li>
<li>Tools: <code>js/ui/tools/</code></li>
</ul>
<hr>
