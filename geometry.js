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
        this.p1 = p1;
        this.p2 = p2;
        this.l1 = l1;
        this.l2 = l2;
        this.l3 = l3;
        this.l4 = l4;
        
        this.couplerPointDist = 0;
        this.couplerPointOffset = 0;
        
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
        const angleAB = Math.atan2(ABy, ABx);
        
        const Px = Ax + (this.cpU * ABx - this.cpV * ABy) / this.l2;
        const Py = Ay + (this.cpU * ABy + this.cpV * ABx) / this.l2;

        return {
            A: new Point(Ax, Ay),
            B: new Point(Bx, By),
            P: new Point(Px, Py)
        };
    }
}
