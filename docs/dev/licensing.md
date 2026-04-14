<div class="breadcrumb">QGas / Developer / Licensing</div>
<h1>Licensing</h1>

<p>This document provides comprehensive information about the licensing of QGas and its dependencies.</p>

<h2>QGas License</h2>

<p>QGas is released under the <strong>MIT License</strong>.</p>

<h3>MIT License</h3>

<div class="codehilite">
<pre><span></span><code>MIT License

Copyright (c) 2025 Marco Quantschnig, Yannick Werner, Thomas Klatzer
Institute of Electricity Economics and Energy Innovation (IEE)
Graz University of Technology, Austria

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
</code></pre>
</div>

<h3>What This Means</h3>

<p>The MIT License is a permissive open-source license that allows you to:</p>

<ul>
<li>Use QGas for commercial purposes</li>
<li>Modify the source code</li>
<li>Distribute original or modified versions</li>
<li>Use QGas in proprietary software</li>
<li>Sublicense the software</li>
</ul>

<p>With the following conditions:</p>

<ul>
<li>Include the original copyright and license notice</li>
<li>No warranty is provided</li>
</ul>

<h2>Dependency Licenses</h2>

<p>QGas uses several third-party libraries, each with their own licenses. All are compatible with commercial and academic use.</p>

<h3>Python Dependencies</h3>

<table>
<thead>
<tr>
<th>Package</th>
<th>License</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Python</strong></td>
<td>PSF License</td>
<td>Python Software Foundation License (permissive)</td>
</tr>
<tr>
<td><strong>Pillow</strong></td>
<td>HPND License</td>
<td>Historical Permission Notice and Disclaimer (permissive)</td>
</tr>
</tbody>
</table>

<h3>JavaScript Dependencies</h3>

<table>
<thead>
<tr>
<th>Library</th>
<th>License</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Leaflet.js</strong></td>
<td>BSD 2-Clause</td>
<td>Very permissive, allows commercial use</td>
</tr>
<tr>
<td><strong>Leaflet Draw</strong></td>
<td>MIT</td>
<td>Same as QGas license</td>
</tr>
<tr>
<td><strong>Leaflet PolylineDecorator</strong></td>
<td>MIT</td>
<td>Same as QGas license</td>
</tr>
<tr>
<td><strong>JSZip</strong></td>
<td>MIT or GPLv3</td>
<td>Dual licensed, we use under MIT</td>
</tr>
<tr>
<td><strong>SheetJS (xlsx)</strong></td>
<td>Apache 2.0</td>
<td>Permissive, allows commercial use</td>
</tr>
<tr>
<td><strong>Chart.js</strong></td>
<td>MIT</td>
<td>Same as QGas license</td>
</tr>
</tbody>
</table>

<h3>Map Tiles</h3>

<table>
<thead>
<tr>
<th>Source</th>
<th>License</th>
<th>Attribution Required</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>OpenStreetMap</strong></td>
<td>ODbL 1.0</td>
<td>Yes - "(c) OpenStreetMap Contributors"</td>
</tr>
</tbody>
</table>

<p>OpenStreetMap data is licensed under the Open Database License (ODbL). You must:</p>
<ul>
<li>Provide attribution to OpenStreetMap contributors</li>
<li>Share any modifications to OSM data under the same license</li>
<li>Note: This applies to OSM data, not to your QGas usage</li>
</ul>

<p>QGas automatically includes the required attribution text in the map interface.</p>

<h2>Sample Data License</h2>

<p>The included sample dataset (SciGRID_gas IGGIELGNC-1) has its own license:</p>

<h3>SciGRID_gas Dataset</h3>

<ul>
<li><strong>Authors:</strong> Diettrich, J., Pluta, A., Medjroubi, W., Dasenbrock, J., Sandoval, J. E.</li>
<li><strong>License:</strong> CC BY 4.0 (Creative Commons Attribution)</li>
<li><strong>Source:</strong> <a href="https://doi.org/10.5281/zenodo.5509988">Zenodo</a></li>
<li><strong>Citation Required:</strong> Yes</li>
</ul>

<p>When using this dataset, cite as:</p>

<div class="codehilite">
<pre><span></span><code>@misc{SciGRID_gas_IGGIELGNC1,
  author = {Diettrich, J. and Pluta, A. and Medjroubi, W. and 
            Dasenbrock, J. and Sandoval, J. E.},
  title = {SciGRID_gas IGGIELGNC-1 (0.2) [Data set]},
  year = {2021},
  publisher = {Zenodo},
  doi = {10.5281/zenodo.5509988},
  url = {https://doi.org/10.5281/zenodo.5509988}
}
</code></pre>
</div>

<h2>Citation</h2>

<p>If you use QGas in academic or commercial work, please cite it:</p>

<h3>BibTeX Format</h3>

<div class="codehilite">
<pre><span></span><code>@misc{QGAS,
   author = {Marco Quantschnig and Yannick Werner and Thomas Klatzer and Sonja Wogrin},
   title = {{QGas: Interactive Gas Infrastructure Toolkit}},
   howpublished = {\url{https://github.com/IEE-TUGraz/QGas}},
   year = {2025},
   note = {Developed at the Institute of Electricity Economics 
           and Energy Innovation (IEE), Graz University of 
           Technology, Austria}
}
</code></pre>
</div>

<h3>Text Format</h3>

<p>M. Quantschnig, Y. Werner, T. Klatzer, and S. Wogrin (2025). <em>QGas: Interactive Gas Infrastructure Toolkit</em>. Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology. https://github.com/IEE-TUGraz/QGas</p>

<h2>Contributing</h2>

<h3>Contributor License Agreement (CLA)</h3>

<p>By contributing to QGas, you agree that:</p>
<ol>
<li>Your contributions will be licensed under the MIT License</li>
<li>You have the right to contribute the code</li>
<li>You understand your contributions will be publicly available</li>
</ol>

<h3>Contributor Recognition</h3>

<p>All contributors are recognized in:</p>
<ul>
<li>README.md contributor table</li>
<li>Git commit history</li>
<li>Release notes for significant contributions</li>
</ul>

<h2>License Compatibility</h2>

<p>QGas's MIT license is compatible with:</p>

<ul>
<li>Commercial projects</li>
<li>Academic research</li>
<li>Government projects</li>
<li>Proprietary software</li>
<li>GPL projects (MIT to GPL allowed)</li>
<li>Apache projects</li>
<li>BSD projects</li>
</ul>

<h2>Trademark</h2>

<p>The QGas name and logo are trademarks of the Institute of Electricity Economics and Energy Innovation (IEE), Graz University of Technology.</p>

<p>You may:</p>
<ul>
<li>Use the name "QGas" to refer to this software</li>
<li>State that your work is "based on QGas" or "uses QGas"</li>
</ul>

<p>You may not:</p>
<ul>
<li>Imply official endorsement without permission</li>
<li>Use the logo in a way that suggests official affiliation</li>
<li>Register similar trademarks</li>
</ul>

<h2>Disclaimer</h2>

<p>The software and included sample data are provided "as is" without warranty of any kind. The authors and TU Graz are not liable for any claims or damages arising from the use of this software.</p>

<p>For infrastructure planning or operational decisions, always verify data accuracy and consult with domain experts.</p>

<h2>Questions</h2>

<p>For licensing questions or permission requests, contact:</p>

<ul>
<li><strong>Email:</strong> Contact information available on <a href="https://github.com/IEE-TUGraz/QGas">GitHub repository</a></li>
<li><strong>Institution:</strong> Institute of Electricity Economics and Energy Innovation (IEE)<br>
Graz University of Technology<br>
Inffeldgasse 18<br>
8010 Graz, Austria</li>
</ul>

<hr>
