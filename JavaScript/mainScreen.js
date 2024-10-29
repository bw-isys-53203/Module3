/**
 * mainScreen.js
 * Primary controller for the main sleep tracking interface.
 * 
 * Dependencies:
 * - db.js: Database operations for sleep data storage and retrieval
 * - navigation.js: Screen navigation and UI state management
 * - settingsScreen.js: User preferences and settings management
 * 
 * Core Responsibilities:
 * - Manages the circular sleep tracking chart (amChart)
 * - Handles sleep data CRUD operations
 * - Processes user interactions with the chart
 * - Maintains current user state and preferences
 */

import { openDB } from './db.js';
import { updateScreenElements, showDemoScreen } from './navigation.js';

// Global state management
let amChartRadarChart;  // Holds the instance of the main radar chart
export let currentDate = new Date();  // Tracks the currently displayed date
let selectedUserKey = 'baby';  // Tracks which user's data is being modified

/**
 * User data structure maintaining display preferences and sleep data cache
 * Keys: 'baby', 'user1', 'user2'
 * Values stored in localStorage with fallback defaults
 */
let userData = {
  'baby': { 
      displayName: localStorage.getItem('babyName') || 'Baby', 
      color: localStorage.getItem('babyColor') || '#FFC0CB',
      sleepData: {} 
  },
  'user1': { 
      displayName: localStorage.getItem('user1Name') || 'User 1',
      color: localStorage.getItem('user1Color') || '#87CEEB',
      sleepData: {} 
  },
  'user2': { 
      displayName: localStorage.getItem('user2Name') || 'User 2', 
      color: localStorage.getItem('user2Color') || '#FFD700',
      sleepData: {} 
  },
};

// Initialize test data generation button
document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generate-test-data');
    if (generateButton) {
        generateButton.addEventListener('click', async () => {
            console.log('Generate test data button clicked');
            await generateDummyData();
        });
    }
});

/**
 * Generates 60 days of sample sleep data for testing purposes
 * Clears existing data before generating new data
 * Creates realistic sleep patterns: single long period for adults, multiple shorter periods for baby
 */
export async function generateDummyData() {
    console.log('Generating dummy data...');
    const db = await openDB();
    const transaction = db.transaction(['sleepData'], 'readwrite');
    const store = transaction.objectStore('sleepData');
    
    await store.clear();  // Clear existing data
    
    // Generate data for past 60 days
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 60);
    
    for (let i = 0; i < 60; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateString = date.toISOString().slice(0, 10);
        
        const data = {
            date: dateString,
            baby: generateRandomSleepRanges(4),  // 4 sleep periods for baby
            user1: generateRandomSleepRanges(1), // 1 sleep period for adults
            user2: generateRandomSleepRanges(1)
        };
        
        await store.put(data);
        console.log(`Added data for ${dateString}:`, data);
    }
    
    await transaction.complete;
    console.log("Dummy data generation complete");
    await updateChart(currentDate);
}

/**
 * Generates random sleep time ranges based on realistic patterns
 * @param {number} numRanges - Number of sleep periods to generate
 * @returns {Array} Array of [startHour, endHour] pairs
 */
function generateRandomSleepRanges(numRanges) {
    const ranges = [];
    
    if (numRanges === 1) {
        // Adults: one longer sleep period (6-9 hours) starting between 22:00 and 02:00
        const startHour = Math.floor(Math.random() * 4) + 22;
        const duration = Math.floor(Math.random() * 4) + 6;
        ranges.push([startHour % 24, (startHour + duration) % 24]);
    } else {
        // Baby: multiple shorter sleep periods (2-4 hours) throughout the day
        for (let i = 0; i < numRanges; i++) {
            const startHour = Math.floor(Math.random() * 24);
            const duration = Math.floor(Math.random() * 3) + 2;
            ranges.push([startHour, (startHour + duration) % 24]);
        }
    }
    
    return ranges.sort((a, b) => a[0] - b[0]);
}

/**
 * Saves sleep data for a specific user and date to IndexedDB
 * @param {string} userKey - Identifier for the user ('baby', 'user1', 'user2')
 * @param {Date} date - Date for which to save sleep data
 * @param {Array} sleepRanges - Array of [startHour, endHour] pairs
 */
async function saveSleepData(userKey, date, sleepRanges) {
    const db = await openDB();
    const dateString = date.toISOString().slice(0, 10);
    
    const transaction = db.transaction(['sleepData'], 'readwrite');
    const store = transaction.objectStore('sleepData');
    
    try {
        const existingData = await store.get(dateString);
        const newData = existingData || { date: dateString };
        newData[userKey] = sleepRanges;
        
        await store.put(newData);
        userData[userKey].sleepData[dateString] = sleepRanges;
        console.log(`Saved sleep data for ${userKey} on ${dateString}:`, sleepRanges);
    } catch (error) {
        console.error("Error saving sleep data:", error);
    }
}

/**
 * Retrieves sleep data for a specific user and date
 * First checks local cache, then falls back to IndexedDB
 * @param {string} userKey - Identifier for the user
 * @param {Date} date - Date for which to retrieve data
 * @returns {Array} Array of [startHour, endHour] pairs, or empty array if no data
 */
async function getSleepData(userKey, date) {
    if (!date) {
        console.error('Error: getSleepData called with undefined date');
        return [];
    }

    const dateString = date.toISOString().slice(0, 10);
    console.log('Getting sleep data for date:', dateString);
    
    // Check cache first
    if (userData[userKey].sleepData[dateString]) {
        return userData[userKey].sleepData[dateString];
    }

    // Fall back to database
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['sleepData'], 'readonly');
            const store = transaction.objectStore('sleepData');
            const request = store.get(dateString);
            
            request.onsuccess = (event) => {
                const data = event.target.result;
                console.log('Retrieved data for', dateString, ':', data);
                
                if (data && data[userKey]) {
                    userData[userKey].sleepData[dateString] = data[userKey];
                    resolve(data[userKey]);
                } else {
                    userData[userKey].sleepData[dateString] = [];
                    resolve([]);
                }
            };
            
            request.onerror = (event) => {
                console.error("Error retrieving data:", event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log('Transaction completed');
            };
        });
    } catch (error) {
        console.error("Error accessing IndexedDB:", error);
        return [];
    }
}

/**
 * Creates and configures the amChart radar chart for sleep visualization
 * Chart displays 24-hour clock with sleep periods for baby (outer ring) and parents (inner rings)
 * @returns {Promise} Resolves with the created chart instance
 */
export function createAmChart() {
    return new Promise((resolve, reject) => { 
        am4core.ready(async function () {
            // Clear existing chart if present
            if (amChartRadarChart) {
                amChartRadarChart.dispose();
            }

            // Initialize chart with animated theme
            am4core.useTheme(am4themes_animated);
            var chart = am4core.create("chartdiv", am4charts.RadarChart);
            window.amChartRadarChart = chart;
            
            // Configure chart dimensions and layout
            chart.innerRadius = am4core.percent(20);
            chart.radius = am4core.percent(85);
            chart.seriesContainer.zIndex = 1;

            // Create and configure the hour labels (0-23)
            var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "hour";
            categoryAxis.renderer.grid.template.location = 0.5;
            categoryAxis.renderer.minGridDistance = 10;
            categoryAxis.renderer.labels.template.fontSize = 11;
            categoryAxis.renderer.labels.template.fill = am4core.color("#666666");
            categoryAxis.renderer.grid.template.strokeOpacity = 0.1;

            // Configure axis for baby's sleep data (outer ring)
            var babyAxis = chart.yAxes.push(new am4charts.ValueAxis());
            babyAxis.min = 0;
            babyAxis.max = 1;
            babyAxis.strictMinMax = true;
            babyAxis.renderer.grid.template.disabled = true;
            babyAxis.renderer.labels.template.disabled = true;
            babyAxis.renderer.axisAngle = 90;

            // Configure axis for parents' sleep data (inner rings)
            var userAxis = chart.yAxes.push(new am4charts.ValueAxis());
            userAxis.min = 0;
            userAxis.max = 1;
            userAxis.strictMinMax = true;
            userAxis.renderer.grid.template.disabled = true;
            userAxis.renderer.labels.template.disabled = true;
            userAxis.renderer.axisAngle = 90;

            // Initialize chart data structure (24 hours)
            let chartData = Array.from({ length: 24 }, (_, i) => ({
                hour: i.toString().padStart(2, '0'),
                baby: 0,
                user1: 0,
                user2: 0
            }));
            chart.data = chartData;

            // Create and configure baby's series (outer ring)
            let babySeries = chart.series.push(new am4charts.RadarColumnSeries());
            babySeries.dataFields.valueY = "baby";
            babySeries.dataFields.categoryX = "hour";
            babySeries.yAxis = babyAxis;
            babySeries.name = userData.baby.displayName;
            babySeries.columns.template.fill = am4core.color(userData.baby.color);
            babySeries.columns.template.strokeOpacity = 0.2;
            babySeries.columns.template.fillOpacity = 0.8;
            babySeries.columns.template.width = am4core.percent(100);
            babySeries.columns.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
            babySeries.columns.template.cornerRadius = 1;
            
            // Add hover effect for baby's series
            let babyHoverState = babySeries.columns.template.states.create("hover");
            babyHoverState.properties.fillOpacity = 0.9;

            // Create and configure series for parents (inner rings)
            ['user1', 'user2'].forEach((userKey, index) => {
                let series = chart.series.push(new am4charts.RadarColumnSeries());
                series.dataFields.valueY = userKey;
                series.dataFields.categoryX = "hour";
                series.yAxis = userAxis;
                series.name = userData[userKey].displayName;
                series.columns.template.fill = am4core.color(userData[userKey].color);
                series.columns.template.strokeOpacity = 0.2;
                series.columns.template.fillOpacity = 0.8;
                series.columns.template.width = am4core.percent(90);
                series.columns.template.cursorOverStyle = am4core.MouseCursorStyle.pointer;
                series.columns.template.cornerRadius = 1;
                
                // Add hover effect
                let hoverState = series.columns.template.states.create("hover");
                hoverState.properties.fillOpacity = 0.9;
                
                // Configure click handling
                series.columns.template.events.on("hit", function(ev) {
                    let hour = parseInt(ev.target.dataItem.categoryX);
                    console.log(`Column clicked: ${hour} for ${userKey}`);
                    toggleSleepHour(selectedUserKey, hour, currentDate);
                });
            });

            // Configure click handling for baby's series
            babySeries.columns.template.events.on("hit", function(ev) {
                let hour = parseInt(ev.target.dataItem.categoryX);
                console.log(`Column clicked: ${hour} for baby`);
                toggleSleepHour(selectedUserKey, hour, currentDate);
            });

            // Configure chart legend
            chart.legend = new am4charts.Legend();
            chart.legend.position = "bottom";
            chart.legend.contentAlign = "center";
            chart.legend.labels.template.fill = am4core.color("#666666");
            chart.legend.marginTop = 20;

            // Configure chart cursor
            chart.cursor = new am4charts.RadarCursor();
            chart.cursor.behavior = "none";
            chart.cursor.lineX.disabled = true;
            chart.cursor.lineY.disabled = true;
            chart.cursor.innerRadius = chart.innerRadius;

            // Add smooth animation on chart creation
            chart.appear(1000, 100);

            amChartRadarChart = chart;
            resolve(chart);
        });
    });
}

/**
 * Handles toggling sleep hours for a specific user
 * Manages the logic for adding, removing, and merging sleep ranges
 * @param {string} userKey - Identifier for the user
 * @param {number} hour - Hour to toggle (0-23)
 * @param {Date} date - Date to modify
 */
async function toggleSleepHour(userKey, hour, date) {
    if (!userKey || !userData[userKey]) {
        console.error("Invalid userKey:", userKey);
        return;
    }

    try {
        // Get current sleep ranges and prepare for update
        let sleepRanges = await getSleepData(userKey, date);
        let isInRange = false;
        let updatedRanges = [...sleepRanges];
        
        // Check if hour is within existing sleep range
        for (let i = 0; i < updatedRanges.length; i++) {
            let [start, end] = updatedRanges[i];
            
            if (hour >= start && hour < end) {
                isInRange = true;
                // Handle removing hour from existing range
                if (end - start === 1) {
                    updatedRanges.splice(i, 1);  // Remove single-hour range
                } else if (hour === start) {
                    updatedRanges[i][0]++;       // Move start forward
                } else if (hour === end - 1) {
                    updatedRanges[i][1]--;       // Move end backward
                } else {
                    // Split range into two
                    updatedRanges.splice(i + 1, 0, [hour + 1, end]);
                    updatedRanges[i][1] = hour;
                }
                break;
            }
        }
        
        // If hour isn't in a range, try to add it
        if (!isInRange) {
            let merged = false;
            // Try to merge with existing ranges
            for (let i = 0; i < updatedRanges.length; i++) {
                if (hour === updatedRanges[i][1]) {
                    updatedRanges[i][1]++;       // Extend end of range
                    merged = true;
                    break;
                } else if (hour + 1 === updatedRanges[i][0]) {
                    updatedRanges[i][0]--;       // Extend start of range
                    merged = true;
                    break;
                }
            }
            
            // Create new range if couldn't merge
            if (!merged) {
                updatedRanges.push([hour, hour + 1]);
            }
        }
        
        // Sort and merge overlapping ranges
        updatedRanges.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < updatedRanges.length - 1; i++) {
            if (updatedRanges[i][1] >= updatedRanges[i + 1][0]) {
                updatedRanges[i][1] = Math.max(updatedRanges[i][1], updatedRanges[i + 1][1]);
                updatedRanges.splice(i + 1, 1);
                i--;
            }
        }

        // Save changes and update display
        await saveSleepData(userKey, date, updatedRanges);
        await updateChart(date);
    } catch (error) {
        console.error('Error in toggleSleepHour:', error);
    }
}

/**
 * Updates the chart display with data for the specified date
 * @param {Date} date - Date to display data for
 */
export async function updateChart(date) {
    if (!date || !(date instanceof Date)) {
        console.error("Invalid date provided to updateChart:", date);
        return;
    }

    if (!amChartRadarChart) {
        await createAmChart();
    }
    await updateDataAndRefreshChart(date);
}

/**
 * Retrieves and processes sleep data for chart display
 * @param {Date} date - Date to process data for
 */
async function updateDataAndRefreshChart(date) {
    // Initialize empty data structure for all hours
    let chartData = Array.from({ length: 24 }, (_, i) => ({
        hour: i.toString().padStart(2, '0'),
        baby: 0,
        user1: 0,
        user2: 0
    }));

    // Process data for each user
    for (const userKey of ['baby', 'user1', 'user2']) {
        const sleepData = await getSleepData(userKey, date);
        
        if (sleepData && sleepData.length) {
            for (const [start, end] of sleepData) {
                let currentHour = start;
                while (currentHour !== end) {
                    chartData[currentHour][userKey] = 1;
                    currentHour = (currentHour + 1) % 24;
                }
            }
        }
    }

    // Update chart display
    if (amChartRadarChart) {
        amChartRadarChart.data = chartData;
        amChartRadarChart.invalidateData();
    }
}

/**
 * Formats a date as MM/DD/YYYY
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Initialize application when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    // Create and update initial chart
    await createAmChart();
    await updateChart(currentDate);
    updateScreenElements();
    
    // Configure initial display
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('currentDate').textContent = formatDate(currentDate);
    
    // Set up date navigation handlers - this goes to the previous day
    document.getElementById('prevDay').addEventListener('click', async () => {
        currentDate.setDate(currentDate.getDate() - 1);
        document.getElementById('currentDate').textContent = formatDate(currentDate);
        await updateChart(currentDate);
    });
    // Set up date navigation handlers - this goes to the next day
    document.getElementById('nextDay').addEventListener('click', async () => {
        currentDate.setDate(currentDate.getDate() + 1);
        document.getElementById('currentDate').textContent = formatDate(currentDate);
        await updateChart(currentDate);
    });
});

/**
 * Global handler for highlighting selected user
 * Updates visual indicators when user selection changes
 * @param {string} userKey - Identifier for the selected user
 */
window.toggleHighlight = function(userKey) {
    selectedUserKey = userKey;
    const circles = document.querySelectorAll('[id$="-circle"]');
    circles.forEach(circle => {
        const isSelected = circle.id === `${userKey}-circle`;
        circle.classList.toggle('ring-4', isSelected);
        circle.classList.toggle('ring-gray-600', isSelected);
        circle.classList.toggle('ring-offset-4', isSelected);
        circle.classList.toggle('ring-offset-white', isSelected);
    });
};

/**
 * Handler for settings changes
 * Updates user data and refreshes chart when settings change
 */
window.addEventListener('settingsChanged', (event) => {
    // Update user data with new settings
    userData.baby.displayName = event.detail.babyName || 'Baby';
    userData.baby.color = event.detail.babyColor || '#FFC0CB';
    userData.user1.displayName = event.detail.user1Name || 'User 1';
    userData.user1.color = event.detail.user1Color || '#87CEEB';
    userData.user2.displayName = event.detail.user2Name || 'User 2';
    userData.user2.color = event.detail.user2Color || '#FFD700';

    // Recreate chart with new settings
    if (amChartRadarChart) {
        amChartRadarChart.dispose();
    }
    createAmChart().then(() => {
        updateChart(currentDate);
    });
});

/**
 * First-time user experience initialization
 * Manages demo prompt and related settings
 */
document.addEventListener('DOMContentLoaded', () => {
    const isFirstTime = localStorage.getItem('showDemoPrompt') === null ? true : 
                       JSON.parse(localStorage.getItem('showDemoPrompt'));
    
    // Configure demo checkbox
    const demoCheckbox = document.getElementById('showDemoPrompt');
    if (demoCheckbox) {
        demoCheckbox.checked = isFirstTime;
        demoCheckbox.addEventListener('change', (e) => {
            localStorage.setItem('showDemoPrompt', e.target.checked);
        });
    }

    // Show initial demo prompt if needed
    if (isFirstTime) {
        showDemoPrompt();
    }
});

/**
 * Handles the display and interaction of the demo prompt modal
 * Controls navigation to demo screen and demo prompt settings
 */
function showDemoPrompt() {
    const modal = document.getElementById('demoModal');
    modal.classList.remove('hidden');

    // Configure modal buttons
    document.getElementById('confirmDemo').addEventListener('click', () => {
        modal.classList.add('hidden');
        document.getElementById('showDemoPrompt').checked = false;
        localStorage.setItem('showDemoPrompt', false);
        showDemoScreen();
    });

    document.getElementById('cancelDemo').addEventListener('click', () => {
        modal.classList.add('hidden');
        // Uncheck the demo prompt box
        document.getElementById('showDemoPrompt').checked = false;
        localStorage.setItem('showDemoPrompt', false);
    });
}
