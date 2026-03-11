const startHour = 8;
const endHour = 23;
const days = 7;

let data = JSON.parse(localStorage.getItem("availability") || "{}");

const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

function generateCalendar(){

    const table = document.getElementById("calendar");

    let header = "<tr><th>Time</th>";
    for(let d=0; d<7; d++){
        header += `<th>${weekdays[d]}</th>`;
    }
    header += "</tr>";
    
    table.innerHTML = header;

    for(let h=startHour; h<=endHour; h++){
        let row = `<tr><td>${h}:00</td>`;
        for(let d=0; d<days; d++){
            const id = `${d}_${h}`;
            row += `
            <td class="slot" id="${id}" onclick="toggle('${id}')">
                <div class="names" id="names_${id}"></div>
            </td>`;
        }
        row += "</tr>";
        table.innerHTML += row;
    }

    refreshNames();
}

function toggle(id){
    const cell = document.getElementById(id);
    cell.classList.toggle("selected");
}

function submitAvailability(){
    const name = document.getElementById("username").value;
    if(!name){
        alert("Enter name");
        return;
    }

    document.querySelectorAll(".slot.selected").forEach(cell=>{
        if(!data[cell.id]) data[cell.id] = [];
        if(!data[cell.id].includes(name)) data[cell.id].push(name);
    });

    localStorage.setItem("availability", JSON.stringify(data));
    refreshNames();
    alert("Saved!");
}

function refreshNames(){
    for(const slot in data){
        const el = document.getElementById("names_"+slot);
        if(el) el.innerText = data[slot].join(", ");
    }
}

function findBest(){
    let best = 0;
    let bestSlots = [];

    for(const slot in data){
        const count = data[slot].length;
        if(count > best){
            best = count;
            bestSlots = [slot];
        } else if(count === best){
            bestSlots.push(slot);
        }
    }

    document.querySelectorAll(".best").forEach(c=>c.classList.remove("best"));
    bestSlots.forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.classList.add("best");
    });

    document.getElementById("result").innerText =
        `Best slot has ${best} people`;
}

function resetAvailability() {
    if(!confirm("Are you sure you want to clear all votes?")) return;

    localStorage.removeItem("availability");
    data = {};

    document.querySelectorAll(".slot").forEach(cell=>{
        cell.classList.remove("selected","best");
        const nameDiv = document.getElementById("names_" + cell.id);
        if(nameDiv) nameDiv.innerText = "";
    });

    document.getElementById("result").innerText = "";
    alert("All votes have been cleared!");
}
const now = new Date();

// Your local time
const localTime = now.toLocaleString([], {hour: '2-digit', minute:'2-digit', weekday:'short', month:'short', day:'numeric'});

// Mountain Time (auto DST)
const mtTime = now.toLocaleString([], {hour: '2-digit', minute:'2-digit', weekday:'short', month:'short', day:'numeric', timeZone: 'America/Denver'});

document.getElementById("time-info").innerText = 
    `Your local time: ${localTime} | Mountain Time (MT): ${mtTime}`;
// Initialize calendar
generateCalendar();