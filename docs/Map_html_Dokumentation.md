# QGas Map.html - Technische Dokumentation

## Lizenzinformationen und externe Bibliotheken

### Verwendete Open-Source Bibliotheken

#### 1. Leaflet (v1.9.4)
- **Quelle**: https://unpkg.com/leaflet@1.9.4/
- **Lizenz**: BSD-2-Clause License
- **Zweck**: Interaktive Kartendarstellung
- **Lizenzpflichtig**: Ja - Attribution erforderlich
- **Copyright**: © 2010-2023, Vladimir Agafonkin, © 2010-2011, CloudMade

#### 2. Leaflet.draw (v1.0.4)
- **Quelle**: https://cdn.jsdelivr.net/npm/leaflet-draw@1.0.4/
- **Lizenz**: MIT License
- **Zweck**: Zeichnen und Bearbeiten von Geometrien auf der Karte
- **Lizenzpflichtig**: Ja - Attribution erforderlich
- **Copyright**: © 2012-2017 Jacob Toye

#### 3. Leaflet Polyline Decorator (v1.6.0)
- **Quelle**: https://cdn.jsdelivr.net/npm/leaflet-polylinedecorator@1.6.0/
- **Lizenz**: MIT License
- **Zweck**: Pfeile und Dekorationen für Pipelines
- **Lizenzpflichtig**: Ja - Attribution erforderlich

#### 4. JSZip (v3.10.1)
- **Quelle**: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/
- **Lizenz**: MIT License oder GPLv3
- **Zweck**: Erstellung von ZIP-Archiven für Datenexport
- **Lizenzpflichtig**: Ja - Attribution erforderlich
- **Copyright**: © 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso

#### 5. SheetJS/XLSX (v0.18.5)
- **Quelle**: https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/
- **Lizenz**: Apache License 2.0
- **Zweck**: Lesen und Schreiben von Excel-Dateien
- **Lizenzpflichtig**: Ja - Attribution erforderlich
- **Copyright**: © 2012-2022 SheetJS LLC

#### 6. Chart.js
- **Quelle**: https://cdn.jsdelivr.net/npm/chart.js
- **Lizenz**: MIT License
- **Zweck**: Diagramme und Visualisierungen
- **Lizenzpflichtig**: Ja - Attribution erforderlich
- **Copyright**: © 2014-2022 Chart.js Contributors

#### 7. Chart.js Zoom Plugin
- **Quelle**: https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom
- **Lizenz**: MIT License
- **Zweck**: Zoom-Funktionalität für Diagramme
- **Lizenzpflichtig**: Ja - Attribution erforderlich

#### 8. OpenStreetMap
- **Quelle**: https://www.openstreetmap.org/
- **Lizenz**: ODbL (Open Database License)
- **Zweck**: Kartendaten und Tiles
- **Lizenzpflichtig**: Ja - Attribution erforderlich ("© OpenStreetMap Contributors")
- **Hinweis**: Bereits im Code als Attribution vorhanden (Zeile 1757)

---

## Systemübersicht

### Projektbeschreibung
QGas Map.html ist ein interaktives Werkzeug zur Visualisierung und Bearbeitung von Gasnetzwerk-Infrastrukturdaten. Die Anwendung ermöglicht das Laden, Bearbeiten und Exportieren von GeoJSON-Daten für:
- Pipelines (inkl. H2-Pipelines)
- Nodes (Knotenpunkte)
- Short-Pipes (Kurzstrecken-Verbindungen)
- Kompressoren
- Speicher
- LNG-Terminals
- Kraftwerke
- Biogas-Produktion
- H2-Nachfrage

### Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    HTML Frontend                         │
│  (Map.html - Single Page Application)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Leaflet    │  │ Leaflet.draw │  │   Chart.js   │  │
│  │   (Karte)    │  │  (Editing)   │  │ (Analytics)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         JavaScript Application Logic             │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ • Layer Management    • Data Export              │   │
│  │ • Config Loading      • User Interaction         │   │
│  │ • Geometry Editing    • Analytics                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Backend Server                        │
│             (Python HTTP Server - GUI.py)                │
├─────────────────────────────────────────────────────────┤
│  • Bereitstellen der Map.html                            │
│  • Laden von GeoJSON-Dateien aus Input/[Projekt]/       │
│  • Laden der Excel-Konfiguration                         │
│  • Speichern von exportierten Daten                      │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  Dateisystem                             │
├─────────────────────────────────────────────────────────┤
│  Input/[Projekt]/                                        │
│  ├── Configuration.xlsx    (Layer-Konfiguration)        │
│  ├── PL_Pipelines.geojson  (Pipeline-Daten)            │
│  ├── N_Nodes.geojson       (Node-Daten)                │
│  ├── Short_Pipes.geojson   (Short-Pipe-Daten)          │
│  ├── C_Compressors.geojson (Kompressor-Daten)          │
│  └── ...weitere Layer...                                │
└─────────────────────────────────────────────────────────┘
```

---

## Hauptkomponenten

### 1. Konfigurationssystem

#### Excel-basierte Konfiguration
- **Datei**: `Configuration.xlsx` (Sheet: "Input_Files")
- **Spalten**:
  - `Filename`: Pfad zur GeoJSON-Datei
  - `Legend Name`: Anzeigename in der Legende
  - `Color`: Farbe (Hex-Code)
  - `Marker Type`: Art des Markers (circle, line, square, etc.)
  - `Size`: Größe des Markers/Linie
  - `Type`: Geometrietyp (Point, Line, ShortPipe, etc.)
  - `Enabled`: Aktivierungsstatus

#### Layer-Konfiguration
```javascript
layerConfig = [
  {
    filename: "PL_Pipelines.geojson",
    legendName: "Pipelines",
    color: "#0066CC",
    markerType: "line",
    size: 3,
    type: "Line",
    enabled: true,
    elementKey: "pipelines",
    geometryClass: "line"
  },
  // ... weitere Layer
]
```

### 2. Layer-Management-System

#### Dynamisches Layer-Loading
- `loadAllLayersFromConfig()`: Lädt alle konfigurierten Layer
- `loadLayer()`: Lädt einen einzelnen Layer
- `ensureLayerInstanceForConfig()`: Stellt Layer-Instanz sicher
- `registerLayerMetadata()`: Registriert Metadaten für Layer

#### Spezielle Layer-Typen

##### Short-Pipes System
Neu implementiertes System für Kurzstrecken-Pipelines:
- **Config Template**: `getShortPipeConfigTemplate()`
- **Detection**: `isShortPipeConfigEntry(config)`
- **Auto-Registration**: `ensureShortPipeConfigPresence()`
- **Export-Path**: `getShortPipeResolvedExportPath()`
- **Fallback-Erstellung**: `initializeFallbackShortPipeLayer()`

Standardwerte:
```javascript
const SHORT_PIPE_CONFIG_DEFAULTS = {
  filename: 'Short_Pipes.geojson',
  legendName: 'Short-Pipes',
  type: 'ShortPipe',
  color: '#ff8800',
  size: 4
};
```

##### Multi-Node-Layer Support
- Unterstützung für mehrere Node-Layer gleichzeitig
- `getAllNodeLayers()`: Gibt alle Node-Layer zurück
- `getNodeLayerEntries()`: Metadata für alle Node-Layer
- `forEachNodeMarker(callback)`: Iteriert über alle Node-Marker

### 3. Bearbeitungsmodi

#### Info Mode
- Anzeigen von Element-Eigenschaften
- Öffnen von Detailansichten
- Standardmodus beim Start

#### Add Mode
- Hinzufügen neuer Pipelines
- Hinzufügen neuer Infrastruktur-Elemente
- Node-Auswahl für Pipeline-Endpunkte

#### Edit Mode
**Pipeline Route Edit**:
- Ändern von Pipeline-Routen
- Verschieben von Zwischenpunkten
- Endpoint-Lock-System (Start/End-Nodes bleiben fixiert)

**Node Position Edit**:
- Verschieben von Nodes
- Automatisches Nachziehen verbundener Pipelines
- Multi-Node-Verschiebung bei co-located Nodes
- Buffer-System für Änderungen:
  ```javascript
  nodePositionEditBuffer = {
    nodeSnapshots: Map<key, snapshot>,
    pipelineSnapshots: Map<key, snapshot>,
    dirtyNodeKeys: Set<key>,
    dirtyPipelineKeys: Set<key>
  }
  ```

#### Delete Mode
- Markieren von Elementen zur Löschung
- Batch-Deletion
- Orphan-Node-Detection (automatisches Löschen verwaister Nodes)

#### Direction Mode
- Ändern der Fließrichtung von Pipelines
- Visuelles Feedback durch Pfeile
- Vertauschen von Start_Node/End_Node

#### Split Node Mode
- Aufteilen eines Nodes in Sub-Nodes
- Automatische Pipeline-Zuordnung
- Interaktive Linien-Auswahl

#### Short-Pipe Mode
- Auswahl von Pipeline-Segmenten
- Extraktion als Short-Pipe
- Übertragung von Eigenschaften

### 4. Export-System

#### Einzelexport
- `exportChanges()`: Exportiert alle geänderten Elemente
- GeoJSON-Format mit Feature-Properties
- Modified-Flag-Tracking

#### Komplettexport
- `exportCompleteDataset()`: ZIP mit allen Layern
- Excel-Konfiguration inklusive
- Ordnerstruktur wird erhalten

#### Short-Pipe Export
- Verwendet konfigurierte Filename aus Excel
- Fallback auf `Short_Pipes.geojson`
- Automatische Config-Registration bei Export

### 5. Geometrie-Utilities

#### Pipeline-Berechnungen
- `calculatePipelineLength(layer)`: Längenberechnung in km
- `getDistance(latlng1, latlng2)`: Haversine-Distanz
- `getNearestPointOnSegment()`: Projektion auf Segment

#### Node-Operationen
- `findNodesAtLatLng()`: Findet co-located Nodes
- `moveNodeAndConnectedPipelines()`: Node mit Pipelines verschieben
- `checkAndDeleteOrphanedNodes()`: Verwaiste Nodes bereinigen

#### Coordinate-Handling
- `cloneLatLngStructure()`: Deep-Copy von Koordinaten
- `reverseLatLngArray()`: Umkehren der Koordinatenreihenfolge
- `syncLayerFeatureGeometry()`: Feature-Geometrie synchronisieren

### 6. Styling-System

#### Style-Registry
```javascript
buildStyleableLayerRegistry() → [
  {
    id: string,
    elementKey: string,
    geometry: 'line' | 'point',
    shape: string,
    layers: [LayerGroup],
    configRef: config,
    metadata: object
  }
]
```

#### Style-Modes
- **Default**: Normaler Anzeigestil
- **Highlight**: Hervorhebung bei Selection
- **Edit**: Editing-Modus (grüne Farbe)
- **Delete**: Markierung zur Löschung (rot)
- **Direction**: Richtungsanzeige mit Pfeilen

#### Color-Management
- `registerLineColorUsage()`: Farbregistrierung
- `selectColor()`: Farbauswahl im UI
- Custom Color Input mit Hex-Validation

### 7. Analytics & Visualisierung

#### Pipeline-Gruppierung
- Gruppierung zusammenhängender Pipelines
- Start/End-Node-Auswahl
- Flow-basierte Sortierung
- `orderPipelinesByFlow()`: Intelligente Reihung

#### Chart.js Integration
- Diagramme für Analyse
- Zoom-Plugin für Details
- Responsive Design

### 8. UI-Komponenten

#### Custom Popup System
```javascript
showCustomPopup(title, content, buttons, extraElement)
```
- Modale Dialoge
- Flexible Button-Konfiguration
- Docking-System (bottom-right)

#### Legende
- Dynamisch generiert aus `layerConfig`
- Toggle-Checkboxen für Layer
- Farbcodierung
- Hierarchische Gruppierung (Sublayer)

#### Tools-Menu
- Export-Dialog
- Screenshot-Modus
- Layer-Verwaltung
- Analytics

#### Contributor-System
- Verfolgung von Änderungen
- User-Management
- Initials-System für Attribution

---

## Dateistruktur

### Input-Ordner
```
Input/
├── [Projektname]/
│   ├── Configuration.xlsx          # Layer-Konfiguration
│   ├── 01_Data_and_Licensing.txt   # Lizenzinformationen
│   ├── PL_Pipelines.geojson
│   ├── PL_Pipelines_h2_new.geojson
│   ├── PL_Pipelines_h2_repurposed.geojson
│   ├── Short_Pipes.geojson         # Short-Pipes (optional)
│   ├── N_Nodes.geojson
│   ├── C_Compressors.geojson
│   ├── S_Storages.geojson
│   ├── P_Powerplants.geojson
│   ├── BP_Biogas_Production.geojson
│   ├── H2D_H2_Demand.geojson
│   ├── BO_Border_Points.geojson
│   └── Infrastructure_Plans/       # Pläne (PNG/PDF)
```

### GeoJSON-Format
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[lng, lat], ...]
      },
      "properties": {
        "ID": "PL_001",
        "Start_Node": "N_100",
        "End_Node": "N_101",
        "Length_km": 45.2,
        "Diameter_mm": 600,
        "Type": "Pipeline",
        "modified": true,
        "Contributor": "MB"
      }
    }
  ]
}
```

---

## Wichtige Konstanten

```javascript
// Element-Keys für Layer-Typen
const ELEMENT_KEYS = {
  pipelines: 'pipelines',
  nodes: 'nodes',
  shortPipes: 'shortPipes',
  compressors: 'compressors',
  storages: 'storages',
  lng: 'lng',
  powerplants: 'powerplants',
  biogas: 'biogas',
  h2demand: 'h2demand',
  borderpoints: 'borderpoints'
};

// Standard-Farben
const DEFAULT_LINE_COLOR_SEQUENCE = [
  '#0066CC', '#FF6B35', '#2ECC71', '#9B59B6', '#E74C3C'
];

const DEFAULT_POINT_COLOR_SEQUENCE = [
  '#FF7800', '#0066CC', '#2ECC71', '#9B59B6', '#E74C3C'
];

// Panes für Z-Index-Management
const PANES = {
  pipelinePane: 400,
  nodePane: 450,
  infrastructurePane: 500
};
```

---

## API-Referenz

### Öffentliche Funktionen

#### Layer-Management
```javascript
// Layer laden
loadLayer(filename, layerName, options)

// Layer-Instanz holen
ensureLayerInstanceForConfig(config)

// Alle Layer laden
loadAllLayersFromConfig()

// Layer-Metadaten
registerLayerMetadata(layerName, config)
```

#### Editing
```javascript
// Modi aktivieren
activateInfoMode(force)
activateEditMode()
activateDeleteMode()
activateAddMode()

// Node-Position bearbeiten
activateNodePositionEdit()
selectNodeForPositionEdit(nodeMarker)
commitPendingNodePositionEdits()
discardPendingNodePositionEdits()

// Pipeline-Route bearbeiten
activatePipelineRouteEdit()
```

#### Export
```javascript
// Änderungen exportieren
exportChanges()

// Kompletter Datensatz
exportCompleteDataset()

// Short-Pipes
getShortPipeResolvedExportPath()
shortPipeLayerHasFeatures()
```

#### Geometrie
```javascript
// Länge berechnen
calculatePipelineLength(layer)

// Distanz berechnen
getDistance(latlng1, latlng2)

// Node finden
findNodesAtLatLng(latlng, toleranceMeters)
```

---

## Performance-Optimierungen

### Layer-Rendering
- Verwendung von Leaflet-Panes für Z-Index-Management
- Lazy-Loading von Layern
- Feature-Caching für schnelleren Zugriff

### Geometry-Operations
- Batch-Updates für mehrere Elemente
- Dirty-Flag-System für geänderte Elemente
- Snapshot-System für Undo-Funktionalität

### Memory-Management
- Cleanup bei Modus-Wechsel
- Event-Handler-Entfernung
- Layer-Instanz-Wiederverwendung

---

## Bekannte Limitierungen

1. **Browser-Kompatibilität**
   - Optimiert für moderne Browser (Chrome, Edge, Firefox)
   - IE11 wird nicht unterstützt

2. **Datengröße**
   - Performance-Degradation bei >10.000 Features pro Layer
   - Empfehlung: Daten-Segmentierung bei großen Projekten

3. **Short-Pipes**
   - Automatische Registrierung erfordert Datei-Existenz
   - Fallback-Layer wird bei fehlender Config erstellt

4. **Multi-User**
   - Keine Echtzeit-Synchronisation
   - Export-basierter Workflow

---

## Lizenz-Compliance Checklist

Für die Verwendung von Map.html müssen folgende Attributions eingehalten werden:

- [ ] **OpenStreetMap**: "© OpenStreetMap Contributors" (bereits im Code)
- [ ] **Leaflet**: BSD-2-Clause Notice in Dokumentation
- [ ] **Leaflet.draw**: MIT License Notice
- [ ] **JSZip**: MIT/GPLv3 License Notice
- [ ] **SheetJS**: Apache 2.0 License Notice
- [ ] **Chart.js**: MIT License Notice

**Empfohlene Attribution** (in About/Impressum):
```
Diese Anwendung verwendet:
- Leaflet © Vladimir Agafonkin (BSD-2-Clause)
- Leaflet.draw © Jacob Toye (MIT)
- JSZip © Stuart Knightley et al. (MIT/GPLv3)
- SheetJS © SheetJS LLC (Apache 2.0)
- Chart.js © Chart.js Contributors (MIT)
- Kartendaten © OpenStreetMap Contributors (ODbL)
```

---

## Wartung & Weiterentwicklung

### Code-Qualität
- Konsistente Namenskonventionen
- Ausführliche Kommentare (Deutsch)
- Fehlerbehandlung mit try-catch
- Console-Logging für Debugging

### Testing
- Manuelle Tests für alle Modi
- Prüfung auf verschiedenen Bildschirmgrößen
- Cross-Browser-Testing empfohlen

### Deployment
1. Änderungen testen in lokalem Setup
2. Cache-Header prüfen (Meta-Tags)
3. Browser-Cache leeren bei Updates (Ctrl+F5)
4. Backup der Input-Daten vor Änderungen

---

## Kontakt & Support

Bei Fragen zur Lizenzierung oder technischen Problemen:
- Dokumentation: Diese Datei
- Code-Kommentare: Inline in Map.html
- Server-Code: GUI.py

**Version**: 2.0 (mit Short-Pipe Support)  
**Letzte Aktualisierung**: Januar 2026

