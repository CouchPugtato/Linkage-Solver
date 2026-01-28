const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-wrapper');

const state = {
    mode: 'select',
    path: [],
    zones: [],
    scale: 1,
    canvasUnitsWidth: 100,
    isDrawing: false,
    draggedZone: null,
    solvedLinkage: null,
    simulationAngle: 0,
    isPlaying: false,
    animationFrameId: null,
    selectedZoneIndex: null
};

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    state.scale = canvas.width / state.canvasUnitsWidth;
    draw();
}

window.addEventListener('resize', resizeCanvas);

const inputWidth = document.getElementById('canvas-units-width');
inputWidth.addEventListener('change', (e) => {
    state.canvasUnitsWidth = parseFloat(e.target.value);
    state.scale = canvas.width / state.canvasUnitsWidth;
    draw();
});

document.getElementById('btn-select').addEventListener('click', () => setMode('select'));
document.getElementById('btn-draw-path').addEventListener('click', () => setMode('draw'));
document.getElementById('btn-add-start-zone').addEventListener('click', () => setMode('add-start-zone'));
document.getElementById('btn-add-pass-zone').addEventListener('click', () => setMode('add-pass-zone'));

document.getElementById('btn-add-manual-zone').addEventListener('click', () => {
    const wVal = parseFloat(document.getElementById('zone-w').value);
    const hVal = parseFloat(document.getElementById('zone-h').value);
    
    if (isNaN(wVal) || isNaN(hVal)) {
        alert("Please enter valid Width and Height");
        return;
    }
    
    const wPx = wVal * state.scale;
    const hPx = hVal * state.scale;
    const x = (canvas.width - wPx) / 2;
    const y = (canvas.height - hPx) / 2;
    
    const type = state.mode === 'add-pass-zone' ? 'pass' : 'start';
    state.zones.push(new Rect(x, y, wPx, hPx, type));
    draw();
});

document.getElementById('btn-clear').addEventListener('click', () => {
    state.path = [];
    state.zones = [];
    state.solvedLinkage = null;
    state.selectedZoneIndex = null;
    updateDeleteButtonState();
    draw();
});

document.getElementById('btn-clear-path').addEventListener('click', () => {
    state.path = [];
    draw();
});

document.getElementById('btn-delete-zone').addEventListener('click', () => {
    if (state.selectedZoneIndex !== null) {
        state.zones.splice(state.selectedZoneIndex, 1);
        state.selectedZoneIndex = null;
        updateDeleteButtonState();
        draw();
    }
});

function updateDeleteButtonState() {
    const btn = document.getElementById('btn-delete-zone');
    btn.disabled = state.selectedZoneIndex === null;
    if (btn.disabled) {
        btn.textContent = "Delete Selected Zone";
    } else {
        btn.textContent = `Delete Zone #${state.selectedZoneIndex + 1}`;
    }
}

const statusDiv = document.getElementById('status');
const btnSolve = document.getElementById('btn-solve');

btnSolve.addEventListener('click', async () => {
    if (state.path.length < 2) {
        alert("Please draw a path first.");
        return;
    }
    
    btnSolve.disabled = true;
    statusDiv.textContent = "Solving... (This may take a moment)";
    
    const solver = new Solver();
    const startZones = state.zones.filter(z => z.type === 'start');
    const passZones = state.zones.filter(z => z.type === 'pass');
    
    const linkage = await solver.solve(state.path, startZones, passZones, (iter, error) => {
        statusDiv.textContent = `Iteration: ${iter}, Error: ${error.toFixed(2)}`;
    });
    
    state.solvedLinkage = linkage;
    btnSolve.disabled = false;
    statusDiv.textContent = linkage ? "Solution found!" : "No solution found.";
    
    if (linkage) {
        document.getElementById('simulation-slider').disabled = false;
        document.getElementById('btn-play').disabled = false;
        draw();
    }
});

const slider = document.getElementById('simulation-slider');
slider.addEventListener('input', (e) => {
    state.simulationAngle = parseFloat(e.target.value) * (Math.PI / 180);
    draw();
});

const btnPlay = document.getElementById('btn-play');
btnPlay.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    btnPlay.textContent = state.isPlaying ? "Pause" : "Play";
    if (state.isPlaying) animate();
});

function animate() {
    if (!state.isPlaying) return;
    
    let angleDeg = (state.simulationAngle * 180 / Math.PI) + 2;
    if (angleDeg > 360) angleDeg = 0;
    
    state.simulationAngle = angleDeg * (Math.PI / 180);
    slider.value = angleDeg;
    draw();
    
    state.animationFrameId = requestAnimationFrame(animate);
}


function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('#sidebar button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
}

let dragStart = null;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = new Point(x, y);
    
    if (state.mode === 'select') {
        let clickedZone = false;
        for (let i = state.zones.length - 1; i >= 0; i--) {
            if (state.zones[i].contains(p)) {
                state.draggedZone = {
                    index: i,
                    offsetX: x - state.zones[i].x,
                    offsetY: y - state.zones[i].y
                };
                state.selectedZoneIndex = i;
                clickedZone = true;
                break;
            }
        }
        if (!clickedZone) {
            state.selectedZoneIndex = null;
        }
        updateDeleteButtonState();
        draw();
        if (clickedZone) return;
    } else if (state.mode === 'draw') {
        state.isDrawing = true;
        state.path = [p];
        draw();
    } else if (state.mode.startsWith('add')) {
        dragStart = p;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p = new Point(x, y);
    
    if (state.draggedZone) {
        const zone = state.zones[state.draggedZone.index];
        zone.x = x - state.draggedZone.offsetX;
        zone.y = y - state.draggedZone.offsetY;
        draw();
    } else if (state.mode === 'draw' && state.isDrawing) {
        const last = state.path[state.path.length - 1];
        if (p.dist(last) > 5) {
            state.path.push(p);
            draw();
        }
    } else if (dragStart) {
        draw();
        ctx.strokeStyle = '#00f';
        ctx.strokeRect(dragStart.x, dragStart.y, x - dragStart.x, y - dragStart.y);
    }
});

canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (state.draggedZone) {
        state.draggedZone = null;
    } else if (state.mode === 'draw') {
        state.isDrawing = false;
    } else if (dragStart) {
        const w = x - dragStart.x;
        const h = y - dragStart.y;
        if (Math.abs(w) > 5 && Math.abs(h) > 5) {
            const rx = w < 0 ? x : dragStart.x;
            const ry = h < 0 ? y : dragStart.y;
            const type = state.mode === 'add-start-zone' ? 'start' : 'pass';
            state.zones.push(new Rect(rx, ry, Math.abs(w), Math.abs(h), type));
        }
        dragStart = null;
        draw();
    }
});


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    state.zones.forEach((z, i) => {
        ctx.fillStyle = z.type === 'start' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)';
        ctx.strokeStyle = z.type === 'start' ? 'green' : 'blue';
        
        if (i === state.selectedZoneIndex) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FFD700'; // Gold color for selection
        } else {
            ctx.lineWidth = 1;
        }

        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        
        ctx.lineWidth = 1; // Reset line width
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        const wUnits = (z.w / state.scale).toFixed(1);
        const hUnits = (z.h / state.scale).toFixed(1);
        ctx.fillText(`${wUnits} x ${hUnits}`, z.x + 5, z.y + 15);
    });
    
    if (state.path.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.moveTo(state.path[0].x, state.path[0].y);
        for (let i = 1; i < state.path.length; i++) {
            ctx.lineTo(state.path[i].x, state.path[i].y);
        }
        ctx.stroke();
    }
    
    if (state.solvedLinkage) {
        const sol = state.solvedLinkage.solve(state.simulationAngle);
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        for (let th = 0; th < Math.PI * 2; th += 0.05) {
            const s = state.solvedLinkage.solve(th);
            if (s) {
                ctx.lineTo(s.P.x, s.P.y);
            } else {
                ctx.moveTo(0,0);
            }
        }
        ctx.stroke();
        
        if (sol) {
            ctx.lineWidth = 3;
            
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
            ctx.lineTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
            ctx.stroke();
            
            ctx.strokeStyle = 'purple';
            ctx.beginPath();
            ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
            ctx.lineTo(sol.A.x, sol.A.y);
            ctx.stroke();
            
            ctx.strokeStyle = 'orange';
            ctx.beginPath();
            ctx.moveTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
            ctx.lineTo(sol.B.x, sol.B.y);
            ctx.stroke();
            
            ctx.strokeStyle = 'blue';
            ctx.beginPath();
            ctx.moveTo(sol.A.x, sol.A.y);
            ctx.lineTo(sol.B.x, sol.B.y);
            ctx.lineTo(sol.P.x, sol.P.y);
            ctx.lineTo(sol.A.x, sol.A.y);
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            [state.solvedLinkage.p1, state.solvedLinkage.p2, sol.A, sol.B, sol.P].forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }
    }
}

resizeCanvas();
updateDeleteButtonState();
