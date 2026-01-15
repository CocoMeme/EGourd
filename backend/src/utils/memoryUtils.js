/**
 * Memory Utility Module
 * Provides memory monitoring and garbage collection hints for Render free tier (512MB limit)
 */

/**
 * Log current memory usage to console
 * @param {string} label - Context label for the log
 */
function logMemoryUsage(label = '') {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const rssMB = Math.round(used.rss / 1024 / 1024);

    console.log(`📊 Memory${label ? ` [${label}]` : ''}: Heap ${heapUsedMB}/${heapTotalMB}MB, RSS ${rssMB}MB`);

    return { heapUsedMB, heapTotalMB, rssMB };
}

/**
 * Hint garbage collection if available (requires --expose-gc flag)
 * Safe to call even if GC is not exposed
 */
function forceGC() {
    if (global.gc) {
        try {
            global.gc();
            console.log('🗑️ Garbage collection triggered');
        } catch (e) {
            console.warn('⚠️ GC hint failed:', e.message);
        }
    }
    // If gc not available, just return silently - this is expected in production
}

/**
 * Start periodic memory monitoring
 * @param {number} intervalMs - Interval between logs (default: 60000ms = 1 minute)
 * @returns {NodeJS.Timer} Interval ID for cleanup
 */
function startMemoryMonitor(intervalMs = 60000) {
    console.log(`📈 Memory monitoring started (every ${intervalMs / 1000}s)`);

    // Log immediately on start
    logMemoryUsage('Monitor Start');

    return setInterval(() => {
        const { heapUsedMB, rssMB } = logMemoryUsage('Periodic');

        // Warn if approaching limit (512MB on Render free tier)
        if (rssMB > 400) {
            console.warn(`⚠️ HIGH MEMORY WARNING: RSS at ${rssMB}MB (limit: 512MB)`);
            forceGC();
        }
    }, intervalMs);
}

/**
 * Check if memory usage is approaching threshold
 * @param {number} thresholdMB - Warning threshold in MB (default: 400)
 * @returns {boolean} True if above threshold
 */
function checkMemoryThreshold(thresholdMB = 400) {
    const used = process.memoryUsage();
    const rssMB = Math.round(used.rss / 1024 / 1024);

    if (rssMB > thresholdMB) {
        console.warn(`⚠️ Memory threshold exceeded: ${rssMB}MB > ${thresholdMB}MB`);
        return true;
    }
    return false;
}

/**
 * Clean up large objects by setting them to null
 * Helper for manual cleanup in hot paths
 * @param {...any} objects - Objects to nullify
 */
function cleanupObjects(...objects) {
    for (let i = 0; i < objects.length; i++) {
        objects[i] = null;
    }
}

module.exports = {
    logMemoryUsage,
    forceGC,
    startMemoryMonitor,
    checkMemoryThreshold,
    cleanupObjects
};
