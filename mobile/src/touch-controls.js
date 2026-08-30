const touchControls=document.getElementById('touchControls');
const movePad=document.getElementById('movePad');
const moveKnob=document.getElementById('moveKnob');
const boostBtn=document.getElementById('boostTouchBtn');
const slowBtn=document.getElementById('slowTouchBtn');
let movePointerId=null;
const holdResetters=[];

function setMovement(clientX,clientY){
    const rect=movePad.getBoundingClientRect();
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    let dx=clientX-cx,dy=clientY-cy;
    const radius=rect.width*.34;
    const distance=Math.hypot(dx,dy);
    if(distance>radius){dx=dx/distance*radius;dy=dy/distance*radius}
    moveKnob.style.transform=`translate(${dx}px,${dy}px)`;
    const deadzone=radius*.18;
    keys['a']=dx<-deadzone;keys['d']=dx>deadzone;
    keys['w']=dy<-deadzone;keys['s']=dy>deadzone;
}

function resetMovement(){
    const pointerId=movePointerId;
    movePointerId=null;
    if(pointerId!==null&&movePad.hasPointerCapture(pointerId))movePad.releasePointerCapture(pointerId);
    keys['w']=keys['a']=keys['s']=keys['d']=false;
    moveKnob.style.transform='translate(0,0)';
}

function resetTouchControls(){
    resetMovement();
    for(const resetHold of holdResetters)resetHold();
}

function syncTouchControls(){
    touchControls.classList.toggle('hidden',game.state!=='playing');
    if(game.state!=='playing')resetTouchControls();
}

movePad.addEventListener('pointerdown',e=>{
    if(game.state!=='playing'||movePointerId!==null)return;
    e.preventDefault();movePointerId=e.pointerId;
    try{movePad.setPointerCapture(e.pointerId)}catch(error){}
    setMovement(e.clientX,e.clientY);
});
movePad.addEventListener('pointermove',e=>{
    if(e.pointerId!==movePointerId)return;
    e.preventDefault();setMovement(e.clientX,e.clientY);
});
function endMove(e){
    if(e.pointerId!==movePointerId)return;
    if(movePad.hasPointerCapture(e.pointerId))movePad.releasePointerCapture(e.pointerId);
    resetMovement();
}
movePad.addEventListener('pointerup',endMove);
movePad.addEventListener('pointercancel',endMove);
movePad.addEventListener('lostpointercapture',e=>{if(e.pointerId===movePointerId)resetMovement()});

function bindHoldButton(button,key){
    const activePointers=new Set();
    const update=()=>{keys[key]=activePointers.size>0;button.classList.toggle('active',activePointers.size>0)};
    const reset=()=>{
        const pointerIds=[...activePointers];
        activePointers.clear();
        for(const pointerId of pointerIds){
            if(button.hasPointerCapture(pointerId))button.releasePointerCapture(pointerId);
        }
        update();
    };
    holdResetters.push(reset);
    button.addEventListener('pointerdown',e=>{
        if(game.state!=='playing')return;
        e.preventDefault();activePointers.add(e.pointerId);
        try{button.setPointerCapture(e.pointerId)}catch(error){}
        update();
    });
    const end=e=>{
        if(!activePointers.delete(e.pointerId))return;
        if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);
        update();
    };
    button.addEventListener('pointerup',end);
    button.addEventListener('pointercancel',end);
    button.addEventListener('lostpointercapture',e=>{activePointers.delete(e.pointerId);update()});
}

bindHoldButton(boostBtn,' ');
bindHoldButton(slowBtn,'shift');
window.resetTouchControls=resetTouchControls;
window.syncTouchControls=syncTouchControls;
syncTouchControls();