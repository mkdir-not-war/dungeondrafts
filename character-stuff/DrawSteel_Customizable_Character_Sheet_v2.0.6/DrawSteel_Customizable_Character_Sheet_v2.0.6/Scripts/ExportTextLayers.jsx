#target photoshop

function exportTextLayers() {
    if (!app.documents.length) {
        alert("No document is open!");
        return;
    }

    // Ask for one CSV file to hold everything
    var saveFile = File.saveDialog("Save ALL text layers as a single CSV", "*.csv");
    if (!saveFile) return;

    var originalDoc = app.activeDocument;
    var uniqueTexts = {}; // Track unique text content
    var file;
    
    try {
        // First pass: collect all unique text content
        for (var d = 0; d < app.documents.length; d++) {
            var doc = app.activeDocument = app.documents[d];
            collectUniqueTexts(doc, uniqueTexts);
        }
        
        // Second pass: write only unique texts to CSV
        file = saveFile;
        file.open("w");
        file.writeln("OriginalText,TranslatedText");
        
        for (var text in uniqueTexts) {
            file.writeln('"' + escapeCSV(text) + '",""');
        }
        
        file.close();
    } catch (e) {
        try { if (file && file.opened) file.close(); } catch (_) {}
        alert("Error writing CSV: " + e.message);
        return;
    }

    // restore original active document
    app.activeDocument = originalDoc;

    // Count unique texts manually (Object.keys not available in older ExtendScript)
    var uniqueCount = 0;
    for (var text in uniqueTexts) {
        uniqueCount++;
    }
    
    alert("Export complete!\n\nDocuments processed: " + app.documents.length + "\nUnique texts exported: " + uniqueCount + "\nSaved:\n" + saveFile.fsName);
}

function collectUniqueTexts(doc, uniqueTexts) {
    // Top-level art layers
    for (var i = 0; i < doc.artLayers.length; i++) {
        var layer = doc.artLayers[i];
        if (layer.kind == LayerKind.TEXT) {
            var text = normalizeText(layer.textItem.contents);
            // Only add if we haven't seen this text before
            if (!uniqueTexts[text]) {
                uniqueTexts[text] = true; // Just mark as seen
            }
        }
    }

    // Recurse into groups
    for (var s = 0; s < doc.layerSets.length; s++) {
        collectUniqueTextsFromLayerSet(doc.layerSets[s], uniqueTexts);
    }
}

function collectUniqueTextsFromLayerSet(layerSet, uniqueTexts) {
    for (var j = 0; j < layerSet.layers.length; j++) {
        var lyr = layerSet.layers[j];
        if (lyr.typename == "ArtLayer" && lyr.kind == LayerKind.TEXT) {
            var text = normalizeText(lyr.textItem.contents);
            // Only add if we haven't seen this text before
            if (!uniqueTexts[text]) {
                uniqueTexts[text] = true; // Just mark as seen
            }
        } else if (lyr.typename == "LayerSet") {
            collectUniqueTextsFromLayerSet(lyr, uniqueTexts);
        }
    }
}

function normalizeText(s) {
    // escape newlines to \n so CSV stays one line per layer
    return String(s).replace(/(\r\n|\n|\r)/g, "\\n");
}

function escapeCSV(s) {
    // double quotes inside fields and keep commas safe
    return String(s).replace(/"/g, '""');
}

exportTextLayers();