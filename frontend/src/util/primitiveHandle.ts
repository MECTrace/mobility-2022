export const decimalToHex = (dec: any) => {
    const tempHex = dec.toString(16);
    return (tempHex.length === 1 ? '0' : '') + tempHex;
  };
  
  export const generateUniqueString = () => {
    const arr = new Uint8Array(40 / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, decimalToHex).join('');
  };
  
  export const safeAnyToNumber = (inputVal: any, fallbackNum = 0) => {
    const result = Number(inputVal);
    return isNaN(result) ? fallbackNum : result;
  };
  