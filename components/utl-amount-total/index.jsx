
/**
 * 
 * IMPORTANT NOTE: 
 *  - DO NOT ADD MARGIN AND PADDING AT ALL 
 *  - THIS IS JUST FOR number format
 *  - Currency Name
 *   
 */

const AmountTotal = ({amt}) => {
  return (<span className="font-bold text-blue-600"> {Number(amt).toFixed(2)}</span>);
};

export default AmountTotal;
