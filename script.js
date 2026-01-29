const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-wrapper');

const state = {
    mode: 'select',
    path: [],
    zones: [],
    scale: 1,
    canvasUnitsWidth: 20,
    isDrawing: false,
    draggedZone: null,
    solvedLinkage: null,
    simulationAngle: 0,
    isPlaying: false,
    animationFrameId: null,
    selectedZoneIndex: null,
    showLengths: false,
    view: { x: 0, y: 0, zoom: 1 },
    isPanning: false,
    lastMousePos: null
};

function toWorld(screenX, screenY) {
    return {
        x: (screenX - state.view.x) / state.view.zoom,
        y: (screenY - state.view.y) / state.view.zoom
    };
}

function toScreen(worldX, worldY) {
    return {
        x: worldX * state.view.zoom + state.view.x,
        y: worldY * state.view.zoom + state.view.y
    };
}

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    state.scale = canvas.width / state.canvasUnitsWidth;
    draw();
}

window.addEventListener('resize', resizeCanvas);

document.getElementById('btn-select').addEventListener('click', () => setMode('select'));
document.getElementById('btn-draw').addEventListener('click', () => setMode('draw'));
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
    
    document.getElementById('linkage-type').textContent = '-';
    document.getElementById('theta-start').textContent = '-';
    document.getElementById('theta-end').textContent = '-';
    document.getElementById('path-error').textContent = '-';
    
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
    
    document.getElementById('linkage-type').textContent = '-';
    document.getElementById('theta-start').textContent = '-';
    document.getElementById('theta-end').textContent = '-';
    document.getElementById('path-error').textContent = '-';

    const solver = new Solver();
    const startZones = state.zones.filter(z => z.type === 'start');
    const passZones = state.zones.filter(z => z.type === 'pass');
    
    const linkage = await solver.solve(state.path, startZones, passZones, (attempt, iter, error) => {
        statusDiv.textContent = `Attempt ${attempt}/5, Iteration: ${iter}, Best Error: ${error === Infinity ? '-' : error.toFixed(2)}`;
    });
    
    state.solvedLinkage = linkage;
    btnSolve.disabled = false;
    statusDiv.textContent = linkage ? "Solution found!" : "No solution found.";
    
    if (linkage) {
        document.getElementById('linkage-type').textContent = linkage.type || 'four-bar';
        document.getElementById('simulation-slider').disabled = false;
        document.getElementById('btn-play').disabled = false;
        document.getElementById('chk-show-lengths').disabled = false;
        
        if (linkage.angleRange) {
            const toDeg = r => (r * 180 / Math.PI).toFixed(1) + '°';
            document.getElementById('theta-start').textContent = toDeg(linkage.angleRange.start);
            document.getElementById('theta-end').textContent = toDeg(linkage.angleRange.end);
        }
        
        document.getElementById('path-error').textContent = linkage.error.toFixed(2);
        
        draw();
    } else {
        document.getElementById('linkage-type').textContent = '-';
        document.getElementById('theta-start').textContent = '-';
        document.getElementById('theta-end').textContent = '-';
        document.getElementById('path-error').textContent = '-';
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

document.getElementById('chk-show-lengths').addEventListener('change', (e) => {
    state.showLengths = e.target.checked;
    draw();
});

function animate() {
    if (!state.isPlaying) return;
    
    if (state.animationDir === undefined) state.animationDir = 1;
    
    const range = state.solvedLinkage && state.solvedLinkage.angleRange;
    if (!range) {
         let angleDeg = (state.simulationAngle * 180 / Math.PI) + 2;
         if (angleDeg > 360) angleDeg = 0;
         state.simulationAngle = angleDeg * (Math.PI / 180);
    } else {
        const speed = 2 * (Math.PI / 180);
        let nextAngle = state.simulationAngle + speed * state.animationDir;
        
        if (state.simulationAngle < range.start || state.simulationAngle > range.end) {
             state.simulationAngle = range.start;
             state.animationDir = 1;
             nextAngle = range.start + speed;
        }

        if (nextAngle >= range.end) {
            nextAngle = range.end;
            state.animationDir = -1;
        } else if (nextAngle <= range.start) {
            nextAngle = range.start;
            state.animationDir = 1;
        }
        state.simulationAngle = nextAngle;
    }
    
    let displayAngle = state.simulationAngle % (2 * Math.PI);
    if (displayAngle < 0) displayAngle += 2 * Math.PI;
    slider.value = displayAngle * (180 / Math.PI);
    
    draw();
    
    state.animationFrameId = requestAnimationFrame(animate);
}


function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('#sidebar button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode}`).classList.add('active');
}

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomSensitivity = 0.008;
    const delta = -e.deltaY * zoomSensitivity;
    const newZoom = Math.max(0.1, Math.min(10, state.view.zoom * (1 + delta)));

    const worldPos = toWorld(mouseX, mouseY);
    state.view.x = mouseX - worldPos.x * newZoom;
    state.view.y = mouseY - worldPos.y * newZoom;
    state.view.zoom = newZoom;

    draw();
});

let dragStart = null;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (e.button === 1 || (e.buttons & 4)) {
        state.isPanning = true;
        state.lastMousePos = { x, y };
        return;
    }

    const worldPos = toWorld(x, y);
    const p = new Point(worldPos.x, worldPos.y);
    
    if (state.mode === 'select') {
        let clickedZone = false;
        for (let i = state.zones.length - 1; i >= 0; i--) {
            if (state.zones[i].contains(p)) {
                state.draggedZone = {
                    index: i,
                    offsetX: worldPos.x - state.zones[i].x,
                    offsetY: worldPos.y - state.zones[i].y
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

    if (state.isPanning && state.lastMousePos) {
        const dx = x - state.lastMousePos.x;
        const dy = y - state.lastMousePos.y;
        state.view.x += dx;
        state.view.y += dy;
        state.lastMousePos = { x, y };
        draw();
        return;
    }

    const worldPos = toWorld(x, y);
    const p = new Point(worldPos.x, worldPos.y);
    
    if (state.draggedZone) {
        const zone = state.zones[state.draggedZone.index];
        zone.x = worldPos.x - state.draggedZone.offsetX;
        zone.y = worldPos.y - state.draggedZone.offsetY;
        draw();
    } else if (state.mode === 'draw' && state.isDrawing) {
        const last = state.path[state.path.length - 1];
        if (p.dist(last) > 5) {
            state.path.push(p);
            draw();
        }
    } else if (dragStart) {
        draw();
        ctx.save();
        ctx.translate(state.view.x, state.view.y);
        ctx.scale(state.view.zoom, state.view.zoom);
        ctx.strokeStyle = '#00f';
        ctx.strokeRect(dragStart.x, dragStart.y, worldPos.x - dragStart.x, worldPos.y - dragStart.y);
        ctx.restore();
    }
});

canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (state.isPanning) {
        state.isPanning = false;
        state.lastMousePos = null;
        return;
    }

    const worldPos = toWorld(x, y);
    
    if (state.draggedZone) {
        state.draggedZone = null;
    } else if (state.mode === 'draw') {
        state.isDrawing = false;
    } else if (dragStart) {
        const w = worldPos.x - dragStart.x;
        const h = worldPos.y - dragStart.y;
        if (Math.abs(w) > 5 && Math.abs(h) > 5) {
            const rx = w < 0 ? worldPos.x : dragStart.x;
            const ry = h < 0 ? worldPos.y : dragStart.y;
            const type = state.mode === 'add-start-zone' ? 'start' : 'pass';
            state.zones.push(new Rect(rx, ry, Math.abs(w), Math.abs(h), type));
        }
        dragStart = null;
        draw();
    }
});


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(state.view.x, state.view.y);
    ctx.scale(state.view.zoom, state.view.zoom);

    const topLeft = toWorld(0, 0);
    const bottomRight = toWorld(canvas.width, canvas.height);
    
    const startX = Math.floor(topLeft.x / state.scale);
    const endX = Math.ceil(bottomRight.x / state.scale);
    const startY = Math.floor(topLeft.y / state.scale);
    const endY = Math.ceil(bottomRight.y / state.scale);

    ctx.beginPath();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1 / state.view.zoom;

    for (let i = startX; i <= endX; i++) {
        const x = i * state.scale;
        ctx.moveTo(x, topLeft.y);
        ctx.lineTo(x, bottomRight.y);
    }

    for (let i = startY; i <= endY; i++) {
        const y = i * state.scale;
        ctx.moveTo(topLeft.x, y);
        ctx.lineTo(bottomRight.x, y);
    }
    ctx.stroke();

    state.zones.forEach((z, i) => {
        ctx.fillStyle = z.type === 'start' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)';
        ctx.strokeStyle = z.type === 'start' ? 'green' : 'blue';
        
        if (i === state.selectedZoneIndex) {
            ctx.lineWidth = 3 / state.view.zoom;
            ctx.strokeStyle = '#FFD700';
        } else {
            ctx.lineWidth = 1 / state.view.zoom;
        }

        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        
        ctx.lineWidth = 1 / state.view.zoom;
        ctx.fillStyle = '#000';
        
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.scale(1/state.view.zoom, 1/state.view.zoom);
        ctx.font = '10px sans-serif';
        const wUnits = (z.w / state.scale).toFixed(1);
        const hUnits = (z.h / state.scale).toFixed(1);
        ctx.fillText(`${wUnits} x ${hUnits}`, 5, 15);
        ctx.restore();
    });
    
    if (state.path.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2 / state.view.zoom;
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
        ctx.lineWidth = 1 / state.view.zoom;
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
            const colors = {
                locked: '#7f8c8d',
                driven: '#27ae60',
                unlocked: '#2980b9',
                tracer: '#e74c3c'
            };

            const type = state.solvedLinkage.type || 'four-bar';
            
            const drawPoint = (p, color, radius = 4) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius / state.view.zoom, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1 / state.view.zoom;
                ctx.stroke();
            };

            const drawGroundSymbol = (p) => {
                const s = 12 / state.view.zoom;
                ctx.fillStyle = colors.locked;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - s/2, p.y + s);
                ctx.lineTo(p.x + s/2, p.y + s);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#7f8c8d';
                ctx.lineWidth = 1 / state.view.zoom;
                ctx.beginPath();
                ctx.moveTo(p.x - s/2, p.y + s);
                ctx.lineTo(p.x - s/2 - 2/state.view.zoom, p.y + s + 4/state.view.zoom);
                ctx.moveTo(p.x, p.y + s);
                ctx.lineTo(p.x - 2/state.view.zoom, p.y + s + 4/state.view.zoom);
                ctx.moveTo(p.x + s/2, p.y + s);
                ctx.lineTo(p.x + s/2 - 2/state.view.zoom, p.y + s + 4/state.view.zoom);
                ctx.stroke();
                
                drawPoint(p, colors.locked); 
            };

            if (type === 'four-bar') {
                ctx.lineWidth = 4 / state.view.zoom;
                ctx.strokeStyle = colors.locked;
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
                ctx.lineTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
                ctx.stroke();
                
                ctx.lineWidth = 5 / state.view.zoom;
                ctx.strokeStyle = colors.driven;
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
                ctx.lineTo(sol.A.x, sol.A.y);
                ctx.stroke();

                const rMotor = 12 / state.view.zoom;
                ctx.beginPath();
                ctx.strokeStyle = colors.driven;
                ctx.lineWidth = 2 / state.view.zoom;
                ctx.arc(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y, rMotor, 0, Math.PI * 1.5);
                ctx.stroke();
                ctx.beginPath();
                const arrowAngle = Math.PI * 1.5;
                const arrowX = state.solvedLinkage.p1.x + rMotor * Math.cos(arrowAngle);
                const arrowY = state.solvedLinkage.p1.y + rMotor * Math.sin(arrowAngle);
                ctx.moveTo(arrowX, arrowY);
                ctx.lineTo(arrowX - 4/state.view.zoom, arrowY + 2/state.view.zoom);
                ctx.moveTo(arrowX, arrowY);
                ctx.lineTo(arrowX + 2/state.view.zoom, arrowY + 4/state.view.zoom);
                ctx.stroke();
                
                ctx.lineWidth = 3 / state.view.zoom;
                ctx.strokeStyle = colors.unlocked;
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
                ctx.lineTo(sol.B.x, sol.B.y);
                ctx.stroke();
                
                ctx.lineWidth = 2 / state.view.zoom;
                ctx.strokeStyle = colors.unlocked;
                ctx.beginPath();
                ctx.moveTo(sol.A.x, sol.A.y);
                ctx.lineTo(sol.B.x, sol.B.y);
                ctx.lineTo(sol.P.x, sol.P.y);
                ctx.closePath();
                ctx.stroke();

                drawGroundSymbol(state.solvedLinkage.p1);
                drawGroundSymbol(state.solvedLinkage.p2);
                
                drawPoint(sol.A, colors.driven);
                drawPoint(sol.B, colors.unlocked);
                drawPoint(sol.P, colors.tracer, 6);

            } else if (type === 'five-bar') {
                ctx.lineWidth = 4 / state.view.zoom;
                ctx.strokeStyle = colors.locked;
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
                ctx.lineTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
                ctx.stroke();
                
                ctx.lineWidth = 5 / state.view.zoom;
                ctx.strokeStyle = colors.driven;
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
                ctx.lineTo(sol.A.x, sol.A.y);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
                ctx.lineTo(sol.B.x, sol.B.y);
                ctx.stroke();

                ctx.lineWidth = 3 / state.view.zoom;
                ctx.strokeStyle = colors.unlocked;
                ctx.beginPath();
                ctx.moveTo(sol.A.x, sol.A.y);
                ctx.lineTo(sol.C.x, sol.C.y);
                ctx.lineTo(sol.B.x, sol.B.y);
                ctx.stroke();
                
                ctx.lineWidth = 2 / state.view.zoom;
                ctx.beginPath();
                ctx.moveTo(sol.A.x, sol.A.y);
                ctx.lineTo(sol.C.x, sol.C.y);
                ctx.lineTo(sol.P.x, sol.P.y);
                ctx.closePath();
                ctx.stroke();

                drawGroundSymbol(state.solvedLinkage.p1);
                drawGroundSymbol(state.solvedLinkage.p2);
                
                drawPoint(sol.A, colors.driven);
                drawPoint(sol.B, colors.driven);
                drawPoint(sol.C, colors.unlocked);
                drawPoint(sol.P, colors.tracer, 6);

            } else if (type === 'six-bar') {
                ctx.lineWidth = 4 / state.view.zoom;
                ctx.strokeStyle = colors.locked;
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
                ctx.lineTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
                ctx.stroke();
                
                ctx.lineWidth = 5 / state.view.zoom;
                ctx.strokeStyle = colors.driven;
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p1.x, state.solvedLinkage.p1.y);
                ctx.lineTo(sol.A.x, sol.A.y);
                ctx.stroke();
                
                ctx.lineWidth = 3 / state.view.zoom;
                ctx.strokeStyle = colors.unlocked;
                ctx.beginPath();
                ctx.moveTo(sol.A.x, sol.A.y);
                ctx.lineTo(sol.B.x, sol.B.y);
                ctx.lineTo(sol.C.x, sol.C.y);
                ctx.closePath();
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(state.solvedLinkage.p2.x, state.solvedLinkage.p2.y);
                ctx.lineTo(sol.B.x, sol.B.y);
                ctx.lineTo(sol.D.x, sol.D.y);
                ctx.closePath();
                ctx.stroke();
                
                ctx.lineWidth = 2 / state.view.zoom;
                ctx.beginPath();
                ctx.moveTo(sol.C.x, sol.C.y);
                ctx.lineTo(sol.P.x, sol.P.y);
                ctx.lineTo(sol.D.x, sol.D.y);
                ctx.stroke();
                
                drawGroundSymbol(state.solvedLinkage.p1);
                drawGroundSymbol(state.solvedLinkage.p2);
                
                drawPoint(sol.A, colors.driven);
                drawPoint(sol.B, colors.unlocked);
                drawPoint(sol.C, colors.unlocked, 3);
                drawPoint(sol.D, colors.unlocked, 3);
                drawPoint(sol.P, colors.tracer, 6);
            }


            if (state.showLengths) {
                const drawLength = (p1, p2, val) => {
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;
                    const len = (val / state.scale).toFixed(1);
                    
                    ctx.save();
                    ctx.translate(midX, midY);
                    ctx.scale(1/state.view.zoom, 1/state.view.zoom);

                    ctx.font = '12px sans-serif';
                    ctx.fillStyle = 'black';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const text = `${len} units`;
                    const metrics = ctx.measureText(text);
                    const padding = 2;
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(-metrics.width/2 - padding, -6 - padding, metrics.width + padding*2, 12 + padding*2);
                    ctx.fillStyle = 'black';
                    ctx.fillText(text, 0, 0);
                    ctx.restore();
                };

                if (type === 'four-bar') {
                    drawLength(state.solvedLinkage.p1, sol.A, state.solvedLinkage.l1);
                    drawLength(sol.A, sol.B, state.solvedLinkage.l2);
                    drawLength(state.solvedLinkage.p2, sol.B, state.solvedLinkage.l3);
                    drawLength(state.solvedLinkage.p1, state.solvedLinkage.p2, state.solvedLinkage.l4);
                } else if (type === 'five-bar') {
                    drawLength(state.solvedLinkage.p1, sol.A, state.solvedLinkage.l1);
                    drawLength(state.solvedLinkage.p2, sol.B, state.solvedLinkage.l2);
                    drawLength(sol.A, sol.C, state.solvedLinkage.l3);
                    drawLength(sol.B, sol.C, state.solvedLinkage.l4);
                    drawLength(state.solvedLinkage.p1, state.solvedLinkage.p2, state.solvedLinkage.p1.dist(state.solvedLinkage.p2));
                    drawLength(sol.C, sol.P, sol.C.dist(sol.P));
                    drawLength(sol.A, sol.P, sol.A.dist(sol.P));
                } else if (type === 'six-bar') {
                    drawLength(state.solvedLinkage.p1, sol.A, state.solvedLinkage.l1);
                    drawLength(sol.A, sol.B, state.solvedLinkage.l2);
                    drawLength(state.solvedLinkage.p2, sol.B, state.solvedLinkage.l3);
                    drawLength(state.solvedLinkage.p1, state.solvedLinkage.p2, state.solvedLinkage.l4);
                    drawLength(sol.C, sol.P, state.solvedLinkage.l5);
                    drawLength(sol.D, sol.P, state.solvedLinkage.l6);
                    drawLength(sol.A, sol.C, sol.A.dist(sol.C));
                    drawLength(sol.B, sol.C, sol.B.dist(sol.C));
                    drawLength(state.solvedLinkage.p2, sol.D, state.solvedLinkage.p2.dist(sol.D));
                    drawLength(sol.B, sol.D, sol.B.dist(sol.D));
                }
            }
        }
    }
    
    ctx.restore();
}

resizeCanvas();
updateDeleteButtonState();

const modal = document.getElementById('help-modal');
const btnHelp = document.getElementById('btn-help');
const spanClose = document.getElementsByClassName('close-modal')[0];

if (btnHelp && modal && spanClose) {
    btnHelp.onclick = function() {
        modal.style.display = "block";
    }

    spanClose.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    switch(e.key.toLowerCase()) {
        case 's':
            setMode('select');
            break;
        case 'd':
            setMode('draw');
            break;
        case 'a':
            setMode('add-start-zone');
            break;
        case 'z':
            setMode('add-pass-zone');
            break;
        case 'delete':
        case 'backspace':
            document.getElementById('btn-delete-zone').click();
            break;
        case 'enter':
            if (!document.getElementById('btn-solve').disabled) {
                document.getElementById('btn-solve').click();
            }
            break;
        case ' ':
            e.preventDefault();
            if (!document.getElementById('btn-play').disabled) {
                document.getElementById('btn-play').click();
            }
            break;
        case 'escape':
            setMode('select');
            state.selectedZoneIndex = null;
            updateDeleteButtonState();
            draw();
            break;
    }
});
