import { jsx as _jsx } from "react/jsx-runtime";
// See https://project.pages.drupalcode.org/canvas/ for documentation on how to build a code component
const Button = ({ children })=>{
    return /*#__PURE__*/ _jsx("div", {
        className: "px-4 py-2 my-4 cursor-pointer border hover:shadow-lg duration-500",
        children: children
    });
};
export default Button;
