export function dotProduct(a: Float32Array, b: Float32Array) {
  let dotProductSum = 0;
  for (let i = 0; i < a.length; i++) dotProductSum += a[i] * b[i];
  return dotProductSum;
}
