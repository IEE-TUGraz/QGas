<div class="breadcrumb">QGas / Developer / Development Setup</div>
<h1>Development Setup</h1>
git branch

<p>This section explains how to add or update modules for QGas.</p>

<h2>Add Python Modules</h2>

<ol>
<li>Add the package to <code>environment.yml</code> under <code>dependencies</code> or the <code>pip:</code> section.</li>
<li>Update your environment:
  <ul>
    <li><code>conda env update -f environment.yml</code></li>
    <li>Activate with <code>conda activate QGas</code></li>
  </ul>
</li>
<li>Verify the install by importing the module in Python.</li>
</ol>

<h2>Add JavaScript Modules</h2>

<ol>
<li>Place the new module in <code>js/</code> (or a subfolder like <code>js/ui/</code>).</li>
<li>Import or reference it from the relevant entry file (usually <code>js/core.js</code> or a UI module).</li>
<li>Reload the browser (Ctrl+F5) to see changes.</li>
</ol>

<h2>Add Other Assets</h2>

<ul>
<li>Images: place in <code>Images/</code> (GUI) or <code>docs/assets/</code> (docs)</li>
<li>Data: add to a project folder under <code>Input/</code></li>
</ul>

<p>Set breakpoints in <code>Server_Control.py</code>, then press F5 to start debugging.</p>

<h3>JavaScript Debugging</h3>

<p>Use browser developer tools:</p>

<ol>
<li>Open browser DevTools (F12)</li>
<li>Go to Sources tab</li>
<li>Find files under <code>localhost:8000/js/</code></li>
<li>Set breakpoints by clicking line numbers</li>
<li>Use Console tab for <code>console.log()</code> output</li>
</ol>

<h3>Common Debugging Scenarios</h3>

<h4>Server Won't Start</h4>
<ul>
<li>Check if port 8000 or 8001 is already in use</li>
<li>Verify Conda environment is activated</li>
<li>Check console for Python errors</li>
</ul>

<h4>Map Doesn't Load</h4>
<ul>
<li>Ensure server is running (green LED in GUI)</li>
<li>Check browser console for JavaScript errors</li>
<li>Verify WebSocket connection (check Network tab)</li>
<li>Try hard refresh (Ctrl+F5)</li>
</ul>

<h4>Tool Not Working</h4>
<ul>
<li>Check browser console for JavaScript errors</li>
<li>Verify tool module is loaded in Map.html</li>
<li>Check if tool is properly registered in <code>tools.js</code></li>
</ul>

<h2>Making Changes</h2>

<h3>Adding a New Tool</h3>

<ol>
<li>Create new file: <code>js/ui/tools/my_tool.js</code></li>
<li>Implement tool with activation/deactivation functions</li>
<li>Add script tag in <code>Map.html</code></li>
<li>Register in <code>js/ui/tools.js</code> tool list</li>
<li>Add button in tools popup grid</li>
</ol>
