


const csv_importer = () => {

        document.getElementById('csvFile').addEventListener('change', handleFile);

        function handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            const text = e.target.result;
            const data = parseCSV(text);
            console.log(data);

            uploadToDrupal(data);
        };

        reader.readAsText(file);
        }

    return(
        <div>
            <input type="file" id="csvFile" accept=".csv" />
        </div>
    )


}

export default csv_importer;