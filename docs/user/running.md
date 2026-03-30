<div class="breadcrumb">QGas / User Guide / Running QGas</div>
<h1>Running QGas</h1>

<p>This section describes how to run the QGas toolkit in Python.</p>

<h2>System Requirements</h2>

<ul>
<li>Python 3.11 or higher</li>
<li>Modern web browser (Microsoft Edge is recommended)</li>
<li>Internet connection for background map tiles</li>
<li>Local port 8000 must be available</li>
</ul>

<h2>Launch GUI Application in Python</h2>

<p>In the first step, an environment with all required dependencies has to be created. All dependencies of this project are listed in the environment.yml file. This can be done by simply executing the activate_environment_windows.bat in the Conda-Activation-Scripts folder, which is located within the QGas project folder. If the environment is already created, make sure that the QGas environment is set as the active python environment.</p>

<p>The local server connection for data transfer from the map to the local storage is managed via a python-based graphical user interface (GUI). Running Server_Control.py in a Python interpreter like Visual Studio Code or PyCharm starts the GUI. Make sure to use the previously created environment to support all dependencies of the project.</p>

<h2>Initialize Server Infrastructure</h2>

<p>Click Start Server. This starts the HTTP server on port 8000 for static file serving. The server status is indicated by an LED in the GUI.</p>

<h2>Access Interactive Map</h2>

<p>Click Open Map and select a project from the list. You can load an existing project or create a new empty project directly from the dialog. This opens a browser window hosting http://localhost:8000/Map.html which loads the different GeoJSON data layers of the project with full Leaflet.js functionalities. Create a new contributor or select an existing one to access the interactive map. This is necessary to keep track of project changes in case multiple contributors are working on a project.</p>

