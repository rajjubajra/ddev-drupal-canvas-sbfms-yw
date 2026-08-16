import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */ const client = new JsonApiClient();
export default function LedgersList() {
    /* --------------------------------------------------
     Fetch: Ledger Accounts
  -------------------------------------------------- */ const { data, error, isLoading } = useSWR([
        'node--accounting_ledger',
        {
            queryString: new DrupalJsonApiParams().addInclude([
                'field_account_type'
            ]).getQueryString()
        }
    ], ([type, options])=>client.getCollection(type, options));
    console.log('Ledger Accounts Data:', data);
    if (error) return 'An error has occurred.';
    if (isLoading) return 'Loading...';
    /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */ return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "w-full flex justify-end",
                children: /*#__PURE__*/ _jsx("a", {
                    href: "/node/add/accounting_ledger",
                    target: "_blank",
                    children: /*#__PURE__*/ _jsx(Button, {
                        children: "Create New Ledger"
                    })
                })
            }),
            /*#__PURE__*/ _jsxs("div", {
                children: [
                    /*#__PURE__*/ _jsx(PageTitle, {
                        title: "List of Ledgers"
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        className: "flex gap-5 flex-wrap",
                        children: data === null || data === void 0 ? void 0 : data.map((ledger)=>{
                            var _ledger_field_account_type;
                            return /*#__PURE__*/ _jsxs("a", {
                                href: `/acc-ledger-book/?ledgerId=${ledger === null || ledger === void 0 ? void 0 : ledger.id}`,
                                className: "w-56 h-20 border flex flex-col justify-center items-center cursor-pointer",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "font-medium",
                                        children: ledger === null || ledger === void 0 ? void 0 : ledger.field_ledger_account_name
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs text-gray-600",
                                        children: ledger === null || ledger === void 0 ? void 0 : (_ledger_field_account_type = ledger.field_account_type) === null || _ledger_field_account_type === void 0 ? void 0 : _ledger_field_account_type.name
                                    })
                                ]
                            }, ledger === null || ledger === void 0 ? void 0 : ledger.id);
                        })
                    })
                ]
            })
        ]
    });
}
