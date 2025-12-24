export function topKPush<T extends { score: number }>(
  arr: T[],
  item: T,
  k: number,
) {
  if (arr.length < k) {
    arr.push(item);
    arr.sort((x, y) => y.score - x.score);
    return;
  }
  if (item.score <= arr[arr.length - 1].score) return;
  arr[arr.length - 1] = item;
  arr.sort((x, y) => y.score - x.score);
}
