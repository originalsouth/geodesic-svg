var N=16
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
}

function setup()
{
    document.title="geodesics-svg [powered by libmd]";
    _init();
    for(let i=0;i<N;i++) particles.push(new particle());
    _set_r(1.0/particle_radius);
    _set_aspect(window.innerHeight/window.innerWidth);
    render(rstat.crco);
}

function reset()
{
    _init();
    render(rstat.c);
}

function loop()
{
    _update(10);
    render(rstat.c);
}

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
    else if(e.keyCode==18) _set_mp(0);
    else if(e.keyCode==49) _set_mp(1);
    else if(e.keyCode==50) _set_mp(2);
    else if(e.keyCode==51) _set_mp(3);
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
