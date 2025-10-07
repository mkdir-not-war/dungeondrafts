#target photoshop

function importTextLayers() {
    if (!app.documents.length) {
        alert("No document is open!");
        return;
    }

    var file = File.openDialog("Select CSV file with translations", "*.csv");
    if (!file) return;

    // Read the CSV file
    file.open("r");
    var content = file.read();
    file.close();

    // Parse CSV content (normalize newlines for Win/Mac)
    var lines = content.replace(/\r\n?/g, '\n').split('\n');
    var translations = {};
    
    // Skip header line and process data
    for (var i = 1; i < lines.length; i++) {
        var line = trimString(String(lines[i]));
        if (!line) continue;
        
        // Simple CSV parsing (handles quoted fields)
        var fields = parseCSVLine(line);
        if (fields.length >= 2) {
            var originalText = fields[0].replace(/\\n/g, '\n'); // unescape line breaks
            var translatedText = fields[1].replace(/\\n/g, '\n'); // unescape line breaks
            
            // Skip if no translation provided
            if (!translatedText || trimString(translatedText) === "") {
                continue;
            }
            
            translations[originalText] = translatedText;
        }
    }

    var totalApplied = 0;
    var originalDoc = app.activeDocument;

    // Process each open document
    for (var d = 0; d < app.documents.length; d++) {
        var doc = app.activeDocument = app.documents[d];
        var appliedCount = 0;

        // Apply translations to art layers
        for (var i = 0; i < doc.artLayers.length; i++) {
            var layer = doc.artLayers[i];
            if (layer.kind == LayerKind.TEXT) {
                var originalText = normalizeText(layer.textItem.contents);
                if (translations[originalText]) {
                    layer.textItem.contents = translations[originalText];
                    appliedCount++;
                }
            }
        }

        // Also check inside groups
        function scanLayerSet(layerSet) {
            for (var j = 0; j < layerSet.layers.length; j++) {
                var lyr = layerSet.layers[j];
                if (lyr.typename == "ArtLayer" && lyr.kind == LayerKind.TEXT) {
                    var originalText = normalizeText(lyr.textItem.contents);
                    if (translations[originalText]) {
                        lyr.textItem.contents = translations[originalText];
                        appliedCount++;
                    }
                } else if (lyr.typename == "LayerSet") {
                    scanLayerSet(lyr);
                }
            }
        }
        
        for (var s = 0; s < doc.layerSets.length; s++) {
            scanLayerSet(doc.layerSets[s]);
        }

        totalApplied += appliedCount;
    }

    // Restore original active document
    app.activeDocument = originalDoc;

    alert("Import complete! Applied " + totalApplied + " translations across " + app.documents.length + " documents.");
}

function parseCSVLine(line) {
    var fields = [];
    var current = "";
    var inQuotes = false;
    
    for (var i = 0; i < line.length; i++) {
        var character = line.charAt(i);
        
        if (character == '"') {
            inQuotes = !inQuotes;
        } else if (character == ',' && !inQuotes) {
            fields.push(current);
            current = "";
        } else {
            current += character;
        }
    }
    
    fields.push(current);
    return fields;
}

// Simple trim helper for ExtendScript compatibility
function trimString(s) {
    // Remove leading/trailing whitespace without using String.prototype.trim
    return s.replace(/^\s+|\s+$/g, "");
}

function normalizeText(s) {
    // escape newlines to \n so CSV stays one line per layer
    return String(s).replace(/(\r\n|\n|\r)/g, "\\n");
}

importTextLayers();