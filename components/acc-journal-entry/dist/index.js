import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient, FormattedText, Image } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import Button from '@/components/utl-button';
import PageTitle from '@/components/utl-page-title';
import AmountTotal from '@/components/utl-amount-total';
/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */ const client = new JsonApiClient();
export default function JournalEntry() {
    const [jourId, setJourId] = useState([]);
    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        console.log('PARAMS: ', params);
        const idsParam = params.get('nodeId'); // e.g. "12,13"
        if (idsParam) {
            const idsArray = idsParam.split(',').map((id)=>Number(id));
            setJourId(idsArray);
        }
    }, []);
    /* --------------------------------------------------
       Fetch: Journal Entries
  -------------------------------------------------- */ //const isReady = jourId !== null && jourId !== undefined && jourId !== '';
    const isReady = Array.isArray(jourId) && jourId.length > 0;
    const params = new DrupalJsonApiParams().addInclude([
        'field_debit_account',
        'field_credit_account',
        'field_image_image.field_media_image'
    ]);
    if (isReady) {
        params.addFilter('drupal_internal__nid', jourId, 'IN');
    }
    const { data, error, isLoading } = useSWR(isReady ? [
        'node--acc_journal_entry',
        jourId.join(','),
        {
            queryString: params.getQueryString()
        }
    ] : null, ([type, , options])=>client.getCollection(type, options));
    console.log('JOURNAL ENTRIES : ', data);
    /**
 * 
 * split the string, check the first word and build link accordingly  
 * 
 */ function generateLink(text) {
        if (!text) return 'Manual Journal Entry';
        const parts = text.trim().split(' ');
        const type = parts[0];
        const id = parts[1];
        if (!id) return '';
        if (type === 'purchase') {
            return /*#__PURE__*/ _jsx("a", {
                href: `/purchase-post-journal/?uuid=${id}`,
                children: "Go to Purchase"
            });
        } else {
            return /*#__PURE__*/ _jsx("a", {
                href: `/invoice/?uuid=${id}`,
                children: "Go to Invoice"
            });
        }
    }
    /* --------------------------------------------------
     Render States
  -------------------------------------------------- */ if (error) return 'An error has occurred.';
    if (isLoading) return 'Loading...';
    /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */ return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "w-full flex justify-end mb-4 gap-2",
                children: [
                    /*#__PURE__*/ _jsx("button", {
                        onClick: ()=>window.history.back(),
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: " ← Back "
                        })
                    }),
                    /*#__PURE__*/ _jsx("a", {
                        href: "/node/add/acc_journal_entry",
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: "Create Journal Entry"
                        })
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Journal Entries"
            }),
            /*#__PURE__*/ _jsx("div", {}),
            data === null || data === void 0 ? void 0 : data.map((entry)=>{
                var _entry_field_description, _entry_field_comment, _entry_field_debit_account, _entry_field_debit_account1, _entry_field_credit_account, _entry_field_credit_account1, _entry_field_image_image;
                return /*#__PURE__*/ _jsxs("div", {
                    className: "my-2 py-4 border border-slate-300",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "border-b border-slate-300 flex flex-wrap justify-between",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "px-4",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-semibold",
                                            children: entry === null || entry === void 0 ? void 0 : entry.title
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "text-xs",
                                            children: entry === null || entry === void 0 ? void 0 : entry.field_date
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "px-4",
                                    children: /*#__PURE__*/ _jsx("div", {
                                        className: "flex gap-2",
                                        children: /*#__PURE__*/ _jsx("a", {
                                            href: `/node/${entry === null || entry === void 0 ? void 0 : entry.drupal_internal__nid}/edit?destination=/admin/content`,
                                            children: /*#__PURE__*/ _jsx(Button, {
                                                children: "Edit"
                                            })
                                        })
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "my-2 pl-4 flex flex-wrap",
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-2 text-xs uppercase w-32",
                                    children: "Description"
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-1 ml-2 text-sm",
                                    children: /*#__PURE__*/ _jsx(FormattedText, {
                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_description = entry.field_description) === null || _entry_field_description === void 0 ? void 0 : _entry_field_description.processed
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "my-2 pl-4 flex flex-wrap",
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-2 text-xs uppercase w-32",
                                    children: "Comment"
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-1 ml-2 text-sm",
                                    children: /*#__PURE__*/ _jsx(FormattedText, {
                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_comment = entry.field_comment) === null || _entry_field_comment === void 0 ? void 0 : _entry_field_comment.processed
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "grid md:grid-cols-2 md:justify-between my-4 border-t border-b border-slate-300",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "border-r border-slate-300 p-4",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-semibold",
                                            children: "Debit"
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "mx-4 pl-4 border-l-2 border-blue-400",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-sm tracking-tighter",
                                                    children: /*#__PURE__*/ _jsx("a", {
                                                        href: `/acc-ledger-book?ledgerId=${entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account = entry.field_debit_account) === null || _entry_field_debit_account === void 0 ? void 0 : _entry_field_debit_account.id}`,
                                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account1 = entry.field_debit_account) === null || _entry_field_debit_account1 === void 0 ? void 0 : _entry_field_debit_account1.field_ledger_account_name
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(AmountTotal, {
                                                        amt: entry === null || entry === void 0 ? void 0 : entry.field_amount
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "p-4",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-semibold",
                                            children: "Credit"
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "mx-4 pl-4 border-l-2 border-blue-400",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-sm tracking-tighter",
                                                    children: /*#__PURE__*/ _jsx("a", {
                                                        href: `/acc-ledger-book?ledgerId=${entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account = entry.field_credit_account) === null || _entry_field_credit_account === void 0 ? void 0 : _entry_field_credit_account.id}`,
                                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account1 = entry.field_credit_account) === null || _entry_field_credit_account1 === void 0 ? void 0 : _entry_field_credit_account1.field_ledger_account_name
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(AmountTotal, {
                                                        amt: entry === null || entry === void 0 ? void 0 : entry.field_amount
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "flex",
                            children: (entry === null || entry === void 0 ? void 0 : entry.field_image_image) && (entry === null || entry === void 0 ? void 0 : (_entry_field_image_image = entry.field_image_image) === null || _entry_field_image_image === void 0 ? void 0 : _entry_field_image_image.map((img)=>{
                                var _img_field_media_image_uri, _img_field_media_image, _img_field_media_image_uri1, _img_field_media_image1;
                                return /*#__PURE__*/ _jsx("a", {
                                    href: img === null || img === void 0 ? void 0 : (_img_field_media_image = img.field_media_image) === null || _img_field_media_image === void 0 ? void 0 : (_img_field_media_image_uri = _img_field_media_image.uri) === null || _img_field_media_image_uri === void 0 ? void 0 : _img_field_media_image_uri.url,
                                    target: "_blank",
                                    children: /*#__PURE__*/ _jsx(Image, {
                                        className: "w-64 h-auto p-2 m-2 border border-slate-300",
                                        src: img === null || img === void 0 ? void 0 : (_img_field_media_image1 = img.field_media_image) === null || _img_field_media_image1 === void 0 ? void 0 : (_img_field_media_image_uri1 = _img_field_media_image1.uri) === null || _img_field_media_image_uri1 === void 0 ? void 0 : _img_field_media_image_uri1.url,
                                        alt: "supporting image",
                                        width: 1000,
                                        height: 500,
                                        unoptimized: true
                                    })
                                });
                            }))
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "text-xs px-4 flex justify-end",
                            children: (entry === null || entry === void 0 ? void 0 : entry.field_purchase_sale_reference_id) !== '' ? generateLink(entry === null || entry === void 0 ? void 0 : entry.field_purchase_sale_reference_id) : 'Manual Journal Entry'
                        })
                    ]
                }, entry === null || entry === void 0 ? void 0 : entry.id);
            })
        ]
    });
}
