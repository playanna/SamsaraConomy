/**
 * Sorts an array of objects based on a specified field in either ascending or descending order.
 * @param {Array} data - The array of objects to be sorted.
 * @param {string} field - The field by which to sort the array (e.g., 'balance', 'xp').
 * @param {string} order - The order of sorting ('asc' for ascending, 'desc' for descending).
 * @returns {Array} - The sorted array.
 */
function sortLeaderboard(data, field, order = 'desc') {
    return data.sort((a, b) => {
      if (order === 'asc') {
        return a[field] - b[field];
      } else if (order === 'desc') {
        return b[field] - a[field];
      } else {
        throw new Error("Invalid sorting order. Use 'asc' or 'desc'.");
      }
    });
  }
  
  module.exports = sortLeaderboard;
  