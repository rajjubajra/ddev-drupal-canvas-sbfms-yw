
/**
 * 
 * IMPORTANT NOTE: 
 *  - DO NOT ADD MARGIN AND PADDING AT ALL 
 *  - THIS IS JUST FOR number format
 *  - Currency Name
 *   
 */

const Amount = ({amt}) => {
  return (<span> {Number(amt).toFixed(2)}</span>);
};

export default Amount;
