/**
 * Mock for nanoid package
 */

let counter = 0;

export const nanoid = (size: number = 21): string => {
  counter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random()
    .toString(36)
    .substring(2, 2 + (size - timestamp.length - 4));
  return `${timestamp}${random}${counter.toString(36).padStart(4, "0")}`.substring(
    0,
    size,
  );
};

export default nanoid;
