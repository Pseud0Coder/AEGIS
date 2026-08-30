function checkBladeCollision(){
    const toHit=new Set();
    const offsets=getArmOffsets();
    for(let armIdx=0;armIdx<offsets.length;armIdx++){
        const ang=blade.angle+offsets[armIdx];
        const bx=player.x+Math.cos(ang)*blade.length;
        const by=player.y+Math.sin(ang)*blade.length;
        for(let i=0;i<enemies.length;i++){
            if(toHit.has(i))continue;
            const e=enemies[i];if(e.hitCooldown>0)continue;
            const d=distPointToSeg(e.x,e.y,player.x,player.y,bx,by);
            if(d<e.radius+blade.width+2){if(checkShielded(e,player.x,player.y,bx,by))continue;toHit.add(i)}
        }
        const trail=armTrails[armIdx];
        for(let i=1;i<trail.length;i++){
            const p1=trail[i-1],p2=trail[i];const alpha=i/trail.length;
            if(alpha<0.4)continue;
            const tr=blade.width*alpha*0.7+3;
            for(let j=0;j<enemies.length;j++){
                if(toHit.has(j))continue;
                const e=enemies[j];if(e.hitCooldown>0)continue;
                const d=distPointToSeg(e.x,e.y,p1.x,p1.y,p2.x,p2.y);
                if(d<e.radius+tr){if(checkShielded(e,p1.x,p1.y,p2.x,p2.y))continue;toHit.add(j)}
            }
        }
    }
    const arr=Array.from(toHit).sort((a,b)=>b-a);
    for(let i of arr){if(enemies[i])hitEnemy(enemies[i],i)}
}

function checkPlayerCollision(){
    if(player.invulnerable>0)return;
    for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i];const dx=e.x-player.x,dy=e.y-player.y;const d=Math.sqrt(dx*dx+dy*dy);
        if(d<e.radius+player.radius){
            game.lives--;game.combo=0;player.invulnerable=2;game.shake=25;game.flashAlpha=0.6;
            explode(player.x,player.y,'#ff4488',30);sndHit();
            if(game.deathLevel.active&&!game.deathLevel.shielded){
                const lost=Math.min(500,game.score);game.score-=lost;game.deathLevel.scoreLost+=lost;
                floatText(player.x,player.y-30,'-'+Math.floor(lost),'#ff0044',20);
            }
            const a=Math.atan2(dy,dx);e.vx=Math.cos(a)*250;e.vy=Math.sin(a)*250;
            if(game.lives<=0)gameOver();return;
        }
    }
    for(let i=powerups.length-1;i>=0;i--){
        const p=powerups[i];const dx=p.x-player.x,dy=p.y-player.y;const d=Math.sqrt(dx*dx+dy*dy);
        if(d<p.radius+player.radius){applyPowerUp(p.type);powerups.splice(i,1)}
    }
}

function updatePulse(dt){
    if(game.pulseLevel===0)return;
    if(!game.pulseActive){
        game.pulseTimer+=dt;
        if(game.pulseTimer>=game.pulseCooldown){
            game.pulseActive=true;game.pulseRadius=0;game.pulseTimer=0;
            sndPulse();game.shake=Math.max(game.shake,5);
            pulseRings.push({r:0,opacity:1});
        }
    }else{
        const prevR=game.pulseRadius;
        game.pulseRadius+=420*dt;
        for(let i=enemies.length-1;i>=0;i--){
            const e=enemies[i];const d=Math.sqrt((e.x-player.x)**2+(e.y-player.y)**2);
            if(d>prevR&&d<game.pulseRadius){
                const pull=180;
                e.vx+=(player.x-e.x)/d*pull;e.vy+=(player.y-e.y)/d*pull;
                if(d<player.radius+e.radius+10){
                    game.combo++;game.comboTimer=2.5;
                    const points=Math.floor(e.score*(1+Math.floor(game.combo/5)*0.4));
                    game.score+=points;
                    explode(e.x,e.y,e.color,12);
                    floatText(e.x,e.y,'+'+points,e.color);
                    enemies.splice(i,1);
                }
            }
        }
        if(game.pulseRadius>=game.pulseMaxRadius[game.pulseLevel]){
            game.pulseActive=false;game.pulseRadius=0;
        }
        if(pulseRings.length>0)pulseRings[0].r=game.pulseRadius;
    }
    for(let i=pulseRings.length-1;i>=0;i--){
        pulseRings[i].opacity-=dt*1.5;
        if(pulseRings[i].opacity<=0)pulseRings.splice(i,1);
    }
}

function update(dt){
    if(game.state!=='playing')return;
    game.time+=dt;
    
    // Death level controls
    let ctrlInvert=1;
    if(game.deathLevel.active&&game.deathLevel.type==='inversion'&&!game.deathLevel.shielded)ctrlInvert=-1;
    
    let mx=0,my=0;
    if(keys['w']||keys['arrowup'])my-=ctrlInvert;
    if(keys['s']||keys['arrowdown'])my+=ctrlInvert;
    if(keys['a']||keys['arrowleft'])mx-=ctrlInvert;
    if(keys['d']||keys['arrowright'])mx+=ctrlInvert;
    if(mx||my){const l=Math.sqrt(mx*mx+my*my);mx/=l;my/=l}
    player.vx=mx*player.speed;player.vy=my*player.speed;
    player.x=Math.max(player.radius,Math.min(W-player.radius,player.x+player.vx*dt));
    player.y=Math.max(player.radius,Math.min(H-player.radius,player.y+player.vy*dt));
    player.invulnerable=Math.max(0,player.invulnerable-dt);
    player.pulseTime+=dt;
    
    // Blade speed with arm penalty
    const spdMult=getSpeedMult();
    const bstMult=getBoostMult();
    let target=blade.baseSpeed*spdMult;
    let using=false;
    if(keys[' ']&&player.energy>0){target=blade.baseSpeed*spdMult*bstMult;player.energy-=42*dt;using=true}
    else if(keys['shift']&&player.energy>0){target=blade.baseSpeed*spdMult*blade.slowMult;player.energy-=28*dt;using=true}
    if(frenzyTimer>0)target*=1.4;
    if(!using)player.energy=Math.min(player.maxEnergy,player.energy+player.energyRegen*dt);
    player.energy=Math.max(0,player.energy);
    blade.currentSpeed+=(target-blade.currentSpeed)*dt*10;
    blade.angle+=blade.currentSpeed*dt;
    blade.hitFlash=Math.max(0,blade.hitFlash-dt);
    
    // Update arm trails
    const offsets=getArmOffsets();
    for(let i=0;i<offsets.length;i++){
        const ang=blade.angle+offsets[i];
        armTrails[i].push({x:player.x+Math.cos(ang)*blade.length,y:player.y+Math.sin(ang)*blade.length});
        if(armTrails[i].length>22)armTrails[i].shift();
    }
    
    // Timers
    if(timeslowTimer>0)timeslowTimer-=dt;
    if(frenzyTimer>0)frenzyTimer-=dt;
    if(game.fieryTimer>0)game.fieryTimer-=dt;
    if(game.magnetTimer>0)game.magnetTimer-=dt;
    
    // Enemy speed modifier
    let enemySpeedMod=1;
    if(game.deathLevel.active&&game.deathLevel.type==='overdrive'&&!game.deathLevel.shielded)enemySpeedMod=2;
    if(timeslowTimer>0)enemySpeedMod*=0.35;
    
    // Spawn rate modifier
    let spawnRateMod=1;
    if(game.deathLevel.active&&game.deathLevel.type==='chaos'&&!game.deathLevel.shielded)spawnRateMod=3;
    
    // Magnet effect
    if(game.magnetTimer>0){
        for(let e of enemies){
            const dx=player.x-e.x,dy=player.y-e.y;const d=Math.sqrt(dx*dx+dy*dy)||1;
            e.vx+=(dx/d)*120*dt;e.vy+=(dy/d)*120*dt;
        }
    }
    
    // Update enemies
    for(let i=enemies.length-1;i>=0;i--){
        enemies[i].update(dt,enemySpeedMod);
        const e=enemies[i];
        if((e.x<-100||e.x>W+100||e.y<-100||e.y>H+100)&&e.spawnTime>3)enemies.splice(i,1);
    }
    
    for(let i=particles.length-1;i>=0;i--){particles[i].update(dt);if(particles[i].life<=0)particles.splice(i,1)}
    for(let i=powerups.length-1;i>=0;i--){powerups[i].update(dt);if(powerups[i].life<=0)powerups.splice(i,1)}
    for(let i=floatingTexts.length-1;i>=0;i--){
        const t=floatingTexts[i];t.y+=t.vy*dt;t.life-=dt;
        if(t.life<=0)floatingTexts.splice(i,1);
    }
    
    if(game.combo>0){game.comboTimer-=dt;if(game.comboTimer<=0)game.combo=0}
    
    game.spawnTimer-=dt*spawnRateMod;
    if(game.spawnTimer<=0){
        spawnEnemy();
        game.spawnTimer=Math.max(0.35,1.4-game.time*0.011)+Math.random()*0.4;
    }
    game.powerupTimer-=dt;
    if(game.powerupTimer<=0){spawnPowerUp();game.powerupTimer=14+Math.random()*8}
    
    updatePulse(dt);
    checkThresholds();
    checkDeathLevelTrigger(dt);
    updateDeathLevel(dt);
    checkBladeCollision();
    checkPlayerCollision();
    
    game.shake*=0.88;game.flashAlpha*=0.88;
    
    for(let s of stars){s.x-=s.z*15*dt;if(s.x<0){s.x=W;s.y=Math.random()*H}}
    
    // Update HUD
    document.getElementById('score').textContent=Math.floor(game.score);
    document.getElementById('combo').textContent=game.combo;
    document.getElementById('lives').textContent=game.lives;
    document.getElementById('armsDisplay').textContent=game.arms;
    document.getElementById('pulseDisplay').textContent=game.pulseLevel;
    document.getElementById('shieldsDisplay').textContent=game.shields;
    document.getElementById('energyFill').style.width=(player.energy/player.maxEnergy*100)+'%';
    if(game.pulseLevel>0){
        const pct=game.pulseActive?100:(game.pulseTimer/game.pulseCooldown*100);
        document.getElementById('pulseFill').style.width=pct+'%';
    }
    
    // Powerup indicators
    const pi=document.getElementById('powerupIndicators');
    let html='';
    if(timeslowTimer>0)html+=`<div class="pwr-ind" style="color:#aa88ff;border-color:#aa88ff">TSLW ${timeslowTimer.toFixed(1)}</div>`;
    if(frenzyTimer>0)html+=`<div class="pwr-ind" style="color:#ff4488;border-color:#ff4488">FRNZ ${frenzyTimer.toFixed(1)}</div>`;
    if(game.fieryTimer>0)html+=`<div class="pwr-ind" style="color:#ff6600;border-color:#ff6600">FIRY ${game.fieryTimer.toFixed(1)}</div>`;
    if(game.magnetTimer>0)html+=`<div class="pwr-ind" style="color:#cc44ff;border-color:#cc44ff">MAGN ${game.magnetTimer.toFixed(1)}</div>`;
    if(game.shields>0)html+=`<div class="pwr-ind" style="color:#4488ff;border-color:#4488ff">SHLD x${game.shields}</div>`;
    pi.innerHTML=html;
}

function draw(){
    ctx.fillStyle='rgba(5, 5, 16, 0.22)';
    ctx.fillRect(0,0,W,H);
    ctx.save();
    if(game.shake>0.5)ctx.translate((Math.random()-0.5)*game.shake,(Math.random()-0.5)*game.shake);
    
    // Stars
    for(let s of stars){ctx.globalAlpha=s.z;ctx.fillStyle='#ffffff';ctx.fillRect(s.x,s.y,s.size,s.size)}
    ctx.globalAlpha=1;
    
    // Death level background tint
    if(game.deathLevel.active&&!game.deathLevel.shielded){
        const colors={inversion:'rgba(170,68,255,0.06)',overdrive:'rgba(255,0,68,0.06)',chaos:'rgba(255,136,0,0.06)'};
        ctx.fillStyle=colors[game.deathLevel.type];ctx.fillRect(0,0,W,H);
    }
    if(game.deathLevel.warning>0){
        const p=Math.sin(game.time*15)*0.5+0.5;
        ctx.fillStyle=`rgba(255,0,68,${0.05+p*0.08})`;ctx.fillRect(0,0,W,H);
    }
    
    if(game.state==='playing'||game.state==='gameover'){
        const offsets=getArmOffsets();
        const bColor=game.fieryTimer>0?'#ff6600':(frenzyTimer>0?'#ff4488':'#00ffcc');
        const trailColor=game.fieryTimer>0?'#ff8800':(frenzyTimer>0?'#ff4488':'#00ffcc');
        
        // Draw arm trails
        for(let armIdx=0;armIdx<offsets.length;armIdx++){
            const trail=armTrails[armIdx];
            for(let i=0;i<trail.length;i++){
                const t=trail[i];const a=i/trail.length;
                ctx.globalAlpha=a*0.5;ctx.fillStyle=trailColor;
                ctx.shadowColor=trailColor;ctx.shadowBlur=15;
                ctx.beginPath();ctx.arc(t.x,t.y,blade.width*a*0.8,0,Math.PI*2);ctx.fill();
            }
        }
        ctx.globalAlpha=1;ctx.shadowBlur=0;
        
        // Draw blades
        for(let armIdx=0;armIdx<offsets.length;armIdx++){
            const ang=blade.angle+offsets[armIdx];
            const bx=player.x+Math.cos(ang)*blade.length;
            const by=player.y+Math.sin(ang)*blade.length;
            const c=blade.hitFlash>0?'#ffffff':bColor;
            ctx.strokeStyle=c;ctx.lineWidth=blade.width;ctx.lineCap='round';
            ctx.shadowColor=c;ctx.shadowBlur=25;
            ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(bx,by);ctx.stroke();
            ctx.strokeStyle='#ffffff';ctx.lineWidth=blade.width*0.4;
            ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(bx,by);ctx.stroke();
            ctx.fillStyle='#ffffff';ctx.shadowBlur=30;
            ctx.beginPath();ctx.arc(bx,by,blade.width*0.7,0,Math.PI*2);ctx.fill();
            
            // Fiery particles
            if(game.fieryTimer>0){
                for(let k=0;k<2;k++){
                    const fa=Math.random()*Math.PI*2;const fs=Math.random()*60+20;
                    particles.push(new Particle(bx,by,Math.cos(fa)*fs,Math.sin(fa)*fs,'#ff6600',Math.random()*2+1,Math.random()*0.3+0.1));
                }
            }
        }
        ctx.shadowBlur=0;
        
        // Pulse rings
        for(let pr of pulseRings){
            ctx.globalAlpha=pr.opacity*0.6;
            ctx.strokeStyle='#aa88ff';ctx.lineWidth=4;ctx.shadowColor='#aa88ff';ctx.shadowBlur=30;
            ctx.beginPath();ctx.arc(player.x,player.y,pr.r,0,Math.PI*2);ctx.stroke();
            ctx.globalAlpha=pr.opacity*0.15;ctx.fillStyle='#aa88ff';
            ctx.beginPath();ctx.arc(player.x,player.y,pr.r,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;ctx.shadowBlur=0;
        
        // Active pulse
        if(game.pulseActive){
            ctx.globalAlpha=0.7;ctx.strokeStyle='#ff44ff';ctx.lineWidth=6;
            ctx.shadowColor='#ff44ff';ctx.shadowBlur=40;
            ctx.beginPath();ctx.arc(player.x,player.y,game.pulseRadius,0,Math.PI*2);ctx.stroke();
            ctx.globalAlpha=0.1;ctx.fillStyle='#ff44ff';
            ctx.beginPath();ctx.arc(player.x,player.y,game.pulseRadius,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;ctx.shadowBlur=0;
        }
        
        // Player
        const pVis=player.invulnerable===0||Math.floor(player.invulnerable*12)%2===0;
        if(pVis){
            const pulse=1+Math.sin(player.pulseTime*4)*0.08;
            const pColor=game.deathLevel.shielded?'#4488ff':'#00ffcc';
            ctx.shadowColor=pColor;ctx.shadowBlur=30;ctx.fillStyle=pColor;
            ctx.beginPath();ctx.arc(player.x,player.y,player.radius*pulse,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#ffffff';
            ctx.beginPath();ctx.arc(player.x,player.y,player.radius*0.5*pulse,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle=pColor;ctx.lineWidth=2;ctx.globalAlpha=0.5;
            ctx.beginPath();ctx.arc(player.x,player.y,player.radius*1.8*pulse,0,Math.PI*2);ctx.stroke();
            ctx.globalAlpha=1;
            
            // Shield aura
            if(game.shields>0||game.deathLevel.shielded){
                ctx.strokeStyle='#4488ff';ctx.lineWidth=3;ctx.globalAlpha=0.4+Math.sin(game.time*3)*0.2;
                ctx.shadowColor='#4488ff';ctx.shadowBlur=20;
                ctx.beginPath();ctx.arc(player.x,player.y,player.radius*2.5,0,Math.PI*2);ctx.stroke();
                ctx.globalAlpha=1;
            }
            // Fiery aura
            if(game.fieryTimer>0){
                ctx.strokeStyle='#ff6600';ctx.lineWidth=2;ctx.globalAlpha=0.3+Math.sin(game.time*6)*0.2;
                ctx.shadowColor='#ff6600';ctx.shadowBlur=15;
                ctx.beginPath();ctx.arc(player.x,player.y,player.radius*2.2,0,Math.PI*2);ctx.stroke();
                ctx.globalAlpha=1;
            }
        }
        ctx.shadowBlur=0;
        
        // Magnet field lines
        if(game.magnetTimer>0){
            ctx.globalAlpha=0.3;ctx.strokeStyle='#cc44ff';ctx.lineWidth=1;
            for(let i=0;i<12;i++){
                const a=(i/12)*Math.PI*2+game.time*2;
                ctx.beginPath();
                for(let r=30;r<300;r+=10){
                    const x=player.x+Math.cos(a+r*0.02)*r;
                    const y=player.y+Math.sin(a+r*0.02)*r;
                    if(r===30)ctx.moveTo(x,y);else ctx.lineTo(x,y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha=1;
        }
        
        for(let e of enemies)e.draw();
        for(let p of powerups)p.draw();
        for(let p of particles)p.draw();
        
        for(let t of floatingTexts){
            ctx.globalAlpha=Math.min(1,t.life);ctx.fillStyle=t.color;
            ctx.shadowColor=t.color;ctx.shadowBlur=12;
            ctx.font=`bold ${t.size||18}px monospace`;ctx.textAlign='center';
            ctx.fillText(t.text,t.x,t.y);
        }
        ctx.globalAlpha=1;ctx.shadowBlur=0;
        
        if(game.lives===1){
            const p=Math.sin(game.time*6)*0.5+0.5;
            ctx.strokeStyle=`rgba(255, 68, 136, ${p*0.4})`;ctx.lineWidth=30;
            ctx.strokeRect(0,0,W,H);
        }
        
        // Death level timer display
        if(game.deathLevel.active){
            const dl=game.deathLevel;
            ctx.fillStyle=dl.shielded?'#4488ff':'#ff6600';
            ctx.font='bold 14px monospace';ctx.textAlign='center';
            ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;
            ctx.fillText(`TIME: ${dl.timer.toFixed(1)}s`,W/2,H-65);
            if(!dl.shielded)ctx.fillText(`SCORE DRAINED: -${Math.floor(dl.scoreLost)}`,W/2,H-50);
            ctx.shadowBlur=0;
        }
    }
    ctx.restore();
    
    if(game.flashAlpha>0.01){
        ctx.fillStyle=`rgba(255, 255, 255, ${game.flashAlpha})`;
        ctx.fillRect(0,0,W,H);
    }
    
    const grad=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.7);
    grad.addColorStop(0,'rgba(0,0,0,0)');
    grad.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
}

let lastTime=performance.now();
function clearGameInput(){
    for(const key of Object.keys(keys))keys[key]=false;
    player.vx=0;player.vy=0;
    if(window.resetTouchControls)window.resetTouchControls();
}
function pauseGame(){
    if(game.state!=='playing')return false;
    game.state='paused';clearGameInput();
    document.getElementById('pauseScreen').classList.remove('hidden');
    document.getElementById('pauseBtn').classList.add('hidden');
    if(audioCtx&&audioCtx.state==='running')audioCtx.suspend().catch(()=>{});
    if(window.syncTouchControls)window.syncTouchControls();
    return true;
}
function resumeGame(){
    if(game.state!=='paused')return false;
    game.state='playing';lastTime=performance.now();
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('pauseBtn').classList.remove('hidden');
    initAudio();
    if(window.syncTouchControls)window.syncTouchControls();
    return true;
}
function returnToMenu(){
    if(game.state!=='playing'&&game.state!=='paused'&&game.state!=='gameover')return false;
    game.state='menu';clearGameInput();
    document.getElementById('menuScreen').classList.remove('hidden');
    document.getElementById('gameoverScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('pauseBtn').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('powerupIndicators').classList.add('hidden');
    document.getElementById('energyBar').classList.add('hidden');
    document.getElementById('energyLabel').classList.add('hidden');
    document.getElementById('pulseBar').classList.add('hidden');
    document.getElementById('deathWarningContainer').innerHTML='';
    document.getElementById('deathBannerContainer').innerHTML='';
    document.getElementById('thresholdContainer').innerHTML='';
    if(audioCtx&&audioCtx.state==='running')audioCtx.suspend().catch(()=>{});
    if(window.syncTouchControls)window.syncTouchControls();
    return true;
}
window.pauseGame=pauseGame;window.resumeGame=resumeGame;window.returnToMenu=returnToMenu;
window.handleAndroidBack=function(){
    if(game.state==='playing')return pauseGame();
    if(game.state==='paused')return resumeGame();
    return false;
};
function loop(now){
    const dt=Math.min(0.05,(now-lastTime)/1000);
    lastTime=now;
    update(dt);
    if(game.state!=='paused')draw();
    requestAnimationFrame(loop);
}

document.getElementById('startBtn').addEventListener('click',startGame);
document.getElementById('restartBtn').addEventListener('click',startGame);
document.getElementById('pauseBtn').addEventListener('click',pauseGame);
document.getElementById('resumeBtn').addEventListener('click',resumeGame);
document.getElementById('menuBtn').addEventListener('click',returnToMenu);
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();game.state==='paused'?resumeGame():pauseGame()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()});
window.addEventListener('pagehide',pauseGame);
window.addEventListener('blur',pauseGame);
requestAnimationFrame(loop);



