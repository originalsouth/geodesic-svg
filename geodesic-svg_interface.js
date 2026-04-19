var N=16
var current_mp=0;
var particles=[];
const colors=["#009900","#990000","#000099"]
const particle_radius=50.0;
const input=[{keys:{h:72,j:74,k:75,l:76}},{keys:{h:37,j:40,k:38,l:39}},{keys:{h:65,j:83,k:87,l:68}}];
const rstat={c:0,cr:1,crc:2,crco:3};

class particle
{
    constructor()
    {
        this.idx=_add_particle(2.0*Math.random()-1.0,2.0*Math.random()-1.0);
        this.object=document.createElementNS(document.lookupNamespaceURI(null),"circle");
        this.input=(this.idx<input.length)?input[this.idx]:null;
    }
    render(status)
    {
        this.object.setAttribute("cx",window.innerWidth*(0.5+_get_pos(this.idx,0)));
        this.object.setAttribute("cy",window.innerHeight*(0.5-_get_pos(this.idx,1)));
        if(status>=rstat.cr) this.object.setAttribute("r",Math.floor(Math.sqrt(window.innerWidth*window.innerHeight)/particle_radius));
        if(status>=rstat.crc) this.object.setAttribute("fill",(this.idx<colors.length)?colors[this.idx]:"black");
        if(status>=rstat.crco) document.documentElement.prepend(this.object);
    }
    destroy()
    {
        _rem_particle();
        this.object.remove();
    }
}

function render(status)
{
    for(let i=0;i<particles.length;i++) particles[i].render(status);
}

function resizer()
{
    _set_r(1.0/particle_radius);
    _set_aspect(window.innerHeight/window.innerWidth);
    render(rstat.cr);
    monge_update();
}

function setup()
{
    document.title="geodesics-svg [powered by libmd]";
    _init();
    for(let i=0;i<N;i++) particles.push(new particle());
    _set_r(1.0/particle_radius);
    _set_aspect(window.innerHeight/window.innerWidth);
    render(rstat.crco);
    monge_setup();
}

function reset()
{
    _init();
    current_mp=0;
    render(rstat.c);
    monge_update();
}

function loop()
{
    _update(10);
    render(rstat.c);
}

// --- Monge patch iso lines (contour lines) ---

var MONGE_RES=80;
var MONGE_LEVELS=14;
var MONGE_L0=10.0;
var monge_ready=false;
var monge_paths=[];

function monge_flatspace(x,y,p) { return 0.0; }

function monge_gaussianbump(x,y,p)
{
    return p[0]*Math.exp(-p[1]*(x*x+y*y));
}

function monge_eggcarton(x,y,p)
{
    return p[0]*Math.cos(p[1]*x)*Math.cos(p[2]*y);
}

function monge_mollifier(x,y,p)
{
    var Ksq=p[1]*p[1];
    var rsq=x*x+y*y;
    if(rsq<Ksq) return p[0]*Math.exp(rsq/(rsq-Ksq));
    return 0.0;
}

var monge_patches=[
    {fn:monge_flatspace,params:[1.0]},
    {fn:monge_gaussianbump,params:[1.0,1.0]},
    {fn:monge_eggcarton,params:[1.0,1.0,1.0]},
    {fn:monge_mollifier,params:[1.0,1.0]}
];

// marching squares edge table: for each of 16 cases, list of [edgeA,edgeB] segments
// corners: 0=BL 1=BR 2=TR 3=TL; edges: 0=bottom 1=right 2=top 3=left
var MS_SEGS=[
    [],[[0,3]],[[0,1]],[[1,3]],
    [[1,2]],[[0,1],[2,3]],[[0,2]],[[2,3]],
    [[2,3]],[[0,2]],[[0,3],[1,2]],[[1,2]],
    [[1,3]],[[0,1]],[[0,3]],[]
];

function monge_color(t)
{
    var r=Math.round(40+t*200);
    var g=Math.round(60+t*80);
    var b=Math.round(200-t*160);
    return "rgb("+r+","+g+","+b+")";
}

function monge_setup()
{
    if(monge_ready) return;
    monge_ready=true;
    var svg=document.documentElement;
    for(var k=0;k<MONGE_LEVELS;k++)
    {
        var path=document.createElementNS(document.lookupNamespaceURI(null),"path");
        path.setAttribute("fill","none");
        path.setAttribute("stroke-linecap","round");
        path.setAttribute("stroke-linejoin","round");
        monge_paths.push(path);
        svg.prepend(path);
    }
    monge_update();
}

function monge_update()
{
    if(!monge_ready) return;
    var W=window.innerWidth;
    var H=window.innerHeight;
    if(W<1||H<1) return;
    var patch=monge_patches[current_mp]||monge_patches[0];
    var R=MONGE_RES;
    var aspect=H/W;
    var L0=MONGE_L0;
    var L1=aspect*L0;
    // sample height field
    var vals=[];
    var zMin=Infinity,zMax=-Infinity;
    for(var i=0;i<=R;i++)
    {
        vals[i]=[];
        for(var j=0;j<=R;j++)
        {
            var z=patch.fn((-0.5+i/R)*L0,(-0.5+j/R)*L1,patch.params);
            vals[i][j]=z;
            if(z<zMin) zMin=z;
            if(z>zMax) zMax=z;
        }
    }
    var zRange=zMax-zMin;
    // hide all if flat
    if(zRange<1e-10)
    {
        for(var k=0;k<MONGE_LEVELS;k++) monge_paths[k].setAttribute("d","");
        return;
    }
    // edge interpolation: returns screen {x,y}
    function einterp(edge,i,j,v0,v1,v2,v3,c)
    {
        var t,nx,ny;
        switch(edge)
        {
            case 0: t=(c-v0)/(v1-v0); nx=-0.5+(i+t)/R; ny=-0.5+j/R; break;
            case 1: t=(c-v1)/(v2-v1); nx=-0.5+(i+1)/R; ny=-0.5+(j+t)/R; break;
            case 2: t=(c-v2)/(v3-v2); nx=-0.5+(i+1-t)/R; ny=-0.5+(j+1)/R; break;
            case 3: t=(c-v3)/(v0-v3); nx=-0.5+i/R; ny=-0.5+(j+1-t)/R; break;
        }
        return {x:W*(0.5+nx),y:H*(0.5-ny)};
    }
    // compute contours via marching squares
    for(var lev=0;lev<MONGE_LEVELS;lev++)
    {
        var c=zMin+(lev+1)*zRange/(MONGE_LEVELS+1);
        var d="";
        for(var i=0;i<R;i++) for(var j=0;j<R;j++)
        {
            var v0=vals[i][j],v1=vals[i+1][j],v2=vals[i+1][j+1],v3=vals[i][j+1];
            var ci=0;
            if(v0>=c) ci|=1;
            if(v1>=c) ci|=2;
            if(v2>=c) ci|=4;
            if(v3>=c) ci|=8;
            var segs=MS_SEGS[ci];
            for(var s=0;s<segs.length;s++)
            {
                var pa=einterp(segs[s][0],i,j,v0,v1,v2,v3,c);
                var pb=einterp(segs[s][1],i,j,v0,v1,v2,v3,c);
                d+="M"+pa.x.toFixed(1)+","+pa.y.toFixed(1)+"L"+pb.x.toFixed(1)+","+pb.y.toFixed(1);
            }
        }
        var t=(lev+1)/(MONGE_LEVELS+1);
        monge_paths[lev].setAttribute("d",d);
        monge_paths[lev].setAttribute("stroke",monge_color(t));
        monge_paths[lev].setAttribute("stroke-width","1.2");
        monge_paths[lev].setAttribute("opacity","0.5");
    }
}

// --- Event listeners ---

document.title="geodesics-svg [loading wasm...]";
Module['onRuntimeInitialized']=function()
{
    setup();
    setInterval(loop,1);
}
document.documentElement.addEventListener("keydown",function(e)
{
    if(e.keyCode==27) reset();
    else if(e.keyCode==61)
    {
        N++;
        particles.push(new particle());
        particles[N-1].render(rstat.crco);
    }
    else if(e.keyCode==173)
    {
        if(N>1)
        {
            particles[N-1].destroy();
            particles.pop();
            N--;
        }
    }
    else if(e.keyCode==18) { current_mp=_set_mp(0); monge_update(); }
    else if(e.keyCode==49) { current_mp=_set_mp(1); monge_update(); }
    else if(e.keyCode==50) { current_mp=_set_mp(2); monge_update(); }
    else if(e.keyCode==51) { current_mp=_set_mp(3); monge_update(); }
    else for(let i=0;i<Math.min(input.length,particles.length);i++)
    {
        switch(e.keyCode)
        {
            case particles[i].input.keys.h: _set_F(particles[i].idx,0,-1.0); break;
            case particles[i].input.keys.j: _set_F(particles[i].idx,1,-1.0); break;
            case particles[i].input.keys.k: _set_F(particles[i].idx,1,1.0);  break;
            case particles[i].input.keys.l: _set_F(particles[i].idx,0,1.0);  break;
        }
    }
},false);
document.documentElement.addEventListener("keyup",function(e)
{
    for(let i=0;i<Math.min(input.length,particles.length);i++)
    {
        switch(e.keyCode)
        {
            case particles[i].input.keys.h: _set_F(particles[i].idx,0,0.0); break;
            case particles[i].input.keys.j: _set_F(particles[i].idx,1,0.0); break;
            case particles[i].input.keys.k: _set_F(particles[i].idx,1,0.0); break;
            case particles[i].input.keys.l: _set_F(particles[i].idx,0,0.0); break;
        }
    }
},false);
window.addEventListener("resize",function(){resizer();},false);
