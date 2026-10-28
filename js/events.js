const listeners = [];

export const onChange = (listener) => listeners.push(listener);

export const notifyChange = () => listeners.forEach((listener) => listener());
