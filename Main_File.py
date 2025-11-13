# -*- coding: utf-8 -*-
"""
This script performs a comprehensive matching process between ENTSOG pipeline data and OpenStreetMap (OSM) data.

The script workflow includes:
1. Parsing and normalizing diameter and pressure data from OSM GeoJSON files.
2. Matching OSM pipeline features to ENTSOG pipelines based on attributes such as name, diameter, and pressure.
3. Creating statistics on the matching results.
4. Adding various infrastructure nodes (storages, compressors, powerplants, LNG terminals) to the topology.
5. Assigning country codes to the nodes based on their spatial location.

Input files are stored in the './Input' directory, intermediate files in './Temporal Files', and outputs in the './Output' directory.

Created on Sun May 19 13:42:00 2025

@author: Marco Quantschnig BSc. (some parts are AI-generated)
"""

import os
import json
import geopandas as gpd
from shapely.geometry import shape, mapping
from shapely.ops import transform
from pyproj import Transformer
from tqdm import tqdm
from rtree import index

from Python_Functions.Convert_Excel_to_Geojson import convert_excel_to_geojson
from Python_Functions.Add_Manual_Input import add_manual_input
from Python_Functions.Geographical_Matching import match_pipelines
from Python_Functions.Formatting_Matching_Output import reformat_geojson
from Python_Functions.Add_Points import add_points_to_topology
from Python_Functions.Add_Country_Information import add_country_and_nuts
from Python_Functions.Reformat_Nodes_and_Pipelines import reformat_Nodes_and_Pipelines
from Python_Functions.Create_Output_Structure import structure_final_output
from Python_Functions.Detailed_Stats import get_final_stats
from Python_Functions.Parser_GEM_OSM import parse_and_save_osm_gem




# ==== Directories ====

geojson_dir = os.path.dirname(os.path.abspath(__file__))


# Input directories - Manual Data



Input_Pipelines = os.path.join(geojson_dir, "Input", "Pipelines.geojson")
Input_Nodes = os.path.join(geojson_dir, "Input", "Nodes.geojson")
Input_Compressors_Excel = os.path.join(geojson_dir, "Input","Manual Input", "Compressors_Manual_Research.xlsx")
Input_Compressors = os.path.join(geojson_dir, "Input", "Compressors.geojson")
Input_Storages_Excel = os.path.join(geojson_dir, "Input","Manual Input", "Storages_Manual_Research.xlsx")
Input_Storages = os.path.join(geojson_dir, "Input", "Storages.geojson")
Input_LNG_Excel = ""
Input_LNG = os.path.join(geojson_dir, "Input", "LNG.geojson")
Input_Powerplants_Excel = ""
Input_Powerplants =  os.path.join(geojson_dir, "Input", "Powerplants.geojson")
Input_NUTS3 = os.path.join(geojson_dir, "Input", "NUTS3.geojson")
Input_Countries = os.path.join(geojson_dir, "Input", "Countries.geojson")
Input_Pipelines_Manual = os.path.join(geojson_dir, "Input", "Manual Input", "Pipelines_Manual_Research.xlsx")

# Input directories - OSM and GEM Exports

Input_OSM = os.path.join(geojson_dir, "Input", "OSM.geojson")
Input_GEM = os.path.join(geojson_dir, "Input", "GEM.geojson")

# Temporal directories
Temporal = os.path.join(geojson_dir, "Temporal Files", "Output_Temporal.geojson")
OSM_Parsed = os.path.join(geojson_dir, "Temporal Files", "OSM_parsed.geojson")
GEM_Parsed = os.path.join(geojson_dir, "Temporal Files", "GEM_parsed.geojson")

# Output directories
Output_Pipelines = os.path.join(geojson_dir, "Output", "PL_Pipelines.geojson")
Output_Nodes = os.path.join(geojson_dir, "Output", "N_Nodes.geojson")
Output_Compressors = os.path.join(geojson_dir, "Output", "C_Compressors.geojson")
Output_Storages = os.path.join(geojson_dir, "Output", "S_Storages.geojson")
Output_Powerplants = os.path.join(geojson_dir, "Output", "P_Powerplants.geojson")
Output_LNG = os.path.join(geojson_dir, "Output", "L_LNG.geojson")
Output_Statistics = os.path.join(geojson_dir, "Output", "Final_Statistics.xlsx")


# ==== Parameters ====

minimal_overlap = 10000  # minimal overlap length from OSM Pipeline compared to ENTSOG Pipeline within a buffer (in meters)
minimal_percentage = 10  # minimal overlap percentage of OSM Pipeline (in %)
matching_buffer = 5000  # radius of buffer around the ENTSOG Pipelines (in meters)

# ==== Convert Excel to GeoJSON ====

convert_excel_to_geojson(Input_Compressors_Excel , Input_Compressors)

convert_excel_to_geojson(Input_Storages_Excel , Input_Storages)

# ==== Add Manual Input ====

add_manual_input(Input_Pipelines, Input_Pipelines_Manual, Temporal)

# ==== Parse and Save OSM and GEM Data ====
parse_and_save_osm_gem(
    Input_OSM,   # relativer Pfad zu OSM.geojson
    Input_GEM,   # relativer Pfad zu GEM.geojson
    OSM_Parsed,  # relativer Pfad für OSM_parsed.geojson
    GEM_Parsed  # relativer Pfad für GEM_parsed.geojson
)

# ==== Match GEM Data ====

match_pipelines(
    ENTSOG=         Temporal,
    GEM=            GEM_Parsed,
    Output=         Temporal,
    Attribute=      "ALL",
    min_Overlap=    minimal_overlap,
    min_percentage= minimal_percentage,
    buffer=         matching_buffer
)

# ==== Match OSM Data ====

match_pipelines(
    ENTSOG=         Temporal,
    GEM=            OSM_Parsed,
    Output=         Temporal,
    Attribute=      "ALL",
    min_Overlap=    minimal_overlap,
    min_percentage= minimal_percentage,
    buffer=         matching_buffer
)

# ==== Formatting Output ====

reformat_geojson(Temporal, Temporal)

# ==== Adding Infrastructure Nodes ====

add_points_to_topology(Temporal, Input_Nodes, Input_Storages, Input_Powerplants, Input_LNG, Input_Compressors);   

# ==== Adding Country Information ====

node_files = [
    Output_Nodes,
    Output_Storages,
    Output_Compressors,
    Output_Powerplants,
    Output_LNG
] 

for node_files in node_files:
    add_country_and_nuts(node_files, Input_Countries, Input_NUTS3)


# ==== Reformat Nodes and Pipelines ====

reformat_Nodes_and_Pipelines(Output_Compressors, Output_Nodes, Output_Pipelines)

# ==== Final Files Formatting ====

structure_final_output(Output_Pipelines, Output_Nodes, Output_Compressors, Output_LNG, Output_Storages, Output_Powerplants)

# ==== Create Statistics ====

get_final_stats(Output_Statistics)



