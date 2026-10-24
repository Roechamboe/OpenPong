// Dora editor clipboard vector: Dir:Speed:Spin:Freq:Arc:SpinType.
// SpinType is the existing spin orientation / angle field (0..359).
const VECTOR_FIELDS=[['direction',0,90],['speed',20,100],['spin',0,60],['frequencyLevel',20,170],['arc',-65,65],['angle',0,359]];
export function parseBallVector(value){
 const parts=String(value).trim().split(':');
 if(parts.length!==6)throw new Error('Expected six values: Dir:Speed:Spin:Freq:Arc:SpinType');
 const ball={};
 VECTOR_FIELDS.forEach(([key,min,max],i)=>{
  if(!/^-?\d+$/.test(parts[i].trim()))throw new Error('All six fields must be whole numbers');
  const n=Number(parts[i].trim());
  if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(key+' must be between '+min+' and '+max);
  ball[key]=n;
 });
 return ball;
}
