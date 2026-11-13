// Camera stops follow the modeled process routes. The same rail drives both circuits.
export const traces={
  h2:{
    title:'Hydrogen circuit',
    steps:[
      {name:'Feed & compression',view:'feed',chapter:0,tag:'CONDITIONED H₂',text:'Conditioned hydrogen is compressed as required before precooling.'},
      {name:'Precooler',view:'exchange',chapter:2,tag:'E-101 / HYDROGEN PASSAGES',text:'Hydrogen gives up heat to LNG through separate metal passages.'},
      {name:'Cold box',view:'deep',chapter:3,tag:'R-101 / DEEP REFRIGERATION',text:'Mechanical refrigeration removes the remaining heat, including heat released during ortho–para conversion.'},
      {name:'LH₂ storage',view:'liquid',chapter:3,tag:'PRODUCT / ~20 K',text:'Following expansion and phase separation, liquid hydrogen is routed to insulated storage.'},
    ],
  },
  lng:{
    title:'LNG circuit',
    steps:[
      {name:'Marine unloading',view:'dock',chapter:1,tag:'JETTY / LNG RECEIVING',text:'The articulated loading arm transfers LNG from the carrier to terminal storage during unloading.'},
      {name:'Tank & pump',view:'pump',chapter:1,tag:'TK-201 / P-201',text:'LNG leaves storage near 111 K. The high-pressure pump sends it toward regasification.'},
      {name:'Precooler',view:'exchange',chapter:2,tag:'E-101 / LNG PASSAGES',text:'LNG absorbs heat from hydrogen. Its temperature rises before the stream reaches the terminal vaporizer.'},
      {name:'Gas send-out',view:'trim',chapter:1,tag:'E-202 / GAS GRID',text:'Terminal vaporization and any required trim heating meet the gas send-out specification.'},
    ],
  },
};

export const bypass={
  h2:{name:'Mechanical precooling',view:'mechanical',chapter:0,tag:'STANDALONE PRECOOLING',text:'The hydrogen train uses mechanical precooling. The dedicated deep refrigeration train still handles the final cooling.'},
  lng:{name:'Terminal bypass',view:'bypass',chapter:1,tag:'INDEPENDENT TERMINAL ROUTE',text:'LNG bypasses E-101 and continues to the terminal vaporizer for gas send-out.'},
};

export const opening=[
  {view:'openingDock',time:5200,tag:'01 / THE COLD SOURCE',title:'Cold arrives by sea.',text:'LNG enters the receiving terminal at about 111 K.'},
  {view:'openingExchange',time:4300,tag:'02 / THE THERMAL LINK',title:'Two circuits exchange heat.',text:'The precooler transfers heat from hydrogen to LNG across separate passages.'},
  {view:'overview',time:5200,tag:'03 / OAPEC 2026 · KUWAIT',title:'LNG cold energy for hydrogen liquefaction',text:'A 3D walkthrough of the integrated process.'},
];

export const dutyProfiles={
  steady:{label:'Steady',values:[108,106,109,111,110,108,106,105,108,110,112,109,108]},
  variable:{label:'Variable',values:[69,66,62,71,90,78,99,118,122,105,89,75,69]},
  outage:{label:'Interruption',values:[101,103,105,102,101,68,0,0,0,55,84,101,101]},
};

export function coldAtHour(values,hour){
  const index=Math.min(values.length-2,Math.floor(hour/2));
  const fraction=(hour-index*2)/2;
  return Math.round(values[index]+(values[index+1]-values[index])*fraction);
}
