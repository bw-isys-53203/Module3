/**
 * graphScreen.js
 * Provides data visualization for sleep patterns over time using Chart.js
 * 
 * Dependencies:
 * - db.js: Database access for sleep records
 * - navigation.js: Date management and UI state
 * 
 * Core Responsibilities:
 * - Aggregates sleep data over specified time periods
 * - Generates line graph visualization of sleep patterns
 * - Manages time range selection and display
 */

import { openDB } from './db.js';
import { getCurrentDate } from './navigation.js';

// Track the current chart instance for proper cleanup
let chartJSLineGraph;

/**
 * Retrieves and aggregates sleep data for specified number of days
 * Counts number of times each hour was slept for each user
 * @param {number} days - Number of days to analyze
 * @returns {Object} Sleep counts per hour for each user
 */
async function getSleepDataForRange(days) {
    console.log(`Getting sleep data for ${days} days`);
    const db = await openDB();
    const endDate = getCurrentDate();
    
    // Initialize counters for each hour (0-23) for each user
    const sleepCounts = {
        baby: Array(24).fill(0),
        user1: Array(24).fill(0),
        user2: Array(24).fill(0)
    };
    
    // Process each day in the range
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().slice(0, 10);
        console.log(`Checking date: ${dateString}`);
        
        try {
            // Retrieve data using Promise-based IndexedDB access
            const dayData = await new Promise((resolve, reject) => {
                const transaction = db.transaction(['sleepData'], 'readonly');
                const store = transaction.objectStore('sleepData');
                const request = store.get(dateString);
                
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
            
            // Process sleep ranges for each user
            if (dayData) {
                ['baby', 'user1', 'user2'].forEach(userKey => {
                    if (dayData[userKey] && Array.isArray(dayData[userKey])) {
                        dayData[userKey].forEach(([start, end]) => {
                            let hour = start;
                            while (hour !== end) {
                                sleepCounts[userKey][hour]++;
                                hour = (hour + 1) % 24;
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.error(`Error fetching data for ${dateString}:`, error);
        }
    }
    
    return sleepCounts;
}

/**
 * Creates or updates the line graph visualization
 * @param {number} days - Number of days to display (defaults to 14)
 * @returns {Chart} Chart.js instance
 */
export async function createLineGraph(days = 14) {
    const ctx = document.getElementById('lineGraph').getContext('2d');
    
    // Cleanup existing chart
    if (chartJSLineGraph) {
        chartJSLineGraph.destroy();
    }
    
    // Get user display preferences
    const babyName = localStorage.getItem('babyName') || 'Baby';
    const user1Name = localStorage.getItem('user1Name') || 'User 1';
    const user2Name = localStorage.getItem('user2Name') || 'User 2';
    const babyColor = localStorage.getItem('babyColor') || '#EC4899';
    const user1Color = localStorage.getItem('user1Color') || '#06B6D4';
    const user2Color = localStorage.getItem('user2Color') || '#F97316';

    // Fetch and process sleep data
    const sleepCounts = await getSleepDataForRange(days);
    
    // Create hour labels (00:00 to 23:00)
    const hourLabels = Array.from({ length: 24 }, (_, i) => 
        i.toString().padStart(2, '0') + ':00'
    );

    // Create new chart instance with configuration
    chartJSLineGraph = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourLabels,
            datasets: [
                {
                    label: babyName,
                    data: sleepCounts.baby,
                    borderColor: babyColor,
                    backgroundColor: babyColor + '40',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: user1Name,
                    data: sleepCounts.user1,
                    borderColor: user1Color,
                    backgroundColor: user1Color + '40',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: user2Name,
                    data: sleepCounts.user2,
                    borderColor: user2Color,
                    backgroundColor: user2Color + '40',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Sleep Patterns Over Past ${days} Days`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} days`;
                        }
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Hour of Day',
                        font: {
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Days',
                        font: {
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: calculateYAxisMax(days),
                    ticks: {
                        stepSize: days <= 14 ? 1 : Math.ceil(days / 20),
                        callback: function(value) {
                            return Math.floor(value);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                }
            }
        }
    });

    return chartJSLineGraph;
}

/**
 * Calculates the maximum y-axis value based on the date range
 * Includes buffer space for readability
 * @param {number} days - Number of days being displayed
 * @returns {number} Maximum y-axis value
 */
function calculateYAxisMax(days) {
    switch(days) {
        case 7:
            return 10;  // 7 + buffer, rounded to next clean number
        case 14:
            return 20;  // 14 + buffer, rounded to next clean number
        case 30:
            return 35;  // 30 + buffer, rounded to next clean number
        case 60:
            return 70;  // 60 + buffer, rounded to next clean number
        case 90:
            return 100; // 90 + buffer, rounded to next clean number
        default:
            return Math.ceil((days * 1.1) / 5) * 5; // Default formula with 10% buffer
    }
}

/**
 * Creates and adds range selection buttons to the UI
 * Buttons allow switching between different time periods
 */
function createRangeButtons() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-center gap-2 mb-4';
    
    // Create buttons for each time range
    [7, 14, 30, 60, 90].forEach(days => {
        const button = document.createElement('button');
        button.className = 'px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600';
        button.textContent = `${days} Days`;
        button.onclick = () => createLineGraph(days);
        buttonContainer.appendChild(button);
    });
    
    // Add buttons to UI if not already present
    const lineGraphEl = document.getElementById('lineGraph');
    if (lineGraphEl && !document.querySelector('.range-buttons')) {
        buttonContainer.classList.add('range-buttons');
        lineGraphEl.parentNode.insertBefore(buttonContainer, lineGraphEl);
    }
}

// Initialize graph and controls
document.addEventListener('DOMContentLoaded', () => {
    createRangeButtons();
    createLineGraph(14); // Start with 14-day view
});

/**
 * Updates the graph with current data
 * Called when sleep data is modified elsewhere in the application
 */
export function updateLineGraph() {
    createLineGraph(14); // Refresh with current range
}