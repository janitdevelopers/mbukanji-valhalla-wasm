/**
 * Valhalla WASM Bindings
 * 
 * This file provides the C++ to JavaScript bindings for Valhalla
 * when compiled to WebAssembly using Emscripten.
 */

#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <emscripten/val.h>

#include <string>
#include <memory>
#include <stdexcept>
#include <fstream>
#include <sstream>

// Valhalla headers
#include "valhalla/tyr/actor.h"
#include "valhalla/baldr/graphreader.h"
#include "valhalla/baldr/pathlocation.h"
#include "valhalla/baldr/tilehierarchy.h"
#include "valhalla/midgard/logging.h"
#include "valhalla/midgard/util.h"
#include "valhalla/sif/costfactory.h"
#include "valhalla/config.h"

using namespace emscripten;

namespace {

// Global state
std::unique_ptr<valhalla::tyr::actor_t> actor;
bool tiles_loaded = false;
std::string valhalla_version = "3.4.0";

/**
 * Create default Valhalla configuration for WASM environment
 */
std::string getDefaultConfig() {
    return R"({
        "mjolnir": {
            "tile_dir": "/tiles",
            "max_cache_size": 1073741824,
            "tile_extract": ""
        },
        "loki": {
            "actions": ["route", "locate"],
            "logging": { "type": "", "color": false },
            "service_defaults": {
                "minimum_reachability": 50,
                "radius": 0,
                "search_cutoff": 35000,
                "node_snap_tolerance": 5,
                "street_side_tolerance": 5,
                "street_side_max_distance": 1000,
                "heading_tolerance": 60
            }
        },
        "thor": {
            "logging": { "type": "", "color": false },
            "service_defaults": {
                "minimum_reachability": 50,
                "radius": 0,
                "search_cutoff": 35000,
                "node_snap_tolerance": 5,
                "street_side_tolerance": 5,
                "street_side_max_distance": 1000,
                "heading_tolerance": 60
            }
        },
        "odin": {
            "logging": { "type": "", "color": false },
            "service_defaults": {
                "minimum_reachability": 50,
                "radius": 0,
                "search_cutoff": 35000,
                "node_snap_tolerance": 5,
                "street_side_tolerance": 5,
                "street_side_max_distance": 1000,
                "heading_tolerance": 60
            }
        },
        "meili": {
            "customizable": ["mode", "search_radius", "turn_penalty_factor", "gps_accuracy"],
            "mode": "auto",
            "default": {
                "beta": 3,
                "breakage_distance": 2000,
                "geometry": false,
                "gps_accuracy": 5.0,
                "interpolation_distance": 10,
                "max_route_distance_factor": 5,
                "max_route_time_factor": 5,
                "max_search_radius": 100,
                "route": true,
                "search_radius": 50,
                "sigma_z": 4.07,
                "turn_penalty_factor": 0
            }
        },
        "service_limits": {
            "auto": { "max_distance": 5000000.0, "max_locations": 20 },
            "bicycle": { "max_distance": 500000.0, "max_locations": 50 },
            "bus": { "max_distance": 5000000.0, "max_locations": 50 },
            "motor_scooter": { "max_distance": 500000.0, "max_locations": 50 },
            "motorcycle": { "max_distance": 500000.0, "max_locations": 50 },
            "pedestrian": { "max_distance": 250000.0, "max_locations": 50, "max_transit_walking_distance": 10000 },
            "truck": { "max_distance": 5000000.0, "max_locations": 20 }
        },
        "costing_options": {
            "auto": {},
            "bicycle": {},
            "bus": {},
            "motor_scooter": {},
            "motorcycle": {},
            "pedestrian": {},
            "truck": {}
        }
    })";
}

/**
 * Extract tar archive to Emscripten virtual filesystem
 */
bool extractTarToFS(const std::string& tarData) {
    // Simple tar extraction (POSIX tar format)
    // Header is 512 bytes, followed by data rounded up to 512 bytes
    
    size_t pos = 0;
    const size_t headerSize = 512;
    
    // Create tiles directory
    EM_ASM({
        try {
            FS.mkdir('/tiles');
        } catch (e) {
            // Directory may already exist
        }
    });
    
    while (pos + headerSize <= tarData.size()) {
        // Read header
        const char* header = tarData.c_str() + pos;
        
        // Check for end of archive (two zero blocks)
        bool allZero = true;
        for (int i = 0; i < headerSize; i++) {
            if (header[i] != 0) {
                allZero = false;
                break;
            }
        }
        if (allZero) break;
        
        // Parse filename (first 100 bytes)
        std::string filename(header, 100);
        filename = filename.c_str(); // Trim at null
        
        // Parse file size (octal, bytes 124-135)
        std::string sizeStr(header + 124, 11);
        size_t fileSize = 0;
        for (char c : sizeStr) {
            if (c >= '0' && c <= '7') {
                fileSize = fileSize * 8 + (c - '0');
            }
        }
        
        // Parse type flag (byte 156)
        char typeFlag = header[156];
        
        pos += headerSize;
        
        if (typeFlag == '5' || typeFlag == 'd') {
            // Directory
            EM_ASM_({
                try {
                    FS.mkdir('/tiles/' + UTF8ToString($0));
                } catch (e) {}
            }, filename.c_str());
        } else if (typeFlag == '0' || typeFlag == '\0') {
            // Regular file
            if (fileSize > 0 && pos + fileSize <= tarData.size()) {
                std::string fileData = tarData.substr(pos, fileSize);
                
                EM_ASM_({
                    var path = '/tiles/' + UTF8ToString($0);
                    var data = new Uint8Array($2);
                    for (var i = 0; i < $2; i++) {
                        data[i] = HEAPU8[$1 + i];
                    }
                    
                    // Create parent directories
                    var parts = path.split('/');
                    parts.pop();
                    var dir = '';
                    for (var i = 0; i < parts.length; i++) {
                        if (parts[i]) {
                            dir += '/' + parts[i];
                            try { FS.mkdir(dir); } catch (e) {}
                        }
                    }
                    
                    FS.writeFile(path, data);
                }, filename.c_str(), fileData.c_str(), fileSize);
            }
        }
        
        // Move to next entry (data rounded up to 512 bytes)
        pos += ((fileSize + 511) / 512) * 512;
    }
    
    return true;
}

} // anonymous namespace

/**
 * ValhallaRouter class exposed to JavaScript
 */
class ValhallaRouter {
public:
    ValhallaRouter() {}
    
    /**
     * Load tiles from a tar archive buffer
     */
    bool loadTiles(const std::string& tarData) {
        try {
            // Extract tiles to virtual filesystem
            if (!extractTarToFS(tarData)) {
                return false;
            }
            
            // Initialize Valhalla actor with config
            std::string config = getDefaultConfig();
            boost::property_tree::ptree pt;
            std::istringstream is(config);
            boost::property_tree::read_json(is, pt);
            
            actor = std::make_unique<valhalla::tyr::actor_t>(pt, true);
            tiles_loaded = true;
            
            return true;
        } catch (const std::exception& e) {
            EM_ASM_({
                console.error('Failed to load tiles:', UTF8ToString($0));
            }, e.what());
            return false;
        }
    }
    
    /**
     * Check if tiles are loaded
     */
    bool hasTiles() const {
        return tiles_loaded && actor != nullptr;
    }
    
    /**
     * Calculate a route
     */
    std::string route(const std::string& requestJson) {
        if (!tiles_loaded || !actor) {
            return R"({"error":"Tiles not loaded","error_code":900})";
        }
        
        try {
            // Call Valhalla route action
            return actor->route(requestJson);
        } catch (const std::exception& e) {
            std::ostringstream oss;
            oss << R"({"error":")" << e.what() << R"(","error_code":999})";
            return oss.str();
        }
    }
    
    /**
     * Clear loaded tiles
     */
    void clearTiles() {
        actor.reset();
        tiles_loaded = false;
        
        // Remove tiles from virtual filesystem
        EM_ASM({
            try {
                var removeDirRecursive = function(path) {
                    var entries = FS.readdir(path);
                    for (var i = 0; i < entries.length; i++) {
                        if (entries[i] === '.' || entries[i] === '..') continue;
                        var entryPath = path + '/' + entries[i];
                        var stat = FS.stat(entryPath);
                        if (FS.isDir(stat.mode)) {
                            removeDirRecursive(entryPath);
                            FS.rmdir(entryPath);
                        } else {
                            FS.unlink(entryPath);
                        }
                    }
                };
                removeDirRecursive('/tiles');
                FS.rmdir('/tiles');
            } catch (e) {}
        });
    }
    
    /**
     * Get version string
     */
    std::string getVersion() const {
        return valhalla_version;
    }
    
    /**
     * Get memory usage estimate
     */
    size_t getMemoryUsage() const {
        return EM_ASM_INT({
            return HEAP8.length;
        });
    }
};

// Emscripten bindings
EMSCRIPTEN_BINDINGS(valhalla_wasm) {
    class_<ValhallaRouter>("ValhallaRouter")
        .constructor<>()
        .function("loadTiles", &ValhallaRouter::loadTiles)
        .function("hasTiles", &ValhallaRouter::hasTiles)
        .function("route", &ValhallaRouter::route)
        .function("clearTiles", &ValhallaRouter::clearTiles)
        .function("getVersion", &ValhallaRouter::getVersion)
        .function("getMemoryUsage", &ValhallaRouter::getMemoryUsage);
    
    // Expose a factory function
    function("createRouter", &std::make_unique<ValhallaRouter>);
}
