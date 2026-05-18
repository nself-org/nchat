/**
 * @fileoverview Tests for Array Utilities
 */

import {
  groupBy,
  sortBy,
  uniqueBy,
  chunk,
  move,
  insertAt,
  removeAt,
  removeWhere,
  updateAt,
  updateWhere,
  flatten,
  first,
  last,
  intersection,
  difference,
  union,
  shuffle,
  sample,
  sampleN,
  partition,
  count,
  range,
  zip,
  findIndex,
  every,
  some,
  toLookup,
} from "../array";

describe("groupBy", () => {
  it("should group by key", () => {
    const data = [
      { type: "a", val: 1 },
      { type: "b", val: 2 },
      { type: "a", val: 3 },
    ];
    const result = groupBy(data, "type");
    expect(result.a).toHaveLength(2);
    expect(result.b).toHaveLength(1);
  });

  it("should group by function", () => {
    const data = [1, 2, 3, 4, 5];
    const result = groupBy(data, (n) => (n % 2 === 0 ? "even" : "odd"));
    expect(result.even).toEqual([2, 4]);
    expect(result.odd).toEqual([1, 3, 5]);
  });

  it("should handle empty array", () => {
    expect(groupBy([], "key")).toEqual({});
  });
});

describe("sortBy", () => {
  it("should sort by key ascending", () => {
    const data = [{ name: "b" }, { name: "a" }, { name: "c" }];
    const result = sortBy(data, "name");
    expect(result[0].name).toBe("a");
  });

  it("should sort descending", () => {
    const data = [{ name: "b" }, { name: "a" }, { name: "c" }];
    const result = sortBy(data, "name", "desc");
    expect(result[0].name).toBe("c");
  });

  it("should sort by multiple keys", () => {
    const data = [
      { role: "admin", name: "b" },
      { role: "user", name: "a" },
      { role: "admin", name: "a" },
    ];
    const result = sortBy(data, [
      { key: "role", direction: "asc" },
      { key: "name", direction: "asc" },
    ]);
    expect(result[0].name).toBe("a");
    expect(result[0].role).toBe("admin");
  });

  it("should handle null values", () => {
    const data = [{ val: 1 }, { val: null }, { val: 2 }];
    const result = sortBy(data, "val");
    expect(result[result.length - 1].val).toBeNull();
  });

  it("should handle empty array", () => {
    expect(sortBy([], "key")).toEqual([]);
  });
});

describe("uniqueBy", () => {
  it("should get unique by key", () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const result = uniqueBy(data, "id");
    expect(result).toHaveLength(2);
  });

  it("should get unique primitives", () => {
    const result = uniqueBy([1, 2, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("should handle empty array", () => {
    expect(uniqueBy([])).toEqual([]);
  });
});

describe("chunk", () => {
  it("should split into chunks", () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("should handle empty array", () => {
    expect(chunk([], 2)).toEqual([]);
  });

  it("should handle size larger than array", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});

describe("move", () => {
  it("should move item", () => {
    const result = move(["a", "b", "c", "d"], 0, 2);
    expect(result).toEqual(["b", "c", "a", "d"]);
  });

  it("should handle same index", () => {
    const arr = ["a", "b", "c"];
    const result = move(arr, 1, 1);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("should handle out of bounds", () => {
    const arr = ["a", "b"];
    const result = move(arr, 0, 10);
    expect(result).toEqual(["a", "b"]);
  });
});

describe("insertAt", () => {
  it("should insert at index", () => {
    const result = insertAt(["a", "b", "d"], 2, "c");
    expect(result).toEqual(["a", "b", "c", "d"]);
  });

  it("should handle negative index", () => {
    const result = insertAt(["a", "b"], -1, "c");
    expect(result[0]).toBe("c");
  });

  it("should handle index beyond length", () => {
    const result = insertAt(["a", "b"], 10, "c");
    expect(result).toEqual(["a", "b", "c"]);
  });
});

describe("removeAt", () => {
  it("should remove at index", () => {
    const result = removeAt(["a", "b", "c"], 1);
    expect(result).toEqual(["a", "c"]);
  });

  it("should handle out of bounds", () => {
    const result = removeAt(["a", "b"], 10);
    expect(result).toEqual(["a", "b"]);
  });
});

describe("removeWhere", () => {
  it("should remove matching items", () => {
    const result = removeWhere([1, 2, 3, 4], (n) => n % 2 === 0);
    expect(result).toEqual([1, 3]);
  });
});

describe("updateAt", () => {
  it("should update at index", () => {
    const result = updateAt([1, 2, 3], 1, 5);
    expect(result).toEqual([1, 5, 3]);
  });

  it("should update with function", () => {
    const result = updateAt([{ n: 1 }], 0, (prev) => ({ ...prev, n: 2 }));
    expect(result[0].n).toBe(2);
  });

  it("should handle out of bounds", () => {
    const result = updateAt([1, 2], 10, 5);
    expect(result).toEqual([1, 2]);
  });
});

describe("updateWhere", () => {
  it("should update matching item", () => {
    const data = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ];
    const result = updateWhere(data, (item) => item.id === 1, {
      name: "updated",
    });
    expect(result[0].name).toBe("updated");
  });

  it("should not change if no match", () => {
    const data = [{ id: 1 }];
    const result = updateWhere(data, (item) => item.id === 999, { id: 2 });
    expect(result).toEqual([{ id: 1 }]);
  });
});

describe("flatten", () => {
  it("should flatten one level", () => {
    const result = flatten([
      [1, 2],
      [3, [4, 5]],
    ]);
    expect(result).toEqual([1, 2, 3, [4, 5]]);
  });

  it("should flatten multiple levels", () => {
    const result = flatten(
      [
        [1, 2],
        [3, [4, 5]],
      ],
      2,
    );
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("first", () => {
  it("should get first items", () => {
    expect(first([1, 2, 3])).toEqual([1]);
    expect(first([1, 2, 3], 2)).toEqual([1, 2]);
  });

  it("should handle empty array", () => {
    expect(first([])).toEqual([]);
  });
});

describe("last", () => {
  it("should get last items", () => {
    expect(last([1, 2, 3])).toEqual([3]);
    expect(last([1, 2, 3], 2)).toEqual([2, 3]);
  });

  it("should handle empty array", () => {
    expect(last([])).toEqual([]);
  });
});

describe("intersection", () => {
  it("should find common items", () => {
    const result = intersection([1, 2, 3], [2, 3, 4]);
    expect(result).toEqual([2, 3]);
  });

  it("should handle objects with key", () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 2 }, { id: 3 }];
    const result = intersection(a, b, "id");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});

describe("difference", () => {
  it("should find items in a but not b", () => {
    const result = difference([1, 2, 3], [2, 3, 4]);
    expect(result).toEqual([1]);
  });

  it("should handle objects with key", () => {
    const a = [{ id: 1 }, { id: 2 }];
    const b = [{ id: 2 }];
    const result = difference(a, b, "id");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});

describe("union", () => {
  it("should combine unique items", () => {
    const result = union([1, 2], [2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("shuffle", () => {
  it("should return array of same length", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result).toHaveLength(5);
  });

  it("should contain same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.sort()).toEqual(arr.sort());
  });

  it("should handle empty array", () => {
    expect(shuffle([])).toEqual([]);
  });
});

describe("sample", () => {
  it("should return item from array", () => {
    const arr = [1, 2, 3];
    const result = sample(arr);
    expect(arr).toContain(result);
  });

  it("should return undefined for empty", () => {
    expect(sample([])).toBeUndefined();
  });
});

describe("sampleN", () => {
  it("should return n random items", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = sampleN(arr, 3);
    expect(result).toHaveLength(3);
  });

  it("should handle n larger than array", () => {
    const result = sampleN([1, 2], 5);
    expect(result).toHaveLength(2);
  });
});

describe("partition", () => {
  it("should split by predicate", () => {
    const [evens, odds] = partition([1, 2, 3, 4], (n) => n % 2 === 0);
    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3]);
  });

  it("should handle empty array", () => {
    const [a, b] = partition([], () => true);
    expect(a).toEqual([]);
    expect(b).toEqual([]);
  });
});

describe("count", () => {
  it("should count all items", () => {
    expect(count([1, 2, 3])).toBe(3);
  });

  it("should count matching items", () => {
    expect(count([1, 2, 3, 4], (n) => n % 2 === 0)).toBe(2);
  });

  it("should return 0 for empty", () => {
    expect(count([])).toBe(0);
  });
});

describe("range", () => {
  it("should create number range", () => {
    expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("should support step", () => {
    expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
  });

  it("should support negative step", () => {
    expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
  });

  it("should return empty for zero step", () => {
    expect(range(0, 5, 0)).toEqual([]);
  });
});

describe("zip", () => {
  it("should zip arrays", () => {
    const result = zip([1, 2], ["a", "b"]);
    expect(result).toEqual([
      [1, "a"],
      [2, "b"],
    ]);
  });

  it("should handle different lengths", () => {
    const result = zip([1, 2, 3], ["a", "b"]);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual([3, undefined]);
  });
});

describe("findIndex", () => {
  it("should find index", () => {
    expect(findIndex([1, 2, 3], (n) => n === 2)).toBe(1);
  });

  it("should return -1 if not found", () => {
    expect(findIndex([1, 2, 3], (n) => n === 5)).toBe(-1);
  });
});

describe("every", () => {
  it("should check all match", () => {
    expect(every([2, 4, 6], (n) => n % 2 === 0)).toBe(true);
    expect(every([2, 3, 6], (n) => n % 2 === 0)).toBe(false);
  });

  it("should return true for empty", () => {
    expect(every([], () => false)).toBe(true);
  });
});

describe("some", () => {
  it("should check any match", () => {
    expect(some([1, 2, 3], (n) => n === 2)).toBe(true);
    expect(some([1, 3, 5], (n) => n === 2)).toBe(false);
  });

  it("should return false for empty", () => {
    expect(some([], () => true)).toBe(false);
  });
});

describe("toLookup", () => {
  it("should create lookup by key", () => {
    const data = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ];
    const result = toLookup(data, "id");
    expect(result[1]).toEqual({ id: 1, name: "a" });
    expect(result[2]).toEqual({ id: 2, name: "b" });
  });

  it("should handle empty array", () => {
    expect(toLookup([], "id")).toEqual({});
  });
});
