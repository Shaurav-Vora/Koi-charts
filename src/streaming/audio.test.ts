// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PcmEncoder, pcm16 } from "../../public/audio/pcm16-core.js";
const collect=(rate:number,samples:Float32Array,block:number)=>{
 const encoder=new PcmEncoder(rate);const chunks:Uint8Array[]=[];
 for(let i=0;i<samples.length;i+=block)for(const c of encoder.push([samples.slice(i,i+block)]))chunks.push(new Uint8Array(c));
 return Buffer.concat(chunks);
};
describe("PCM audio",()=>{
 it("clips and writes signed little-endian samples",()=>{const bytes=pcm16([-2,-1,0,1,2]);expect([...new Uint8Array(bytes)]).toEqual([0,128,0,128,0,0,255,127,255,127]);});
 it.each([44100,48000])("resamples %i Hz continuously across arbitrary blocks",rate=>{const signal=Float32Array.from({length:rate},(_,i)=>0.5*Math.sin(2*Math.PI*1000*i/rate));const small=collect(rate,signal,128);expect(small).toEqual(collect(rate,signal,997));expect(small.length).toBe(32000);});
 it("downmixes channels and retains incomplete chunks",()=>{const encoder=new PcmEncoder(16000);expect(encoder.push([new Float32Array(800).fill(1),new Float32Array(800).fill(-1)])).toEqual([]);const chunks=encoder.push([new Float32Array(800),new Float32Array(800)]);expect(chunks).toHaveLength(1);expect(new Uint8Array(chunks[0]).every(x=>x===0)).toBe(true);});
 it("attenuates frequencies that would alias during downsampling",()=>{const rms=(hz:number)=>{const bytes=collect(48000,Float32Array.from({length:48000},(_,i)=>Math.sin(2*Math.PI*hz*i/48000)),128);const samples=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.length/2);return Math.sqrt(Array.from(samples.slice(1000)).reduce((sum,x)=>sum+x*x,0)/(samples.length-1000));};expect(rms(12000)).toBeLessThan(rms(1000)*0.02);});
});
