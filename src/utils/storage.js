const memoryStorage = new Map();

const setItem = async (key, value) => {
  memoryStorage.set(key, JSON.stringify(value));
};

const getItem = async (key, fallback = null) => {
  const raw = memoryStorage.get(key);
  return raw ? JSON.parse(raw) : fallback;
};

module.exports = { setItem, getItem };
