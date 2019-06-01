#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <array>
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif
#include "libmd/libmd.h"

using namespace std;

mpmd<2> sys;
vector<ldf> null_vec(2,0.0);
vector<array<ldf,2>> user_input;

template<class X> X SHIELD(X r,vector<ldf> &parameters)
{
    const ldf b=parameters[0];
    const ldf rco=2.0*parameters[1];
    if(r<=rco) return b*(rco-r);
    else return 0.0;
}

template<ui dim> void USER_INPUT(ui i,std::vector<ui> &particles,std::vector<ldf> &parameters,void *sys)
{
    (void) particles;
    (void) parameters;
    for(ui d=0;d<dim;d++) SYS->particles[i].F[d]+=user_input[i][d];
}

extern "C"
{
    void EMSCRIPTEN_KEEPALIVE init()
    {
        sys.patch.setmp(MP::FLATSPACE);
        sys.simbox.L[0]=sys.simbox.L[1]=10.0;
        sys.set_ssz(100.0);
        sys.set_rco(100.0);
        sys.simbox.bcond[0]=sys.simbox.bcond[1]=BCOND::PERIODIC;
        sys.integrator.method=MP_INTEGRATOR::VZ;
    }
    ui EMSCRIPTEN_KEEPALIVE add_particle(ldf x,ldf y)
    {
        if(sys.N)
        {
            ldf deltax[2]={sys.simbox.L[0]*x-sys.particles[0].x[0],sys.simbox.L[1]*y-sys.particles[0].x[1]};
            sys.thread_periodicity(deltax);
            const ui pid=sys.clone_particle(0U,deltax);
            user_input.push_back({0.0,0.0});
            sys.history();
            return pid;
        }
        else
        {
            const ui pid=sys.add_particle(1.0);
            sys.import_pos(pid,sys.simbox.L[0]*x,sys.simbox.L[1]*y);
            sys.import_vel(pid,0.0,0.0);
            sys.set_type(pid,0);
            vector<ldf> pot_param={10.0,0.0};
            sys.add_typeinteraction(0,0,sys.add_interaction(sys.v.add(SHIELD),pot_param));
            sys.assign_all_forcetype(sys.add_forcetype(sys.f.add(USER_INPUT<2>),null_vec));
            sys.set_damping(3e-1);
            sys.history();
            user_input.push_back({0.0,0.0});
            return pid;
        }
    }
    void EMSCRIPTEN_KEEPALIVE set_aspect(ldf aspect)
    {
        sys.simbox.L[1]=aspect*sys.simbox.L[0];
        sys.periodicity();
    }
    ui EMSCRIPTEN_KEEPALIVE set_mp(ui mpid)
    {
        sys.patch.setmp(mpid);
        sys.history();
        return sys.patch.patch;
    }
    void EMSCRIPTEN_KEEPALIVE set_r(ldf rco)
    {
        sys.network.library[0].parameters[1]=sqrt(sys.simbox.L[0]*sys.simbox.L[1])*rco;
    }
    void EMSCRIPTEN_KEEPALIVE rem_particle()
    {
        if(sys.N>1)
        {
            sys.rem_particle(sys.N-1);
            user_input.pop_back();
        }
    }
    void EMSCRIPTEN_KEEPALIVE update(ui steps)
    {
        sys.timesteps(steps);
    }
    ldf EMSCRIPTEN_KEEPALIVE get_pos(ui idx,ui dim)
    {
        return sys.particles[idx].x[dim]/sys.simbox.L[dim];
    }
    void EMSCRIPTEN_KEEPALIVE set_F(ui idx,ui dim,ldf F)
    {
        user_input[idx][dim]=F;
    }
}
