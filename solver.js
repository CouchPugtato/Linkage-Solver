class Solver {
    constructor() {
        this.bestLinkage = null;
        this.bestError = Infinity;
        this.maxIterations = 10000;
    }

    async solve(targetPath, startZones, passZones, callback) {
        this.bestError = Infinity;
        
        const startTime = Date.now();
        
        for (let i = 0; i < this.maxIterations; i++) {
            if (i % 100 === 0) {
                await new Promise(r => setTimeout(r, 0));
                if (callback) callback(i, this.bestError);
            }

            const candidate = this.generateCandidate(startZones);
            
            const error = this.evaluate(candidate, targetPath, passZones);
            
            if (error < this.bestError) {
                this.bestError = error;
                this.bestLinkage = candidate;
                console.log(`New best error: ${error}`);
            }
        }
        
        return this.bestLinkage;
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

    evaluate(linkage, targetPath, passZones) {
        const curvePoints = [];
        const step = 5 * (Math.PI / 180);
        for (let theta = 0; theta < 2 * Math.PI; theta += step) {
            const sol = linkage.solve(theta);
            if (sol) {
                curvePoints.push(sol.P);
            }
        }
        
        if (curvePoints.length < 10) return Infinity;
        
        let totalDist = 0;
        let maxDist = 0;
        
        for (const tp of targetPath) {
            let minD = Infinity;
            for (const cp of curvePoints) {
                const d = tp.dist(cp);
                if (d < minD) minD = d;
            }
            totalDist += minD;
            if (minD > maxDist) maxDist = minD;
        }
        
        let zonePenalty = 0;
        for (const zone of passZones) {
            let passed = false;
            for (const cp of curvePoints) {
                if (zone.contains(cp)) {
                    passed = true;
                    break;
                }
            }
            if (!passed) zonePenalty += 10000;
        }
        
        return (totalDist / targetPath.length) + zonePenalty;
    }
}
