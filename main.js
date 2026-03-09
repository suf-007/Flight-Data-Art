import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

////////////////////////////////////////////////////
// SCENE
////////////////////////////////////////////////////

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = window.innerWidth < 600 ? 8 : 6;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);  
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

////////////////////////////////////////////////////
// AIRPORT SELECTOR
////////////////////////////////////////////////////

const airportSelect = document.createElement("select");
airportSelect.style.position = "absolute";
airportSelect.style.top = "20px";
airportSelect.style.left = "20px";
airportSelect.style.padding = "8px";
airportSelect.style.borderRadius = "6px";

const airports = [
  { name: "Bengaluru - KIA", code: "BLR" },
  { name: "Delhi - IGI", code: "DEL" },
  { name: "Mumbai - BOM", code: "BOM" },
  { name: "Chennai - MAA", code: "MAA" },
  { name: "Hyderabad - HYD", code: "HYD" },
  { name: "London - Heathrow", code: "LHR" }
];

airports.forEach(a => {
  const option = document.createElement("option");
  option.value = a.code;
  option.innerText = a.name;
  airportSelect.appendChild(option);
});

document.body.appendChild(airportSelect);

////////////////////////////////////////////////////
// UI PANEL
////////////////////////////////////////////////////

const counter = document.createElement("div");
counter.style.position = "absolute";
counter.style.top = "70px";
counter.style.left = "20px";
counter.style.color = "white";
counter.style.fontFamily = "monospace";
counter.style.fontSize = "16px";
counter.style.background = "rgba(0,0,0,0.6)";
counter.style.padding = "10px";
counter.style.borderRadius = "8px";
counter.style.maxWidth = "180px";
counter.style.lineHeight = "1.4";
counter.style.fontSize = "13px";
document.body.appendChild(counter);

////////////////////////////////////////////////////
// GARDEN IMAGE
////////////////////////////////////////////////////

new THREE.TextureLoader().load("assets/garden.png", (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 6),
    new THREE.MeshBasicMaterial({ map: texture })
  );

  scene.add(plane);
});

////////////////////////////////////////////////////
// UTILITY FUNCTIONS
////////////////////////////////////////////////////

function randomFlowerSpot(){
  return new THREE.Vector3(
    (Math.random()-0.5)*0.8,
    -0.3 + (Math.random()-0.5)*0.5,
    0.3
  );
}

function randomCornerSpawn(){
  const corners = [
    new THREE.Vector3( 2.8, -2.8, 0.3),
    new THREE.Vector3(-2.8, -2.8, 0.3),
    new THREE.Vector3( 2.8,  2.8, 0.3),
    new THREE.Vector3(-2.8,  2.8, 0.3)
  ];
  return corners[Math.floor(Math.random()*4)].clone();
}

////////////////////////////////////////////////////
// AIRLINE DATABASE
////////////////////////////////////////////////////

const airlines = {
  "AI": { name: "Air India", color: "red" },
  "EK": { name: "Emirates", color: "gold" },
  "6E": { name: "IndiGo", color: "blue" },
  "UK": { name: "Vistara", color: "purple" },
  "QR": { name: "Qatar Airways", color: "brown" },
  "LH": { name: "Lufthansa", color: "yellow" },
  "BA": { name: "British Airways", color: "navy" },
};

const airlineCodes = Object.keys(airlines);

function randomAirline(){
  const code = airlineCodes[Math.floor(Math.random()*airlineCodes.length)];
  return { code, ...airlines[code] };
}

////////////////////////////////////////////////////
// BUTTERFLY SHADER
////////////////////////////////////////////////////

const vertexShader = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
uniform float uOpacity;
uniform float uSide;
uniform vec3 uColor;   // -1 left , +1 right

#define PI 3.1415926
float scale = 22.8;

varying vec2 vUv;

float functionB(float r, float t){
    return 7.2 - .5*sin(t) + 2.5*sin(3.*t) + 2.*sin(5.*t) - 1.7*sin(7.*t)
           + 3.*cos(2.*t) - 2.*cos(4.*t) - 0.4*cos(16.*t) - r;
}

void main(){

    vec2 fragCoord = vUv * uResolution;
    vec2 uv = (2.0*fragCoord - uResolution.xy) / uResolution.y * .7;

    // wing flap deformation
    uv.x *= 1. - sin(uTime*2.)*.2;

    if(uv.x > 0.)
        uv *= mat2(1.,0., (.3)*sin(1.2*uTime),1.);
    else
        uv *= mat2(1.,0., -(.3)*sin(1.2*uTime),1.);

    float r = length(uv*scale);
    float t = atan(uv.y, uv.x);

    float shape = functionB(r,t);

    if(shape < 0.0) discard;

    // ✂ CUT HALF BASED ON SIDE
    if(uSide < 0.0 && uv.x > 0.0) discard;
    if(uSide > 0.0 && uv.x < 0.0) discard;

    vec3 color = uColor;

    vec2 dotUV = uv * 4.0;
    vec2 grid = fract(dotUV) - 0.5;
    float dist = length(grid);
    float dot = smoothstep(0.15, 0.12, dist);

    color = mix(color, vec3(0.0), dot);

    gl_FragColor = vec4(color, uOpacity);
}
`;

////////////////////////////////////////////////////
// GLITTER TRAIL SYSTEM
////////////////////////////////////////////////////

const glitterParticles = [];

const glitterMaterial = new THREE.PointsMaterial({
  color: 0xffaa33,
  size: 0.04,
  transparent: true,
  opacity: 1,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

function spawnGlitter(position){

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    position.x,
    position.y,
    position.z
  ]);

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vertices, 3)
  );

  const point = new THREE.Points(geometry, glitterMaterial.clone());
  point.userData.life = 1.0;

  scene.add(point);
  glitterParticles.push(point);
}

function updateGlitter(dt){

  for(let i = glitterParticles.length - 1; i >= 0; i--){

    const p = glitterParticles[i];

    p.userData.life -= dt * 2.5;

    p.material.opacity = p.userData.life * (0.6 + Math.random()*0.4);

    if(p.userData.life <= 0){
      scene.remove(p);
      glitterParticles.splice(i,1);
    }
  }
}

function windField(position, time){

  const windX =
    Math.sin(position.y * 0.8 + time * 0.6) * 0.1;

  const windY =
    Math.cos(position.x * 0.6 + time * 0.5) * 0.08;

  return new THREE.Vector3(windX, windY, 0);
}

////////////////////////////////////////////////////
// BUTTERFLY CLASS
////////////////////////////////////////////////////

class Butterfly {

  constructor(type){

    this.type = type;
    this.airline = randomAirline();
    // update airline statistics
const typeKey = this.type === "arrival"
  ? "arrival"
  : this.type === "departure"
  ? "departure"
  : "parked";

if(!airlineStats[typeKey][this.airline.name]){
  airlineStats[typeKey][this.airline.name] = 0;
}

airlineStats[typeKey][this.airline.name]++;
    this.colorShift = Math.random();
    // PERSONALITY
    this.energy = 0.6 + Math.random() * 0.8;      // how strong flaps are
    this.flutter = 0.8 + Math.random() * 1.5;     // flap speed
    this.wanderStrength = 0.05 + Math.random() * 0.15;
    this.depthOffset = Math.random() * Math.PI * 2;
    this.hoverTimer = 0;
    this.hovering = false;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.5,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(512,512) },
        uOpacity: { value: 1 }
      }
    });

    ////////////////////////////////////////////////////
    // ROOT GROUP 
    ////////////////////////////////////////////////////
    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    ////////////////////////////////////////////////////
    // BODY (centered)
    ////////////////////////////////////////////////////
    this.body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.01, 5),
      new THREE.MeshBasicMaterial({ color: 0x111111 })
    );

    // make body vertical
    this.body.rotation.z = Math.PI;

    this.mesh.add(this.body);

    ////////////////////////////////////////////////////
    // SHADER BASE
    ////////////////////////////////////////////////////
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.5,
      uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(512,512) },
      uOpacity: { value: 1 },
      uSide: { value: 1 },
      uColor: { value: new THREE.Color(0xffffff) }
    }
    });

    ////////////////////////////////////////////////////
    // LEFT WING
    ////////////////////////////////////////////////////
    this.leftPivot = new THREE.Group();
    this.mesh.add(this.leftPivot);

    this.leftWing = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.1),
      this.material.clone()
    );

    this.leftWing.material.uniforms.uSide.value = -1;

    // place wing left of body
    this.leftWing.position.x = -0.01;

    this.leftPivot.add(this.leftWing);

    ////////////////////////////////////////////////////
    // RIGHT WING
    ////////////////////////////////////////////////////
    this.rightPivot = new THREE.Group();
    this.mesh.add(this.rightPivot);

    this.rightWing = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.1),
      this.material.clone()
    );

    this.rightWing.material.uniforms.uSide.value = 1;

    // place wing right of body
    this.rightWing.position.x = 0.01;

    this.rightPivot.add(this.rightWing);
    const airlineColor = new THREE.Color(this.airline.color);

    this.leftWing.material.uniforms.uColor.value = airlineColor;
    this.rightWing.material.uniforms.uColor.value = airlineColor;

    // small head
    const head = new THREE.Mesh(
      new THREE.CircleGeometry(0.004, 4),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    head.position.set(0, 0.015, 0.01);
    this.mesh.add(head);

    // antenna geometry (thin line)
    const antennaLength = 0.01;
    const antennaGeo = new THREE.CylinderGeometry(0.001, 0.0001, antennaLength, 3);
    const antennaMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    // IMPORTANT: move cylinder so bottom sits at origin
    antennaGeo.translate(0, antennaLength / 2, 0);

    // LEFT ANTENNA
    const antennaL = new THREE.Mesh(antennaGeo, antennaMat);

    // attach exactly to top edge of head
    antennaL.position.set(-0.007, 0.03, 0.01);
    antennaL.rotation.z = Math.PI * 0.3;

    this.mesh.add(antennaL);

    // RIGHT ANTENNA
    const antennaR = new THREE.Mesh(antennaGeo.clone(), antennaMat);
    antennaR.position.set(0.007, 0.03, 0.01);
    antennaR.rotation.z = -Math.PI * 0.3;

    this.mesh.add(antennaR);

    ////////////////////////////////////////////////////
    // small dot tips (ATTACHED TO ANTENNAS)
    ////////////////////////////////////////////////////

    const tipGeo = new THREE.SphereGeometry(0.002, 2, 2);

    // attach to end of antenna (not world position)
    const tipL = new THREE.Mesh(tipGeo, antennaMat);
    tipL.position.set(0, antennaLength, 0);
    antennaL.add(tipL);

    const tipR = new THREE.Mesh(tipGeo, antennaMat);
    tipR.position.set(0, antennaLength, 0);
    antennaR.add(tipR);

    ////////////////////////////////////////////////////
    // LEGS (simple thin lines)
    ////////////////////////////////////////////////////

    const legGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.05, 1);

    for(let i = -1; i <= 1; i++){
      const leg = new THREE.Mesh(legGeo, antennaMat);
      leg.position.set(i * 0.015, -0.05, 0.01);
      leg.rotation.z = i * 0.5;
      this.mesh.add(leg);
    }
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = 0.5;
    this.maxForce = 0.8;
    this.damping = 0.98;

    this.state = "flying";
    this.life = 0;

    if(type === "arrival"){
      this.position = randomCornerSpawn();
      this.target = randomFlowerSpot();
    }

    if(type === "departure"){
      this.position = randomFlowerSpot();
      this.target = randomCornerSpawn();
    }

    if(type === "parked"){
      this.position = randomFlowerSpot();
      this.target = this.position.clone();
      this.state = "resting";
    }

    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }

  steerTowards(target){
    const desired = new THREE.Vector3().subVectors(target, this.position);
    const distance = desired.length();
    desired.normalize();

    if(distance < 1.0){
      desired.multiplyScalar(this.maxSpeed * distance);
    } else {
      desired.multiplyScalar(this.maxSpeed);
    }

    const steer = new THREE.Vector3().subVectors(desired, this.velocity);
    steer.clampLength(0, this.maxForce);
    return steer;
  }

 update(dt){

  this.leftWing.material.uniforms.uTime.value += dt;
  this.rightWing.material.uniforms.uTime.value += dt;

  const time = performance.now() * 0.001;

  ////////////////////////////////////////////////////
  // FLYING
  ////////////////////////////////////////////////////

  if(this.state === "flying"){

    const toTarget = new THREE.Vector3()
      .subVectors(this.target, this.position);

    const distance = toTarget.length();
    const desiredDir = toTarget.clone().normalize();

    ////////////////////////////////////////////////////
    // RANDOM HOVER PAUSE
    ////////////////////////////////////////////////////

    if(!this.hovering && Math.random() < 0.002){
      this.hovering = true;
      this.hoverTimer = 0.3 + Math.random() * 0.5;
    }

    if(this.hovering){
      this.hoverTimer -= dt;

      this.velocity.multiplyScalar(0.9);

      if(this.hoverTimer <= 0){
        this.hovering = false;
      }
    }

    ////////////////////////////////////////////////////
    // SPEED CONTROL
    ////////////////////////////////////////////////////

    let speedFactor = 1.0;
    if(distance < 2.0){
      speedFactor = distance / 2.0;
    }

    const burst =
      Math.sin(time * this.flutter * 4.0) * 0.5 + 0.5;

    const desiredVelocity =
      desiredDir.multiplyScalar(
        this.maxSpeed *
        speedFactor *
        (0.4 + burst * this.energy)
      );

    ////////////////////////////////////////////////////
    // WANDER
    ////////////////////////////////////////////////////

    const wander =
      new THREE.Vector3(
        Math.sin(time * 1.5 + this.depthOffset),
        Math.cos(time * 1.2 + this.depthOffset),
        0
      ).multiplyScalar(this.wanderStrength);

    ////////////////////////////////////////////////////
    // WIND
    ////////////////////////////////////////////////////

    const wind = windField(this.position, time);

    ////////////////////////////////////////////////////
    // APPLY MOVEMENT
    ////////////////////////////////////////////////////

    this.velocity.lerp(
      desiredVelocity.add(wander).add(wind),
      0.05
    );

    this.velocity.multiplyScalar(0.985);

    this.position.add(this.velocity.clone().multiplyScalar(dt));

    ////////////////////////////////////////////////////
    // DEPTH SWOOP (Z movement)
    ////////////////////////////////////////////////////

    this.position.z =
      0.3 +
      Math.sin(time * 2.0 + this.depthOffset) * 0.05;

    this.mesh.position.copy(this.position);

    ////////////////////////////////////////////////////
    // BODY MOTION
    ////////////////////////////////////////////////////

    this.mesh.rotation.x =
      -0.3 +
      Math.sin(time * 5.0) * 0.05;

    this.mesh.rotation.z =
      -this.velocity.x * 0.5;

    this.mesh.rotation.y =
      Math.sin(time * 2.0 + this.depthOffset) * 0.2;

    ////////////////////////////////////////////////////
    // WING FLAP (ENERGY BASED)
    ////////////////////////////////////////////////////

    const flap =
      Math.sin(time * this.flutter * 10.0);

    const shaped =
      Math.sign(flap) *
      Math.pow(Math.abs(flap), 0.65);

    const angle = shaped * (0.6 + this.energy * 0.5);

    this.leftPivot.rotation.y  =  angle;
    this.rightPivot.rotation.y = -angle;

    ////////////////////////////////////////////////////
    // ARRIVAL
    ////////////////////////////////////////////////////

    if(this.type === "arrival" && distance < 0.05){
      this.state = "resting";
    }

    ////////////////////////////////////////////////////
    // DEPARTURE
    ////////////////////////////////////////////////////

    if(this.type === "departure" && distance < 0.1){
      this.state = "fading";
    }
  }

  ////////////////////////////////////////////////////
  // RESTING
  ////////////////////////////////////////////////////

  if(this.state === "resting"){

    this.life += dt;

    this.mesh.rotation.x = -0.25;
    this.mesh.rotation.z = 0.1;
    this.mesh.rotation.y =
      Math.sin(time * 1.2) * 0.1;

    const slowFlap =
      Math.sin(time * 2.0) * 0.4;

    this.leftPivot.rotation.y  = slowFlap;
    this.rightPivot.rotation.y = -slowFlap;

    if(this.life > 8 && this.type !== "parked"){
      this.state = "fading";
    }
  }

  ////////////////////////////////////////////////////
  // FADING
  ////////////////////////////////////////////////////

  if(this.state === "fading"){
    this.leftWing.material.uniforms.uOpacity.value -= dt * 0.4;
    this.rightWing.material.uniforms.uOpacity.value -= dt * 0.4;

    if(this.leftWing.material.uniforms.uOpacity.value <= 0){
      scene.remove(this.mesh);
      this.dead = true;
    }
  }
}
}

////////////////////////////////////////////////////
// AIRPORT DATA SIMULATION
////////////////////////////////////////////////////

function fetchAirportState(code){

  const airportData = {

    BLR: { parked: 10, arrivals: 20, departures: 12 },
    
    DEL: { parked: 5, arrivals: 30, departures: 14 },

    BOM: { parked: 5, arrivals: 20, departures: 13 },

    MAA: { parked: 5, arrivals: 10, departures: 12 },

    HYD: { parked: 5, arrivals: 22, departures: 12 },

    LHR: { parked: 15, arrivals: 35, departures: 30 }
  };
  
  return airportData[code] || { parked: 5, arrivals: 1, departures: 1 };
}
  
////////////////////////////////////////////////////
// PERSISTENT AIRPORT STATE
////////////////////////////////////////////////////

let butterflies = [];

let airportState = {
  parked: 4
};

let airlineStats = {
  parked: {},
  arrival: {},
  departure: {}
};

function updateUI(code, state){

  function buildList(group){
  let text = "";

  for(const airline in airlineStats[group]){

    const airlineColor =
      Object.values(airlines).find(a => a.name === airline)?.color || "white";

    text += `
      <span style="
        display:inline-block;
        width:10px;
        height:10px;
        background:${airlineColor};
        margin-right:6px;
      "></span>
      ${airline}<span style="float:right">${airlineStats[group][airline]}</span><br>
    `;
  }

  return text || "None<br>";
}

  counter.innerHTML = `
    Airport: ${code}<br><br>

    <b>Parked</b><br>
    ${buildList("parked")}<br>

    <b>Arrivals</b><br>
    ${buildList("arrival")}<br>

    <b>Departures</b><br>
    ${buildList("departure")}
  `;
}

////////////////////////////////////////////////////
// SPAWN LOGIC
////////////////////////////////////////////////////

function spawnParked(count){
  for(let i=0;i<count;i++){
    butterflies.push(new Butterfly("parked"));
  }
}

function spawnArrival(){
  const b = new Butterfly("arrival");

  b.onLanded = () => {
    airportState.parked++;
    updateUI();
    b.type = "parked";
  };

  butterflies.push(b);
}

function spawnDeparture(){

  if(airportState.parked <= 0) return;

  airportState.parked--;

  const b = new Butterfly("departure");
  butterflies.push(b);

  updateUI();
}

////////////////////////////////////////////////////
// INITIAL LOAD PER AIRPORT
////////////////////////////////////////////////////

function initAirport(){

  airlineStats = {
    parked: {},
    arrival: {},
    departure: {}
  };

  butterflies.forEach(b => scene.remove(b.mesh));
  butterflies = [];

  const code = airportSelect.value;
  const state = fetchAirportState(code);

  // Spawn parked butterflies
  for(let i=0;i<state.parked;i++){
    butterflies.push(new Butterfly("parked"));
  }

  // Spawn arrivals
  for(let i=0;i<state.arrivals;i++){
    butterflies.push(new Butterfly("arrival"));
  }

  // Spawn departures
  for(let i=0;i<state.departures;i++){
    butterflies.push(new Butterfly("departure"));
  }

  // UPDATE UI AFTER SPAWNING
  updateUI(code, state);

}

airportSelect.addEventListener("change", initAirport);
initAirport();

////////////////////////////////////////////////////
// ANIMATION LOOP
////////////////////////////////////////////////////

const clock = new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  butterflies.forEach((b,i)=>{
    b.update(dt);
    if(b.dead){
      butterflies.splice(i,1);
    }
  });
  updateGlitter(dt);

  renderer.render(scene,camera);
}

animate();

window.addEventListener("resize",()=>{

  const w = window.innerWidth;
  const h = window.innerHeight;

  renderer.setSize(w, h);

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  camera.position.z = w < 600 ? 8 : 6;

});