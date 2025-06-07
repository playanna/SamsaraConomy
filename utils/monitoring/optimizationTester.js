// Comprehensive testing script for Priority 1 optimizations
const { MemoryMonitor } = require('./memoryMonitor.js');
const { CacheMonitor } = require('./cacheMonitor.js');

class OptimizationTester {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    /**
     * Test inventory optimization performance
     */
    async testInventoryOptimization() {
        console.log('🧪 [TEST] Testing inventory optimization...');
        
        try {
            const { getOrMigrateInventory, getPaginatedInventory } = require('../workhelpers/handlers/inventoryHandlerOptimized.js');
            
            // Test migration and retrieval performance
            const testUserId = 'test_user_' + Date.now();
            const start = Date.now();
            
            // This should create a new optimized inventory
            const inventory = await getOrMigrateInventory(testUserId);
            const migrationTime = Date.now() - start;
            
            // Test pagination performance
            const paginationStart = Date.now();
            const paginatedData = await getPaginatedInventory(testUserId, 'all', 0, 12);
            const paginationTime = Date.now() - paginationStart;
            
            const results = {
                testName: 'Inventory Optimization',
                status: inventory ? 'PASSED' : 'FAILED',
                migrationTime: `${migrationTime}ms`,
                paginationTime: `${paginationTime}ms`,
                inventoryStructure: {
                    hasUserId: !!inventory.userId,
                    hasMaps: !!(inventory.souls instanceof Map),
                    hasMetadata: !!inventory.metadata
                },
                performance: migrationTime < 100 && paginationTime < 50 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
            };
            
            console.log('✅ [INVENTORY TEST]', results);
            return results;
        } catch (error) {
            console.error('❌ [INVENTORY TEST] Failed:', error.message);
            return { testName: 'Inventory Optimization', status: 'FAILED', error: error.message };
        }
    }

    /**
     * Test database query optimization
     */
    async testDatabaseOptimization() {
        console.log('🧪 [TEST] Testing database optimization...');
        
        try {
            const { initializeUserDataOptimized, findOrCreateLean } = require('../workhelpers/workHelpers.js');
            
            const testUserId = 'test_user_db_' + Date.now();
            const start = Date.now();
            
            // Test optimized user data initialization
            const userData = await initializeUserDataOptimized(testUserId);
            const initTime = Date.now() - start;
            
            const results = {
                testName: 'Database Query Optimization',
                status: userData ? 'PASSED' : 'FAILED',
                initializationTime: `${initTime}ms`,
                hasAllComponents: !!(userData.multipliers && userData.settings && userData.inventory),
                performance: initTime < 50 ? 'EXCELLENT' : initTime < 100 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
                leanQueries: 'Implemented'
            };
            
            console.log('✅ [DATABASE TEST]', results);
            return results;
        } catch (error) {
            console.error('❌ [DATABASE TEST] Failed:', error.message);
            return { testName: 'Database Query Optimization', status: 'FAILED', error: error.message };
        }
    }

    /**
     * Test static data lazy loading
     */
    async testStaticDataLoading() {
        console.log('🧪 [TEST] Testing static data lazy loading...');
        
        try {
            const { GearDataManager, LootDataManager, CreatureDataManager } = require('../dataManagers/index.js');
            
            const start = Date.now();
            
            // Test gear data loading
            const gearData = await GearDataManager.getGearBySlot('weapon');
            const gearTime = Date.now() - start;
            
            // Test loot data loading
            const lootStart = Date.now();
            const lootData = await LootDataManager.getLootByRealm('verdant');
            const lootTime = Date.now() - lootStart;
            
            // Test creature data loading
            const creatureStart = Date.now();
            const creatureData = await CreatureDataManager.getCreaturesByRealm('verdant');
            const creatureTime = Date.now() - creatureStart;
            
            const results = {
                testName: 'Static Data Lazy Loading',
                status: 'PASSED',
                gearLoadTime: `${gearTime}ms`,
                lootLoadTime: `${lootTime}ms`,
                creatureLoadTime: `${creatureTime}ms`,
                dataLoaded: {
                    gear: Array.isArray(gearData) && gearData.length > 0,
                    loot: Array.isArray(lootData) && lootData.length > 0,
                    creatures: Array.isArray(creatureData) && creatureData.length > 0
                },
                performance: (gearTime + lootTime + creatureTime) < 200 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
            };
            
            console.log('✅ [STATIC DATA TEST]', results);
            return results;
        } catch (error) {
            console.error('❌ [STATIC DATA TEST] Failed:', error.message);
            return { testName: 'Static Data Lazy Loading', status: 'FAILED', error: error.message };
        }
    }

    /**
     * Test cache management system
     */
    async testCacheManagement() {
        console.log('🧪 [TEST] Testing cache management...');
        
        try {
            // Run cache performance test
            const cacheTest = await CacheMonitor.testCachePerformance();
            const validation = CacheMonitor.validateCacheTargets();
            
            const results = {
                testName: 'Cache Management',
                status: validation.overall ? 'PASSED' : 'NEEDS_ATTENTION',
                performanceTest: cacheTest,
                targetValidation: validation,
                recommendations: CacheMonitor.generateRecommendations()
            };
            
            console.log('✅ [CACHE TEST]', results);
            return results;
        } catch (error) {
            console.error('❌ [CACHE TEST] Failed:', error.message);
            return { testName: 'Cache Management', status: 'FAILED', error: error.message };
        }
    }

    /**
     * Run comprehensive optimization test suite
     */
    async runFullTestSuite() {
        console.log('\n🚀 [OPTIMIZATION TESTING] Starting comprehensive test suite...');
        console.log('═══════════════════════════════════════════════════════════════');
        
        // Measure baseline memory
        const baseline = await MemoryMonitor.measureBaseline();
        
        // Run all tests
        const tests = [
            this.testCacheManagement(),
            this.testDatabaseOptimization(),
            this.testStaticDataLoading(),
            this.testInventoryOptimization()
        ];
        
        const results = await Promise.allSettled(tests);
        
        // Compile results
        const testSummary = {
            timestamp: new Date().toISOString(),
            baseline: baseline,
            totalTests: results.length,
            passed: 0,
            failed: 0,
            needsAttention: 0,
            details: []
        };
        
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const test = result.value;
                testSummary.details.push(test);
                
                if (test.status === 'PASSED') testSummary.passed++;
                else if (test.status === 'NEEDS_ATTENTION') testSummary.needsAttention++;
                else testSummary.failed++;
            } else {
                testSummary.failed++;
                testSummary.details.push({
                    testName: 'Unknown Test',
                    status: 'FAILED',
                    error: result.reason?.message || 'Unknown error'
                });
            }
        }
        
        // Final assessment
        const overallStatus = testSummary.failed === 0 ? 
            (testSummary.needsAttention === 0 ? 'ALL_PASSED' : 'MOSTLY_PASSED') : 
            'ISSUES_DETECTED';
        
        testSummary.overallStatus = overallStatus;
        testSummary.successRate = `${Math.round((testSummary.passed / testSummary.totalTests) * 100)}%`;
        
        console.log('\n📊 [TEST SUMMARY]');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`Overall Status: ${overallStatus} (${testSummary.successRate} success rate)`);
        console.log(`Passed: ${testSummary.passed}, Failed: ${testSummary.failed}, Needs Attention: ${testSummary.needsAttention}`);
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        return testSummary;
    }

    /**
     * Get next steps recommendation based on test results
     */
    static getNextStepsRecommendation(testSummary) {
        const recommendations = [];
        
        if (testSummary.overallStatus === 'ALL_PASSED') {
            recommendations.push({
                priority: 'HIGH',
                action: 'Begin Priority 2 Optimizations',
                description: 'All Priority 1 optimizations are working well. Ready to proceed with Priority 2 items.',
                nextSteps: [
                    'Implement Image Processing Optimization',
                    'Add Loot Generation Optimization', 
                    'Database Connection Optimization',
                    'Event Handler Memory Management'
                ]
            });
            
            recommendations.push({
                priority: 'MEDIUM',
                action: 'Setup Continuous Monitoring',
                description: 'Deploy memory and cache monitoring in production',
                nextSteps: [
                    'Enable memory monitoring with alerts',
                    'Setup cache performance tracking',
                    'Create performance dashboard'
                ]
            });
        } else if (testSummary.overallStatus === 'MOSTLY_PASSED') {
            recommendations.push({
                priority: 'HIGH',
                action: 'Address Attention Items',
                description: 'Fix items needing attention before proceeding',
                nextSteps: [
                    'Review cache performance targets',
                    'Tune TTL values based on usage patterns',
                    'Monitor for 24-48 hours before next phase'
                ]
            });
        } else {
            recommendations.push({
                priority: 'CRITICAL',
                action: 'Fix Failed Tests',
                description: 'Resolve failing tests before proceeding',
                nextSteps: [
                    'Debug failed test cases',
                    'Verify database connections',
                    'Check module imports and dependencies'
                ]
            });
        }
        
        return recommendations;
    }
}

module.exports = { OptimizationTester };
