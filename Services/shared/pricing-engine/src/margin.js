/**
 * @param {number} basePrice
 * @param {'PERCENTAGE'|'FIXED'} marginType
 * @param {number} marginValue
 * @returns {{ basePrice: number, marginAmount: number, sellPrice: number }}
 */
export function computeMargin(basePrice, marginType, marginValue) {
  let marginAmount = 0;

  switch (marginType) {
    case 'PERCENTAGE':
      marginAmount = basePrice * (marginValue / 100);
      break;
    case 'FIXED':
      marginAmount = marginValue;
      break;
  }

  return {
    basePrice,
    marginAmount: Math.round(marginAmount * 100) / 100,
    sellPrice: Math.round((basePrice + marginAmount) * 100) / 100,
  };
}
