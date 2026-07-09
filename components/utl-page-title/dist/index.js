import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// See https://project.pages.drupalcode.org/canvas/ for documentation on how to build a code component
const PageTitle = ({ title, dateFrom, dateTo })=>{
    return /*#__PURE__*/ _jsxs("div", {
        className: "w-full md:my-10 mb-8 my-1 border-b border-blue-500 pb-2 font-bold",
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "text-xl text-blue-500",
                children: title
            }),
            !dateFrom || !dateTo ? '' : /*#__PURE__*/ _jsxs("div", {
                className: "text-sm uppercase",
                children: [
                    "Transaction From ",
                    /*#__PURE__*/ _jsx("b", {
                        children: dateFrom
                    }),
                    " to ",
                    /*#__PURE__*/ _jsx("b", {
                        children: dateTo
                    })
                ]
            })
        ]
    });
};
export default PageTitle;
