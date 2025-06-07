// Cache performance monitoring and metrics collection
const { cacheManager } = require('../cache/cacheManager.js');

class CacheMonitor {
    constructor() {
        this.startTime = Date.now();
        this.baselineStats = null;
        this.performanceLog = [];
    }

    /**
     * Get detailed cache performance metrics
     */
    static getCacheMetrics() {
        const stats = cacheManager.getStats();
        const performance = cacheManager.getPerformanceMetrics();
        
        return {
            timestamp: new Date().toISOString(),
            stats,
            performance,
            categories: {
                USER_DATA: cacheManager.getCategoryStats('USER_DATA'),
                USERNAMES: cacheManager.getCategoryStats('USERNAMES'),
                LEADERBOARD: cacheManager.getCategoryStats('LEADERBOARD'),
                STATIC_DATA: cacheManager.getCategoryStats('STATIC_DATA'),
                IMAGES: cacheManager.getCategoryStats('IMAGES'),
                LOOT_TABLES: cacheManager.getCategoryStats('LOOT_TABLES')
            }
        };
    }

    /**
     * Check if cache performance meets roadmap targets
     */
    static validateCacheTargets() {
        const metrics = CacheMonitor.getCacheMetrics();
        const targets = {
            hitRate: 85, // Target: > 85% hit rate
            memoryUsageMB: 100, // Target: reasonable memory usage
            averageResponseTime: 5 // Target: < 5ms average response
        };

        const results = {
            timestamp: metrics.timestamp,
            targets,
            actual: {
                hitRate: metrics.performance.hitRate,
                memoryUsageMB: metrics.stats.memoryUsage ? Math.round(metrics.stats.memoryUsage / 1024 / 1024) : 0,
                averageResponseTime: metrics.performance.averageResponseTime || 0
            },
            passing: {},
            overall: true
        };

        // Check each target
        results.passing.hitRate = results.actual.hitRate >= targets.hitRate;
        results.passing.memoryUsage = results.actual.memoryUsageMB <= targets.memoryUsageMB;
        results.passing.responseTime = results.actual.averageResponseTime <= targets.averageResponseTime;
        
        results.overall = results.passing.hitRate && results.passing.memoryUsage && results.passing.responseTime;

        return results;
    }

    /**
     * Log cache performance with status indicators
     */
    static logCachePerformance() {
        const metrics = CacheMonitor.getCacheMetrics();
        const validation = CacheMonitor.validateCacheTargets();
        
        console.log('\n📊 [CACHE PERFORMANCE REPORT]');
        console.log('═══════════════════════════════════');
        console.log(`Timestamp: ${metrics.timestamp}`);
        console.log(`Hit Rate: ${metrics.performance.hitRate.toFixed(1)}% ${validation.passing.hitRate ? '✅' : '❌'} (Target: >85%)`);
        console.log(`Memory Usage: ${validation.actual.memoryUsageMB} MB ${validation.passing.memoryUsage ? '✅' : '❌'} (Target: <100MB)`);
        console.log(`Avg Response: ${validation.actual.averageResponseTime.toFixed(2)}ms ${validation.passing.responseTime ? '✅' : '❌'} (Target: <5ms)`);
        console.log(`Overall Status: ${validation.overall ? '✅ PASSING' : '❌ NEEDS ATTENTION'}`);
        
        // Category breakdown
        console.log('\n📋 Category Breakdown:');
        for (const [category, stats] of Object.entries(metrics.categories)) {
            if (stats && stats.keys > 0) {
                console.log(`  ${category}: ${stats.keys} keys, ${stats.hits}/${stats.misses} hit/miss`);
            }
        }
        console.log('═══════════════════════════════════\n');

        return { metrics, validation };
    }

    /**
     * Start automated cache monitoring
     */
    static startCacheMonitoring(intervalMs = 600000) { // Default: 10 minutes
        console.log(`📊 [CACHE] Started cache monitoring (${intervalMs/60000} minute intervals)`);
        
        // Initial baseline
        const baseline = CacheMonitor.logCachePerformance();
        
        const monitoringInterval = setInterval(() => {
            try {
                CacheMonitor.logCachePerformance();
            } catch (error) {
                console.error('Error in cache monitoring:', error);
            }
        }, intervalMs);

        return { baseline, monitoringInterval };
    }

    /**
     * Test cache performance with sample operations
     */
    static async testCachePerformance() {
        console.log('🧪 [CACHE TEST] Starting cache performance test...');
        
        const testKey = 'performance_test';
        const testData = { test: true, timestamp: Date.now(), data: Array(100).fill('sample') };
        
        // Test set operation
        const setStart = Date.now();
        cacheManager.set('USER_DATA', testKey, testData);
        const setTime = Date.now() - setStart;
        
        // Test get operation
        const getStart = Date.now();
        const retrieved = cacheManager.get('USER_DATA', testKey);
        const getTime = Date.now() - getStart;
        
        // Test delete operation
        const deleteStart = Date.now();
        cacheManager.del('USER_DATA', testKey);
        const deleteTime = Date.now() - deleteStart;
        
        const results = {
            setTime: `${setTime}ms`,
            getTime: `${getTime}ms`,
            deleteTime: `${deleteTime}ms`,
            dataRetrieval: retrieved ? 'SUCCESS' : 'FAILED',
            totalTime: `${setTime + getTime + deleteTime}ms`
        };
        
        console.log('🧪 [CACHE TEST] Results:', results);
        return results;
    }

    /**
     * Generate optimization recommendations based on current performance
     */
    static generateRecommendations() {
        const validation = CacheMonitor.validateCacheTargets();
        const recommendations = [];
        
        if (!validation.passing.hitRate) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Hit Rate',
                issue: `Hit rate is ${validation.actual.hitRate.toFixed(1)}%, below target of 85%`,
                suggestion: 'Consider increasing TTL values for frequently accessed data or pre-warming critical cache entries'
            });
        }
        
        if (!validation.passing.memoryUsage) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Memory Usage',
                issue: `Memory usage is ${validation.actual.memoryUsageMB}MB, above target of 100MB`,
                suggestion: 'Consider reducing TTL values or implementing more aggressive cleanup policies'
            });
        }
        
        if (!validation.passing.responseTime) {
            recommendations.push({
                priority: 'LOW',
                category: 'Response Time',
                issue: `Average response time is ${validation.actual.averageResponseTime.toFixed(2)}ms, above target of 5ms`,
                suggestion: 'Consider optimizing cache data structures or reducing serialization overhead'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'SUCCESS',
                category: 'Performance',
                issue: 'All cache performance targets are being met',
                suggestion: 'Continue monitoring and consider implementing Priority 2 optimizations'
            });
        }
        
        return recommendations;
    }
}

module.exports = { CacheMonitor };
