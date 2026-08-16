import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';

/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */
const client = new JsonApiClient();



export default function LedgersList() {


  /* --------------------------------------------------
     Fetch: Ledger Accounts
  -------------------------------------------------- */
  const { data, error, isLoading } = useSWR(
    [
      'node--accounting_ledger',
      {
        queryString: new DrupalJsonApiParams()
          .addInclude(['field_account_type'])
          .getQueryString(),
      },
    ],
    ([type, options]) => client.getCollection(type, options)
  );

  console.log('Ledger Accounts Data:', data);
  
  if (error) return 'An error has occurred.';
  if (isLoading) return 'Loading...';

  /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */
  return (
    <div>
     
      <div className='w-full flex justify-end'>
      <a href='/node/add/accounting_ledger' target='_blank'><Button>Create New Ledger</Button></a>
      </div>

    {/* ----------------List of Ledgers in Grid ---------------- */}
      {(
        <div>
          <PageTitle title="List of Ledgers" />
          <div className="flex gap-5 flex-wrap">
            {data?.map((ledger) => (
              <a
                key={ledger?.id}
                href={`/acc-ledger-book/?ledgerId=${ledger?.id}`}
                className="w-56 h-20 border flex flex-col justify-center items-center cursor-pointer"
              >
                <div className="font-medium">
                  {ledger?.field_ledger_account_name}
                </div>
                <div className="text-xs text-gray-600">
                  {ledger?.field_account_type?.name}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
