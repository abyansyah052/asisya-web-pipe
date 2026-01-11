// =============================================
// LIGHTHOUSE CI CONFIGURATION
// Performance Testing for Asisya Assessment Platform
// =============================================

module.exports = {
  ci: {
    collect: {
      // Build the app first, then test
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
      
      // URLs to test
      url: [
        'http://localhost:3000/',           // Candidate Login
        'http://localhost:3000/adminpsi',   // Admin/Psychologist Login
      ],
      
      // Number of runs per URL (for consistency)
      numberOfRuns: 3,
      
      // Chrome flags for headless testing
      settings: {
        chromeFlags: '--no-sandbox --disable-gpu --headless',
        // Mobile-first testing
        formFactor: 'mobile',
        throttling: {
          // Simulate 4G connection
          rttMs: 150,
          throughputKbps: 1638,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
        },
      },
    },
    
    assert: {
      // Performance Budgets
      assertions: {
        // Core Web Vitals - CRITICAL
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],       // < 2s
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],     // < 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],      // < 0.1
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],           // < 300ms
        'interactive': ['warn', { maxNumericValue: 3800 }],                  // < 3.8s
        
        // Performance Score Thresholds
        'categories:performance': ['warn', { minScore: 0.8 }],               // > 80%
        'categories:accessibility': ['warn', { minScore: 0.9 }],             // > 90%
        'categories:best-practices': ['warn', { minScore: 0.9 }],            // > 90%
        'categories:seo': ['warn', { minScore: 0.9 }],                       // > 90%
        
        // Bundle Size Limits
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }],  // < 500KB JS
        'resource-summary:total:size': ['warn', { maxNumericValue: 1500000 }],  // < 1.5MB total
        
        // Network Requests
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 10 }],
        
        // Image Optimization
        'uses-webp-images': 'warn',
        'uses-optimized-images': 'warn',
        'uses-responsive-images': 'warn',
        
        // JavaScript Optimization  
        'unused-javascript': 'warn',
        'duplicated-javascript': 'warn',
        'legacy-javascript': 'warn',
        
        // CSS Optimization
        'unused-css-rules': 'warn',
        
        // Server Response
        'server-response-time': ['warn', { maxNumericValue: 600 }],  // < 600ms
        
        // Accessibility - CRITICAL for assessment platform
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'bypass': 'warn',
        
        // SEO Basics
        'meta-description': 'warn',
        'robots-txt': 'warn',
      },
    },
    
    upload: {
      // Upload to temporary public storage (free, expires in 7 days)
      target: 'temporary-public-storage',
    },
  },
};
