# -*- coding: utf-8 -*-
"""
QGas – Interactive Map Interface
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
- Map HTML entry point: GUI.html served over the local HTTP server.
"""

import sys
import tkinter as tk
from tkinter import ttk, messagebox
import os
import threading
import http.server
import socketserver
import webbrowser
import json
import gzip
import shutil
import zipfile
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse, parse_qs, quote_plus

class CombinedGUI:
    def __init__(self, root):
        """
        Initialize the QGas application GUI.

        Configures the main window geometry, determines the application base path
        (supporting both script and PyInstaller frozen-exe execution), initializes
        the HTTP server state variables, and builds all UI widgets.

        Args:
            root (tk.Tk): The root Tkinter window instance created by ``main()``.
        """
        print("Initializing QGas Map Interface...")
        self.root = root
        self.root.title("QGas - Interactive Gas Infrastructure Toolkit")
        
        # Set optimal window size for modern tile interface - further increased for full visibility
        window_width = 1200
        window_height = 750  # Reduced for compact layout with compressed tiles
        
        # Get screen dimensions for centering
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        
        # Calculate position for centering - ensure window fits on screen
        x = (screen_width - window_width) // 2
        y = max(20, (screen_height - window_height) // 2)  # Ensure minimum 20px from top
        
        # Make sure window doesn't go off screen
        if y + window_height > screen_height - 40:  # Leave 40px at bottom
            y = screen_height - window_height - 40
        
        # Set window size and position
        self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        
        # Set minimum window size to ensure content remains readable - reduced for compact layout
        self.root.minsize(1000, 650)
        
        # Configure window state
        self.root.state('normal')  # Start in normal state, not maximized
        
        print(f"Window configured: {window_width}x{window_height}, centered at ({x}, {y})")
        print("Window properties set")
        
        # === APPLICATION SETUP ===
        # Determine if running as exe or script - this affects path resolution
        if getattr(sys, 'frozen', False):
            # Running as compiled exe - use executable directory
            self.app_dir = os.path.dirname(sys.executable)
        else:
            # Running as Python script - use script directory
            self.app_dir = os.path.dirname(os.path.abspath(__file__))
        
        # === MAP SERVER VARIABLES ===
        # Configuration for the local HTTP server that serves the interactive map
        self.PORT = 8000  # Port number for the local web server
        self.filename = "GUI.html"  # HTML file containing the interactive map
        self.url = f"http://localhost:{self.PORT}/{self.filename}"  # Complete URL for map access
        self.script_dir = self.app_dir  # Directory containing map files
        self.server_thread = None  # Thread object for running HTTP server in background
        self.httpd = None  # HTTP server instance
        
        # === OPTIMIZATION FEATURES ===
        self.executor = ThreadPoolExecutor(max_workers=4)  # Thread pool for parallel processing
        self.data_cache = {}  # In-memory cache for GeoJSON data
        self.selected_project = "Standard"  # Currently selected project folder
        print("Map server variables initialized")
        
        # Ensure all required directories exist before proceeding
        self.ensure_directories()
        
        print("Creating widgets...")
        self.create_widgets()

    def ensure_directories(self):
        """
        Create any missing required directories for the application.
        Since we now use Input project folders, Output directories are no longer needed.
        """
        # No directories need to be created - Input folders already exist
        pass
        
    def create_widgets(self):
        """
        Create the main GUI layout with the QGas Interactive Map interface.
        Modern design with logo and tile-based layout optimized for larger window.
        """
        print("Creating modern QGas Interactive Map interface...")
        
        # Configure root window styling
        self.root.configure(bg='#f8f9fa')
        
        # === MAIN CONTAINER ===
        main_container = tk.Frame(self.root, bg='#f8f9fa')
        main_container.pack(fill=tk.BOTH, expand=True, padx=40, pady=30)
        
        # === HEADER SECTION ===
        self.create_header(main_container)
        
        # === MAIN CONTENT AREA ===
        content_frame = tk.Frame(main_container, bg='#f8f9fa')
        content_frame.pack(fill=tk.BOTH, expand=True, pady=(25, 0))
        
        # === CONTROL TILES ===
        self.create_control_tiles(content_frame)
        
        # Status bar removed - status now only in header
        
        print("Modern widget creation completed successfully")
    
    def create_header(self, parent):
        """
        Create the header section with logo, application title, and LED server-status indicator.

        Attempts to load ``Images/QGas_Logo.png`` (requires Pillow); falls back to a
        text emoji placeholder if the image is unavailable. The LED indicator in the
        top-right corner is updated by ``update_status()`` whenever the server state
        changes.

        Args:
            parent (tk.Frame): Parent container frame that the header is packed into.
        """
        header_frame = tk.Frame(parent, bg='#ffffff', relief='flat', bd=2)
        header_frame.pack(fill=tk.X, pady=(0, 20))
        
        # Add shadow effect
        shadow_frame = tk.Frame(parent, bg='#e9ecef', height=2)
        shadow_frame.pack(fill=tk.X, pady=(0, 5))
        
        # Header content
        header_content = tk.Frame(header_frame, bg='#ffffff')
        header_content.pack(fill=tk.X, padx=30, pady=20)
        
        # Logo section
        logo_frame = tk.Frame(header_content, bg='#ffffff')
        logo_frame.pack(side=tk.LEFT, padx=(0, 20))
        
        # Ensure Tkinter is ready for image creation
        self.root.update()
        
        try:
            # Load and display logo
            logo_path = os.path.join(self.app_dir, "Images", "QGas_Logo.png")
            if os.path.exists(logo_path):
                from PIL import Image, ImageTk
                logo_image = Image.open(logo_path)
                logo_image = logo_image.resize((80, 80), Image.Resampling.LANCZOS)
                self.logo_photo = ImageTk.PhotoImage(logo_image)
                logo_label = tk.Label(logo_frame, image=self.logo_photo, bg='#ffffff')
                logo_label.pack()
                # Also set window/taskbar icon
                try:
                    icon_image = Image.open(logo_path).resize((32, 32), Image.Resampling.LANCZOS)
                    self.icon_photo = ImageTk.PhotoImage(icon_image)
                    self.root.iconphoto(True, self.icon_photo)
                except Exception:
                    pass
            else:
                print(f"Logo not found at: {logo_path}")
                # Fallback logo placeholder
                logo_label = tk.Label(logo_frame, text="🏭", font=("Arial", 48), bg='#ffffff', fg='#007bff')
                logo_label.pack()
        except Exception as e:
            # If any error occurs (PIL not available, image loading fails, etc.), use text placeholder
            print(f"Logo load error: {e}")
            logo_label = tk.Label(logo_frame, text="🏭", font=("Arial", 48), bg='#ffffff', fg='#007bff')
            logo_label.pack()
        
        # Title section
        title_frame = tk.Frame(header_content, bg='#ffffff')
        title_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        title_label = tk.Label(title_frame, text="QGas - Interactive Gas Infrastructure Toolkit", 
                              font=("Segoe UI", 24, "bold"), 
                              bg='#ffffff', fg='#2c3e50')
        title_label.pack(anchor=tk.W)
        
        # LED Status section (right side)
        status_frame = tk.Frame(header_content, bg='#ffffff')
        status_frame.pack(side=tk.RIGHT, padx=(20, 0))
        
        # LED Status label
        led_label = tk.Label(status_frame, text="Server Status", 
                            font=("Segoe UI", 10, "bold"), 
                            bg='#ffffff', fg='#495057')
        led_label.pack()
        
        # LED indicator frame
        led_indicator_frame = tk.Frame(status_frame, bg='#ffffff')
        led_indicator_frame.pack(pady=(5, 0))
        
        # LED circle (using Canvas for better control)
        self.led_canvas = tk.Canvas(led_indicator_frame, width=20, height=20, bg='#ffffff', highlightthickness=0)
        self.led_canvas.pack(side=tk.LEFT, padx=(0, 8))
        
        # Initial LED state (stopped/red)
        self.led_circle = self.led_canvas.create_oval(2, 2, 18, 18, fill='#dc3545', outline='#a71e2a', width=2)
        
        # Status text next to LED
        self.led_status_text = tk.Label(led_indicator_frame, text="Stopped", 
                                       font=("Segoe UI", 11, "bold"), 
                                       bg='#ffffff', fg='#dc3545')
        self.led_status_text.pack(side=tk.LEFT)
        
        # Version info under the LED
        version_frame = tk.Frame(status_frame, bg='#ffffff')
        version_frame.pack(pady=(8, 0))
        
        version_label = tk.Label(version_frame, text="QGas v1.0", 
                                font=("Segoe UI", 9), 
                                bg='#ffffff', fg='#6c757d')
        version_label.pack()
    
    def create_control_tiles(self, parent):
        """
        Create the tile-based control interface with Start, Open Map, and Stop action tiles.

        Arranges three action tiles in a responsive 3-column grid (row 0) and an
        information tile spanning all columns below (row 1). Row weights are set so
        action tiles receive three times more vertical space than the info tile.

        Args:
            parent (tk.Frame): Parent container frame for the tile grid.
        """
        tiles_frame = tk.Frame(parent, bg='#f8f9fa')
        tiles_frame.pack(fill=tk.BOTH, expand=True)
        
        # Configure grid weights for responsive layout - give more space to action tiles
        tiles_frame.grid_columnconfigure(0, weight=1)
        tiles_frame.grid_columnconfigure(1, weight=1)
        tiles_frame.grid_columnconfigure(2, weight=1)
        tiles_frame.grid_rowconfigure(0, weight=3)  # Action tiles get 3x more space
        tiles_frame.grid_rowconfigure(1, weight=1)  # Info tile gets less space
        
        # Tile 1: Start Server
        self.create_action_tile(tiles_frame, 
                               title="Start Server",
                               description="Initialize the map server for pipeline visualization",
                               icon="🚀",
                               button_text="Start Server",
                               command=self.start_server,
                               color="#28a745",
                               row=0, column=0)
        
        # Tile 2: Open Map
        self.create_action_tile(tiles_frame,
                               title="Open Map",
                               description="Launch the interactive pipeline map in your default web browser",
                               icon="🌐",
                               button_text="Open Map",
                               command=self.open_browser,
                               color="#007bff",
                               row=0, column=1)
        
        # Tile 3: Stop Server
        self.create_action_tile(tiles_frame,
                               title="Stop Server",
                               description="Shutdown the server and close all active connections safely",
                               icon="⏹️",
                               button_text="Stop Server",
                               command=self.stop_server,
                               color="#dc3545",
                               row=0, column=2)
        
        # Info Tile (spans all columns) - smaller
        self.create_info_tile(tiles_frame)
    
    def create_action_tile(self, parent, title, description, icon, button_text, command, color, row, column):
        """
        Create a single action tile widget and place it in the given grid cell.

        Each tile contains a large emoji icon, a heading, a short description and a
        colored action button. Hover effects darken the button color using
        ``darken_color()``.

        Args:
            parent (tk.Frame): Parent grid container.
            title (str): Heading text displayed inside the tile.
            description (str): Longer description text shown below the heading.
            icon (str): Unicode emoji used as the tile icon (e.g. ``"🚀"``).
            button_text (str): Label text of the action button.
            command (callable): Callback invoked when the button is clicked.
            color (str): Hex color code for the button background (e.g. ``"#28a745"``).
            row (int): Grid row index for tile placement.
            column (int): Grid column index for tile placement.
        """
        tile_frame = tk.Frame(parent, bg='#ffffff', relief='flat', bd=1, highlightbackground='#dee2e6', highlightthickness=1)
        tile_frame.grid(row=row, column=column, padx=12, pady=10, sticky='nsew', ipadx=20, ipady=12)
        
        # Configure parent grid weights for better responsiveness
        parent.grid_rowconfigure(row, weight=1)
        
        # Configure tile grid
        tile_frame.grid_rowconfigure(0, weight=1)
        tile_frame.grid_columnconfigure(0, weight=1)
        
        # Tile content with compressed vertical padding
        content_frame = tk.Frame(tile_frame, bg='#ffffff')
        content_frame.grid(row=0, column=0, sticky='nsew', padx=25, pady=15)
        
        # Icon - smaller with reduced spacing
        icon_label = tk.Label(content_frame, text=icon, font=("Arial", 32), bg='#ffffff')
        icon_label.pack(pady=(0, 8))
        
        # Title - reduced spacing
        title_label = tk.Label(content_frame, text=title, 
                              font=("Segoe UI", 16, "bold"), 
                              bg='#ffffff', fg='#2c3e50')
        title_label.pack(pady=(0, 6))
        
        # Description with minimal spacing
        short_descriptions = {
            "Initialize the map server for pipeline visualization": "Start HTTP server for interactive map",
            "Launch the interactive pipeline map in your default web browser": "Open the gas infrastructure map in your browser",
            "Shutdown the server and close all active connections safely": "Stop all servers and close connections"
        }
        
        short_desc = short_descriptions.get(description, description)
        
        desc_label = tk.Label(content_frame, text=short_desc, 
                             font=("Segoe UI", 11), 
                             bg='#ffffff', fg='#6c757d', 
                             wraplength=220, justify=tk.CENTER,
                             relief='flat')
        desc_label.pack(pady=(0, 12))
        
        # Action Button - compact spacing
        button = tk.Button(content_frame, text=button_text,
                          font=("Segoe UI", 12, "bold"),
                          bg=color, fg='white',
                          relief='flat', bd=0,
                          padx=25, pady=10,
                          cursor='hand2',
                          command=command)
        button.pack()
        
        # Hover effects
        def on_enter(e):
            button.config(bg=self.darken_color(color))
            
        def on_leave(e):
            button.config(bg=color)
            
        button.bind("<Enter>", on_enter)
        button.bind("<Leave>", on_leave)
    
    def create_info_tile(self, parent):
        """
        Create the compact information tile that spans all three columns.

        Displays static server metadata in a 3-column grid: map file name, HTTP port,
        server URL, working directory, and a feature summary.

        Args:
            parent (tk.Frame): Parent container whose grid row 1 receives the tile.
        """
        info_frame = tk.Frame(parent, bg='#ffffff', relief='flat', bd=1, highlightbackground='#dee2e6', highlightthickness=1)
        info_frame.grid(row=1, column=0, columnspan=3, padx=20, pady=(10, 15), sticky='ew', ipadx=15, ipady=8)
        
        # Info content - compressed spacing
        content_frame = tk.Frame(info_frame, bg='#ffffff')
        content_frame.pack(fill=tk.BOTH, expand=True, padx=25, pady=12)
        
        # Info icon and title - smaller
        header_frame = tk.Frame(content_frame, bg='#ffffff')
        header_frame.pack(fill=tk.X, pady=(0, 8))
        
        info_icon = tk.Label(header_frame, text="ℹ️", font=("Arial", 18), bg='#ffffff')
        info_icon.pack(side=tk.LEFT, padx=(0, 10))
        
        info_title = tk.Label(header_frame, text="Server Information", 
                             font=("Segoe UI", 13, "bold"), 
                             bg='#ffffff', fg='#2c3e50')
        info_title.pack(side=tk.LEFT, anchor=tk.W)
        
        # Info grid with minimal spacing
        info_grid = tk.Frame(content_frame, bg='#ffffff')
        info_grid.pack(fill=tk.X)
        
        # Configure grid columns - 3 columns for more compact layout
        info_grid.grid_columnconfigure(0, weight=1)
        info_grid.grid_columnconfigure(1, weight=1)
        info_grid.grid_columnconfigure(2, weight=1)
        
        # Info items - more compact
        info_items = [
            ("Map File:", self.filename),
            ("HTTP Port:", str(self.PORT)),
            ("Server URL:", self.url),
            ("Working Dir:", os.path.basename(self.script_dir)),
            ("Features:", "Pipelines, Nodes, Storage, LNG, Consumption")
        ]
        
        for i, (label, value) in enumerate(info_items):
            row = i // 3
            col = i % 3
            
            item_frame = tk.Frame(info_grid, bg='#ffffff')
            item_frame.grid(row=row, column=col, sticky='w', padx=(0, 20), pady=2)
            
            # Compact layout - stack label and value vertically with minimal spacing
            label_widget = tk.Label(item_frame, text=label, 
                                   font=("Segoe UI", 9, "bold"), 
                                   bg='#ffffff', fg='#495057',
                                   relief='flat')
            label_widget.pack(anchor=tk.W)
            
            # Truncate long values for compact display
            display_value = value
            if len(value) > 25:
                display_value = value[:22] + "..."
                
            value_widget = tk.Label(item_frame, text=display_value, 
                                   font=("Segoe UI", 9), 
                                   bg='#ffffff', fg='#6c757d',
                                   relief='flat')
            value_widget.pack(anchor=tk.W)
    
    # ================================================================================
    # UTILITY METHODS
    # ================================================================================
    
    def darken_color(self, color):
        """
        Utility function to darken colors for hover effects
        
        Args:
            color (str): Hex color code
            
        Returns:
            str: Darker version of the color
        """
        color_map = {
            "#28a745": "#218838",  # Green darker
            "#007bff": "#0056b3",  # Blue darker  
            "#dc3545": "#c82333",  # Red darker
        }
        return color_map.get(color, color)
    
    def update_status(self, status, is_running=False):
        """
        Update the header LED indicator to reflect server status
        
        Args:
            status (str): Status text (e.g., "Running", "Stopped")
            is_running (bool): True if server is running, False otherwise
        """
        if is_running:
            # Update LED to green (running) - only in header
            if hasattr(self, 'led_canvas') and hasattr(self, 'led_circle'):
                self.led_canvas.itemconfig(self.led_circle, fill='#28a745', outline='#1e7e34')
            if hasattr(self, 'led_status_text'):
                self.led_status_text.config(text="Running", fg='#28a745')
        else:
            # Update LED to red (stopped) - only in header
            if hasattr(self, 'led_canvas') and hasattr(self, 'led_circle'):
                self.led_canvas.itemconfig(self.led_circle, fill='#dc3545', outline='#a71e2a')
            if hasattr(self, 'led_status_text'):
                self.led_status_text.config(text="Stopped", fg='#dc3545')
    
    # ================================================================================
    # MAP SERVER CORE FUNCTIONALITY
    # ================================================================================
    
    def create_map_tab(self, parent):
        """
        Legacy method for map tab creation
        Now handled by create_widgets for unified interface
        """
        # This method is now handled by create_widgets
        pass
    
    class ReusableTCPServer(socketserver.TCPServer):
        """
        Custom TCP server with address reuse enabled
        Prevents "Address already in use" errors on rapid restart
        """
        allow_reuse_address = True
    
    def start_server(self):
        """
        Start the HTTP server for map visualization
        
        Features:
        - Serves static files (HTML, JS, CSS)
        - Provides API endpoints for dynamic data
        - Handles GeoJSON with compression
        - Dynamic project path routing
        """
        if self.httpd is not None:
            messagebox.showinfo("Info", "Server is already running.")
            return
        
        try:
            os.chdir(self.script_dir)
            
            # Optimized handler with compression and API endpoints
            class OptimizedHandler(http.server.SimpleHTTPRequestHandler):
                """
                Custom HTTP request handler with optimization features
                
                Features:
                - API endpoints for data queries
                - GeoJSON compression for large files
                - Dynamic project path routing
                - Cache control headers
                - Layer statistics without geometry
                """
                def __init__(self, *args, gui_instance=None, **kwargs):
                    self.gui_instance = gui_instance
                    super().__init__(*args, **kwargs)
                
                def end_headers(self):
                    """
                    Add cache-control headers to prevent browser caching
                    Ensures users always see the latest data
                    """
                    # Add cache-control headers to prevent caching
                    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
                    self.send_header('Pragma', 'no-cache')
                    self.send_header('Expires', '0')
                    super().end_headers()
                
                def do_GET(self):
                    """
                    Handle GET requests with routing logic
                    
                    Routes:
                    - /api/* -> API endpoints
                    - *.geojson -> GeoJSON with compression
                    - Other -> Standard file serving
                    """
                    from urllib.parse import urlparse, parse_qs
                    parsed_path = urlparse(self.path)
                    path = parsed_path.path
                    
                    # API Endpoints für optimierte Datenabfrage
                    if path.startswith('/api/'):
                        self.handle_api_request(path, parsed_path.query)
                    # Komprimierte GeoJSON-Dateien
                    elif path.endswith('.geojson'):
                        self.handle_geojson_request(path)
                    # Standard Dateien
                    else:
                        super().do_GET()
                
                def handle_api_request(self, path, query):
                    """
                    Handle API requests for specific data queries
                    
                    Endpoints:
                    - /api/layers: List available layers
                    - /api/current_project: Get active project name
                    - /api/layer_stats: Get layer statistics without geometry
                    - /api/list_projects: List all project folders in Input/
                    - /api/project_files: List .geojson files for a given project
                    
                    Args:
                        path (str): API endpoint path
                        query (str): Query string parameters
                    """
                    try:
                        import json
                        from urllib.parse import parse_qs
                        
                        params = parse_qs(query)
                        
                        if path == '/api/layers':
                            # Gibt verfügbare Layer zurück
                            layers = ['pipelines', 'nodes', 'compressors', 'storages', 'powerplants', 'lng']
                            self.send_json_response({'layers': layers})
                            
                        elif path == '/api/current_project':
                            project_name = getattr(self.gui_instance, 'selected_project', 'Standard') or 'Standard'
                            self.send_json_response({'project': project_name})

                        elif path == '/api/layer_stats':
                            # Gibt Layer-Statistiken zurück (ohne Geometrie für Performance)
                            layer_name = params.get('name', [''])[0]
                            stats = self.get_layer_statistics(layer_name)
                            self.send_json_response(stats)

                        elif path == '/api/list_projects':
                            # Lists all project subdirectories inside Input/
                            input_dir = os.path.join(self.gui_instance.app_dir, 'Input')
                            projects = []
                            if os.path.isdir(input_dir):
                                for entry in sorted(os.listdir(input_dir)):
                                    full = os.path.join(input_dir, entry)
                                    if os.path.isdir(full):
                                        projects.append(entry)
                            self.send_json_response({'projects': projects})

                        elif path == '/api/project_files':
                            # Lists .geojson files inside Input/{project}/
                            project_name = params.get('project', [''])[0]
                            # Sanitize: only allow safe characters
                            safe_project = ''.join(c for c in project_name if c.isalnum() or c in ('_', '-', ' '))
                            project_dir = os.path.join(self.gui_instance.app_dir, 'Input', safe_project)
                            files = []
                            if os.path.isdir(project_dir):
                                for entry in sorted(os.listdir(project_dir)):
                                    if entry.lower().endswith('.geojson'):
                                        files.append(entry)
                            self.send_json_response({'project': safe_project, 'files': files})
                            
                    except Exception as e:
                        self.send_error(500, f"API Error: {str(e)}")
                
                def handle_geojson_request(self, path):
                    """
                    Handle GeoJSON requests with dynamic project path routing and compression
                    
                    Features:
                    - Routes Output/* requests to Input/{project}/*
                    - Compresses files larger than 1MB with gzip
                    - Proper content-type and encoding headers
                    
                    Args:
                        path (str): Requested file path
                    """
                    try:
                        import json
                        import gzip
                        from urllib.parse import unquote
                        
                        file_path = unquote(path).lstrip('/')
                        
                        # Dynamic project path routing - redirect Output/ requests to Input/{project}/
                        if file_path.startswith('Output/') and hasattr(self.gui_instance, 'selected_project'):
                            # Redirect Output/xyz.geojson to Input/{project}/xyz.geojson
                            geojson_filename = file_path.replace('Output/', '')
                            project_file_path = f"Input/{self.gui_instance.selected_project}/{geojson_filename}"
                            
                            if os.path.exists(project_file_path):
                                file_path = project_file_path
                                print(f"Redirected {path} -> {project_file_path}")
                        
                        resolved_path = file_path
                        if not os.path.isabs(resolved_path):
                            resolved_path = os.path.join(self.gui_instance.app_dir, resolved_path)

                        if os.path.exists(resolved_path):
                            with open(resolved_path, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                            
                            # Komprimiere große GeoJSON-Dateien
                            json_data = json.dumps(data, ensure_ascii=False)
                            
                            # Komprimiere wenn Datei > 1MB
                            if len(json_data.encode('utf-8')) > 1024 * 1024:
                                compressed_data = gzip.compress(json_data.encode('utf-8'))
                                
                                self.send_response(200)
                                self.send_header('Content-Type', 'application/json; charset=utf-8')
                                self.send_header('Content-Encoding', 'gzip')
                                self.send_header('Content-Length', str(len(compressed_data)))
                                self.end_headers()
                                self.wfile.write(compressed_data)
                            else:
                                self.send_json_response(data)
                        else:
                            self.send_error(404, "File not found")
                            
                    except Exception as e:
                        self.send_error(500, f"GeoJSON Error: {str(e)}")
                
                def send_json_response(self, data):
                    """
                    Serialize *data* as UTF-8 JSON and write a complete HTTP 200 response.

                    Sets ``Content-Type: application/json; charset=utf-8`` and a matching
                    ``Content-Length`` header before writing the body.

                    Args:
                        data (dict | list): Python object to serialize with ``json.dumps``.
                    """
                    import json
                    json_data = json.dumps(data, ensure_ascii=False)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
                    self.end_headers()
                    self.wfile.write(json_data.encode('utf-8'))
                
                def get_layer_statistics(self, layer_name):
                    """
                    Return feature count and file metadata for a layer without loading geometry.

                    Looks up the layer's GeoJSON file via a fixed name mapping and reads only
                    the ``features`` array length plus OS-level file metadata, keeping the
                    response payload small.

                    Args:
                        layer_name (str): Logical layer key, one of ``'pipelines'``,
                            ``'nodes'``, ``'compressors'``, ``'storages'``,
                            ``'powerplants'``, ``'lng'``.

                    Returns:
                        dict: ``{'layer': str, 'count': int, 'file_size': int,
                        'last_modified': float}`` on success, or
                        ``{'error': str, 'count': 0}`` if the file is missing or unreadable.
                    """
                    try:
                        import json
                        
                        file_mapping = {
                            'pipelines': 'Output/PL_Pipelines.geojson',
                            'nodes': 'Output/N_Nodes.geojson',
                            'compressors': 'Output/C_Compressors.geojson',
                            'storages': 'Output/S_Storages.geojson',
                            'powerplants': 'Output/P_Powerplants.geojson',
                            'lng': 'Output/L_LNG.geojson'
                        }
                        
                        file_path = file_mapping.get(layer_name)
                        if not file_path or not os.path.exists(file_path):
                            return {'error': 'Layer not found', 'count': 0}
                        
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        features = data.get('features', [])
                        return {
                            'layer': layer_name,
                            'count': len(features),
                            'file_size': os.path.getsize(file_path),
                            'last_modified': os.path.getmtime(file_path)
                        }
                    except Exception as e:
                        return {'error': str(e), 'count': 0}
            
            # Create HTTP request handler with GUI instance reference
            Handler = lambda *args, **kwargs: OptimizedHandler(*args, gui_instance=self, **kwargs)
            
            # Start HTTP server in daemon thread
            self.httpd = self.ReusableTCPServer(("", self.PORT), Handler)
            self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
            self.server_thread.start()
            
            # Brief delay to ensure servers are fully initialized
            import time
            time.sleep(1)
            
            # Update UI status indicators
            self.update_status(f"Running - HTTP:{self.PORT}", is_running=True)
            messagebox.showinfo("Info", f"Server started - HTTP: {self.PORT}")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start servers: {str(e)}")
    
    def show_project_selection_after_start(self):
        """
        Scan the ``Input/`` folder and auto-select or prompt for a project after server start.

        If only one sub-folder exists it is selected automatically. If multiple folders
        exist the user is shown the project selection dialog. Falls back to
        ``"Standard"`` on any error.
        """
        try:
            # Get available projects
            input_dir = os.path.join(self.app_dir, "Input")
            projects = [d for d in os.listdir(input_dir) 
                       if os.path.isdir(os.path.join(input_dir, d))]
            
            if len(projects) > 1:
                # Show project selection dialog
                selected_project = self.show_project_selection_dialog(projects)
                if selected_project:
                    # Store selected project for server routing instead of modifying GUI.html
                    self.selected_project = selected_project
                    print(f"Project selected for new session: {selected_project}")
            elif len(projects) == 1:
                # Automatically use the only available project
                self.selected_project = projects[0]
                print(f"Auto-selected project: {projects[0]}")
            else:
                self.selected_project = "Standard"  # Fallback
                
        except Exception as e:
            print(f"Error in project selection after start: {e}")
            self.selected_project = "Standard"  # Fallback
    
    def get_cached_layer_data(self, layer_name, bbox=None):
        """
        Load layer data with caching and optional bounding box filtering
        
        Args:
            layer_name (str): Name of the layer to load
            bbox (str, optional): Bounding box string "minX,minY,maxX,maxY"
            
        Returns:
            dict: GeoJSON FeatureCollection
        """
        cache_key = f"{layer_name}_{bbox}" if bbox else layer_name
        
        # Prüfe Cache
        if cache_key in self.data_cache:
            return self.data_cache[cache_key]
        
        # Lade Daten
        file_mapping = {
            'pipelines': 'Output/PL_Pipelines.geojson',
            'nodes': 'Output/N_Nodes.geojson',
            'compressors': 'Output/C_Compressors.geojson',
            'storages': 'Output/S_Storages.geojson',
            'powerplants': 'Output/P_Powerplants.geojson',
            'lng': 'Output/L_LNG.geojson'
        }
        
        file_path = file_mapping.get(layer_name)
        if not file_path or not os.path.exists(file_path):
            return {'type': 'FeatureCollection', 'features': []}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Bounding Box Filterung (falls gewünscht)
            if bbox:
                data = self.filter_data_by_bbox(data, bbox)
            
            # Cache Ergebnis
            self.data_cache[cache_key] = data
            return data
            
        except Exception as e:
            print(f"Error loading {layer_name}: {e}")
            return {'type': 'FeatureCollection', 'features': []}
    
    def filter_data_by_bbox(self, geojson_data, bbox_str):
        """
        Filter GeoJSON data by bounding box for viewport optimization
        
        Args:
            geojson_data (dict): GeoJSON FeatureCollection
            bbox_str (str): Bounding box "minX,minY,maxX,maxY"
            
        Returns:
            dict: Filtered GeoJSON FeatureCollection
        """
        try:
            # Parse bbox: "minX,minY,maxX,maxY"
            minX, minY, maxX, maxY = map(float, bbox_str.split(','))
            
            filtered_features = []
            for feature in geojson_data.get('features', []):
                geometry = feature.get('geometry', {})
                coordinates = geometry.get('coordinates', [])
                
                # Einfache Punkt-Prüfung
                if geometry.get('type') == 'Point':
                    x, y = coordinates
                    if minX <= x <= maxX and minY <= y <= maxY:
                        filtered_features.append(feature)
                elif geometry.get('type') == 'LineString' and coordinates:
                    # Prüfe ersten Punkt der Linie
                    x, y = coordinates[0]
                    if minX <= x <= maxX and minY <= y <= maxY:
                        filtered_features.append(feature)
                else:
                    # Für andere Geometrien: Alles durchlassen
                    filtered_features.append(feature)
            
            return {
                'type': 'FeatureCollection',
                'features': filtered_features
            }
        except:
            # Bei Fehlern: Originaldata zurückgeben
            return geojson_data
    
    def update_layer_feature(self, layer_name, feature):
        """
        Update a feature in the layer data
        
        Note: Currently logs the update. Extend this method to persist
        changes to files or database as needed.
        
        Args:
            layer_name (str): Name of the layer
            feature (dict): Updated GeoJSON feature
            
        Returns:
            bool: True if update was successful
        """
        try:
            print(f"Updating feature in {layer_name}: {feature.get('id', 'unknown')}")
            
            # Hier würde die tatsächliche Update-Logik stehen
            # z.B. Schreiben in Export-Datei oder Datenbank
            
            # Cache für diesen Layer invalidieren
            keys_to_remove = [key for key in self.data_cache.keys() if key.startswith(layer_name)]
            for key in keys_to_remove:
                del self.data_cache[key]
            
            return True
        except Exception as e:
            print(f"Error updating feature: {e}")
            return False
    
    # ================================================================================
    # SERVER SHUTDOWN
    # ================================================================================
    
    def stop_server(self):
        """
        Stop all running servers and cleanup resources
        
        Actions:
        - Shutdown HTTP server
        - Clear data cache
        - Reset UI status
        - Reset selected project
        """
        # Stop HTTP Server
        if self.httpd is not None:
            self.httpd.shutdown()
            self.httpd.server_close()
            self.httpd = None
        
        # Clear cache
        self.data_cache.clear()
        
        # Update UI
        self.update_status("Stopped", is_running=False)
        
        # Reset selected project
        self.selected_project = "Standard"
        
        messagebox.showinfo("Info", "All servers stopped and cache cleared.")
    
    # ================================================================================
    # BROWSER AND PROJECT MANAGEMENT
    # ================================================================================
    
    def open_browser(self):
        """
        Open the interactive map in web browser with project selection
        
        Features:
        - Project selection dialog before opening
        - Automatic URL parameter injection with selected project
        - Preference for Microsoft Edge browser
        - Fallback to default browser if Edge unavailable
        """
        # Check for project selection first
        if not self.select_project():
            return  # User cancelled project selection
            
        final_url = self.url
        if self.selected_project:
            separator = '&' if '?' in final_url else '?'
            final_url = f"{final_url}{separator}project={quote_plus(self.selected_project)}"

        # Try to open in Edge, fall back to default browser
        edge_path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
        try:
            if os.path.exists(edge_path):
                import subprocess
                subprocess.Popen([edge_path, final_url])
                print("Opening map in Microsoft Edge...")
            else:
                webbrowser.open(final_url)
                print("Opening map in default browser...")
        except Exception as e:
            print(f"Error opening browser: {e}")
            webbrowser.open(final_url)
    
    def select_project(self):
        """
        Show project selection dialog if multiple projects exist
        
        Returns:
            bool: True if project selected or default used, False if cancelled
        """
        input_path = os.path.join(self.app_dir, "Input")
        
        if not os.path.exists(input_path):
            messagebox.showerror("Error", "Input folder not found!")
            return False
        
        # Get all subdirectories in Input folder
        try:
            subdirs = [d for d in os.listdir(input_path) 
                      if os.path.isdir(os.path.join(input_path, d))]
            
            if not subdirs:
                messagebox.showerror("Error", "No project folders found in Input directory!")
                return False
            
            # If only Standard folder exists, use it automatically
            if len(subdirs) == 1 and "Standard" in subdirs:
                self.selected_project = "Standard"
                print(f"Using default project: {self.selected_project}")
                self.update_map_paths("Standard")
                return True
            
            # Multiple projects - show selection dialog
            selected_project = self.show_project_selection_dialog(subdirs)
            if not selected_project:
                return False
            self.selected_project = selected_project
            return True
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not read Input directory: {e}")
            return False
    
    def show_project_selection_dialog(self, projects):
        """
        Display a modal project-selection dialog with a dropdown and project-creation support.

        Defaults to ``"Standard"`` in the dropdown if that folder exists.  The dialog
        also exposes a *Create New Project* button that calls
        ``prompt_new_project_dialog()`` before returning.

        Args:
            projects (list[str]): Sorted list of available project folder names.

        Returns:
            str | None: The selected or newly created project name, or ``None`` if the
            user cancelled the dialog.
        """
        import tkinter.ttk as ttk
        
        # Create modal dialog with even larger size for better button visibility
        dialog = tk.Toplevel(self.root)
        dialog.title("Select Project")
        dialog.geometry("520x440")
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Center dialog properly with screen bounds checking
        screen_width = dialog.winfo_screenwidth()
        screen_height = dialog.winfo_screenheight()
        dialog_width = 520
        dialog_height = 440
        
        # Calculate center position
        x = (screen_width - dialog_width) // 2
        y = (screen_height - dialog_height) // 2
        
        # Ensure dialog doesn't go off screen
        x = max(20, min(x, screen_width - dialog_width - 20))
        y = max(20, min(y, screen_height - dialog_height - 60))  # Extra space at bottom
        
        dialog.geometry(f"{dialog_width}x{dialog_height}+{x}+{y}")
        
        self.selected_project = None
        self.dialog_result = None
        
        # Dialog content with more padding
        main_frame = tk.Frame(dialog, bg='#ffffff', padx=40, pady=32)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title with more space
        title_label = tk.Label(main_frame, text="Select Project", 
                      font=("Segoe UI", 18, "bold"),
                      bg='#ffffff', fg='#2c3e50')
        title_label.pack(pady=(0, 12))
        
        # Description with better spacing
        desc_label = tk.Label(main_frame, 
                     text="Choose a project to load or create a new empty one.",
                     font=("Segoe UI", 12),
                     bg='#ffffff', fg='#6c757d',
                     justify=tk.CENTER)
        desc_label.pack(pady=(0, 24))
        
        # Project selection with more space
        selection_frame = tk.Frame(main_frame, bg='#ffffff')
        selection_frame.pack(fill=tk.X, pady=(0, 28))
        
        project_label = tk.Label(selection_frame, text="Available Projects:", 
                    font=("Segoe UI", 12, "bold"),
                    bg='#ffffff', fg='#495057')
        project_label.pack(anchor=tk.W, pady=(0, 8))
        
        project_var = tk.StringVar()
        project_combo = ttk.Combobox(selection_frame, textvariable=project_var, 
                        values=sorted(projects), state="readonly",
                        font=("Segoe UI", 12), width=40, height=10)
        project_combo.pack(fill=tk.X, pady=(0, 6))
        
        # Set default selection (Standard if available, otherwise first)
        if "Standard" in projects:
            project_combo.set("Standard")
        else:
            project_combo.set(projects[0])
        
        # Buttons with clear spacing and no overlap
        button_frame = tk.Frame(main_frame, bg='#ffffff')
        button_frame.pack(fill=tk.X, pady=(28, 10))
        button_frame.grid_columnconfigure(0, weight=1)
        button_frame.grid_columnconfigure(1, weight=1)
        button_frame.grid_columnconfigure(2, weight=1)
        
        def on_ok():
            self.selected_project = project_var.get()
            if self.selected_project:
                self.dialog_result = self.selected_project
                self.update_map_paths(self.selected_project)
                print(f"Selected project: {self.selected_project}")
            dialog.destroy()
        
        def on_cancel():
            self.dialog_result = None
            dialog.destroy()

        def on_create_new():
            new_project = self.prompt_new_project_dialog(dialog, projects)
            if new_project:
                if new_project not in projects:
                    projects.append(new_project)
                    projects.sort()
                    project_combo.config(values=projects)
                project_var.set(new_project)
        
        create_btn = tk.Button(button_frame, text="Create New Project",
                       font=("Segoe UI", 12, "bold"),
                       bg='#17a2b8', fg='white',
                               relief='flat', padx=18, pady=8,
                       command=on_create_new)
        create_btn.grid(row=0, column=0, sticky='ew', padx=(0, 8))

        ok_btn = tk.Button(button_frame, text="Load Project",
                  font=("Segoe UI", 12, "bold"),
                  bg='#007bff', fg='white',
                          relief='flat', padx=24, pady=8,
                  command=on_ok)
        ok_btn.grid(row=0, column=1, sticky='ew', padx=(4, 4))

        cancel_btn = tk.Button(button_frame, text="Cancel",
                      font=("Segoe UI", 12),
                      bg='#6c757d', fg='white',
                              relief='flat', padx=24, pady=8,
                      command=on_cancel)
        cancel_btn.grid(row=0, column=2, sticky='ew', padx=(8, 0))
        
        # Handle dialog close
        dialog.protocol("WM_DELETE_WINDOW", on_cancel)
        
        # Wait for dialog to close
        dialog.wait_window()
        
        return self.dialog_result

    def prompt_new_project_dialog(self, parent, projects):
        """
        Show a secondary modal dialog to collect a new project name and create it on disk.

        Validates the name with ``validate_project_name()`` and then calls
        ``create_project_from_template()`` to scaffold the folder structure.

        Args:
            parent (tk.Toplevel): Parent dialog window used as the transient owner.
            projects (list[str]): Existing project names used for duplicate detection.

        Returns:
            str | None: The validated new project name on success, or ``None`` if the
            user cancelled or validation failed.
        """
        dialog = tk.Toplevel(parent)
        dialog.title("Create New Project")
        dialog.geometry("460x300")
        dialog.resizable(False, False)
        dialog.transient(parent)
        dialog.grab_set()

        screen_width = dialog.winfo_screenwidth()
        screen_height = dialog.winfo_screenheight()
        dialog_width = 460
        dialog_height = 300
        x = (screen_width - dialog_width) // 2
        y = (screen_height - dialog_height) // 2
        dialog.geometry(f"{dialog_width}x{dialog_height}+{x}+{y}")

        main_frame = tk.Frame(dialog, bg='#ffffff', padx=32, pady=24)
        main_frame.pack(fill=tk.BOTH, expand=True)

        title_label = tk.Label(main_frame, text="New Project", 
                       font=("Segoe UI", 16, "bold"),
                       bg='#ffffff', fg='#2c3e50')
        title_label.pack(pady=(0, 10))

        desc_label = tk.Label(main_frame,
                      text="Enter a name for the new project.\nThe folder will be created under Input/.",
                      font=("Segoe UI", 10),
                      bg='#ffffff', fg='#6c757d',
                      justify=tk.CENTER)
        desc_label.pack(pady=(0, 16))

        name_var = tk.StringVar()
        name_entry = tk.Entry(main_frame, textvariable=name_var, font=("Segoe UI", 12))
        name_entry.pack(fill=tk.X, pady=(0, 18))
        name_entry.focus_set()

        result = {'name': None}

        def on_create():
            raw_name = name_var.get().strip()
            valid_name = self.validate_project_name(raw_name, projects)
            if not valid_name:
                return
            if self.create_project_from_template(valid_name):
                result['name'] = valid_name
                dialog.destroy()

        def on_cancel():
            dialog.destroy()

        button_frame = tk.Frame(main_frame, bg='#ffffff')
        button_frame.pack(fill=tk.X, pady=(12, 0))

        cancel_btn = tk.Button(button_frame, text="Cancel",
                      font=("Segoe UI", 11),
                      bg='#6c757d', fg='white',
                      relief='flat', padx=22, pady=6,
                      command=on_cancel)
        cancel_btn.pack(side=tk.RIGHT, padx=(12, 0))

        create_btn = tk.Button(button_frame, text="Create",
                      font=("Segoe UI", 11, "bold"),
                      bg='#28a745', fg='white',
                      relief='flat', padx=22, pady=6,
                      command=on_create)
        create_btn.pack(side=tk.RIGHT)

        dialog.protocol("WM_DELETE_WINDOW", on_cancel)
        dialog.wait_window()

        return result['name']

    def validate_project_name(self, name, projects):
        """
        Validate a proposed project name against Windows filesystem and uniqueness rules.

        Checks for empty input, forbidden characters (``< > : / \\ | ? * "``),
        reserved names (``"."`` / ``".."``), trailing spaces or dots, and
        case-insensitive duplicates in *projects*. Displays an error dialog for each
        violation.

        Args:
            name (str): Raw name string entered by the user.
            projects (list[str]): Existing project folder names for duplicate checking.

        Returns:
            str | None: The validated name if all checks pass, ``None`` otherwise.
        """
        if not name:
            messagebox.showerror("Error", "Project name cannot be empty.")
            return None

        invalid_chars = '<>:/\\|?*"'
        if any(ch in name for ch in invalid_chars):
            messagebox.showerror("Error", "Project name contains invalid characters.")
            return None

        if name in ('.', '..') or name.endswith(' ') or name.endswith('.'):
            messagebox.showerror("Error", "Project name is not valid.")
            return None

        lower_names = {p.lower() for p in projects}
        if name.lower() in lower_names:
            messagebox.showerror("Error", "A project with this name already exists.")
            return None

        return name

    def create_project_from_template(self, project_name):
        """
        Scaffold a new project folder under ``Input/`` with minimal required files.

        Creates ``Input/<project_name>/`` and populates it with:

        - ``PL_Pipelines.geojson`` — empty feature collection (schema from Standard)
        - ``N_Nodes.geojson`` — empty feature collection (schema from Standard)
        - ``config.xlsx`` — minimal configuration workbook
        - ``license.txt`` — empty placeholder

        Args:
            project_name (str): Validated name for the new project folder.

        Returns:
            bool: ``True`` if the project was created successfully, ``False`` on error.
        """
        input_dir = os.path.join(self.app_dir, "Input")
        project_dir = os.path.join(input_dir, project_name)
        if os.path.exists(project_dir):
            messagebox.showerror("Error", "Project folder already exists.")
            return False

        try:
            os.makedirs(project_dir, exist_ok=False)

            template_dir = os.path.join(input_dir, "Standard")
            pipelines_src = os.path.join(template_dir, "PL_Pipelines.geojson")
            nodes_src = os.path.join(template_dir, "N_Nodes.geojson")

            self.write_empty_geojson(pipelines_src, os.path.join(project_dir, "PL_Pipelines.geojson"))
            self.write_empty_geojson(nodes_src, os.path.join(project_dir, "N_Nodes.geojson"))

            config_dst = os.path.join(project_dir, "config.xlsx")
            self.write_minimal_configuration_xlsx(config_dst)

            license_dst = os.path.join(project_dir, "license.txt")
            with open(license_dst, 'w', encoding='utf-8') as f:
                f.write("")

            messagebox.showinfo("Info", f"Project '{project_name}' created successfully.")
            return True
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create project: {e}")
            return False

    def write_empty_geojson(self, template_path, dest_path):
        """
        Write an empty GeoJSON FeatureCollection to *dest_path*.

        Preserves the ``name`` and ``crs`` fields from *template_path* if it exists;
        otherwise writes a minimal FeatureCollection whose ``name`` is derived from
        the destination filename stem.

        Args:
            template_path (str): Path to an existing GeoJSON used as schema source.
                If the file does not exist, a bare FeatureCollection is created.
            dest_path (str): Absolute or relative output path for the new GeoJSON file.
        """
        data = None
        if os.path.exists(template_path):
            with open(template_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

        if not data:
            base_name = os.path.splitext(os.path.basename(dest_path))[0]
            data = {
                "type": "FeatureCollection",
                "name": base_name,
                "features": []
            }
        else:
            data["features"] = []

        with open(dest_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=True, indent=2)

    def write_minimal_configuration_xlsx(self, dest_path):
        """
        Write a minimal OOXML ``.xlsx`` workbook to *dest_path* without requiring openpyxl.

        The workbook contains a single ``Input_Files`` sheet pre-populated with header
        row and two data rows (pipelines and nodes) matching the expected QGas
        configuration schema.

        Args:
            dest_path (str): Absolute or relative path where the ``.xlsx`` file is written.
        """
        content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
"""

        rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
"""

        workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="Input_Files" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>
"""

        workbook_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""

        styles = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="1"><font/></fonts>
    <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
    <borders count="1"><border/></borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>
"""

        sheet_rows = [
            ["Filename", "Legend Name", "Color", "Marker", "Size", "Type", "Parent"],
            ["PL_Pipelines.geojson", "Pipelines", "#0070f3", "line", "4", "LineString", ""],
            ["N_Nodes.geojson", "Nodes", "#ff6b6b", "circle", "6", "Point", ""],
        ]

        sheet_xml_rows = []
        for row_idx, row in enumerate(sheet_rows, start=1):
            cells = []
            for col_idx, value in enumerate(row, start=1):
                col_letter = chr(ord('A') + col_idx - 1)
                cell_ref = f"{col_letter}{row_idx}"
                cell_value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                cells.append(f"<c r=\"{cell_ref}\" t=\"inlineStr\"><is><t>{cell_value}</t></is></c>")
            sheet_xml_rows.append(f"<row r=\"{row_idx}\">{''.join(cells)}</row>")

        sheet = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetData>
        {rows}
    </sheetData>
</worksheet>
""".format(rows="\n    ".join(sheet_xml_rows))

        with zipfile.ZipFile(dest_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr('[Content_Types].xml', content_types)
            zf.writestr('_rels/.rels', rels)
            zf.writestr('xl/workbook.xml', workbook)
            zf.writestr('xl/_rels/workbook.xml.rels', workbook_rels)
            zf.writestr('xl/worksheets/sheet1.xml', sheet)
            zf.writestr('xl/styles.xml', styles)
    
    def update_map_paths(self, project_name):
        """
        Rewrite ``fetch()`` URLs in ``GUI.html`` to point to ``Input/<project_name>/``.

        First normalises any pre-existing ``Input/<old_project>/`` prefix to plain
        ``Input/`` (prevents double-nesting on repeated calls), then replaces all
        ``fetch('Input/`` occurrences with ``fetch('Input/<project_name>/``.

        Args:
            project_name (str): Name of the project folder to activate in the map.
        """
        import re
        try:
            map_file_path = os.path.join(self.app_dir, "GUI.html")
            
            if not os.path.exists(map_file_path):
                print("GUI.html not found!")
                return
            
            # Read current map file
            with open(map_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # First, normalize any existing Input/project/ patterns back to Input/
            # This prevents accumulating project paths like Input/Standard/Standard/
            normalized_content = re.sub(r"Input/[^/'\")]+/", "Input/", content)
            
            # Also normalize any Output/ paths back to Input/ since data is in Input folders
            normalized_content = re.sub(r"fetch\('Output/", "fetch('Input/", normalized_content)
            
            # Now update all Input/ paths to Input/{project_name}/
            # Only replace in fetch() calls and similar contexts
            updated_content = re.sub(r"fetch\('Input/", f"fetch('Input/{project_name}/", normalized_content)
            
            # Write updated content back
            with open(map_file_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
                
            print(f"Updated map paths to use project: {project_name}")
            
        except Exception as e:
            print(f"Error updating map paths: {e}")
            messagebox.showerror("Error", f"Could not update map for project {project_name}: {e}")
    
    def reset_map_paths(self):
        """
        Revert all ``fetch('Input/<project>/``) URLs in ``GUI.html`` back to ``fetch('Output/``.

        Intended as a cleanup step when the application shuts down or when the user
        reverts to the legacy Output-folder layout.
        """
        try:
            map_file_path = os.path.join(self.app_dir, "GUI.html")
            
            if not os.path.exists(map_file_path):
                return
            
            # Read current map file
            with open(map_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Reset all Input/{project}/ paths back to Output/
            import re
            updated_content = re.sub(r"fetch\('Input/[^/]+/", "fetch('Output/", content)
            
            # Write updated content back
            with open(map_file_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
                
            print("Reset map paths to original Output/ structure")
            
        except Exception as e:
            print(f"Error resetting map paths: {e}")
    
    def clear_browser_cache(self):
        """
        Add or update a ``?v=<timestamp>`` cache-busting query parameter in ``GUI.html``.

        Scans all ``.geojson`` fetch URLs in the HTML and replaces or appends a ``v``
        parameter set to the current Unix timestamp so the browser fetches fresh data
        on the next page load.
        """
        try:
            import time
            cache_buster = str(int(time.time()))
            map_file_path = os.path.join(self.app_dir, "GUI.html")
            
            if not os.path.exists(map_file_path):
                return
            
            # Read current map file
            with open(map_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Update cache buster parameter in all fetch calls
            import re
            updated_content = re.sub(r'\?v=\d+', f'?v={cache_buster}', content)
            
            # If no cache buster exists, add one
            if '?v=' not in updated_content:
                updated_content = re.sub(r"\.geojson'", f".geojson?v={cache_buster}'", updated_content)
            
            # Write updated content back
            with open(map_file_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
                
            print(f"Updated browser cache buster to: {cache_buster}")
            
        except Exception as e:
            print(f"Error clearing browser cache: {e}")
        
    # ========================
    # CLEANUP METHODS
    # ========================
    def on_closing(self):
        """
        Handle application shutdown gracefully.
        Stops the map server if running and cleans up any background processes
        before closing the application window.
        """
        # Stop map server if currently running
        if self.httpd is not None:
            self.stop_server()
        
        # Close the main application window
        self.root.destroy()

def main():
    """
    Main entry point for the QGas Interactive Map application.
    Initializes the Tkinter GUI, creates the application instance, and starts
    the main event loop. Includes error handling for startup issues.
    """
    try:
        print("Starting QGas Interactive Map Interface...")
        root = tk.Tk()
        print("Tkinter root window created successfully")
        app = CombinedGUI(root)
        print("QGas GUI application initialized successfully")
        
        # Set up proper application shutdown handling
        root.protocol("WM_DELETE_WINDOW", app.on_closing)
        
        print("Starting main loop...")
        root.mainloop()
    except Exception as e:
        print(f"Error starting QGas GUI: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()