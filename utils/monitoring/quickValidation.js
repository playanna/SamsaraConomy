// Quick validation script to check Priority 1 optimizations
const { OptimizationTester } = require('./optimizationTester.js');
const { MemoryMonitor } = require('./memoryMonitor.js');
const { CacheMonitor } = require('./cacheMonitor.js');

async function runQuickValidation() {
    console.log('🚀 [QUICK VALIDATION] Starting Priority 1 optimization checks...\n');
    
    try {
        // 1. Memory baseline check
        console.log('📏 Step 1: Memory Baseline');
        const baseline = await MemoryMonitor.measureBaseline();
        
        // 2. Cache performance check
        console.log('\n📊 Step 2: Cache Performance');
        const cacheMetrics = CacheMonitor.logCachePerformance();
        
        // 3. Quick functionality tests
        console.log('\n🧪 Step 3: Functionality Tests');
        const tester = new OptimizationTester();
        
        // Test cache management
        const cacheTest = await tester.testCacheManagement();
        
        // Test database optimization  
        const dbTest = await tester.testDatabaseOptimization();
        
        // Generate summary
        const summary = {
            timestamp: new Date().toISOString(),
            baseline: baseline,
            cachePerformance: cacheMetrics.validation,
            tests: {
                cache: cacheTest.status,
                database: dbTest.status
            },
            nextSteps: []
        };
        
        // Determine next steps
        if (cacheTest.status === 'PASSED' && dbTest.status === 'PASSED') {
            summary.nextSteps = [
                '✅ Priority 1 optimizations are working',
                '📊 Ready for 24-48 hour monitoring period',
                '🚀 Consider starting Priority 2 optimizations',
                '⚡ Begin implementing Image Processing Optimization'
            ];
        } else {
            summary.nextSteps = [
                '⚠️ Some optimizations need attention',
                '🔧 Review failed tests and fix issues',
                '⏳ Re-run validation after fixes'
            ];
        }
        
        console.log('\n📋 [SUMMARY]');
        console.log('═══════════════════════════════════════');
        console.log(`Validation completed at: ${summary.timestamp}`);
        console.log(`Cache test: ${summary.tests.cache}`);
        console.log(`Database test: ${summary.tests.database}`);
        console.log(`Cache hit rate: ${summary.cachePerformance.actual.hitRate.toFixed(1)}%`);
        console.log('\n📍 Next Steps:');
        summary.nextSteps.forEach(step => console.log(`  ${step}`));
        console.log('═══════════════════════════════════════\n');
        
        return summary;
        
    } catch (error) {
        console.error('❌ [VALIDATION ERROR]', error);
        return { error: error.message, timestamp: new Date().toISOString() };
    }
}

// Auto-run if called directly
if (require.main === module) {
    runQuickValidation()
        .then(result => {
            if (result.error) {
                process.exit(1);
            } else {
                console.log('✅ Quick validation completed successfully');
                process.exit(0);
            }
        })
        .catch(error => {
            console.error('💥 Validation failed:', error);
            process.exit(1);
        });
}

module.exports = { runQuickValidation };
