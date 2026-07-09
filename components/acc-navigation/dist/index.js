import { jsx as _jsx } from "react/jsx-runtime";
import { JsonApiClient, sortMenu } from 'drupal-canvas';
import useSWR from 'swr';
const client = new JsonApiClient();
const Navigation = ()=>{
    const { data, isLoading, error } = useSWR([
        'menu_items',
        'main'
    ], ([type, resourceId])=>client.getResource(type, resourceId));
    if (error) return 'An error has occurred.';
    if (isLoading) return 'Loading...';
    const menu = sortMenu(data);
    return /*#__PURE__*/ _jsx("ul", {
        children: menu.map((item)=>/*#__PURE__*/ _jsx("li", {
                children: /*#__PURE__*/ _jsx("a", {
                    href: item.url,
                    children: item.title
                })
            }, item.id))
    });
};
export default Navigation;
