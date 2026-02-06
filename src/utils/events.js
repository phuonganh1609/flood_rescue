import { EventEmitter } from 'events';

/**
 * Global event bus using Node.js EventEmitter
 * No need for external dependencies or separate eventBus file
 */
const eventBus = new EventEmitter();

// Set max listeners to avoid memory leak warnings
eventBus.setMaxListeners(20);

export { eventBus };
