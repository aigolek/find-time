// CONFIGURATION
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzIsH8DgwLw5Lgg2tcr_W33ArMlMnoIg8R-Ac5SWkc2bU3EwczSJuqxahccG6LOlA9N/exec'
const startHour = 8;
const endHour = 23;
const days = 7;
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Global data object to store name lists
let data = {};

/**
 * 1. GENERATE CALENDAR
 * Creates the HTML table structure on page load
 */
function generateCalendar() {
    console.log("1. Generating Calendar...");
    const table = document.getElementById("calendar");
    
    // Header Row
    let header = "<tr><th>Time (MT)</th>";
    for (let d = 0; d < 7; d++) {
        header += `<th>${weekdays[d]}</th>`;
    }
    header += "</tr>";
    table.innerHTML = header;

    // Time Rows
    for (let h = startHour; h <= endHour; h++) {
        let row = `<tr><td>${h}:00</td>`;
        for (let d = 0; d < days; d++) {
            const id = `${d}_${h}`;
            row += `
            <td class="slot" id="${id}" onclick="toggle('${id}')">
                <div class="names" id="names_${id}"></div>
            </td>`;
        }
        row += "</tr>";
        table.innerHTML += row;
    }
}

/**
 * 2. TOGGLE SELECTION
 * Highlights a cell when a user clicks it
 */
function toggle(id) {
    const cell = document.getElementById(id);
    cell.classList.toggle("selected");
}

/**
 * 3. LOAD CLOUD DATA
 * Fetches the current list of names from Google Sheets
 */
async function loadCloudData() {
    console.log("2. Attempting to fetch from Google...");
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const cloudData = await response.json();
        console.log("3. Data received from Google:", cloudData);
        
        data = cloudData;
        refreshNames();
    } catch (e) {
        console.error("Fetch Error:", e);
        // Fallback: If Google fails, try to show what's in local memory
        const local = localStorage.getItem("availability");
        if(local) {
            data = JSON.parse(local);
            refreshNames();
        }
    }
}

/**
 * 4. REFRESH NAMES
 * Updates the text inside the calendar cells
 */
function refreshNames() {
    // Clear all existing name displays
    document.querySelectorAll(".names").forEach(div => div.innerText = "");
    
    // Loop through the data object (keys are Slot IDs)
    for (const slotId in data) {
        const el = document.getElementById("names_" + slotId);
        if (el) {
            // Join the array of names into a string
            el.innerText = data[slotId].join(", ");
        }
    }
}

/**
 * 5. SUBMIT AVAILABILITY
 * Sends the user's name and selected slots to Google Sheets
 */
async function submitAvailability() {
    const name = document.getElementById("username").value.trim();
    const selectedElements = document.querySelectorAll(".slot.selected");
    const selectedSlots = Array.from(selectedElements).map(el => el.id);

    if (!name) {
        alert("Please enter your name!");
        return;
    }
    if (selectedSlots.length === 0) {
        alert("Please click some time slots first!");
        return;
    }

    const btn = document.querySelector(".save");
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        console.log("Sending to Google:", { name, slots: selectedSlots });

        // POST data to Google
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Essential for Google Apps Script redirects
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: name, 
                slots: selectedSlots 
            })
        });

        // Save locally as a backup
        localStorage.setItem("availability", JSON.stringify(data));

        // Wait a moment for Google to finish the write operation, then refresh
        setTimeout(async () => {
            await loadCloudData(); 
            btn.innerText = originalText;
            btn.disabled = false;
            alert("Saved successfully!");
            
            // Clean up the UI
            document.querySelectorAll(".slot.selected").forEach(el => el.classList.remove("selected"));
        }, 1500);

    } catch (e) {
        console.error("Submission Error:", e);
        alert("Error saving data.");
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

/**
 * 6. FIND BEST TIME
 * Highlights slots with the most people
 */
function findBest() {
    let bestCount = 0;
    let bestSlots = [];

    // Reset previous "best" highlights
    document.querySelectorAll(".best").forEach(c => c.classList.remove("best"));

    for (const slot in data) {
        const count = data[slot].length;
        if (count > bestCount) {
            bestCount = count;
            bestSlots = [slot];
        } else if (count === bestCount && count > 0) {
            bestSlots.push(slot);
        }
    }

    bestSlots.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("best");
    });

    document.getElementById("result").innerText = 
        bestCount > 0 ? `Best slot has ${bestCount} people` : "No votes yet.";
}

/**
 * 7. RESET (LOCAL ONLY)
 * Note: This only clears local UI, not the Google Sheet
 */
function resetAvailability() {
    if (!confirm("Clear your current selections? (This won't delete data from the Google Sheet)")) return;
    document.querySelectorAll(".slot").forEach(cell => {
        cell.classList.remove("selected", "best");
    });
}

function doGet(e) {
    console.log("Google Script Received GET Request with params:", e);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    const allData = {};
    
    // Check if sheet has data beyond the header
    if (rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const name = rows[i][1];
        const slotString = rows[i][2] ? rows[i][2].toString() : "";
        if (!slotString) continue;

        const slots = slotString.split(",");
        slots.forEach(slotId => {
          const id = slotId.trim();
          if (id) {
            if (!allData[id]) allData[id] = [];
            if (!allData[id].includes(name)) {
              allData[id].push(name);
            }
          }
        });
      }
    }
    
    // This specific sequence helps bypass most CORS/Redirect issues
    const output = JSON.stringify(allData);
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"error": err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- INITIALIZE PAGE ---
const now = new Date();
const localTime = now.toLocaleString([], {hour: '2-digit', minute:'2-digit', weekday:'short', month:'short', day:'numeric'});
const mtTime = now.toLocaleString([], {hour: '2-digit', minute:'2-digit', weekday:'short', month:'short', day:'numeric', timeZone: 'America/Denver'});

document.getElementById("time-info").innerText = 
    `Your local time: ${localTime} | Mountain Time (MT): ${mtTime}`;

// 1. Build the table
generateCalendar();
// 2. Fetch names from Google to fill the table
loadCloudData();