const { writeFileSync } = require("fs");
const { join } = require("path");

const gltf = {
  asset: { version: "2.0", generator: "manual" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [
    { mesh: 0, rotation: [0, 0, 0, 1] },
  ],
  meshes: [
    {
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          material: 0,
        },
      ],
    },
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 24,
      type: "VEC3",
      max: [0.8, 1.125, 0.02],
      min: [-0.8, -1.125, -0.02],
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: 24,
      type: "VEC3",
    },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: 288 },
    { buffer: 0, byteOffset: 288, byteLength: 288 },
  ],
  buffers: [{ byteLength: 576 }],
  materials: [
    {
      pbrMetallicRoughness: {
        baseColorFactor: [0.133, 0.133, 0.133, 1.0],
        metallicFactor: 0.1,
        roughnessFactor: 0.7,
      },
    },
  ],
};

const json = JSON.stringify(gltf);
const jsonBuf = Buffer.from(json, "utf8");
const pad = (4 - (jsonBuf.length % 4)) % 4;
const paddedJson = Buffer.concat([jsonBuf, Buffer.alloc(pad, 0x20)]);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + 8 + paddedJson.length, 8);

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(paddedJson.length, 0);
jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4);

const glb = Buffer.concat([header, jsonChunkHeader, paddedJson]);
const outPath = join(__dirname, "..", "src", "assets", "card.glb");
writeFileSync(outPath, glb);
console.log("Created", outPath, `(${glb.length} bytes)`);
