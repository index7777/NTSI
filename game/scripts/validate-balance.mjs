import assert from "node:assert/strict";

const attributes = ["spirit", "bone", "body", "sense"];
const realms = {
  qi: { ranges: [[2, 6], [4, 11], [7, 18]], caps: [220, 180, 190, 160], expected: [18, 51, 105] },
  foundation: { ranges: [[8, 18], [14, 30], [22, 45]], caps: [440, 360, 380, 320], expected: [54, 144, 279] },
  goldenCore: { ranges: [[25, 45], [40, 70], [60, 100]], caps: [840, 660, 730, 620], expected: [135, 345, 645] },
};

function band(level) { return level <= 3 ? 0 : level <= 6 ? 1 : 2; }
function cumulative(realm, level) {
  let result = 0;
  for (let i = 1; i <= level; i += 1) result += realm.ranges[band(i)][1];
  return result;
}

for (const [realmName, realm] of Object.entries(realms)) {
  assert.equal(cumulative(realm, 3), realm.expected[0], `${realmName} 3層回推錯誤`);
  assert.equal(cumulative(realm, 6), realm.expected[1], `${realmName} 6層回推錯誤`);
  assert.equal(cumulative(realm, 9), realm.expected[2], `${realmName} 9層回推錯誤`);
  for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex += 1) {
    const caps = Array.from({ length: 9 }, (_, index) =>
      Math.ceil(realm.caps[attributeIndex] * cumulative(realm, index + 1) / cumulative(realm, 9))
    );
    assert.equal(caps.at(-1), realm.caps[attributeIndex], `${realmName}.${attributes[attributeIndex]} 未到終極上限`);
    for (let i = 1; i < caps.length; i += 1) {
      assert.ok(caps[i] > caps[i - 1], `${realmName}.${attributes[attributeIndex]} 第${i + 1}層未遞增`);
    }
  }
}

assert.deepEqual(
  realms.foundation.caps.map((value, index) => value + realms.qi.caps[index]),
  [660, 540, 570, 480],
  "筑基總上限回推錯誤",
);
assert.deepEqual(
  realms.goldenCore.caps.map((value, index) => value + realms.foundation.caps[index] + realms.qi.caps[index]),
  [1500, 1200, 1300, 1100],
  "金丹總上限回推錯誤",
);

const pools = [
  [70, 30, 0], [15, 85, 0], [0, 60, 40],
  [90, 10, 0], [20, 80, 0], [0, 75, 25],
];
for (const pool of pools) assert.equal(pool.reduce((sum, value) => sum + value, 0), 100, "概率池不等於100%");

console.log("✓ 3／6／9層單輪最大成長回推正確");
console.log("✓ 27組逐層四維上限均單調遞增且第9層封頂");
console.log("✓ 筑基與金丹跨境總天花板回推正確");
console.log("✓ 裸衝／服丹概率池均為100%");
