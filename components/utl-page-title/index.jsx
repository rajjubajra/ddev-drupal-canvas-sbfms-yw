// See https://project.pages.drupalcode.org/canvas/ for documentation on how to build a code component

const PageTitle = ({title, dateFrom, dateTo}) => {
  return (
    <div className='w-full md:my-10 mb-8 my-1 border-b border-blue-500 pb-2 font-bold'>
    <div className="text-xl text-blue-500">{title}</div>
      { !dateFrom || !dateTo
        ? '' :
    <div className="text-sm uppercase">Transaction From <b>{dateFrom}</b> to <b>{dateTo}</b></div>
        
      }
    </div>
  );
};

  export default PageTitle;
