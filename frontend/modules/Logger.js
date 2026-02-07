/**
 * Logger Module - Centralized logging with levels and timestamps
 */

export class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        this.currentLevel = this.levels.INFO;
    }

    setLevel(level) {
        this.currentLevel = this.levels[level] || this.levels.INFO;
    }

    _log(level, message, data = null) {
        if (this.levels[level] < this.currentLevel) return;

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}] [${this.context}]`;
        
        if (data) {
            console[level.toLowerCase()](prefix, message, data);
        } else {
            console[level.toLowerCase()](prefix, message);
        }
    }

    debug(message, data = null) {
        this._log('DEBUG', message, data);
    }

    info(message, data = null) {
        this._log('INFO', message, data);
    }

    warn(message, data = null) {
        this._log('WARN', message, data);
    }

    error(message, data = null) {
        this._log('ERROR', message, data);
    }
}

