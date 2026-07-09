import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * 
 * IMPORTANT NOTE: 
 *  - DO NOT ADD MARGIN AND PADDING AT ALL 
 *  - THIS IS JUST FOR number format
 *  - Currency Name
 *   
 */ const Amount = ({ amt })=>{
    return /*#__PURE__*/ _jsx("div", {
        className: "text-sm w-full text-right",
        children: /*#__PURE__*/ _jsxs("span", {
            children: [
                " ",
                Number(amt).toFixed(2)
            ]
        })
    });
};
export default Amount;
