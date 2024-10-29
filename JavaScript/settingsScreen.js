/**
 * settingsScreen.js
 * Manages user preferences and application settings
 * 
 * Dependencies:
 * - mainScreen.js: Chart updates and test data generation
 * - navigation.js: Screen management and UI updates
 * 
 * Core Responsibilities:
 * - Handles user name and color preferences
 * - Manages theme switching
 * - Coordinates settings changes across application
 * - Handles test data generation
 */

import { updateChart } from './mainScreen.js';
import { updateScreenElements, getCurrentDate } from './navigation.js';
import { generateDummyData } from './mainScreen.js';

document.addEventListener('DOMContentLoaded', () => {
    /**
     * Updates chart display with current date
     * Used after settings changes to refresh visualization
     */
    function updateChartWithDate() {
        const currentDate = getCurrentDate();
        updateChart(currentDate);
    }

    // Initialize test data generation functionality
    const generateButton = document.getElementById('generate-test-data');
    if (generateButton) {
        generateButton.addEventListener('click', async () => {
            console.log('Generate test data button clicked');
            await generateDummyData();
            updateChartWithDate();
        });
    }

    /**
     * Name input event listeners
     * Updates display names and persists changes to localStorage
     */
    document.getElementById('baby-name').addEventListener('input', (e) => {
        document.getElementById('baby-name-display').textContent = e.target.value;
        localStorage.setItem('babyName', e.target.value); 
        triggerSettingsChanged();
    });

    document.getElementById('user1-name').addEventListener('input', (e) => {
        document.getElementById('user1-name-display').textContent = e.target.value;
        localStorage.setItem('user1Name', e.target.value); 
        triggerSettingsChanged();
    });

    document.getElementById('user2-name').addEventListener('input', (e) => {
        document.getElementById('user2-name-display').textContent = e.target.value;
        localStorage.setItem('user2Name', e.target.value);
        triggerSettingsChanged();
    });

    /**
     * Color input event listeners
     * Updates user color indicators and persists changes to localStorage
     */
    document.getElementById('baby-color').addEventListener('input', (e) => {
        document.getElementById('baby-circle').style.backgroundColor = e.target.value;
        localStorage.setItem('babyColor', e.target.value);
        triggerSettingsChanged();
    });

    document.getElementById('user1-color').addEventListener('input', (e) => {
        document.getElementById('user1-circle').style.backgroundColor = e.target.value;
        localStorage.setItem('user1Color', e.target.value); 
        triggerSettingsChanged();
    });

    document.getElementById('user2-color').addEventListener('input', (e) => {
        document.getElementById('user2-circle').style.backgroundColor = e.target.value;
        localStorage.setItem('user2Color', e.target.value); 
        triggerSettingsChanged();
    });

    /**
     * Theme management
     * Handles switching between different visual themes
     */
    const themeSelect = document.getElementById('theme-select');

    /**
     * Loads a theme's stylesheet
     * Removes existing theme before loading new one
     * @param {string} themeName - Name of theme to load
     */
    function loadThemeStylesheet(themeName) {
        // Clean up existing theme
        const existingThemeLink = document.querySelector('link[id="theme-stylesheet"]');
        if (existingThemeLink) {
            document.head.removeChild(existingThemeLink);
        }

        // Load new theme (except purple which is default/base theme)
        if (themeName !== 'purple') {
            const themeLink = document.createElement('link');
            themeLink.id = 'theme-stylesheet';
            themeLink.rel = 'stylesheet';
            themeLink.href = `/CSS/${themeName}.css`; 
            document.head.appendChild(themeLink);
        }
    }

    // Initialize theme from saved preference or default
    const savedTheme = localStorage.getItem('theme') || 'purple';
    themeSelect.value = savedTheme;
    loadThemeStylesheet(savedTheme);

    // Handle theme changes
    themeSelect.addEventListener('change', (event) => {
        const selectedTheme = event.target.value;
        localStorage.setItem('theme', selectedTheme);
        loadThemeStylesheet(selectedTheme);
        updateScreenElements();
    });

    // Initial UI update
    updateScreenElements();
});

/**
 * Dispatches settings change event
 * Notifies other components of user preference updates
 * Includes all current settings in event detail
 */
function triggerSettingsChanged() {
    console.log('Triggering settings changed event...');
    window.dispatchEvent(new CustomEvent('settingsChanged', {
        detail: {
            babyName: localStorage.getItem('babyName'),
            babyColor: localStorage.getItem('babyColor'),
            user1Name: localStorage.getItem('user1Name'),
            user1Color: localStorage.getItem('user1Color'),
            user2Name: localStorage.getItem('user2Name'),
            user2Color: localStorage.getItem('user2Color')
        }
    }));
}