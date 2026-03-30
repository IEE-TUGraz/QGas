<div class="breadcrumb">QGas / User Guide / Quickstart</div>
<h1>Quickstart</h1>

<p>Goal: Start QGas locally and open the interactive map.</p>

<h2>Prerequisites</h2>

<ul>
<li><strong>Python 3.11+</strong></li>
<li>Modern browser (the manual recommends <strong>Microsoft Edge</strong>)</li>
<li>Local port <strong>8000</strong> must be available</li>
</ul>

<h2>1) Install Environment</h2>

<p>The project includes a Conda definition: <strong><code>environment.yml</code></strong>.</p>

<h3>Option A: Manual Setup</h3>

<div class="codehilite">
<pre><span></span><code>conda env create -f environment.yml
conda activate QGas
</code></pre>
</div>

<h3>Option B: Automated Setup (Recommended for Non-Programmers)</h3>

<p>For users who prefer a simplified setup, use the <strong>Conda-Activation-Scripts</strong>. This repository provides easy-to-use scripts that automatically create and activate the environment:</p>

<ul>
<li><strong>Repository:</strong> <a href="https://github.com/IEE-TUGraz/Conda-Activation-Scripts" target="_blank">https://github.com/IEE-TUGraz/Conda-Activation-Scripts</a></li>
<li>The scripts handle environment creation and activation with a single click</li>
<li>Ideal for users unfamiliar with command-line tools</li>
</ul>

<p>See the <code>Conda-Activation-Scripts/</code> folder in the project root for included scripts.</p>

<h2>2) Start QGas GUI</h2>

<div class="codehilite">
<pre><span></span><code>python Server_Control.py
</code></pre>
</div>

<h2>3) Select Project, Start Server</h2>

<ul>
<li>In the GUI, select a project from the <strong><code>Input/</code></strong> folder</li>
<li>Start the server (GUI controls web server and WebSocket)</li>
</ul>

<h2>4) Open Interactive Map</h2>

<ul>
<li><code>http://localhost:8000/Map.html</code></li>
</ul>

<p>If a contributor dialog appears: create a new contributor or select an existing one.</p>
