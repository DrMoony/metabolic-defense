// Minimal RGBA PNG decoder for the read-only generated assets (no npm dependencies).
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
export async function readPNG(file){
  const bytes=await readFile(file),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),parts=[];
  assert.equal(bytes[24],8);assert.equal(bytes[25],6);assert.equal(bytes[28],0);
  for(let at=8;at<bytes.length;){const size=bytes.readUInt32BE(at),kind=bytes.toString('ascii',at+4,at+8);if(kind==='IDAT')parts.push(bytes.subarray(at+8,at+8+size));at+=size+12;}
  const raw=inflateSync(Buffer.concat(parts)),stride=width*4,pixels=new Uint8Array(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];assert(filter<=4);
    for(let x=0;x<stride;x++){
      const i=y*stride+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0;
      pixels[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
    }
  }
  return {width,height,pixels};
}
