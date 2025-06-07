// Memory monitoring implementation for tracking RAM optimization results
const fs = require('fs').promises;
const path = require('path');

class MemoryMonitor {
    constructor() {
        this.logPath = path.join(__dirname, '../../logs/memory-logs.txt');
        this.startTime = Date.now();
        this.isMonitoring = false;
        this.memoryAlerts = [];
    }

    /**
     * Log current memory usage to console and file
     */
    static logMemoryUsage() {
        const usage = process.memoryUsage();
        const timestamp = new Date().toISOString();
        
        const memoryInfo = {
            timestamp,
            rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
            external: `${Math.round(usage.external / 1024 / 1024)} MB`,
            arrayBuffers: `${Math.round(usage.arrayBuffers / 1024 / 1024)} MB`
        };

        console.log(`[MEMORY] ${timestamp} - RSS: ${memoryInfo.rss}, Heap Used: ${memoryInfo.heapUsed}, Heap Total: ${memoryInfo.heapTotal}`);
        return memoryInfo;
    }

    /**
     * Setup memory alerts and monitoring
     */
    static setupMemoryAlerts() {
        const monitor = new MemoryMonitor();
        
        const alertInterval = setInterval(() => {
            const usage = process.memoryUsage();
            const heapUsedMB = usage.heapUsed / 1024 / 1024;
            const rssMB = usage.rss / 1024 / 1024;
            
            // Alert thresholds based on roadmap targets
            if (heapUsedMB > 512) { // 512MB threshold (roadmap target: stay under 512MB)
                console.warn(`🚨 [MEMORY ALERT] High heap usage: ${Math.round(heapUsedMB)} MB`);
                monitor.memoryAlerts.push({
                    type: 'HIGH_HEAP',
                    value: heapUsedMB,
                    timestamp: new Date().toISOString()
                });
            }
            
            if (rssMB > 1000) { // 1GB threshold
                console.warn(`🚨 [MEMORY ALERT] High RSS usage: ${Math.round(rssMB)} MB`);
                monitor.memoryAlerts.push({
                    type: 'HIGH_RSS',
                    value: rssMB,
                    timestamp: new Date().toISOString()
                });
                
                // Trigger cache cleanup
                try {
                    const { cacheManager } = require('../cache/cacheManager.js');
                    cacheManager.handleMemoryPressure();
                    console.log('🧹 [MEMORY] Triggered cache cleanup due to high memory usage');
                } catch (error) {
                    console.error('Error triggering cache cleanup:', error);
                }
            }
        }, 60000); // Check every minute

        console.log('📊 [MEMORY] Memory monitoring started - checking every 60 seconds');
        return { monitor, alertInterval };
    }

    /**
     * Start continuous memory monitoring with file logging
     */
    async startMonitoring(intervalMs = 300000) { // Default: 5 minutes
        if (this.isMonitoring) {
            console.log('⚠️ [MEMORY] Monitoring already active');
            return;
        }

        this.isMonitoring = true;
        console.log(`📊 [MEMORY] Started continuous monitoring (${intervalMs/1000}s intervals)`);

        // Ensure logs directory exists
        const logsDir = path.dirname(this.logPath);
        try {
            await fs.mkdir(logsDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }

        this.monitoringInterval = setInterval(async () => {
            try {
                const memoryInfo = MemoryMonitor.logMemoryUsage();
                
                // Log to file
                const logEntry = `${memoryInfo.timestamp}: RSS=${memoryInfo.rss}, HeapUsed=${memoryInfo.heapUsed}, HeapTotal=${memoryInfo.heapTotal}\n`;
                await fs.appendFile(this.logPath, logEntry);
                
            } catch (error) {
                console.error('Error logging memory usage:', error);
            }
        }, intervalMs);
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.isMonitoring = false;
            console.log('📊 [MEMORY] Monitoring stopped');
        }
    }

    /**
     * Get memory usage statistics since monitoring started
     */
    async getMemoryReport() {
        const currentUsage = process.memoryUsage();
        const uptime = (Date.now() - this.startTime) / 1000; // seconds

        return {
            uptime: `${Math.round(uptime / 60)} minutes`,
            currentMemory: {
                rss: `${Math.round(currentUsage.rss / 1024 / 1024)} MB`,
                heapUsed: `${Math.round(currentUsage.heapUsed / 1024 / 1024)} MB`,
                heapTotal: `${Math.round(currentUsage.heapTotal / 1024 / 1024)} MB`
            },
            alerts: this.memoryAlerts,
            alertCount: this.memoryAlerts.length
        };
    }

    /**
     * Performance baseline measurement
     */
    static async measureBaseline() {
        console.log('📏 [MEMORY] Measuring performance baseline...');
        
        const beforeGC = process.memoryUsage();
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const afterGC = process.memoryUsage();
        
        const baseline = {
            timestamp: new Date().toISOString(),
            beforeGC: {
                rss: Math.round(beforeGC.rss / 1024 / 1024),
                heapUsed: Math.round(beforeGC.heapUsed / 1024 / 1024),
                heapTotal: Math.round(beforeGC.heapTotal / 1024 / 1024)
            },
            afterGC: {
                rss: Math.round(afterGC.rss / 1024 / 1024),
                heapUsed: Math.round(afterGC.heapUsed / 1024 / 1024),
                heapTotal: Math.round(afterGC.heapTotal / 1024 / 1024)
            },
            gcEnabled: !!global.gc
        };

        console.log('📏 [BASELINE]', JSON.stringify(baseline, null, 2));
        return baseline;
    }
}

module.exports = { MemoryMonitor };
