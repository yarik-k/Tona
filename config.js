const TONA_CONFIG = {
    SERVER_URL: 'http://localhost:8000',
    STATS_SERVER_URL: 'http://localhost:8001',
    MESSAGE_LIMIT: 30,
    MODAL_WIDTH: '1200px',
    MODAL_HEIGHT: '85vh',
    ENABLE_REAL_TIME_ANALYSIS: true,
    ENABLE_MEMORY: true,
    DEBUG_MODE: false,
    FEATURES: {
        TONE_ANALYSIS: true,
        SUGGESTION_COPY: true,
        STATISTICS_UPDATE: true,
        MEMORY_PERSISTENCE: true,
        COMPREHENSIVE_STATS: true
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TONA_CONFIG;
} 