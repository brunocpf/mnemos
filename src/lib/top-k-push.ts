function insertSortedDesc<T extends { score: number }>(
  arr: T[],
  item: T,
  k: number,
) {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (arr[mid].score < item.score) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  arr.splice(low, 0, item);
  if (arr.length > k) {
    arr.pop();
  }
}

export function topKPush<T extends { score: number }>(
  arr: T[],
  item: T,
  k: number,
) {
  if (arr.length < k) {
    insertSortedDesc(arr, item, k);
    return;
  }
  if (item.score <= arr[arr.length - 1].score) return;
  insertSortedDesc(arr, item, k);
}
