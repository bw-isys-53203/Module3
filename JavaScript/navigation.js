/**
 * navigation.js
 * Handles screen navigation and UI state management for the Sleep Tracker application.
 * 
 * Dependencies:
 * - mainScreen.js: Chart creation and updates
 * - graphScreen.js: Sleep data visualization
 * 
 * Core Responsibilities:
 * - Manages navigation between different screens (main, settings, data, demo)
 * - Handles user preference updates and storage
 * - Maintains UI state consistency across screen transitions
 * - Manages date display and formatting
 */

import { createAmChart, updateChart } from './mainScreen.js';
import { createLineGraph } from './graphScreen.js';
import { currentDate } from './mainScreen.js';

/**
 * Shows the main screen and hides all others
 * Recreates the sleep tracking chart to ensure fresh data display
 */
function showMainScreen() {
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
    document.getElementById('data-screen').classList.add('hidden');
    document.getElementById('demo-screen').classList.add('hidden');
    updateScreenElements();

    // Ensure clean chart recreation
    if (typeof amChartRadarChart !== 'undefined' && amChartRadarChart) {
        amChartRadarChart.dispose();
    }
    createAmChart().then(() => {
        updateChart(currentDate);
    }).catch(error => {
        console.error('Error recreating chart:', error);
    });
}

/**
 * Shows the settings screen and hides all others
 * Used for managing user preferences and app configuration
 */
function showSettingsScreen() {
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('settings-screen').classList.remove('hidden');
    document.getElementById('data-screen').classList.add('hidden');
    document.getElementById('demo-screen').classList.add('hidden');
    updateScreenElements();
}

/**
 * Shows the data visualization screen and hides all others
 * Initializes the line graph for sleep pattern analysis
 */
function showDataScreen() {
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
    document.getElementById('data-screen').classList.remove('hidden');
    document.getElementById('demo-screen').classList.add('hidden');
    updateScreenElements();
    createLineGraph();
}

/**
 * Shows the demo screen and hides all others
 * Used for first-time user experience and tutorial content
 */
export function showDemoScreen() {
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('settings-screen').classList.add('hidden');
    document.getElementById('data-screen').classList.add('hidden');
    document.getElementById('demo-screen').classList.remove('hidden');
    updateScreenElements();
}

// Register navigation event listeners
document.getElementById('settings-button').addEventListener('click', showSettingsScreen);
document.getElementById('back-button').addEventListener('click', showMainScreen);
document.getElementById('data-button').addEventListener('click', showDataScreen);
document.getElementById('data-back-button').addEventListener('click', showMainScreen);
document.getElementById('demo-button').addEventListener('click', showDemoScreen);
document.getElementById('demo-back-button').addEventListener('click', showSettingsScreen);
document.getElementById('demo-home-button').addEventListener('click', showMainScreen);

/**
 * Creates an event listener for name input fields
 * Updates both display and local storage when names change
 * @param {string} inputId - ID of the input element
 * @param {string} displayId - ID of the display element
 * @param {string} storageKey - localStorage key for the value
 */
function createNameInputListener(inputId, displayId, storageKey) {
    document.getElementById(inputId).addEventListener('input', (e) => {
        document.getElementById(displayId).textContent = e.target.value;
        localStorage.setItem(storageKey, e.target.value);
        updateScreenElements();
    });
}

// Initialize name input listeners
createNameInputListener('baby-name', 'baby-name-display', 'babyName');
createNameInputListener('user1-name', 'user1-name-display', 'user1Name');
createNameInputListener('user2-name', 'user2-name-display', 'user2Name');

/**
 * Creates an event listener for color input fields
 * Updates local storage when colors change
 * @param {string} inputId - ID of the input element
 * @param {string} storageKey - localStorage key for the value
 */
function createColorInputListener(inputId, storageKey) {
    document.getElementById(inputId).addEventListener('input', (e) => {
        localStorage.setItem(storageKey, e.target.value);
        updateScreenElements();
    });
}

// Initialize color input listeners
createColorInputListener('baby-color', 'babyColor');
createColorInputListener('user1-color', 'user1Color');
createColorInputListener('user2-color', 'user2Color');

/**
 * Initializes application settings on page load
 * Sets up default values and initial screen state
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * Initializes an input element with stored or default value
     * @param {string} inputId - ID of the input element
     * @param {string} storageKey - localStorage key to check
     * @param {string} defaultValue - Fallback value if nothing is stored
     */
    function initializeInput(inputId, storageKey, defaultValue) {
        const input = document.getElementById(inputId);
        input.value = localStorage.getItem(storageKey) || defaultValue;
    }

    // Initialize user inputs with defaults
    initializeInput('baby-name', 'babyName', 'Baby');
    initializeInput('user1-name', 'user1Name', 'User 1');
    initializeInput('user2-name', 'user2Name', 'User 2');

    // Initialize color preferences with defaults
    initializeInput('baby-color', 'babyColor', '#EC4899');
    initializeInput('user1-color', 'user1Color', '#06B6D4');
    initializeInput('user2-color', 'user2Color', '#F97316');

    // Set up initial screen state
    updateScreenElements();
    updateChart(currentDate);
});

/**
 * Updates all UI elements to reflect current user preferences
 * Called after settings changes and screen transitions
 */
export function updateScreenElements() {
    // Update name displays with stored or default values
    document.getElementById('baby-name-display').textContent = localStorage.getItem('babyName') || 'Baby';
    document.getElementById('user1-name-display').textContent = localStorage.getItem('user1Name') || 'User 1';
    document.getElementById('user2-name-display').textContent = localStorage.getItem('user2Name') || 'User 2';

    // Update color indicators with stored or default values
    document.getElementById('baby-circle').style.backgroundColor = localStorage.getItem('babyColor') || '#EC4899';
    document.getElementById('user1-circle').style.backgroundColor = localStorage.getItem('user1Color') || '#06B6D4';
    document.getElementById('user2-circle').style.backgroundColor = localStorage.getItem('user2Color') || '#F97316';
}

/**
 * Retrieves the current date for use across modules
 * @returns {Date} Current application date
 */
export function getCurrentDate() {
    return currentDate;
}

/**
 * Updates the current date and refreshes date display
 * @param {Date} date - New date to set
 */
export function setCurrentDate(date) {
    currentDate = date;
    document.getElementById('currentDate').textContent = formatDate(currentDate);
}

/**
 * Formats a date object into MM/DD/YYYY string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}