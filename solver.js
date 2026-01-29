class Solver {
    constructor() {
        this.bestLinkage = null;
        this.bestError = Infinity;
        this.maxIterations = 5000;
        this.attempts = 5;
    }

    async solve(targetPath, startZones, passZones, callback) {
        let globalBestLinkage = null;
        let globalBestError = Infinity;

        const startTime = Date.now();

        for (let a = 1; a <= this.attempts; a++) {
            this.bestError = Infinity;
            this.bestLinkage = null;
            
            for (let i = 0; i < this.maxIterations; i++) {
                if (i % 100 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                    if (callback) callback(a, i, globalBestError);
                }

                const candidate = this.generateCandidate(startZones);
                
                const error = this.evaluate(candidate, targetPath, passZones, startZones);
                
                if (error < this.bestError) {
                    this.bestError = error;
                    this.bestLinkage = candidate;
                }
            }
            
            if (this.bestError < globalBestError) {
                globalBestError = this.bestError;
                globalBestLinkage = this.bestLinkage;
            }
        }
        
        this.bestLinkage = globalBestLinkage;
        this.bestError = globalBestError;

        if (this.bestLinkage) {
            this.bestLinkage.angleRange = this.findPathRange(this.bestLinkage, targetPath);
            this.bestLinkage.error = this.bestError;
        }

        return this.bestLinkage;
    }

    findPathRange(linkage, targetPath) {
        const step = 2 * (Math.PI / 180);
        let rawThetas = [];
        
        for (const tp of targetPath) {
            let bestTheta = 0;
            let minDist = Infinity;
            
            for (let t = 0; t < 2 * Math.PI; t += step) {
                const sol = linkage.solve(t);
                if (sol) {
                    const d = sol.P.dist(tp);
                    if (d < minDist) {
                        minDist = d;
                        bestTheta = t;
                    }
                }
            }
            rawThetas.push(bestTheta);
        }
        
        if (rawThetas.length === 0) return { start: 0, end: 2 * Math.PI };

        let unwrappedThetas = [rawThetas[0]];
        for (let i = 1; i < rawThetas.length; i++) {
            let prev = unwrappedThetas[i-1];
            let curr = rawThetas[i];
            
            let diff = curr - prev;
            
            while (curr - prev > Math.PI) curr -= 2 * Math.PI;
            while (curr - prev < -Math.PI) curr += 2 * Math.PI;
            
            unwrappedThetas.push(curr);
        }
        
        const minT = Math.min(...unwrappedThetas);
        const maxT = Math.max(...unwrappedThetas);
        
        return { start: minT, end: maxT };
    }

    generateCandidate(startZones) {
        let p1, p2;
        if (startZones.length > 0) {
            const z1 = startZones[Math.floor(Math.random() * startZones.length)];
            p1 = new Point(
                z1.x + Math.random() * z1.w,
                z1.y + Math.random() * z1.h
            );
            
            const z2 = startZones[Math.floor(Math.random() * startZones.length)];
            p2 = new Point(
                z2.x + Math.random() * z2.w,
                z2.y + Math.random() * z2.h
            );
        } else {
            p1 = new Point(Math.random() * 800, Math.random() * 600);
            p2 = new Point(Math.random() * 800, Math.random() * 600);
        }

        const l4 = p1.dist(p2);
        
        const scale = l4 || 100;
        const l1 = Math.random() * scale * 1.5;
        const l2 = Math.random() * scale * 2.0;
        const l3 = Math.random() * scale * 2.0;
        
        const cpU = (Math.random() - 0.5) * scale * 2;
        const cpV = (Math.random() - 0.5) * scale * 2;
        
        const linkage = new FourBarLinkage(p1, p2, l1, l2, l3, l4);
        linkage.cpU = cpU;
        linkage.cpV = cpV;
        
        return linkage;
    }

    evaluate(linkage, targetPath, passZones, startZones) {
        const curveSegments = [];
        const step = 5 * (Math.PI / 180);
        const validZones = [...(startZones || []), ...(passZones || [])];
        
        let startSol = null;
        let startMinDist = Infinity;
        const pStart = targetPath[0];

        let prevSol = null;
        let firstSol = null;

        for (let theta = 0; theta < 2 * Math.PI; theta += step) {
            const sol = linkage.solve(theta);
            if (sol) {
                if (validZones.length > 0) {
                    const pointsToCheck = [sol.A, sol.B, sol.P];
                    let allIn = true;
                    for (const p of pointsToCheck) {
                        let inZone = false;
                        for (const z of validZones) {
                            if (z.contains(p)) {
                                inZone = true;
                                break;
                            }
                        }
                        if (!inZone) {
                            allIn = false;
                            break;
                        }
                    }
                    if (!allIn) {
                        prevSol = null;
                        continue;
                    }
                }
                
                const d = sol.P.dist(pStart);
                if (d < startMinDist) {
                    startMinDist = d;
                    startSol = sol;
                }
                
                if (prevSol) {
                    curveSegments.push({ p1: prevSol.P, p2: sol.P });
                }
                
                if (!firstSol) firstSol = sol;
                prevSol = sol;
            } else {
                prevSol = null;
            }
        }
        
        if (prevSol && firstSol) {
             const solEnd = linkage.solve(0);
             if (solEnd && prevSol) {
                  curveSegments.push({ p1: prevSol.P, p2: firstSol.P });
             }
        }
        
        if (curveSegments.length < 5) return Infinity;
        
        if (startZones && startZones.length > 0 && startSol) {
            const startPoints = [startSol.A, startSol.B, startSol.P];
            for (const p of startPoints) {
                let inStartZone = false;
                for (const z of startZones) {
                    if (z.contains(p)) {
                        inStartZone = true;
                        break;
                    }
                }
                if (!inStartZone) return Infinity;
            }
        }
        
        let totalDist = 0;
        let maxDist = 0;
        
        for (const tp of targetPath) {
            let minDistSq = Infinity;
            
            for (const seg of curveSegments) {
                const v = seg.p1;
                const w = seg.p2;
                
                const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
                let dSq;
                if (l2 === 0) {
                    dSq = (tp.x - v.x)**2 + (tp.y - v.y)**2;
                } else {
                    let t = ((tp.x - v.x) * (w.x - v.x) + (tp.y - v.y) * (w.y - v.y)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    const px = v.x + t * (w.x - v.x);
                    const py = v.y + t * (w.y - v.y);
                    dSq = (tp.x - px)**2 + (tp.y - py)**2;
                }
                
                if (dSq < minDistSq) minDistSq = dSq;
            }
            
            const minD = Math.sqrt(minDistSq);
            totalDist += minD;
            if (minD > maxDist) maxDist = minD;
        }
        
        let zonePenalty = 0;
        for (const zone of passZones) {
            let passed = false;
            for (const seg of curveSegments) {
                if (zone.contains(seg.p1) || zone.contains(seg.p2)) {
                    passed = true;
                    break;
                }
            }
            if (!passed) zonePenalty += 10000;
        }
        
        return (totalDist / targetPath.length) + zonePenalty;
    }
}
