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
- Author: Dipl.-Ing. Marco Quantschnig
- Institution: Institut fuer Elektrizitaetswirtschaft und Energieinnovation, TU Graz
- Created: August 2025
- License: See LICENSE file
- Disclaimer: AI-assisted tools were used to support development and documentation.

Inputs
------
- Runtime environment: Python 3.x with Tkinter.
- Local project folders (Input/ and related assets).
- Map HTML entry point: Map.html served over the local HTTP server.
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
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse, parse_qs, quote_plus

class CombinedGUI:
    def __init__(self, root):
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
        self.filename = "Map.html"  # HTML file containing the interactive map
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
        """Create modern header with logo and title"""
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
            else:
                # Fallback logo placeholder
                logo_label = tk.Label(logo_frame, text="🏭", font=("Arial", 48), bg='#ffffff', fg='#007bff')
                logo_label.pack()
        except Exception as e:
            # If any error occurs (PIL not available, image loading fails, etc.), use text placeholder
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
        """Create modern tile-based control interface with larger action tiles"""
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
        """Create a modern action tile with compressed height and minimal spacing"""
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
        """Create compact information display tile with minimal height"""
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
                    """Sendet JSON-Antwort"""
                    import json
                    json_data = json.dumps(data, ensure_ascii=False)
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Content-Length', str(len(json_data.encode('utf-8'))))
                    self.end_headers()
                    self.wfile.write(json_data.encode('utf-8'))
                
                def get_layer_statistics(self, layer_name):
                    """Gibt Layer-Statistiken zurück ohne Geometrie-Daten"""
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
            
            # Show project selection dialog after server start
            self.show_project_selection_after_start()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start servers: {str(e)}")
    
    def show_project_selection_after_start(self):
        """
        Show project selection dialog after server start
        Allows user to choose which dataset to visualize
        """
        try:
            # Get available projects
            input_dir = os.path.join(self.app_dir, "Input")
            projects = [d for d in os.listdir(input_dir) 
                       if os.path.isdir(os.path.join(input_dir, d))]
            
            if len(projects) > 1:
                # Show project selection dialog
                selected_project = self.show_project_selection_dialog()
                if selected_project:
                    # Store selected project for server routing instead of modifying Map.html
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
            
        try:
            final_url = self.url
            if self.selected_project:
                separator = '&' if '?' in final_url else '?'
                final_url = f"{final_url}{separator}project={quote_plus(self.selected_project)}"

            # Try to open in Edge
            edge_path = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
            webbrowser.register('edge', None, webbrowser.BackgroundBrowser(edge_path))
            webbrowser.get('edge').open(final_url)
            print("Opening map in Microsoft Edge...")
        except Exception as e:
            print(f"Could not open in Edge: {e}")
            print("Opening in default browser...")
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
            return self.show_project_selection_dialog(subdirs)
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not read Input directory: {e}")
            return False
    
    def show_project_selection_dialog(self, projects):
        """
        Display project selection dialog with dropdown menu
        
        Args:
            projects (list): List of available project folder names
            
        Returns:
            bool: True if project selected, False if cancelled
        """
        import tkinter.ttk as ttk
        
        # Create modal dialog with even larger size for better button visibility
        dialog = tk.Toplevel(self.root)
        dialog.title("Select Project")
        dialog.geometry("450x380")  # Further increased height for button space
        dialog.resizable(False, False)
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Center dialog properly with screen bounds checking
        screen_width = dialog.winfo_screenwidth()
        screen_height = dialog.winfo_screenheight()
        dialog_width = 450
        dialog_height = 380
        
        # Calculate center position
        x = (screen_width - dialog_width) // 2
        y = (screen_height - dialog_height) // 2
        
        # Ensure dialog doesn't go off screen
        x = max(20, min(x, screen_width - dialog_width - 20))
        y = max(20, min(y, screen_height - dialog_height - 60))  # Extra space at bottom
        
        dialog.geometry(f"{dialog_width}x{dialog_height}+{x}+{y}")
        
        self.selected_project = None
        self.dialog_result = False
        
        # Dialog content with more padding
        main_frame = tk.Frame(dialog, bg='#ffffff', padx=40, pady=30)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Title with more space
        title_label = tk.Label(main_frame, text="Select Project", 
                              font=("Segoe UI", 18, "bold"),
                              bg='#ffffff', fg='#2c3e50')
        title_label.pack(pady=(0, 15))
        
        # Description with better spacing
        desc_label = tk.Label(main_frame, 
                             text="Multiple projects found in Input folder.\nPlease select which project to load:",
                             font=("Segoe UI", 12),
                             bg='#ffffff', fg='#6c757d',
                             justify=tk.CENTER)
        desc_label.pack(pady=(0, 25))
        
        # Project selection with more space
        selection_frame = tk.Frame(main_frame, bg='#ffffff')
        selection_frame.pack(fill=tk.X, pady=(0, 25))
        
        project_label = tk.Label(selection_frame, text="Available Projects:", 
                                font=("Segoe UI", 12, "bold"),
                                bg='#ffffff', fg='#495057')
        project_label.pack(anchor=tk.W, pady=(0, 8))
        
        project_var = tk.StringVar()
        project_combo = ttk.Combobox(selection_frame, textvariable=project_var, 
                                    values=sorted(projects), state="readonly",
                                    font=("Segoe UI", 12), width=35, height=8)
        project_combo.pack(fill=tk.X, pady=(0, 5))
        
        # Set default selection (Standard if available, otherwise first)
        if "Standard" in projects:
            project_combo.set("Standard")
        else:
            project_combo.set(projects[0])
        
        # Buttons with much better spacing and larger size for full visibility
        button_frame = tk.Frame(main_frame, bg='#ffffff')
        button_frame.pack(fill=tk.X, pady=(30, 10))  # More space above buttons
        
        def on_ok():
            self.selected_project = project_var.get()
            if self.selected_project:
                self.dialog_result = True
                self.update_map_paths(self.selected_project)
                print(f"Selected project: {self.selected_project}")
            dialog.destroy()
        
        def on_cancel():
            self.dialog_result = False
            dialog.destroy()
        
        cancel_btn = tk.Button(button_frame, text="Cancel",
                              font=("Segoe UI", 13),
                              bg='#6c757d', fg='white',
                              relief='flat', padx=30, pady=4,
                              command=on_cancel)
        cancel_btn.pack(side=tk.RIGHT, padx=(20, 0))
        
        ok_btn = tk.Button(button_frame, text="Load Project",
                          font=("Segoe UI", 13, "bold"),
                          bg='#007bff', fg='white',
                          relief='flat', padx=30, pady=4,
                          command=on_ok)
        ok_btn.pack(side=tk.RIGHT)
        
        # Handle dialog close
        dialog.protocol("WM_DELETE_WINDOW", on_cancel)
        
        # Wait for dialog to close
        dialog.wait_window()
        
        return self.dialog_result
    
    def update_map_paths(self, project_name):
        """Update the map HTML file to use the selected project paths."""
        import re
        try:
            map_file_path = os.path.join(self.app_dir, "Map.html")
            
            if not os.path.exists(map_file_path):
                print("Map.html not found!")
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
        """Reset map paths back to Output/ (original default state)."""
        try:
            map_file_path = os.path.join(self.app_dir, "Map.html")
            
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
        """Add cache-busting parameters to Map.html to force browser reload."""
        try:
            import time
            cache_buster = str(int(time.time()))
            map_file_path = os.path.join(self.app_dir, "Map.html")
            
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