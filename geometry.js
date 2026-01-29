class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    dist(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }
    
    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }
    
    sub(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }
    
    mult(scalar) {
        return new Point(this.x * scalar, this.y * scalar);
    }

    distToSegment(v, w) {
        const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
        if (l2 === 0) return this.dist(v);
        let t = ((this.x - v.x) * (w.x - v.x) + (this.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const px = v.x + t * (w.x - v.x);
        const py = v.y + t * (w.y - v.y);
        return Math.sqrt((this.x - px)**2 + (this.y - py)**2);
    }
}

class Rect {
    constructor(x, y, w, h, type) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.type = type;
    }

    contains(p) {
        return p.x >= this.x && p.x <= this.x + this.w &&
               p.y >= this.y && p.y <= this.y + this.h;
    }
}

class FourBarLinkage {
    constructor(p1, p2, l1, l2, l3, l4) {
        this.type = 'four-bar';
        this.p1 = p1;
        this.p2 = p2;
        this.l1 = l1;
        this.l2 = l2;
        this.l3 = l3;
        this.l4 = l4;
        
        this.cpU = 0;
        this.cpV = 0;
    }

    solve(theta) {
        const Ax = this.p1.x + this.l1 * Math.cos(theta);
        const Ay = this.p1.y + this.l1 * Math.sin(theta);
        
        const d2 = (Ax - this.p2.x)**2 + (Ay - this.p2.y)**2;
        const d = Math.sqrt(d2);
        
        if (d > this.l2 + this.l3 || d < Math.abs(this.l2 - this.l3) || d === 0) {
            return null;
        }
        
        const a = (this.l2**2 - this.l3**2 + d2) / (2 * d);
        const h = Math.sqrt(Math.max(0, this.l2**2 - a**2));
        
        const x2 = Ax + a * (this.p2.x - Ax) / d;
        const y2 = Ay + a * (this.p2.y - Ay) / d;
        
        const Bx = x2 + h * (this.p2.y - Ay) / d;
        const By = y2 - h * (this.p2.x - Ax) / d;
        
        const ABx = Bx - Ax;
        const ABy = By - Ay;
        
        const Px = Ax + (this.cpU * ABx - this.cpV * ABy) / this.l2;
        const Py = Ay + (this.cpU * ABy + this.cpV * ABx) / this.l2;

        return {
            A: new Point(Ax, Ay),
            B: new Point(Bx, By),
            P: new Point(Px, Py)
        };
    }
}

class GearedFiveBarLinkage {
    constructor(p1, p2, l1, l2, l3, l4, dist_p1_p2, gearRatio, phaseShift) {
        this.type = 'five-bar';
        this.p1 = p1;
        this.p2 = p2;
        this.l1 = l1;
        this.l2 = l2;
        this.l3 = l3;
        this.l4 = l4;
        
        this.gearRatio = gearRatio;
        this.phaseShift = phaseShift;
        
        this.cpU = 0;
        this.cpV = 0;
    }
    
    solve(theta) {
        const Ax = this.p1.x + this.l1 * Math.cos(theta);
        const Ay = this.p1.y + this.l1 * Math.sin(theta);
        
        const theta2 = theta * this.gearRatio + this.phaseShift;
        const Bx = this.p2.x + this.l2 * Math.cos(theta2);
        const By = this.p2.y + this.l2 * Math.sin(theta2);
        
        const d2 = (Ax - Bx)**2 + (Ay - By)**2;
        const d = Math.sqrt(d2);
        
        if (d > this.l3 + this.l4 || d < Math.abs(this.l3 - this.l4) || d === 0) {
            return null;
        }
        
        const a = (this.l3**2 - this.l4**2 + d2) / (2 * d);
        const h = Math.sqrt(Math.max(0, this.l3**2 - a**2));
        
        const x2 = Ax + a * (Bx - Ax) / d;
        const y2 = Ay + a * (By - Ay) / d;
        
        const Cx = x2 + h * (By - Ay) / d;
        const Cy = y2 - h * (Bx - Ax) / d;
        
        const ACx = Cx - Ax;
        const ACy = Cy - Ay;
        
        const Px = Ax + (this.cpU * ACx - this.cpV * ACy) / this.l3;
        const Py = Ay + (this.cpU * ACy + this.cpV * ACx) / this.l3;
        
        return {
            A: new Point(Ax, Ay),
            B: new Point(Bx, By),
            C: new Point(Cx, Cy),
            P: new Point(Px, Py)
        };
    }
}

class WattSixBarLinkage {
    constructor(p1, p2, l1, l2, l3, l4) {
        this.type = 'six-bar';
        this.p1 = p1;
        this.p2 = p2;
        this.l1 = l1;
        this.l2 = l2;
        this.l3 = l3;
        this.l4 = l4;
        
        this.cu = 0.5;
        this.cv = 0;
        
        this.du = 0.5;
        this.dv = 0;
        
        this.l5 = 100;
        this.l6 = 100;
    }
    
    solve(theta) {
        const Ax = this.p1.x + this.l1 * Math.cos(theta);
        const Ay = this.p1.y + this.l1 * Math.sin(theta);
        
        const d2 = (Ax - this.p2.x)**2 + (Ay - this.p2.y)**2;
        const d = Math.sqrt(d2);
        
        if (d > this.l2 + this.l3 || d < Math.abs(this.l2 - this.l3) || d === 0) {
            return null;
        }
        
        const a = (this.l2**2 - this.l3**2 + d2) / (2 * d);
        const h = Math.sqrt(Math.max(0, this.l2**2 - a**2));
        
        const x2 = Ax + a * (this.p2.x - Ax) / d;
        const y2 = Ay + a * (this.p2.y - Ay) / d;
        
        const Bx = x2 + h * (this.p2.y - Ay) / d;
        const By = y2 - h * (this.p2.x - Ax) / d;
        
        const ABx = Bx - Ax;
        const ABy = By - Ay;
        const Cx = Ax + (this.cu * ABx - this.cv * ABy);
        const Cy = Ay + (this.cu * ABy + this.cv * ABx);
        
        const RockerX = Bx - this.p2.x;
        const RockerY = By - this.p2.y;
        const Dx = this.p2.x + (this.du * RockerX - this.dv * RockerY);
        const Dy = this.p2.y + (this.du * RockerY + this.dv * RockerX);
        
        const distCD2 = (Cx - Dx)**2 + (Cy - Dy)**2;
        const distCD = Math.sqrt(distCD2);
        
        if (distCD > this.l5 + this.l6 || distCD < Math.abs(this.l5 - this.l6) || distCD === 0) {
            return null;
        }
        
        const a2 = (this.l5**2 - this.l6**2 + distCD2) / (2 * distCD);
        const h2 = Math.sqrt(Math.max(0, this.l5**2 - a2**2));
        
        const x3 = Cx + a2 * (Dx - Cx) / distCD;
        const y3 = Cy + a2 * (Dy - Cy) / distCD;
        
        const Px = x3 + h2 * (Dy - Cy) / distCD;
        const Py = y3 - h2 * (Dx - Cx) / distCD;
        
        return {
            A: new Point(Ax, Ay),
            B: new Point(Bx, By),
            C: new Point(Cx, Cy),
            D: new Point(Dx, Dy),
            P: new Point(Px, Py)
        };
    }
}

window.Point = Point;
window.Rect = Rect;
window.FourBarLinkage = FourBarLinkage;
window.GearedFiveBarLinkage = GearedFiveBarLinkage;
window.WattSixBarLinkage = WattSixBarLinkage;