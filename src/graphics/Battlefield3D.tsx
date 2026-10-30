import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import type {BattleState,Unit} from '../types';

type CastleModel={
  root:THREE.Group;
  intact:THREE.Group;
  rubble:THREE.Group;
  cracks:THREE.Group;
  lastHp:number;
  hitAt:number;
  collapsedAt:number;
};
type UnitModel={group:THREE.Group;key:string;spawnedAt:number;removedAt:number|null;lastHp:number;lastReady:boolean;hitAt:number;attackAt:number;owner:number};

const MAX_WALL=[8,9,8];
const LANE_X=[-6.6,0,6.6];
const material=(hex:number,glow=0)=>new THREE.MeshStandardMaterial({
  color:hex,roughness:.75,metalness:.15,flatShading:true,
  emissive:glow,emissiveIntensity:glow?.12:0,
});
const stoneA=material(0x5d7699),stoneB=material(0x8e6089);
const trimA=material(0x66bec0),trimB=material(0xea9b7d);
const golden=material(0xdab982,0x6d481e);
const floorStone=material(0x252039);

function brick(parent:THREE.Group,shape:[number,number,number],at:[number,number,number],mat:THREE.Material) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...shape),mat);
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

function castle(owner:number,lane:number):CastleModel{
  const root=new THREE.Group();
  root.position.set(LANE_X[lane],0,owner===0?2.25:-2.25);
  const intact=new THREE.Group(),rubble=new THREE.Group(),cracks=new THREE.Group();
  root.add(intact,rubble,cracks);
  const wall=owner===0?stoneA:stoneB;
  const trim=owner===0?trimA:trimB;
  brick(intact,[2.35,.85,.55],[0,.56,0],wall);
  brick(intact,[2.45,.13,.7],[0,.95,0],trim);
  brick(intact,[.52,1.45,.72],[-.93,.78,0],wall);
  brick(intact,[.52,1.45,.72],[.93,.78,0],wall);
  for(const x of [-1.06,-.80,.80,1.06]){
    brick(intact,[.22,.27,.81],[x,1.63,0],trim);
  }
  for(const x of [-.54,0,.54]){
    brick(intact,[.29,.23,.7],[x,1.16,0],wall);
  }
  brick(intact,[.48,.66,.07],[0,.43,.35],material(0x201723));
  brick(intact,[.08,.74,.07],[0,.43,.41],golden);
  // Jagged cracks on the visible face; progressively revealed as HP drops.
  const points=[
    new THREE.Vector3(-.36,1.04,.38),
    new THREE.Vector3(-.09,.72,.39),
    new THREE.Vector3(-.24,.54,.39),
    new THREE.Vector3(.18,.18,.40),
  ];
  const line=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color:0xf5af76,transparent:true,opacity:.85}),
  );
  cracks.add(line);
  cracks.visible=false;
  const offsets:[number,number,number][]=[
    [-.91,.20,-.15],[-.48,.20,.35],[.2,.20,-.34],[.91,.18,.30],
    [-.25,.28,.18],[.61,.15,-.23],
  ];
  offsets.forEach(([x,y,z],i)=>{
    const chunk=brick(rubble,[.35+i%3*.16,.28+i%2*.12,.55],[x,y,z],wall);
    chunk.rotation.set(.15*i,.25*i,-.12*i);
    chunk.userData.originY=y;
  });
  rubble.visible=false;
  return {root,intact,rubble,cracks,lastHp:MAX_WALL[lane],hitAt:-10,collapsedAt:-10};
}

function unitMarker(owner:number,lane:number,unit:Unit,now:number):UnitModel{
  const group=new THREE.Group();
  group.position.set(LANE_X[lane],.03,owner===0?.65:-.65);
  const base=owner===0?0x4cbbb5:0xce748e;
  const baseMat=material(base);
  const stone=material(0x262239);
  const podium=new THREE.Mesh(new THREE.CylinderGeometry(.50,.58,.14,8),stone);
  podium.position.y=.1;group.add(podium);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.23,.34,.76,6),baseMat);
  body.position.y=.58;group.add(body);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(.33,.46,5),golden);
  crown.position.y=1.18;group.add(crown);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.49,.035,5,24),golden);
  ring.rotation.x=Math.PI/2;ring.position.y=.18;group.add(ring);
  if(unit.stance==='defense'){
    const shield=new THREE.Mesh(new THREE.BoxGeometry(.48,.65,.12),trimA);
    shield.position.set(0,.71,.43);group.add(shield);
  }
  group.scale.setScalar(.01);
  return {group,key:owner+'-'+lane+'-'+unit.cardId+'-'+unit.stance,spawnedAt:now,removedAt:null,lastHp:unit.hp,lastReady:unit.canAttack,hitAt:-10,attackAt:-10,owner};
}

function disposeChildren(root:THREE.Object3D){
  root.traverse(object=>{
    if(object instanceof THREE.Mesh){
      object.geometry.dispose();
      // Shared materials live for the lifetime of the module.
    }
    if(object instanceof THREE.Line)object.geometry.dispose();
  });
}

export default function Battlefield3D({battle}:{battle:BattleState}){
  const host=useRef<HTMLDivElement>(null);
  const update=useRef<(state:BattleState)=>void>(()=>{});
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    const mount=host.current;
    if(!mount)return;
    let renderer:THREE.WebGLRenderer;
    try{
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    }catch{
      setUnavailable(true);
      return;
    }
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0x15101f);
    scene.fog=new THREE.Fog(0x15101f,15,28);
    const camera=new THREE.OrthographicCamera(-8.15,8.15,4.45,-4.45,.1,80);
    camera.position.set(0,10.5,14.5);
    camera.lookAt(0,.2,0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setSize(mount.clientWidth||900,mount.clientHeight||280);
    renderer.domElement.setAttribute('aria-hidden','true');
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xc3b5e0,2));
    const light=new THREE.DirectionalLight(0xffdfae,3);
    light.position.set(-5,10,7);scene.add(light);
    const rim=new THREE.DirectionalLight(0x729fe2,1.6);
    rim.position.set(5,5,-6);scene.add(rim);
    const field=new THREE.Mesh(new THREE.PlaneGeometry(22,11),floorStone);
    field.rotation.x=-Math.PI/2;field.position.y=-.03;scene.add(field);
    [-3.3,3.3].forEach(x=>{
      const separator=new THREE.Mesh(new THREE.BoxGeometry(.035,.014,9),golden);
      separator.position.set(x,-.01,0);scene.add(separator);
    });
    [-.16,.16].forEach(z=>{
      const center=new THREE.Mesh(new THREE.BoxGeometry(20,.012,.025),golden);
      center.position.set(0,.015,z);scene.add(center);
    });
    const castles:CastleModel[][]=[
      MAX_WALL.map((_,i)=>castle(0,i)),
      MAX_WALL.map((_,i)=>castle(1,i)),
    ];
    castles.flat().forEach(c=>scene.add(c.root));
    const markers=new Map<string,UnitModel>();
    const dying:UnitModel[]=[];
    const clock=new THREE.Clock();
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    update.current=state=>{
      const now=clock.getElapsedTime();
      for(let owner=0;owner<2;owner++){
        for(let lane=0;lane<3;lane++){
          const visual=castles[owner][lane],hp=state.players[owner].walls[lane];
          if(hp<visual.lastHp){
            visual.hitAt=now;
            if(hp===0)visual.collapsedAt=now;
          }
          visual.lastHp=hp;
          visual.intact.visible=hp>0;
          visual.cracks.visible=hp>0&&hp<MAX_WALL[lane]*.65;
          visual.rubble.visible=hp===0;
        }
      }
      const desired=new Set<string>();
      for(let owner=0;owner<2;owner++)for(let lane=0;lane<3;lane++){
        const unit=state.players[owner].lanes[lane][0];
        if(!unit)continue;
        const key=owner+'-'+lane+'-'+unit.cardId+'-'+unit.stance;
        desired.add(key);
        if(!markers.has(key)){
          const marker=unitMarker(owner,lane,unit,now);
          markers.set(key,marker);
          scene.add(marker.group);
        }else{
          const marker=markers.get(key)!;
          if(unit.hp<marker.lastHp)marker.hitAt=now;
          if(marker.lastReady&&!unit.canAttack&&unit.stance==='attack')marker.attackAt=now;
          marker.lastHp=unit.hp;
          marker.lastReady=unit.canAttack;
        }
      }
      for(const [key,marker] of markers)if(!desired.has(key)){
        markers.delete(key);
        marker.removedAt=now;
        dying.push(marker);
      }
    };
    // Render state after all 3D objects exist.
    update.current(battle);
    const resize=()=>{
      const width=Math.max(1,mount.clientWidth),height=Math.max(1,mount.clientHeight);
      const aspect=width/height;
      // Preserve correct 3D proportions while fitting all three lanes.
      const verticalSpan=Math.max(6.9,18.2/aspect);
      const halfHeight=verticalSpan/2;
      camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;
      camera.top=halfHeight;camera.bottom=-halfHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width,height,false);
    };
    const observer=new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    let frame=0,disposed=false;
    const animate=()=>{
      if(disposed)return;
      const now=clock.getElapsedTime();
      for(const visual of castles.flat()){
        if(!reduceMotion&&now-visual.hitAt<.45&&visual.lastHp>0){
          visual.intact.position.x=Math.sin((now-visual.hitAt)*45)*.07*(1-(now-visual.hitAt)/.45);
        }else visual.intact.position.x=0;
        if(visual.rubble.visible){
          const elapsed=reduceMotion?1.2:Math.max(0,now-visual.collapsedAt);
          visual.rubble.children.forEach((chunk,i)=>{
            const mesh=chunk as THREE.Mesh;
            mesh.position.y=Math.max(.13,(mesh.userData.originY as number)+.9*Math.max(0,1-elapsed*1.7));
            mesh.rotation.z=(i%2?1:-1)*Math.min(1,elapsed)*.5;
          });
        }
      }
      for(const marker of markers.values()){
        const elapsed=reduceMotion?2:now-marker.spawnedAt;
        const factor=Math.min(1,Math.max(.01,elapsed*3.5));
        marker.group.scale.setScalar(factor);
        if(!reduceMotion){
          const hit=now-marker.hitAt;
          const swing=now-marker.attackAt;
          const shake=hit>=0&&hit<.4?Math.sin(hit*43)*.1*(1-hit/.4):0;
          const lunge=swing>=0&&swing<.42?Math.sin(Math.PI*swing/.42)*.5:0;
          marker.group.position.x=(LANE_X[Number(marker.key.split('-')[1])]??0)+shake;
          marker.group.position.y=.02+Math.sin(now*2)*.035;
          marker.group.position.z=(marker.owner===0?.65:-.65)+(marker.owner===0?-lunge:lunge);
        }
      }
      for(let i=dying.length-1;i>=0;i--){
        const marker=dying[i];
        const elapsed=now-(marker.removedAt??now);
        const factor=reduceMotion?0:Math.max(0,1-elapsed*3);
        marker.group.scale.setScalar(factor);
        if(factor<=0){
          scene.remove(marker.group);
          disposeChildren(marker.group);
          dying.splice(i,1);
        }
      }
      renderer.render(scene,camera);
      frame=window.requestAnimationFrame(animate);
    };
    animate();
    return ()=>{
      disposed=true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      markers.forEach(m=>{scene.remove(m.group);disposeChildren(m.group);});
      dying.forEach(m=>{scene.remove(m.group);disposeChildren(m.group);});
      castles.flat().forEach(c=>disposeChildren(c.root));
      scene.remove(field);field.geometry.dispose();
      renderer.dispose();
      if(mount.contains(renderer.domElement))mount.removeChild(renderer.domElement);
    };
    // Only build the scene once; the separate effect below updates game state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>update.current(battle),[battle]);
  return <div className="battlefield-3d" ref={host} role="img"
    aria-label="실시간 3D 성벽 6개와 양측 유닛 배치 시각화">
    {unavailable&&<div className="battlefield-3d-fallback">3D 그래픽을 사용할 수 없어 전투 정보만 표시합니다.</div>}
  </div>;
}
