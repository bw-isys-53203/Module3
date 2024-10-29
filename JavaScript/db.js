/**
 * db.js
 * Handles IndexedDB initialization and access for sleep tracking data
 * 
 * Core Responsibilities:
 * - Initializes and manages IndexedDB database
 * - Provides database access to other modules
 * - Handles database versioning and upgrades
 */

// Database configuration constants
const DB_NAME = 'sleepTrackerDB';
const DB_VERSION = 1;
const SLEEP_DATA_STORE = 'sleepData';

/**
 * Opens or creates the IndexedDB database
 * Creates sleep data store if it doesn't exist during version upgrade
 * 
 * Database Structure:
 * - Store Name: 'sleepData'
 * - Key: date (YYYY-MM-DD)
 * - Value: {
 *     date: string,
 *     baby: array of [startHour, endHour],
 *     user1: array of [startHour, endHour],
 *     user2: array of [startHour, endHour]
 *   }
 * 
 * @returns {Promise<IDBDatabase>} Database instance
 * @throws {Error} If database cannot be opened
 */
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database open errors
        request.onerror = (event) => {
            console.error("Error opening database:", event.target.error);
            reject(event.target.error);
        };

        // Handle database version upgrade/initialization
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(SLEEP_DATA_STORE)) {
                db.createObjectStore(SLEEP_DATA_STORE, { keyPath: 'date' });
            }
        };

        // Return database instance on successful open
        request.onsuccess = (event) => {
            console.log("Database opened successfully");
            resolve(event.target.result);
        };
    });
}